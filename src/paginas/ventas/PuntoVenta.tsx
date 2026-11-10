import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Minus, PackageSearch, PauseCircle, PlayCircle, Plus, Printer, Receipt, ScanBarcode, ShoppingCart, Trash2, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { productosApi } from '@/api/catalogo'
import { aApiError } from '@/api/errores'
import { inventarioApi } from '@/api/inventario'
import type {
  ClienteResponse,
  CompletoResponse,
  CondicionVenta,
  ProductoResponse,
  VentaResponse,
} from '@/api/tipos'
import { ventasApi } from '@/api/ventas'
import { useUsuario } from '@/auth/contexto'
import { EditorPagos } from '@/componentes/formularios/EditorPagos'
import { ModalEncargo } from '@/componentes/formularios/ModalEncargo'
import { ModalPedidoReposicion } from '@/componentes/formularios/ModalPedidoReposicion'
import { SelectorCliente } from '@/componentes/formularios/SelectorCliente'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { CampoTexto, Entrada } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { FotoProducto } from '@/componentes/ui/FotoProducto'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useCajaActual } from '@/hooks/useCajaActual'
import { useMetodosPago } from '@/hooks/useMetodosPago'
import { useDocumentoPdf } from '@/hooks/useDocumentoPdf'
import { useRetraso } from '@/hooks/useRetraso'
import {
  actualizarLinea,
  agregarAlCarrito,
  aDetallesVenta,
  calcularTotales,
  claveLinea,
  completosDisponibles,
  consumoPorProducto,
  productosDelCarrito,
  quitarLinea,
  type LineaCarrito,
} from '@/logica/carrito'
import { esDecimalValido } from '@/logica/decimales'
import { cantidad, cantidadConUnidad, hoyLima, soles, solesDeCentimos, sufijoUnidad } from '@/logica/formato'
import { aPagosRequest, calcularCobro, type PagoFormulario } from '@/logica/pagos'
import { otrasUbicacionesConStock } from '@/logica/disponibilidad'
import { avisoStockBajo } from '@/logica/stockBajo'
import { billetesSugeridos } from '@/logica/billetes'
import { etiquetaEnEspera, guardarEnEspera, leerEnEspera, MAXIMO_EN_ESPERA, ponerEnEspera, type VentaEnEspera } from '@/logica/ventasEnEspera'
import { presentacionesActivas } from '@/logica/presentaciones'

const PAGO_INICIAL: PagoFormulario = { metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }

/**
 * Punto de venta rapido: buscar producto, elegir presentacion, carrito con cantidades (decimales para kilo y
 * metro) y descuento, venta al contado o a credito, pago mixto y vuelto. La venta se emite en la tienda de la
 * caja abierta del usuario.
 */
