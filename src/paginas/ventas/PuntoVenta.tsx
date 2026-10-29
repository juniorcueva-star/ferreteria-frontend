import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Minus, Plus, ScanBarcode, ShoppingCart, Trash2, Wallet } from 'lucide-react'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { productosApi } from '@/api/catalogo'
import { aApiError } from '@/api/errores'
import { inventarioApi } from '@/api/inventario'
import type { ClienteResponse, CondicionVenta, PresentacionResponse, ProductoResponse, VentaResponse } from '@/api/tipos'
import { clientesApi, cotizacionesApi, ventasApi } from '@/api/ventas'
import { EditorPagos } from '@/componentes/formularios/EditorPagos'
import { SelectorCliente } from '@/componentes/formularios/SelectorCliente'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { CampoTexto, Entrada, Selector } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { FotoProducto } from '@/componentes/ui/FotoProducto'
import { Modal } from '@/componentes/ui/Modal'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useCajaActual } from '@/hooks/useCajaActual'
import { useMetodosPago } from '@/hooks/useMetodosPago'
import { useRetraso } from '@/hooks/useRetraso'
import {
  actualizarLinea,
  agregarAlCarrito,
  aDetallesVenta,
  cambiarPresentacion,
  calcularTotales,
  quitarLinea,
  type LineaCarrito,
} from '@/logica/carrito'
import { esDecimalValido } from '@/logica/decimales'
import { crearColaEscaneos, presentacionEscaneada } from '@/logica/escaneo'
import { cantidad, cantidadConUnidad, hoyLima, soles, solesDeCentimos, sufijoUnidad } from '@/logica/formato'
import { aPagosRequest, calcularCobro, type PagoFormulario } from '@/logica/pagos'
import { permiteDecimales, presentacionesActivas, textoChip } from '@/logica/presentaciones'

const PAGO_INICIAL: PagoFormulario = { metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }

/**
 * Punto de venta rapido: buscar producto, elegir presentacion, carrito con cantidades (decimales para kilo y
 * metro) y descuento, venta al contado o a credito, pago mixto y vuelto. La venta se emite en la tienda de la
 * caja abierta del usuario.
 */
