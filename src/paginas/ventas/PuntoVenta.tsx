import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Minus, Plus, ScanBarcode, ShoppingCart, Trash2, Wallet } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { productosApi } from '@/api/catalogo'
import { aApiError } from '@/api/errores'
import { inventarioApi } from '@/api/inventario'
import type { ClienteResponse, CondicionVenta, ProductoResponse, VentaResponse } from '@/api/tipos'
import { ventasApi } from '@/api/ventas'
import { EditorPagos } from '@/componentes/formularios/EditorPagos'
import { SelectorCliente } from '@/componentes/formularios/SelectorCliente'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { CampoTexto, Entrada } from '@/componentes/ui/Campo'
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
  calcularTotales,
  quitarLinea,
  type LineaCarrito,
} from '@/logica/carrito'
import { esDecimalValido } from '@/logica/decimales'
import { cantidad, cantidadConUnidad, hoyLima, soles, solesDeCentimos, sufijoUnidad } from '@/logica/formato'
import { aPagosRequest, calcularCobro, type PagoFormulario } from '@/logica/pagos'
import { permiteDecimales, presentacionesActivas } from '@/logica/presentaciones'

const PAGO_INICIAL: PagoFormulario = { metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }

/**
 * Punto de venta rapido: buscar producto, elegir presentacion, carrito con cantidades (decimales para kilo y
 * metro) y descuento, venta al contado o a credito, pago mixto y vuelto. La venta se emite en la tienda de la
 * caja abierta del usuario.
 */
export default function PuntoVenta() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
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
  const busqueda = useRetraso(texto.trim(), 250)
  const tiendaId = caja.data?.ubicacionId

  const productos = useQuery({
    queryKey: ['productos', 'pos', busqueda],
    queryFn: () => productosApi.listar({ texto: busqueda, activo: true, size: 12, sort: 'nombre,asc' }),
    placeholderData: keepPreviousData,
  })

  // Stock en la tienda de la caja para los productos visibles y los del carrito
  const idsStock = useMemo(() => {
    const ids = new Set<number>([...(productos.data?.contenido.map((p) => p.id) ?? []), ...carrito.map((l) => l.productoId)])
    return [...ids].sort((a, b) => a - b)
  }, [productos.data, carrito])
  const stock = useQuery({
    queryKey: ['inventario', 'stock', 'pos', tiendaId, idsStock],
    queryFn: () => inventarioApi.stock({ ubicacionId: tiendaId, productoIds: idsStock, size: 100 }),
    enabled: tiendaId !== undefined && idsStock.length > 0,
    placeholderData: keepPreviousData,
  })
  const stockDe = (productoId: number) => stock.data?.contenido.find((s) => s.productoId === productoId)?.cantidad ?? 0

  const totales = calcularTotales(carrito)
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
        precio: p.precioVenta,
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
          <Link to="/caja" className="inline-flex h-9 items-center gap-2 rounded-lg bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-oscuro">
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
              <span className="hidden items-center gap-1 text-xs text-tinta-tenue md:flex">
                <ScanBarcode className="size-4" /> Enter = código de barras
              </span>
            </div>
            {errorCodigo && <p className="mt-2 text-xs text-peligro">{errorCodigo}</p>}
          </div>
          {productos.isPending && <Cargando />}
          {productos.isError && <MensajeError error={productos.error} className="m-4" />}
          {productos.data?.contenido.length === 0 && <EstadoVacio titulo="Sin resultados" descripcion="Prueba con otro nombre o código." />}
          <ul className="grid gap-px bg-borde sm:grid-cols-2">
            {productos.data?.contenido.map((producto) => {
              const disponible = stockDe(producto.id)
              return (
                <li key={producto.id} className="flex flex-col gap-3 bg-white p-4" data-testid={`pos-producto-${producto.codigo}`}>
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

        {/* Carrito y cobro */}
        <div className="flex flex-col gap-5">
          <Tarjeta>
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
                  const disponible = stockDe(linea.productoId)
                  const sinStock = tiendaId !== undefined && calculo !== undefined && calculo.cantidadBase > disponible
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
                            {linea.presentacionNombre} · {soles(linea.precio)}
                          </p>
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
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, linea.presentacionId, { cantidad: e.target.value }))}
                            className="h-8 w-16 border-x border-borde text-center font-mono text-sm focus:outline-none"
                          />
                          <button type="button" onClick={() => paso(1)} className="p-2 text-tinta-suave hover:text-tinta" aria-label="Sumar uno">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <label className="flex items-center gap-1 text-xs text-tinta-suave">
                          Desc. S/
                          <Entrada
                            aria-label={`Descuento de ${linea.productoNombre}`}
                            inputMode="decimal"
                            placeholder="0.00"
                            value={linea.descuento}
                            onChange={(e) => setCarrito((c) => actualizarLinea(c, linea.presentacionId, { descuento: e.target.value }))}
                            className="h-8 w-20 font-mono"
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
                        {sinStock && (
                          <span className="text-peligro">
                            Stock insuficiente (hay {cantidad(disponible)} {sufijoUnidad(linea.unidadBase)})
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
    </div>
  )
}