export default function PuntoVenta() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const caja = useCajaActual()
  const metodos = useMetodosPago()
  const buscador = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [condicion, setCondicion] = useState<CondicionVenta>('CONTADO')
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [vencimiento, setVencimiento] = useState('')
  const [pagos, setPagos] = useState<PagoFormulario[]>([PAGO_INICIAL])
  const [intentado, setIntentado] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null)
  const [vendida, setVendida] = useState<VentaResponse | null>(null)
  const [pedido, setPedido] = useState<ProductoResponse | null>(null)
  const usuario = useUsuario()
  const [enEspera, setEnEspera] = useState<VentaEnEspera[]>(() => leerEnEspera(usuario.id))
  const cambiarEnEspera = (lista: VentaEnEspera[]) => {
    setEnEspera(lista)
    guardarEnEspera(usuario.id, lista)
  }
  const [encargo, setEncargo] = useState<{ producto: ProductoResponse; presentacionId: number } | null>(null)
  const busqueda = useRetraso(texto.trim(), 250)
  const tiendaId = caja.data?.ubicacionId

  const productos = useQuery({
    queryKey: ['productos', 'pos', busqueda],
    queryFn: () => productosApi.listar({ texto: busqueda, activo: true, size: 12, sort: 'nombre,asc' }),
    placeholderData: keepPreviousData,
  })
  // Sin busqueda se muestran los mas vendidos de la tienda (si todavia no hay ventas, el catalogo)
  const frecuentes = useQuery({
    queryKey: ['productos', 'pos', 'frecuentes', tiendaId],
    queryFn: () => productosApi.frecuentes(tiendaId),
    enabled: tiendaId !== undefined,
    staleTime: 5 * 60_000,
  })
  const conFrecuentes = busqueda === '' && (frecuentes.data?.length ?? 0) > 0
  const visibles: ProductoResponse[] = useMemo(
    () => (conFrecuentes ? (frecuentes.data ?? []) : (productos.data?.contenido ?? [])),
    [conFrecuentes, frecuentes.data, productos.data],
  )

  // Stock en la tienda de la caja para los productos visibles y los del carrito
  const idsStock = useMemo(() => {
    // Incluye las piezas de los completos (Ej: la tuerca y la arandela del perno completo)
    const piezasVisibles = visibles.flatMap((p) =>
      p.completos.filter((c) => c.activo).flatMap((c) => c.componentes.map((x) => x.productoId)),
    )
    const ids = new Set<number>([
      ...visibles.map((p) => p.id),
      ...piezasVisibles,
      ...productosDelCarrito(carrito),
    ])
    return [...ids].sort((a, b) => a - b)
  }, [visibles, carrito])
  const stock = useQuery({
    queryKey: ['inventario', 'stock', 'pos', tiendaId, idsStock],
    queryFn: () => inventarioApi.stock({ ubicacionId: tiendaId, productoIds: idsStock, size: 100 }),
    enabled: tiendaId !== undefined && idsStock.length > 0,
    placeholderData: keepPreviousData,
  })
  // Disponibilidad en las otras tiendas y el almacen (solo lectura, para pedidos grandes)
  const idsVisibles = useMemo(() => visibles.map((p) => p.id), [visibles])
  const disponibilidad = useQuery({
    queryKey: ['inventario', 'resumen', 'pos', idsVisibles],
    queryFn: () => inventarioApi.resumen({ productoIds: idsVisibles, size: 100 }),
    enabled: idsVisibles.length > 0,
    placeholderData: keepPreviousData,
  })
  const otrasDe = (productoId: number) => {
    const resumen = disponibilidad.data?.contenido.find((r) => r.productoId === productoId)
    return resumen ? otrasUbicacionesConStock(resumen, tiendaId) : []
  }
  const productoDe = (productoId: number) => visibles.find((p) => p.id === productoId)
  const stockDe = (productoId: number) => stock.data?.contenido.find((s) => s.productoId === productoId)?.cantidad ?? 0
  const minimoDe = (productoId: number) => stock.data?.contenido.find((s) => s.productoId === productoId)?.stockMinimo ?? 0
  const totales = calcularTotales(carrito)
  // Unidad base que se lleva de cada producto, sumando sus lineas y las piezas de los completos
  const consumo = consumoPorProducto(carrito, totales.lineas)
  const baseEnCarrito = (productoId: number) => consumo.get(productoId) ?? 0
  const cobro = calcularCobro(totales.totalCentimos, condicion, pagos, metodos.data ?? [])
  const errorCliente = condicion === 'CREDITO' && !cliente ? 'Una venta a crédito necesita un cliente' : undefined
  const errorVencimiento = vencimiento && vencimiento < hoyLima() ? 'No puede ser anterior a hoy' : undefined
  const restante = condicion === 'CONTADO' ? cobro.faltaCentimos : Math.max(0, totales.totalCentimos - cobro.pagadoCentimos)

  const agregar = (producto: ProductoResponse, presentacionId: number) => {
    const p = producto.presentaciones.find((x) => x.id === presentacionId)
    if (!p) return
    setCarrito((actual) =>
      agregarAlCarrito(actual, {
        productoId: producto.id,
        productoNombre: producto.nombre,
        unidadBase: producto.unidadBase,
        presentacionId: p.id,
        presentacionNombre: p.nombre,
        factor: p.factor,
        decimales: p.decimales,
        precio: p.precioVenta,
      }),
    )
  }

  /** Completo: el producto con sus piezas (Ej: perno + tuerca + arandela), por unidades enteras. */
  const agregarCompleto = (producto: ProductoResponse, completo: CompletoResponse) => {
    setCarrito((actual) =>
      agregarAlCarrito(actual, {
        productoId: producto.id,
        productoNombre: producto.nombre,
        unidadBase: producto.unidadBase,
        presentacionId: null,
        completoId: completo.id,
        composicion: completo.composicion,
        piezas: completo.componentes.map((c) => ({ productoId: c.productoId, cantidadBase: c.cantidadBase })),
        presentacionNombre: completo.nombre,
        factor: 1,
        decimales: 0,
        precio: completo.precioVenta,
      }),
    )
  }

  const buscarPorCodigo = async () => {
    const codigo = texto.trim()
    if (!codigo) return
    setErrorCodigo(null)
    // Si coincide exactamente con un codigo de barras se agrega directo; si no, se queda la busqueda
    try {
      const producto = await productosApi.porCodigoBarras(codigo)
      const presentacion = producto.presentaciones.find((p) => p.codigoBarras === codigo && p.activo)
      if (presentacion && producto.activo) {
        agregar(producto, presentacion.id)
        setTexto('')
      }
    } catch (e) {
      if (aApiError(e).estado !== 404) setErrorCodigo(aApiError(e).message)
    }
  }

  const registrar = useMutation({
    mutationFn: () =>
      ventasApi.registrar({
        condicion,
        clienteId: cliente?.id ?? null,
        fechaVencimiento: condicion === 'CREDITO' && vencimiento ? vencimiento : null,
        detalles: aDetallesVenta(carrito),
        pagos: aPagosRequest(
          pagos.filter((p) => condicion === 'CONTADO' || p.monto.trim() !== ''),
          metodos.data ?? [],
        ),
      }),
    onSuccess: (venta) => {
      setVendida(venta)
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
      void queryClient.invalidateQueries({ queryKey: ['cajas'] })
      void queryClient.invalidateQueries({ queryKey: ['ventas'] })
      void queryClient.invalidateQueries({ queryKey: ['reportes'] })
      void queryClient.invalidateQueries({ queryKey: ['inicio'] })
    },
  })

  // En credito los pagos vacios no cuentan (adelanto opcional)
  const pagosCredito = pagos.filter((p) => p.monto.trim() !== '')
  const cobroFinal = condicion === 'CREDITO' ? calcularCobro(totales.totalCentimos, condicion, pagosCredito, metodos.data ?? []) : cobro
  const puedeCobrar = caja.data != null && totales.valido && cobroFinal.valido && !errorCliente && !errorVencimiento

  const cobrar = () => {
    setIntentado(true)
    if (puedeCobrar) registrar.mutate()
  }

  // Atajos de teclado: F2 va al buscador y F9 cobra (o registra la venta a credito)
  const cobrarConAtajo = useRef(cobrar)
  useEffect(() => {
    cobrarConAtajo.current = vendida ? () => undefined : cobrar
  })
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        buscador.current?.focus()
        buscador.current?.select()
      } else if (e.key === 'F9') {
        e.preventDefault()
        cobrarConAtajo.current()
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [])

  /** Pausa el carrito actual (el cliente fue a buscar dinero) para atender a otro. */
  const pausar = () => {
    if (carrito.length === 0) return
    const lista = ponerEnEspera(enEspera, { carrito, condicion, cliente, totalCentimos: totales.totalCentimos })
    if (!lista) {
      avisar(`Ya hay ${MAXIMO_EN_ESPERA} ventas en espera: retome o descarte una`, 'error')
      return
    }
    cambiarEnEspera(lista)
    limpiarCarrito()
    avisar('Venta en espera: puede atender al siguiente cliente')
  }

  /** Retoma una venta en espera; si hay un carrito en curso, ese pasa a espera (se intercambian). */
  const retomar = (id: string) => {
    const venta = enEspera.find((v) => v.id === id)
    if (!venta) return
    let resto = enEspera.filter((v) => v.id !== id)
    if (carrito.length > 0) {
      resto = ponerEnEspera(resto, { carrito, condicion, cliente, totalCentimos: totales.totalCentimos }) ?? resto
    }
    cambiarEnEspera(resto)
    setCarrito(venta.carrito)
    setCondicion(venta.condicion)
    setCliente(venta.cliente)
    setPagos([PAGO_INICIAL])
    setIntentado(false)
  }

  const limpiarCarrito = () => {
    setCarrito([])
    setCondicion('CONTADO')
    setCliente(null)
    setVencimiento('')
    setPagos([PAGO_INICIAL])
    setIntentado(false)
  }

  const nuevaVenta = () => {
    setVendida(null)
    setCarrito([])
    setCondicion('CONTADO')
    setCliente(null)
    setVencimiento('')
    setPagos([PAGO_INICIAL])
    setIntentado(false)
    registrar.reset()
    void productos.refetch()
    buscador.current?.focus()
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Punto de venta"
        subtitulo={caja.data ? `Vendiendo en ${caja.data.ubicacionNombre} · Caja N.° ${caja.data.id}` : 'Registra ventas al contado o a crédito'}
        acciones={
          <Boton variante="secundario" icono={<History className="size-4" />} onClick={() => navegar('/ventas/historial')}>
            Historial de ventas
          </Boton>
        }
      />

      {caja.data === null && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-alerta/30 bg-alerta-claro px-5 py-4" role="alert">
          <p className="text-sm text-tinta">
            <strong>Debes abrir tu caja antes de vender.</strong> Las ventas se registran en la caja abierta de tu usuario.
          </p>
          <Link to="/caja" className="inline-flex h-9 items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-sobre-marca hover:bg-marca-oscuro">
            <Wallet className="size-4" /> Abrir caja
          </Link>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Catalogo */}
        <Tarjeta className="self-start">
          <div className="border-b border-borde p-4">
            <div className="flex gap-2">
              <Buscador
                valor={texto}
                onCambiar={setTexto}
                placeholder="Buscar producto por nombre, código o código de barras…"
                aria-label="Buscar producto para vender"
                className="flex-1"
                autoFocus
                ref={buscador}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void buscarPorCodigo()
                }}
              />
              <span className="hidden flex-col justify-center text-[11px] leading-tight text-tinta-tenue md:flex">
                <span className="inline-flex items-center gap-1">
                  <ScanBarcode className="size-3.5" /> Enter = código de barras
                </span>
                <span>F2 buscar · F9 cobrar</span>
              </span>
            </div>
            {errorCodigo && <p className="mt-2 text-xs text-peligro">{errorCodigo}</p>}
          </div>
          {conFrecuentes && (
            <p className="border-b border-borde bg-marca-claro px-4 py-2 text-xs font-semibold tracking-wide text-tinta uppercase" data-testid="pos-frecuentes">
              Los más vendidos de tu tienda · escribe para buscar otros
            </p>
          )}
          {productos.isPending && !conFrecuentes && <Cargando />}
          {productos.isError && <MensajeError error={productos.error} className="m-4" />}
          {!conFrecuentes && productos.data?.contenido.length === 0 && <EstadoVacio titulo="Sin resultados" descripcion="Prueba con otro nombre o código." />}
          <ul className="grid sm:grid-cols-2">
            {visibles.map((producto) => {
              const disponible = stockDe(producto.id)
              return (
                <li key={producto.id} className="flex flex-col gap-3 border-b border-borde p-4 sm:odd:border-r" data-testid={`pos-producto-${producto.codigo}`}>
                  <div className="flex items-start gap-3">
                    <FotoProducto url={producto.imagenUrl} nombre={producto.nombre} className="size-12" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-tight font-semibold text-tinta">{producto.nombre}</p>
                      <p className="font-mono text-xs text-tinta-tenue">{producto.codigo}</p>
                      {tiendaId !== undefined && (
                        <p className={cn('mt-0.5 font-mono text-xs', disponible > 0 ? 'text-tinta-suave' : 'text-peligro')}>
                          Stock: {cantidadConUnidad(disponible, producto.unidadBase)}
                        </p>
                      )}
                      {otrasDe(producto.id).length > 0 && (
                        <p className="mt-0.5 text-xs text-tinta-tenue" data-testid={`pos-otras-${producto.codigo}`}>
                          También en:{' '}
                          {otrasDe(producto.id)
                            .map((u) => `${u.ubicacionNombre} ${cantidad(u.cantidad)}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {tiendaId !== undefined && disponible <= 0 && (
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={<PackageSearch className="size-4" />}
                      onClick={() => setEncargo({ producto, presentacionId: presentacionesActivas(producto)[0]?.id ?? 0 })}
                      aria-label={`Hacer encargo de ${producto.nombre}`}
                    >
                      Hacer encargo
                    </Boton>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {presentacionesActivas(producto).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => agregar(producto, p.id)}
                        className="inline-flex flex-col items-start rounded-lg border border-borde bg-crema/50 px-2.5 py-1.5 text-left transition-colors hover:border-marca hover:bg-marca-claro"
                        aria-label={`Agregar ${producto.nombre} ${p.nombre}`}
                      >
                        <span className="text-xs font-semibold text-tinta">{p.nombre}</span>
                        <span className="font-mono text-xs text-marca-texto">{soles(p.precioVenta)}</span>
                      </button>
                    ))}
                    {producto.completos
                      .filter((c) => c.activo && c.componentes.every((x) => x.disponible))
                      .map((c) => {
                        const alcanza = completosDisponibles(
                          c.componentes.map((x) => ({ productoId: x.productoId, cantidadBase: x.cantidadBase })),
                          stockDe,
                        )
                        return (
                          <button
                            key={`c${c.id}`}
                            type="button"
                            onClick={() => agregarCompleto(producto, c)}
                            title={`Incluye: ${c.composicion}`}
                            className="inline-flex flex-col items-start rounded-lg border-2 border-marca bg-marca-claro px-2.5 py-1.5 text-left transition-colors hover:bg-marca"
                            aria-label={`Agregar ${producto.nombre} ${c.nombre}`}
                            data-testid={`pos-completo-${c.id}`}
                          >
                            <span className="text-xs font-semibold text-tinta">{c.nombre}</span>
                            <span className="font-mono text-xs text-tinta">{soles(c.precioVenta)}</span>
                            {tiendaId !== undefined && (
                              <span className={cn('text-[11px]', alcanza > 0 ? 'text-tinta-suave' : 'text-peligro')}>Alcanza: {alcanza}</span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                </li>
              )
            })}
          </ul>
        </Tarjeta>

        {/* Carrito y cobro: en laptop queda fijo a la derecha con su propio desplazamiento */}
        <div className="flex flex-col gap-5 xl:sticky xl:top-[5.5rem] xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
          <Tarjeta>
            <TituloTarjeta
              titulo={`Carrito (${carrito.length})`}
              icono={<ShoppingCart className="size-4 text-marca-texto" />}
              accion={
                carrito.length > 0 && (
                  <div className="flex gap-1">
                    <Boton variante="secundario" tamano="sm" icono={<PauseCircle className="size-4" />} onClick={pausar}>
                      Poner en espera
                    </Boton>
                    <Boton variante="fantasma" tamano="sm" onClick={() => setCarrito([])}>
                      Vaciar
                    </Boton>
                  </div>
                )
              }
            />
            {enEspera.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-borde bg-marca-claro px-5 py-3" data-testid="ventas-en-espera">
                <p className="text-xs font-semibold tracking-wide text-tinta uppercase">En espera ({enEspera.length})</p>
                {enEspera.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{etiquetaEnEspera(v)}</span>
                    <span className="font-mono text-xs font-semibold">{solesDeCentimos(v.totalCentimos)}</span>
                    <Boton tamano="sm" icono={<PlayCircle className="size-4" />} onClick={() => retomar(v.id)} aria-label={`Retomar ${etiquetaEnEspera(v)}`}>
                      Retomar
                    </Boton>
                    <Boton variante="fantasma" tamano="sm" aria-label={`Descartar ${etiquetaEnEspera(v)}`} onClick={() => cambiarEnEspera(enEspera.filter((x) => x.id !== v.id))}>
                      <X className="size-4" />
                    </Boton>
                  </div>
                ))}
              </div>
            )}
            {carrito.length === 0 ? (
              <EstadoVacio titulo="Carrito vacío" descripcion="Elige una presentación del catálogo para agregarla." />
            ) : (
              <ul className="divide-y divide-borde">
                {carrito.map((linea, i) => {
                  const calculo = totales.lineas[i]
                  const decimales = linea.decimales > 0
                  const clave = claveLinea(linea)
                  const esCompleto = linea.completoId != null
                  const disponible = stockDe(linea.productoId)
                  // En un completo falta stock si alguna pieza no alcanza para todo el carrito
                  const sinStock =
                    tiendaId !== undefined &&
                    calculo !== undefined &&
                    (esCompleto
                      ? (linea.piezas ?? []).some((x) => baseEnCarrito(x.productoId) > stockDe(x.productoId))
                      : baseEnCarrito(linea.productoId) > disponible)
                  const aviso =
                    tiendaId !== undefined && stock.data && !esCompleto
                      ? avisoStockBajo(disponible, baseEnCarrito(linea.productoId), minimoDe(linea.productoId))
                      : null
                  const paso = (delta: number) => {
                    const actual = esDecimalValido(linea.cantidad, 3) ? Number(linea.cantidad.replace(',', '.')) : 0
                    const nuevo = Math.max(decimales ? 0.5 : 1, actual + delta)
                    setCarrito((c) => actualizarLinea(c, clave, { cantidad: String(Number(nuevo.toFixed(3))) }))
                  }
                  return (
                    <li key={clave} className="flex flex-col gap-2 px-5 py-3" data-testid={`carrito-linea-${i + 1}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm leading-tight font-semibold text-tinta">{linea.productoNombre}</p>
                          <p className="font-mono text-xs text-tinta-suave">
                            {linea.presentacionNombre} · {soles(linea.precio)}
                          </p>
                          {linea.composicion && <p className="text-[11px] text-tinta-tenue">Incluye: {linea.composicion}</p>}
                        </div>
                        <p className="font-mono text-sm font-bold text-tinta">{solesDeCentimos(calculo?.subtotalCentimos ?? 0)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-borde">
                          <button type="button" onClick={() => paso(-1)} className="p-2 text-tinta-suave hover:text-tinta" aria-label="Restar uno">
                            <Minus className="size-3.5" />
                          </button>
                          <input
                            aria-label={`Cantidad de ${linea.productoNombre} ${linea.presentacionNombre}`}
                            inputMode={decimales ? 'decimal' : 'numeric'}
                            value={linea.cantidad}
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, clave, { cantidad: e.target.value }))}
                            className="h-8 w-16 border-x border-borde text-center font-mono text-sm focus:outline-none"
                          />
                          <button type="button" onClick={() => paso(1)} className="p-2 text-tinta-suave hover:text-tinta" aria-label="Sumar uno">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-tinta-suave">
                          Desc. S/
                          <Entrada
                            aria-label={`Descuento de ${linea.productoNombre}`}
                            inputMode="decimal"
                            placeholder="0.00"
                            value={linea.descuento}
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, clave, { descuento: e.target.value }))}
                            className="h-8 w-20! font-mono"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setCarrito((c) => quitarLinea(c, clave))}
                          className="ml-auto rounded p-1.5 text-tinta-tenue hover:bg-peligro-claro hover:text-peligro"
                          aria-label={`Quitar ${linea.productoNombre}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs">
                        {calculo && calculo.cantidadBase > 0 && linea.factor !== 1 && (
                          <span className="font-mono text-tinta-tenue">= {cantidadConUnidad(calculo.cantidadBase, linea.unidadBase)}</span>
                        )}
                        {aviso && !sinStock && (
                          <span className="font-semibold text-alerta" role="status">
                            {aviso.agotado
                              ? 'Se agota con esta venta: pida reposición'
                              : `Quedarán ${cantidad(aviso.restante)} ${sufijoUnidad(linea.unidadBase)}: pida reposición`}
                          </span>
                        )}
                        {(aviso || sinStock) && productoDe(linea.productoId) && (
                          <button
                            type="button"
                            className="font-semibold text-marca-texto underline"
                            onClick={() => setPedido(productoDe(linea.productoId) ?? null)}
                          >
                            Pedir reposición
                          </button>
                        )}
                        {sinStock && esCompleto && (
                          <span className="text-peligro">
                            Stock insuficiente: alcanza para{' '}
                            {completosDisponibles(linea.piezas ?? [], stockDe)} {linea.presentacionNombre.toLowerCase()}
                          </span>
                        )}
                        {sinStock && !esCompleto && (
                          <span className="text-peligro">
                            Stock insuficiente (hay {cantidad(disponible)} {sufijoUnidad(linea.unidadBase)})
                          </span>
                        )}
                        {sinStock && !esCompleto && linea.presentacionId !== null && productoDe(linea.productoId) && (
                          <button
                            type="button"
                            className="font-semibold text-marca-texto underline"
                            onClick={() => {
                              const producto = productoDe(linea.productoId)
                              if (producto && linea.presentacionId !== null) setEncargo({ producto, presentacionId: linea.presentacionId })
                            }}
                          >
                            Hacer encargo
                          </button>
                        )}
                        {calculo?.error && <span className="text-peligro">{calculo.error}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <dl className="space-y-1 border-t border-borde bg-crema/50 px-5 py-4 text-sm">
              <div className="flex justify-between text-tinta-suave">
                <dt>Op. gravada</dt>
                <dd className="font-mono">{solesDeCentimos(totales.baseCentimos)}</dd>
              </div>
              <div className="flex justify-between text-tinta-suave">
                <dt>IGV (18 %)</dt>
                <dd className="font-mono">{solesDeCentimos(totales.igvCentimos)}</dd>
              </div>
              {totales.descuentoCentimos > 0 && (
                <div className="flex justify-between text-tinta-suave">
                  <dt>Descuentos</dt>
                  <dd className="font-mono">−{solesDeCentimos(totales.descuentoCentimos)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-lg font-bold text-tinta">
                <dt>Total</dt>
                <dd className="font-mono" data-testid="total-venta">
                  {solesDeCentimos(totales.totalCentimos)}
                </dd>
              </div>
            </dl>
          </Tarjeta>

          <Tarjeta>
            <TituloTarjeta titulo="Cobro" icono={<Wallet className="size-4 text-marca-texto" />} />
            <div className="flex flex-col gap-4 p-5">
              <div role="radiogroup" aria-label="Condición de la venta" className="grid grid-cols-2 gap-1 rounded-xl bg-beige p-1">
                {(['CONTADO', 'CREDITO'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={condicion === c}
                    onClick={() => setCondicion(c)}
                    className={cn(
                      'h-9 rounded-lg text-sm font-semibold transition-colors',
                      condicion === c ? 'bg-white text-tinta shadow-sm' : 'text-tinta-suave hover:text-tinta',
                    )}
                  >
                    {c === 'CONTADO' ? 'Contado' : 'Crédito (fiado)'}
                  </button>
                ))}
              </div>

              <SelectorCliente valor={cliente} onElegir={setCliente} error={intentado ? errorCliente : undefined} />
              {condicion === 'CREDITO' && (
                <CampoTexto
                  etiqueta="Fecha de vencimiento (opcional)"
                  type="date"
                  min={hoyLima()}
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                  error={errorVencimiento}
                />
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-tinta-suave">
                  {condicion === 'CONTADO' ? 'Pagos' : 'Adelanto (opcional)'}
                </span>
                {condicion === 'CONTADO' && totales.totalCentimos > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Paga con">
                    <span className="text-xs text-tinta-suave">Paga con:</span>
                    {[totales.totalCentimos / 100, ...billetesSugeridos(totales.totalCentimos)].map((monto, i) => (
                      <button
                        key={monto}
                        type="button"
                        onClick={() => setPagos([{ metodoPago: 'EFECTIVO', monto: monto.toFixed(2), numeroOperacion: '' }])}
                        className="rounded-lg border border-borde bg-white px-2.5 py-1 font-mono text-sm font-semibold text-tinta hover:border-marca hover:bg-marca-claro"
                      >
                        {i === 0 ? 'Exacto' : `S/ ${monto}`}
                      </button>
                    ))}
                  </div>
                )}
                {metodos.data && (
                  <EditorPagos pagos={pagos} metodos={metodos.data} onCambiar={setPagos} restanteCentimos={restante} />
                )}
              </div>

              <dl className="space-y-1 rounded-xl bg-crema px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-tinta-suave">Pagado</dt>
                  <dd className="font-mono font-semibold">{solesDeCentimos(cobroFinal.pagadoCentimos)}</dd>
                </div>
                {condicion === 'CONTADO' ? (
                  cobro.faltaCentimos > 0 ? (
                    <div className="flex justify-between text-peligro">
                      <dt>Falta</dt>
                      <dd className="font-mono font-semibold">{solesDeCentimos(cobro.faltaCentimos)}</dd>
                    </div>
                  ) : (
                    <div className="flex justify-between text-lg font-bold text-exito">
                      <dt>Vuelto</dt>
                      <dd className="font-mono" data-testid="vuelto">
                        {solesDeCentimos(cobro.vueltoCentimos)}
                      </dd>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between text-lg font-bold text-alerta">
                    <dt>Queda como deuda</dt>
                    <dd className="font-mono" data-testid="saldo-credito">
                      {solesDeCentimos(cobroFinal.saldoCentimos)}
                    </dd>
                  </div>
                )}
              </dl>

              {intentado && !puedeCobrar && (
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-peligro" role="alert">
                  {!caja.data && <li>Abre tu caja para poder cobrar</li>}
                  {carrito.length === 0 && <li>Agrega productos al carrito</li>}
                  {carrito.length > 0 && !totales.valido && <li>Revisa las cantidades y descuentos del carrito</li>}
                  {errorCliente && <li>{errorCliente}</li>}
                  {cobroFinal.errores.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              {registrar.error && <MensajeError error={registrar.error} />}

              <Boton tamano="lg" onClick={cobrar} cargando={registrar.isPending} disabled={!caja.data} className="w-full">
                {condicion === 'CONTADO'
                  ? `Cobrar ${solesDeCentimos(totales.totalCentimos)}`
                  : `Registrar venta a crédito ${solesDeCentimos(totales.totalCentimos)}`}
              </Boton>
            </div>
          </Tarjeta>
        </div>
      </div>

      {vendida && (
        <Modal
          abierto
          onCerrar={nuevaVenta}
          titulo="Venta registrada"
          descripcion={`${vendida.numeroDocumento} · ${vendida.ubicacionNombre}`}
          ancho="sm"
          pie={
            <>
              <BotonImprimirVenta ventaId={vendida.id} numero={vendida.numeroDocumento} />
              <Boton variante="secundario" onClick={() => navegar(`/ventas/${vendida.id}`)}>
                Ver detalle
              </Boton>
              <Boton onClick={nuevaVenta}>Nueva venta</Boton>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-sm" data-testid="venta-registrada">
            <div className="flex justify-between">
              <span className="text-tinta-suave">Total</span>
              <span className="font-mono font-bold">{soles(vendida.total)}</span>
            </div>
            {vendida.condicion === 'CONTADO' ? (
              <div className="rounded-xl bg-exito-claro px-4 py-4 text-center">
                <p className="text-sm text-exito">Vuelto a entregar</p>
                <p className="font-mono text-3xl font-bold text-exito">{soles(vendida.vuelto)}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-alerta-claro px-4 py-4 text-center">
                <p className="text-sm text-alerta">Saldo pendiente de {vendida.clienteNombre}</p>
                <p className="font-mono text-3xl font-bold text-alerta">{soles(vendida.saldoPendiente)}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
      {pedido && <ModalPedidoReposicion productoInicial={pedido} tiendaInicial={tiendaId ?? null} onCerrar={() => setPedido(null)} />}
      {encargo && (
        <ModalEncargo
          producto={encargo.producto}
          presentacionId={encargo.presentacionId}
          ubicacionId={tiendaId ?? null}
          onCerrar={() => setEncargo(null)}
        />
      )}
    </div>
  )
}

/** Imprime la nota de venta recien registrada (con el logo y los datos de la empresa). */
function BotonImprimirVenta({ ventaId, numero }: { ventaId: number; numero: string }) {
  const pdf = useDocumentoPdf(() => ventasApi.pdf(ventaId), `${numero}.pdf`)
  const ticket = useDocumentoPdf(() => ventasApi.ticket(ventaId), `ticket-${numero}.pdf`)
  return (
    <>
      <Boton variante="secundario" icono={<Receipt className="size-4" />} cargando={ticket.imprimiendo} onClick={ticket.imprimir}>
        Ticket
      </Boton>
      <Boton variante="secundario" icono={<Printer className="size-4" />} cargando={pdf.imprimiendo} onClick={pdf.imprimir}>
        A4
      </Boton>
    </>
  )
}