export default function PuntoVenta() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const cotizacionId = Number(parametros.get('cotizacionId'))
  const desdeCotizacion = Number.isInteger(cotizacionId) && cotizacionId > 0
  const queryClient = useQueryClient()
  const caja = useCajaActual()
  const metodos = useMetodosPago()
  const buscador = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [productosEnCarrito, setProductosEnCarrito] = useState<Record<number, ProductoResponse>>({})
  const [condicion, setCondicion] = useState<CondicionVenta>('CONTADO')
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [vencimiento, setVencimiento] = useState('')
  const [pagos, setPagos] = useState<PagoFormulario[]>([PAGO_INICIAL])
  const [intentado, setIntentado] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null)
  const [escaneado, setEscaneado] = useState<{ producto: ProductoResponse; presentacion: PresentacionResponse } | null>(null)
  const [vendida, setVendida] = useState<VentaResponse | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  const [cambioPresentacion, setCambioPresentacion] = useState<{ linea: LineaCarrito; presentacion: PresentacionResponse } | null>(null)
  const colaEscaneos = useRef<ReturnType<typeof crearColaEscaneos> | null>(null)
  const busqueda = useRetraso(texto.trim(), 250)
  const tiendaId = caja.data?.ubicacionId
  const cotizacion = useQuery({ queryKey: ['cotizaciones', 'detalle', cotizacionId], queryFn: () => cotizacionesApi.obtener(cotizacionId), enabled: desdeCotizacion })
  const clienteCotizacion = useQuery({ queryKey: ['clientes', cotizacion.data?.clienteId], queryFn: () => clientesApi.obtener(cotizacion.data!.clienteId), enabled: desdeCotizacion && cotizacion.data !== undefined })

  useEffect(() => {
    if (!cotizacion.data || !clienteCotizacion.data) return
    startTransition(() => {
      setCliente(clienteCotizacion.data)
      setCarrito(cotizacion.data.detalles.map((d) => ({ productoId: d.productoId, productoNombre: d.descripcion.split(' - ')[0] ?? d.descripcion, unidadBase: d.unidadBase, presentacionId: d.presentacionId, presentacionNombre: d.descripcion.split(' - ').slice(1).join(' - '), factor: d.factor, precio: d.precioUnitario, cantidad: String(d.cantidad), descuento: d.descuento ? String(d.descuento) : '', descuentoPorcentaje: d.ajustePorcentaje && d.ajustePorcentaje < 0 ? String(-d.ajustePorcentaje) : '', incrementoPorcentaje: d.ajustePorcentaje && d.ajustePorcentaje > 0 ? String(d.ajustePorcentaje) : '' })))
    })
  }, [cotizacion.data, clienteCotizacion.data])

  const productos = useQuery({
    queryKey: ['productos', 'pos', busqueda],
    queryFn: ({ signal }) => productosApi.listar({ texto: busqueda, activo: true, size: 12, sort: 'nombre,asc' }, signal),
    placeholderData: keepPreviousData,
  })

  // Stock en la tienda de la caja para los productos visibles y los del carrito
  const idsStock = useMemo(() => {
    const ids = new Set<number>([...(productos.data?.contenido.map((p) => p.id) ?? []), ...carrito.map((l) => l.productoId)])
    return [...ids].sort((a, b) => a - b)
  }, [productos.data, carrito])
  const stock = useQuery({
    queryKey: ['inventario', 'stock', 'pos', tiendaId, idsStock],
    queryFn: ({ signal }) => inventarioApi.stock({ ubicacionId: tiendaId, productoIds: idsStock, size: 100 }, signal),
    enabled: tiendaId !== undefined && idsStock.length > 0,
    placeholderData: keepPreviousData,
  })
  const stockDe = (productoId: number) => stock.data?.contenido.find((s) => s.productoId === productoId)?.cantidad ?? 0
  const disponibilidad = useQuery({
    queryKey: ['inventario', 'stock', 'pos', 'ubicaciones', idsStock],
    queryFn: ({ signal }) => inventarioApi.disponibilidad(idsStock, signal),
    enabled: idsStock.length > 0,
  })

  const totales = calcularTotales(carrito)
  const cantidadPorProducto = new Map<number, number>()
  carrito.forEach((linea, i) => {
    const cantidadBase = totales.lineas[i]?.cantidadBase ?? 0
    cantidadPorProducto.set(linea.productoId, (cantidadPorProducto.get(linea.productoId) ?? 0) + Math.round(cantidadBase * 1000))
  })
  const cobro = calcularCobro(totales.totalCentimos, condicion, pagos, metodos.data ?? [])
  const errorCliente = condicion === 'CREDITO' && !cliente ? 'Una venta a crédito necesita un cliente' : undefined
  const errorVencimiento = vencimiento && vencimiento < hoyLima() ? 'No puede ser anterior a hoy' : undefined
  const restante = condicion === 'CONTADO' ? cobro.faltaCentimos : Math.max(0, totales.totalCentimos - cobro.pagadoCentimos)

  const agregar = (producto: ProductoResponse, presentacionId: number) => {
    if (desdeCotizacion) return
    const p = producto.presentaciones.find((x) => x.id === presentacionId)
    if (!p) return
    setProductosEnCarrito((actual) => ({ ...actual, [producto.id]: producto }))
    setCarrito((actual) =>
      agregarAlCarrito(actual, {
        productoId: producto.id,
        productoNombre: producto.nombre,
        unidadBase: producto.unidadBase,
        presentacionId: p.id,
        presentacionNombre: p.nombre,
        factor: p.factor,
        precio: p.precioVenta,
      }),
    )
  }

  if (colaEscaneos.current === null) {
    colaEscaneos.current = crearColaEscaneos(async (codigo) => {
      setEscaneando(true)
      setErrorCodigo(null)
      setEscaneado(null)
      try {
        const producto = await productosApi.porCodigoBarras(codigo)
        const presentacion = presentacionEscaneada(producto, codigo)
        if (!presentacion) {
          setErrorCodigo('El código no corresponde a una presentación activa.')
          return
        }
        agregar(producto, presentacion.id)
        setEscaneado({ producto, presentacion })
      } catch (e) {
        setErrorCodigo(aApiError(e).message)
      } finally {
        setEscaneando(false)
        buscador.current?.focus()
      }
    })
  }

  const buscarPorCodigo = () => {
    const codigo = texto.trim()
    if (!codigo) return
    setTexto('')
    colaEscaneos.current?.encolar(codigo)
  }

  const registrar = useMutation({
    mutationFn: () =>
      desdeCotizacion
        ? ventasApi.registrarDesdeCotizacion(cotizacionId, {
            condicion,
            fechaVencimiento: condicion === 'CREDITO' && vencimiento ? vencimiento : null,
            pagos: aPagosRequest(pagos.filter((p) => condicion === 'CONTADO' || p.monto.trim() !== ''), metodos.data ?? []),
          })
        : ventasApi.registrar({
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
      void queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
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

  const nuevaVenta = () => {
    if (desdeCotizacion) {
      navegar('/ventas')
      return
    }
    setVendida(null)
    setCarrito([])
    setProductosEnCarrito({})
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
        subtitulo={desdeCotizacion && cotizacion.data ? `Cotización ${cotizacion.data.codigo}: snapshots acordados bloqueados` : caja.data ? `Vendiendo en ${caja.data.ubicacionNombre} · Caja N.° ${caja.data.id}` : 'Registra ventas al contado o a crédito'}
        acciones={
          <Boton variante="secundario" icono={<History className="size-4" />} onClick={() => navegar('/ventas/historial')}>
            Historial de ventas
          </Boton>
        }
      />
      {cotizacion.isError && <MensajeError error={cotizacion.error} className="mb-4" />}
      {desdeCotizacion && cotizacion.data && <div className="mb-4 rounded-xl border border-marca/30 bg-marca-claro px-4 py-3 text-sm">Venta desde cotización {cotizacion.data.codigo}. Cantidades, presentaciones, precios y ajustes se confirman desde el servidor.</div>}

      {caja.data === null && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-alerta/30 bg-alerta-claro px-5 py-4" role="alert">
          <p className="text-sm text-tinta">
            <strong>Debes abrir tu caja antes de vender.</strong> Las ventas se registran en la caja abierta de tu usuario.
          </p>
          <Link to="/caja" className="inline-flex h-9 items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-black hover:bg-marca-oscuro">
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
                  placeholder="Escanear código o buscar producto…"
                  aria-label="Escanear código de barras o buscar producto"
                  className="flex-1"
                  autoFocus
                  ref={buscador}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      buscarPorCodigo()
                    }
                  }}
                />
                <Boton variante="secundario" onClick={() => buscador.current?.focus()} className="hidden md:inline-flex">
                  <ScanBarcode className="size-4" /> Escanear
                </Boton>
              </div>
             <p className="mt-2 text-xs text-tinta-tenue">El lector USB escribe el código y envía Enter. Las lecturas consecutivas se procesan en orden.</p>
             {escaneando && <p className="mt-2 text-xs text-marca" role="status">Leyendo código de barras…</p>}
             {errorCodigo && <p className="mt-2 text-xs text-peligro" role="alert">{errorCodigo}</p>}
            {escaneado && (
              <div className="mt-3 rounded-xl border border-exito/30 bg-exito-claro px-3 py-2 text-xs" data-testid="escaneo-encontrado" role="status">
                <p className="font-semibold text-exito">Producto agregado: {escaneado.producto.nombre}</p>
                <p className="mt-1 font-mono text-tinta-suave">
                  {textoChip(escaneado.presentacion, escaneado.producto.unidadBase)} · {soles(escaneado.presentacion.precioVenta)} · Stock disponible:{' '}
                  {cantidadConUnidad(stockDe(escaneado.producto.id), escaneado.producto.unidadBase)}
                </p>
              </div>
            )}
          </div>
          {productos.isPending && <Cargando />}
          {productos.isError && <MensajeError error={productos.error} className="m-4" />}
          {disponibilidad.isError && <p role="status" className="m-4 text-sm text-peligro">No se pudo consultar el stock de otras ubicaciones.</p>}
          {productos.data?.contenido.length === 0 && <EstadoVacio titulo="Sin resultados" descripcion="Prueba con otro nombre o código." />}
          <ul className="grid sm:grid-cols-2">
            {productos.data?.contenido.map((producto) => {
              const disponible = stockDe(producto.id)
              const ubicacionesProducto = (disponibilidad.data ?? []).filter((s) => s.productoId === producto.id)
              const otrasUbicaciones = ubicacionesProducto.filter((s) => s.ubicacionId !== tiendaId && s.cantidad > 0)
              const totalRedMilesimas = ubicacionesProducto.reduce((total, s) => total + Math.round(s.cantidad * 1000), 0)
              return (
                <li key={producto.id} className="flex flex-col gap-3 border-b border-borde p-4 sm:odd:border-r" data-testid={`pos-producto-${producto.codigo}`}>
                  <div className="flex items-start gap-3">
                    <FotoProducto url={producto.imagenUrl} nombre={producto.nombre} className="size-12" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-tight font-semibold text-tinta">{producto.nombre}</p>
                      <p className="font-mono text-xs text-tinta-tenue">{producto.codigo}</p>
                      {tiendaId !== undefined && (
                        <p className={cn('mt-0.5 font-mono text-xs', disponible > 0 ? 'text-tinta-suave' : 'text-peligro')}>
                          Stock: {stock.isError ? 'no disponible' : stock.isPending || stock.isPlaceholderData ? 'consultando…' : cantidadConUnidad(disponible, producto.unidadBase)}
                        </p>
                      )}
                      {disponibilidad.data && ubicacionesProducto.length > 0 && (
                        <p className="mt-1 text-xs text-tinta-suave">Total en ubicaciones: {cantidadConUnidad(totalRedMilesimas / 1000, producto.unidadBase)}</p>
                      )}
                      {otrasUbicaciones.length > 0 && (
                        <p className="mt-1 text-xs text-tinta-tenue">
                          Otras ubicaciones: {otrasUbicaciones.map((s) => `${s.ubicacionNombre} ${cantidadConUnidad(s.cantidad, producto.unidadBase)}`).join(' · ')}
                        </p>
                      )}
                      {stock.isSuccess && !stock.isPlaceholderData && disponible <= 0 && otrasUbicaciones.length > 0 && (
                        <p className="mt-1 text-xs text-alerta">Para vender aquí se requiere traslado o reposición.</p>
                      )}
                    </div>
                  </div>
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
                        <span className="font-mono text-xs text-marca-oscuro">{soles(p.precioVenta)}</span>
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </Tarjeta>

        {/* Carrito y cobro: en laptop queda fijo a la derecha con su propio desplazamiento */}
        <div className="flex flex-col gap-5 xl:sticky xl:top-[5.5rem] xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
          <Tarjeta className={desdeCotizacion ? 'pointer-events-none opacity-85' : undefined}>
            <TituloTarjeta
              titulo={`Carrito (${carrito.length})`}
              icono={<ShoppingCart className="size-4 text-marca" />}
              accion={
                carrito.length > 0 && (
                  <Boton variante="fantasma" tamano="sm" onClick={() => setCarrito([])}>
                    Vaciar
                  </Boton>
                )
              }
            />
            {carrito.length === 0 ? (
              <EstadoVacio titulo="Carrito vacío" descripcion="Elige una presentación del catálogo para agregarla." />
            ) : (
              <ul className="divide-y divide-borde">
                {carrito.map((linea, i) => {
                  const calculo = totales.lineas[i]
                  const decimales = permiteDecimales(linea.unidadBase)
                  const admiteFraccionComercial = decimales || linea.factor !== 1
                  const producto = productosEnCarrito[linea.productoId]
                  const presentaciones = producto ? presentacionesActivas(producto) : []
                  const disponible = stockDe(linea.productoId)
                  const sinStock = tiendaId !== undefined && stock.isSuccess && !stock.isPlaceholderData && calculo !== undefined && (cantidadPorProducto.get(linea.productoId) ?? 0) > Math.round(disponible * 1000)
                  const paso = (delta: number) => {
                    const actual = esDecimalValido(linea.cantidad, 3) ? Number(linea.cantidad.replace(',', '.')) : 0
                    const nuevo = Math.max(decimales ? 0.5 : 1, actual + delta)
                    setCarrito((c) => actualizarLinea(c, linea.presentacionId, { cantidad: String(Number(nuevo.toFixed(3))) }))
                  }
                  return (
                    <li key={linea.presentacionId} className="flex flex-col gap-2 px-5 py-3" data-testid={`carrito-linea-${i + 1}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm leading-tight font-semibold text-tinta">{linea.productoNombre}</p>
                          <p className="font-mono text-xs text-tinta-suave">
                            {linea.presentacionNombre} · Precio original {soles(linea.precio)}
                          </p>
                          {presentaciones.length > 1 && (
                            <label className="mt-1 flex items-center gap-2 text-xs text-tinta-suave">
                              Presentación
                              <Selector
                                aria-label={`Presentación de ${linea.productoNombre}`}
                                value={linea.presentacionId}
                                onChange={(e) => {
                                  const presentacion = presentaciones.find((p) => p.id === Number(e.target.value))
                                  if (presentacion && presentacion.id !== linea.presentacionId) setCambioPresentacion({ linea, presentacion })
                                }}
                                className="h-8 w-44 py-0 font-mono text-xs"
                              >
                                {presentaciones.map((p) => {
                                  const yaEnCarrito = p.id !== linea.presentacionId && carrito.some((l) => l.presentacionId === p.id)
                                  return (
                                    <option key={p.id} value={p.id} disabled={yaEnCarrito}>
                                      {textoChip(p, linea.unidadBase)} · {soles(p.precioVenta)}{yaEnCarrito ? ' (en carrito)' : ''}
                                    </option>
                                  )
                                })}
                              </Selector>
                            </label>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[11px] text-tinta-tenue">Importe {solesDeCentimos(calculo?.importeCentimos ?? 0)}</p>
                          <p className="font-mono text-sm font-bold text-tinta">{solesDeCentimos(calculo?.subtotalCentimos ?? 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-borde">
                          <button type="button" onClick={() => paso(-1)} className="p-2 text-tinta-suave hover:text-tinta" aria-label="Restar uno">
                            <Minus className="size-3.5" />
                          </button>
                          <input
                            aria-label={`Cantidad de ${linea.productoNombre} ${linea.presentacionNombre}`}
                            inputMode={admiteFraccionComercial ? 'decimal' : 'numeric'}
                            value={linea.cantidad}
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, linea.presentacionId, { cantidad: e.target.value }))}
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
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, linea.presentacionId, { descuento: e.target.value, descuentoPorcentaje: '', incrementoPorcentaje: '' }))}
                            className="h-8 w-20! font-mono"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-tinta-suave">
                          Desc. %
                          <Entrada
                            aria-label={`Descuento porcentual de ${linea.productoNombre}`}
                            inputMode="decimal"
                            placeholder="0"
                            value={linea.descuentoPorcentaje}
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, linea.presentacionId, { descuento: '', descuentoPorcentaje: e.target.value, incrementoPorcentaje: '' }))}
                            className="h-8 w-16! font-mono"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-tinta-suave">
                          Inc. %
                          <Entrada
                            aria-label={`Incremento porcentual de ${linea.productoNombre}`}
                            inputMode="decimal"
                            placeholder="0"
                            value={linea.incrementoPorcentaje}
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, linea.presentacionId, { descuento: '', descuentoPorcentaje: '', incrementoPorcentaje: e.target.value }))}
                            className="h-8 w-16! font-mono"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setCarrito((c) => quitarLinea(c, linea.presentacionId))}
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
                        {calculo && calculo.ajustePorcentaje !== null && (
                          <span className={calculo.ajustePorcentaje < 0 ? 'text-peligro' : 'text-exito'}>
                            {calculo.ajustePorcentaje < 0 ? 'Descuento' : 'Incremento'} {Math.abs(calculo.ajustePorcentaje)} %
                          </span>
                        )}
                        {sinStock && (
                          <span className="text-peligro">
                            Stock insuficiente entre las presentaciones (hay {cantidad(disponible)} {sufijoUnidad(linea.unidadBase)})
                          </span>
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
              {totales.incrementoCentimos > 0 && (
                <div className="flex justify-between text-tinta-suave">
                  <dt>Incrementos</dt>
                  <dd className="font-mono">+{solesDeCentimos(totales.incrementoCentimos)}</dd>
                </div>
              )}
              <div className="flex justify-between text-xs text-tinta-tenue">
                <dt>Ajuste general</dt>
                <dd>Disponible cuando se definan impuestos, orden y autorizaciones.</dd>
              </div>
              <div className="flex justify-between pt-1 text-lg font-bold text-tinta">
                <dt>Total</dt>
                <dd className="font-mono" data-testid="total-venta">
                  {solesDeCentimos(totales.totalCentimos)}
                </dd>
              </div>
            </dl>
          </Tarjeta>

          <Tarjeta>
            <TituloTarjeta titulo="Cobro" icono={<Wallet className="size-4 text-marca" />} />
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
                      condicion === c ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-suave hover:text-tinta',
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
      {cambioPresentacion && (() => {
        const nuevaLinea = {
          ...cambioPresentacion.linea,
          presentacionId: cambioPresentacion.presentacion.id,
          presentacionNombre: cambioPresentacion.presentacion.nombre,
          factor: cambioPresentacion.presentacion.factor,
          precio: cambioPresentacion.presentacion.precioVenta,
        }
        const equivalente = calcularTotales([nuevaLinea]).lineas[0]
        return (
          <Modal
            abierto
            onCerrar={() => setCambioPresentacion(null)}
            titulo="Cambiar presentación"
            descripcion="La cantidad escrita se conserva y se recalcula con el nuevo factor y precio."
            ancho="sm"
            pie={
              <>
                <Boton variante="secundario" onClick={() => setCambioPresentacion(null)}>Cancelar</Boton>
                <Boton
                  onClick={() => {
                    setCarrito((actual) =>
                      cambiarPresentacion(actual, cambioPresentacion.linea.presentacionId, {
                        productoId: cambioPresentacion.linea.productoId,
                        productoNombre: cambioPresentacion.linea.productoNombre,
                        unidadBase: cambioPresentacion.linea.unidadBase,
                        presentacionId: cambioPresentacion.presentacion.id,
                        presentacionNombre: cambioPresentacion.presentacion.nombre,
                        factor: cambioPresentacion.presentacion.factor,
                        precio: cambioPresentacion.presentacion.precioVenta,
                      }),
                    )
                    setCambioPresentacion(null)
                  }}
                >
                  Confirmar cambio
                </Boton>
              </>
            }
          >
            <div className="space-y-2 text-sm">
              <p>
                {cambioPresentacion.linea.presentacionNombre} a <strong>{cambioPresentacion.presentacion.nombre}</strong> · {soles(cambioPresentacion.presentacion.precioVenta)}
              </p>
              <p className="font-mono text-tinta-suave">
                {cambioPresentacion.linea.cantidad} presentación(es) = {cantidadConUnidad(equivalente?.cantidadBase ?? 0, cambioPresentacion.linea.unidadBase)}
              </p>
              {cambioPresentacion.linea.descuento && <p className="text-tinta-suave">Se conserva el descuento monetario actual: S/ {cambioPresentacion.linea.descuento}.</p>}
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
