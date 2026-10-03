import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeftRight,
  HandCoins,
  PackagePlus,
  Receipt,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { comprasApi } from '@/api/compras'
import { trasladosApi } from '@/api/inventario'
import { reportesApi } from '@/api/reportes'
import { useUsuario } from '@/auth/contexto'
import { tienePermiso } from '@/auth/permisos'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio } from '@/componentes/ui/Estados'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { useCajaActual } from '@/hooks/useCajaActual'
import { cantidadConUnidad, fecha, fechaHora, hoyLima, soles } from '@/logica/formato'

/** Fecha desde la que se suman las deudas (todas las ventas a credito con saldo). */
const DESDE_SIEMPRE = '2000-01-01'

function saludo(): string {
  const hora = Number(new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }).format(new Date()))
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Resumen del dia segun el rol: ventas, caja, stock bajo, traslados por recibir y deudas. */
export default function Inicio() {
  const usuario = useUsuario()
  const { seleccionadaId, seleccionada } = useUbicacion()
  const hoy = hoyLima()
  const rol = usuario.rol
  const ubicacionId = seleccionadaId ?? undefined
  const venden = tienePermiso(rol, 'reportes.ventas')
  const compran = tienePermiso(rol, 'compras.ver')

  const ventasHoy = useQuery({
    queryKey: ['inicio', 'ventas', hoy, ubicacionId],
    queryFn: () => reportesApi.ventasPorTienda({ desde: hoy, hasta: hoy, ubicacionId, size: 50 }),
    enabled: venden,
  })
  const deudas = useQuery({
    queryKey: ['inicio', 'deudas', hoy, ubicacionId],
    queryFn: () => reportesApi.ventasPorTienda({ desde: DESDE_SIEMPRE, hasta: hoy, ubicacionId, size: 50 }),
    enabled: venden,
  })
  const caja = useCajaActual(tienePermiso(rol, 'caja.usar'))
  const stockBajo = useQuery({
    queryKey: ['reportes', 'stock-bajo', 'inicio', ubicacionId],
    queryFn: () => reportesApi.stockBajo({ ubicacionId, size: 5 }),
  })
  const porRecibir = useQuery({
    queryKey: ['traslados', 'inicio', 'en-camino', ubicacionId, rol],
    queryFn: () =>
      trasladosApi.listar({
        estado: 'ENVIADO',
        // El vendedor recibe en su tienda; el almacenero ve lo que envio; el ADMIN filtra por la ubicacion elegida
        destinoId: rol === 'VENDEDOR' ? ubicacionId : undefined,
        ubicacionId: rol === 'VENDEDOR' ? undefined : ubicacionId,
        size: 5,
      }),
  })
  const comprasHoy = useQuery({
    queryKey: ['compras', 'inicio', hoy, ubicacionId],
    queryFn: () => comprasApi.listar({ desde: hoy, hasta: hoy, ubicacionId, estado: 'REGISTRADA', size: 5 }),
    enabled: compran,
  })

  const sumar = (filas: { totalVendido: number; cantidadVentas: number; saldoPendiente: number }[] | undefined) => ({
    total: filas?.reduce((s, f) => s + f.totalVendido, 0) ?? 0,
    cantidad: filas?.reduce((s, f) => s + f.cantidadVentas, 0) ?? 0,
    saldo: filas?.reduce((s, f) => s + f.saldoPendiente, 0) ?? 0,
  })
  const ventas = sumar(ventasHoy.data?.contenido)
  const deuda = sumar(deudas.data?.contenido)

  return (
    <div>
      <EncabezadoPagina
        titulo={`${saludo()}, ${usuario.nombres.split(' ')[0]}`}
        subtitulo={`Resumen de hoy, ${fecha(hoy)} · ${seleccionada?.nombre ?? 'Todas las ubicaciones'}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {venden && (
          <Indicador
            icono={ShoppingBag}
            titulo="Ventas de hoy"
            valor={ventasHoy.isPending ? '…' : soles(ventas.total)}
            detalle={`${ventas.cantidad} ${ventas.cantidad === 1 ? 'venta emitida' : 'ventas emitidas'}`}
            enlace={{ a: '/ventas/historial', texto: 'Ver ventas' }}
            testid="indicador-ventas"
          />
        )}
        {tienePermiso(rol, 'caja.usar') && (
          <Indicador
            icono={Wallet}
            titulo="Mi caja"
            valor={caja.isPending ? '…' : caja.data ? 'Abierta' : 'Cerrada'}
            tono={caja.data ? 'exito' : 'alerta'}
            mono={false}
            detalle={
              caja.data
                ? `${caja.data.ubicacionNombre} · desde ${fechaHora(caja.data.fechaApertura)}`
                : 'Ábrela para empezar a vender'
            }
            enlace={{ a: '/caja', texto: caja.data ? 'Ver resumen' : 'Abrir caja' }}
            testid="indicador-caja"
          />
        )}
        {compran && (
          <Indicador
            icono={PackagePlus}
            titulo="Compras de hoy"
            valor={comprasHoy.isPending ? '…' : String(comprasHoy.data?.totalElementos ?? 0)}
            detalle="comprobantes registrados"
            enlace={{ a: '/compras', texto: 'Ver compras' }}
          />
        )}
        <Indicador
          icono={AlertTriangle}
          titulo="Stock bajo"
          valor={stockBajo.isPending ? '…' : String(stockBajo.data?.totalElementos ?? 0)}
          tono={(stockBajo.data?.totalElementos ?? 0) > 0 ? 'peligro' : 'exito'}
          detalle="productos en o bajo su mínimo"
          enlace={{ a: '/inventario?soloBajo=1', texto: 'Ver inventario' }}
          testid="indicador-stock-bajo"
        />
        <Indicador
          icono={Truck}
          titulo={rol === 'VENDEDOR' ? 'Traslados por recibir' : 'Traslados en camino'}
          valor={porRecibir.isPending ? '…' : String(porRecibir.data?.totalElementos ?? 0)}
          tono={(porRecibir.data?.totalElementos ?? 0) > 0 ? 'alerta' : 'neutro'}
          detalle={rol === 'VENDEDOR' ? 'envíos del almacén a tu tienda' : 'enviados y aún no recibidos'}
          enlace={{ a: '/movimientos?tab=traslados', texto: 'Ver traslados' }}
          testid="indicador-traslados"
        />
        {venden && (
          <Indicador
            icono={HandCoins}
            titulo="Deudas pendientes"
            valor={deudas.isPending ? '…' : soles(deuda.saldo)}
            tono={deuda.saldo > 0 ? 'alerta' : 'neutro'}
            detalle="saldo total por cobrar (fiado)"
            enlace={{ a: '/clientes?tab=deudas', texto: 'Ver deudas' }}
            testid="indicador-deudas"
          />
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Tarjeta>
          <TituloTarjeta titulo="Productos con stock bajo" icono={<AlertTriangle className="size-4 text-peligro" />} />
          {stockBajo.isPending ? (
            <Cargando />
          ) : stockBajo.data?.contenido.length === 0 ? (
            <EstadoVacio titulo="Todo en orden" descripcion="Ningún producto llegó a su stock mínimo." />
          ) : (
            <ul className="divide-y divide-borde">
              {stockBajo.data?.contenido.map((s) => (
                <li key={`${s.productoId}-${s.ubicacionId}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-tinta">{s.productoNombre}</p>
                    <p className="text-xs text-tinta-suave">{s.ubicacionNombre}</p>
                  </div>
                  <div className="text-right font-mono text-sm">
                    <p className="font-semibold text-peligro">{cantidadConUnidad(s.cantidad, s.unidadBase)}</p>
                    <p className="text-xs text-tinta-tenue">mín. {cantidadConUnidad(s.stockMinimo, s.unidadBase)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta titulo={rol === 'VENDEDOR' ? 'Traslados por recibir' : 'Traslados en camino'} icono={<ArrowLeftRight className="size-4 text-marca" />} />
          {porRecibir.isPending ? (
            <Cargando />
          ) : porRecibir.data?.contenido.length === 0 ? (
            <EstadoVacio titulo="No hay traslados en camino" />
          ) : (
            <ul className="divide-y divide-borde">
              {porRecibir.data?.contenido.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-tinta">{t.codigo}</p>
                    <p className="text-xs text-tinta-suave">
                      {t.origenNombre} → {t.destinoNombre}
                    </p>
                  </div>
                  <span className="text-xs text-tinta-suave">{fechaHora(t.fechaEnvio)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta className="mt-5">
        <TituloTarjeta titulo="Accesos rápidos" />
        <div className="flex flex-wrap gap-2 p-5">
          {tienePermiso(rol, 'ventas.registrar') && <Acceso a="/ventas" icono={<Receipt className="size-4" />}>Nueva venta</Acceso>}
          {tienePermiso(rol, 'caja.usar') && <Acceso a="/caja" icono={<Wallet className="size-4" />}>Caja</Acceso>}
          {tienePermiso(rol, 'compras.registrar') && <Acceso a="/compras/nueva" icono={<PackagePlus className="size-4" />}>Registrar compra</Acceso>}
          {tienePermiso(rol, 'traslados.enviar') && <Acceso a="/movimientos/traslados/nuevo" icono={<Truck className="size-4" />}>Nuevo traslado</Acceso>}
          {tienePermiso(rol, 'fiado.ver') && <Acceso a="/clientes?tab=deudas" icono={<HandCoins className="size-4" />}>Cobrar deudas</Acceso>}
        </div>
      </Tarjeta>
    </div>
  )
}

type Tono = 'exito' | 'alerta' | 'peligro' | 'neutro'

function Indicador({
  icono: Icono,
  titulo,
  valor,
  detalle,
  tono = 'neutro',
  enlace,
  testid,
  mono = true,
}: {
  icono: LucideIcon
  titulo: string
  valor: string
  detalle: string
  tono?: Tono
  enlace: { a: string; texto: string }
  testid?: string
  /** Numeros en monoespaciada; textos (Abierta/Cerrada) en la fuente normal */
  mono?: boolean
}) {
  const colores: Record<Tono, string> = {
    exito: 'bg-exito-claro text-exito',
    alerta: 'bg-alerta-claro text-alerta',
    peligro: 'bg-peligro-claro text-peligro',
    neutro: 'bg-marca-claro text-marca',
  }
  return (
    <Tarjeta className="flex flex-col p-5" data-testid={testid}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-tinta-suave">{titulo}</p>
        <span className={cn('flex size-9 items-center justify-center rounded-lg', colores[tono])}>
          <Icono className="size-5" aria-hidden />
        </span>
      </div>
      <p className={cn('mt-3 text-[26px] leading-none font-bold text-tinta', mono && 'font-mono')}>{valor}</p>
      <p className="mt-2 text-xs text-tinta-suave">{detalle}</p>
      <Link to={enlace.a} className="mt-4 text-sm font-semibold text-marca hover:underline">
        {enlace.texto} →
      </Link>
    </Tarjeta>
  )
}

function Acceso({ a, icono, children }: { a: string; icono: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={a}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-borde bg-white px-4 text-sm font-semibold text-tinta hover:border-marca hover:text-marca"
    >
      {icono}
      {children}
    </Link>
  )
}
