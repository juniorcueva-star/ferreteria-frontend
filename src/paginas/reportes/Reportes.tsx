import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { reportesApi } from '@/api/reportes'
import type { OrdenProductos } from '@/api/tipos'
import { fiadoApi } from '@/api/ventas'
import { useUsuario } from '@/auth/contexto'
import { tienePermiso, type Permiso } from '@/auth/permisos'
import { TablaDeudores } from '@/componentes/tablas/TablaDeudores'
import { CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { Pestanas } from '@/componentes/ui/Pestanas'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { cantidad, cantidadConUnidad, fecha, hoyLima, inicioMesLima, nombreUnidad, soles } from '@/logica/formato'

type IdReporte = 'ventas' | 'productos' | 'traslados' | 'compras' | 'stock' | 'deudores'

const REPORTES: { id: IdReporte; etiqueta: string; permiso: Permiso; conFechas: boolean }[] = [
  { id: 'ventas', etiqueta: 'Ventas por tienda', permiso: 'reportes.ventas', conFechas: true },
  { id: 'productos', etiqueta: 'Más vendidos', permiso: 'reportes.productos', conFechas: true },
  { id: 'traslados', etiqueta: 'Traslados por tienda', permiso: 'reportes.traslados', conFechas: true },
  { id: 'compras', etiqueta: 'Compras por proveedor', permiso: 'reportes.compras', conFechas: true },
  { id: 'stock', etiqueta: 'Stock bajo', permiso: 'reportes.stockBajo', conFechas: false },
  { id: 'deudores', etiqueta: 'Deudores', permiso: 'reportes.deudores', conFechas: false },
]

/** Reportes del backend con filtros de fecha (dias de Lima) y tienda. */
export default function Reportes() {
  const usuario = useUsuario()
  const { seleccionada } = useUbicacion()
  const [parametros, setParametros] = useSearchParams()
  const disponibles = REPORTES.filter((r) => tienePermiso(usuario.rol, r.permiso))
  const activo = disponibles.find((r) => r.id === parametros.get('r')) ?? disponibles[0]
  const [desde, setDesde] = useState(inicioMesLima())
  const [hasta, setHasta] = useState(hoyLima())
  const rangoInvalido = desde !== '' && hasta !== '' && desde > hasta

  if (!activo) return null

  return (
    <div>
      <EncabezadoPagina titulo="Reportes" subtitulo={`${activo.etiqueta} · ${seleccionada?.nombre ?? 'Todas las ubicaciones'}`} />
      <Pestanas<IdReporte>
        pestanas={disponibles.map((r) => ({ id: r.id, etiqueta: r.etiqueta }))}
        activa={activo.id}
        onCambiar={(id) => setParametros({ r: id })}
      />
      {activo.conFechas && (
        <Tarjeta className="mb-5 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <CampoTexto etiqueta="Desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          <CampoTexto
            etiqueta="Hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            error={rangoInvalido ? '“Desde” no puede ser posterior a “Hasta”' : undefined}
          />
          <p className="self-end pb-2.5 text-xs text-tinta-tenue sm:col-span-2">Los días se cuentan en hora de Lima, ambos inclusive.</p>
        </Tarjeta>
      )}
      {activo.conFechas && (!desde || !hasta || rangoInvalido) ? (
        <Tarjeta className="p-6">
          <EstadoVacio titulo="Elija un rango de fechas válido" />
        </Tarjeta>
      ) : (
        <>
          {activo.id === 'ventas' && <VentasPorTienda desde={desde} hasta={hasta} />}
          {activo.id === 'productos' && <MasVendidos desde={desde} hasta={hasta} />}
          {activo.id === 'traslados' && <TrasladosPorTienda desde={desde} hasta={hasta} />}
          {activo.id === 'compras' && <ComprasPorProveedor desde={desde} hasta={hasta} />}
          {activo.id === 'stock' && <StockBajo />}
          {activo.id === 'deudores' && <Deudores />}
        </>
      )}
    </div>
  )
}

interface Rango {
  desde: string
  hasta: string
}

function Estados({ columnas, consulta }: { columnas: number; consulta: { isPending: boolean; isError: boolean; error: unknown; data?: { contenido: unknown[] } } }) {
  if (consulta.isPending) {
    return (
      <FilaCompleta columnas={columnas}>
        <Cargando />
      </FilaCompleta>
    )
  }
  if (consulta.isError) {
    return (
      <FilaCompleta columnas={columnas}>
        <MensajeError error={consulta.error} />
      </FilaCompleta>
    )
  }
  if (consulta.data?.contenido.length === 0) {
    return (
      <FilaCompleta columnas={columnas}>
        <EstadoVacio titulo="Sin datos en este rango" descripcion="Pruebe con otras fechas o con otra tienda." />
      </FilaCompleta>
    )
  }
  return null
}

function TablaReporte({ encabezados, children, pie }: { encabezados: ReactNode; children: ReactNode; pie?: ReactNode }) {
  return (
    <Tarjeta className="overflow-hidden">
      <Tabla>
        <Thead>
          <tr>{encabezados}</tr>
        </Thead>
        <Tbody>{children}</Tbody>
      </Tabla>
      {pie}
    </Tarjeta>
  )
}

function VentasPorTienda({ desde, hasta }: Rango) {
  const { seleccionadaId } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  const filtro = { desde, hasta, ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 20 }
  const consulta = useQuery({ queryKey: ['reportes', 'ventas', filtro], queryFn: () => reportesApi.ventasPorTienda(filtro), placeholderData: keepPreviousData })
  const filas = consulta.data?.contenido ?? []
  const suma = (f: (x: (typeof filas)[number]) => number) => filas.reduce((s, x) => s + f(x), 0)
  return (
    <TablaReporte
      encabezados={
        <>
          <Th>Tienda</Th>
          <Th alinear="derecha">Ventas</Th>
          <Th alinear="derecha">Total vendido</Th>
          <Th alinear="derecha">Contado</Th>
          <Th alinear="derecha">Crédito</Th>
          <Th alinear="derecha">Saldo pendiente</Th>
          <Th alinear="derecha">Anuladas</Th>
        </>
      }
      pie={<Paginacion pagina={consulta.data} onCambiar={setPagina} />}
    >
      <Estados columnas={7} consulta={consulta} />
      {filas.map((f) => (
        <Tr key={f.ubicacionId}>
          <Td>
            <p className="font-semibold">{f.ubicacionNombre}</p>
            <p className="font-mono text-xs text-tinta-tenue">RUC {f.empresaRuc}</p>
          </Td>
          <Td alinear="derecha" className="font-mono">{f.cantidadVentas}</Td>
          <Td alinear="derecha" className="font-mono font-bold">{soles(f.totalVendido)}</Td>
          <Td alinear="derecha" className="font-mono">{soles(f.totalContado)}</Td>
          <Td alinear="derecha" className="font-mono">{soles(f.totalCredito)}</Td>
          <Td alinear="derecha" className="font-mono text-alerta">{soles(f.saldoPendiente)}</Td>
          <Td alinear="derecha" className="font-mono text-tinta-suave">{f.cantidadAnuladas}</Td>
        </Tr>
      ))}
      {filas.length > 1 && (
        <tr className="bg-crema font-semibold">
          <Td>Total</Td>
          <Td alinear="derecha" className="font-mono">{suma((x) => x.cantidadVentas)}</Td>
          <Td alinear="derecha" className="font-mono">{soles(suma((x) => x.totalVendido))}</Td>
          <Td alinear="derecha" className="font-mono">{soles(suma((x) => x.totalContado))}</Td>
          <Td alinear="derecha" className="font-mono">{soles(suma((x) => x.totalCredito))}</Td>
          <Td alinear="derecha" className="font-mono">{soles(suma((x) => x.saldoPendiente))}</Td>
          <Td alinear="derecha" className="font-mono">{suma((x) => x.cantidadAnuladas)}</Td>
        </tr>
      )}
    </TablaReporte>
  )
}

function MasVendidos({ desde, hasta }: Rango) {
  const { seleccionadaId } = useUbicacion()
  const [orden, setOrden] = useState<OrdenProductos>('MONTO')
  const [pagina, setPagina] = useState(0)
  const filtro = { desde, hasta, orden, ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 20 }
  const consulta = useQuery({ queryKey: ['reportes', 'productos', filtro], queryFn: () => reportesApi.productosMasVendidos(filtro), placeholderData: keepPreviousData })
  return (
    <>
      <div className="mb-4 max-w-xs">
        <CampoSelector etiqueta="Ordenar por" value={orden} onChange={(e) => { setOrden(e.target.value as OrdenProductos); setPagina(0) }}>
          <option value="MONTO">Monto vendido</option>
          <option value="CANTIDAD">Cantidad vendida (unidad base)</option>
        </CampoSelector>
      </div>
      <TablaReporte
        encabezados={
          <>
            <Th>#</Th>
            <Th>Producto</Th>
            <Th>Unidad</Th>
            <Th alinear="derecha">Cantidad vendida</Th>
            <Th alinear="derecha">Monto vendido</Th>
            <Th alinear="derecha">N.° de ventas</Th>
          </>
        }
        pie={<Paginacion pagina={consulta.data} onCambiar={setPagina} />}
      >
        <Estados columnas={6} consulta={consulta} />
        {consulta.data?.contenido.map((p, i) => (
          <Tr key={p.productoId}>
            <Td className="font-mono text-tinta-tenue">{(consulta.data?.pagina ?? 0) * 20 + i + 1}</Td>
            <Td>
              <p className="font-semibold">{p.productoNombre}</p>
              <p className="font-mono text-xs text-tinta-tenue">{p.productoCodigo}</p>
            </Td>
            <Td className="text-tinta-suave">{nombreUnidad(p.unidadBase)}</Td>
            <Td alinear="derecha" className="font-mono">{cantidadConUnidad(p.cantidadVendida, p.unidadBase)}</Td>
            <Td alinear="derecha" className="font-mono font-bold">{soles(p.montoVendido)}</Td>
            <Td alinear="derecha" className="font-mono">{p.numeroVentas}</Td>
          </Tr>
        ))}
      </TablaReporte>
    </>
  )
}

function TrasladosPorTienda({ desde, hasta }: Rango) {
  const { seleccionada } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  // El ADMIN puede filtrar por almacen de origen; el almacenero siempre ve el suyo
  const filtro = { desde, hasta, origenId: seleccionada?.tipo === 'ALMACEN' ? seleccionada.id : undefined, page: pagina, size: 20 }
  const consulta = useQuery({ queryKey: ['reportes', 'traslados', filtro], queryFn: () => reportesApi.trasladosPorTienda(filtro), placeholderData: keepPreviousData })
  return (
    <TablaReporte
      encabezados={
        <>
          <Th>Tienda destino</Th>
          <Th alinear="derecha">Traslados</Th>
          <Th alinear="derecha">Recibidos</Th>
          <Th alinear="derecha">En camino</Th>
          <Th alinear="derecha">Anulados</Th>
        </>
      }
      pie={<Paginacion pagina={consulta.data} onCambiar={setPagina} />}
    >
      <Estados columnas={5} consulta={consulta} />
      {consulta.data?.contenido.map((t) => (
        <Tr key={t.destinoId}>
          <Td className="font-semibold">{t.destinoNombre}</Td>
          <Td alinear="derecha" className="font-mono font-bold">{t.cantidadTraslados}</Td>
          <Td alinear="derecha" className="font-mono text-exito">{t.recibidos}</Td>
          <Td alinear="derecha" className="font-mono text-alerta">{t.enCamino}</Td>
          <Td alinear="derecha" className="font-mono text-peligro">{t.anulados}</Td>
        </Tr>
      ))}
    </TablaReporte>
  )
}

function ComprasPorProveedor({ desde, hasta }: Rango) {
  const { seleccionadaId } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  const filtro = { desde, hasta, ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 20 }
  const consulta = useQuery({ queryKey: ['reportes', 'compras', filtro], queryFn: () => reportesApi.comprasPorProveedor(filtro), placeholderData: keepPreviousData })
  return (
    <TablaReporte
      encabezados={
        <>
          <Th>Proveedor</Th>
          <Th>RUC</Th>
          <Th alinear="derecha">Compras</Th>
          <Th alinear="derecha">Total comprado</Th>
          <Th>Última compra</Th>
        </>
      }
      pie={<Paginacion pagina={consulta.data} onCambiar={setPagina} />}
    >
      <Estados columnas={5} consulta={consulta} />
      {consulta.data?.contenido.map((c) => (
        <Tr key={c.proveedorId}>
          <Td className="font-semibold">{c.proveedorRazonSocial}</Td>
          <Td className="font-mono text-sm text-tinta-suave">{c.proveedorRuc ?? '—'}</Td>
          <Td alinear="derecha" className="font-mono">{c.cantidadCompras}</Td>
          <Td alinear="derecha" className="font-mono font-bold">{soles(c.totalComprado)}</Td>
          <Td className="text-tinta-suave">{fecha(c.ultimaCompra)}</Td>
        </Tr>
      ))}
    </TablaReporte>
  )
}

function StockBajo() {
  const { seleccionadaId } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  const filtro = { ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 20 }
  const consulta = useQuery({ queryKey: ['reportes', 'stock-bajo', 'reporte', filtro], queryFn: () => reportesApi.stockBajo(filtro), placeholderData: keepPreviousData })
  return (
    <TablaReporte
      encabezados={
        <>
          <Th>Producto</Th>
          <Th>Ubicación</Th>
          <Th alinear="derecha">Stock</Th>
          <Th alinear="derecha">Mínimo</Th>
          <Th alinear="derecha">Faltan para el mínimo</Th>
        </>
      }
      pie={<Paginacion pagina={consulta.data} onCambiar={setPagina} />}
    >
      <Estados columnas={5} consulta={consulta} />
      {consulta.data?.contenido.map((s) => (
        <Tr key={`${s.productoId}-${s.ubicacionId}`}>
          <Td>
            <p className="font-semibold">{s.productoNombre}</p>
            <p className="font-mono text-xs text-tinta-tenue">{s.productoCodigo}</p>
          </Td>
          <Td className="text-tinta-suave">{s.ubicacionNombre}</Td>
          <Td alinear="derecha" className="font-mono font-bold text-peligro">{cantidadConUnidad(s.cantidad, s.unidadBase)}</Td>
          <Td alinear="derecha" className="font-mono">{cantidadConUnidad(s.stockMinimo, s.unidadBase)}</Td>
          <Td alinear="derecha" className="font-mono text-tinta-suave">{cantidad(Math.max(0, s.stockMinimo - s.cantidad))}</Td>
        </Tr>
      ))}
    </TablaReporte>
  )
}

function Deudores() {
  const { seleccionadaId } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  const filtro = { ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 20 }
  const consulta = useQuery({ queryKey: ['fiado', 'deudores', filtro], queryFn: () => fiadoApi.deudores(filtro), placeholderData: keepPreviousData })
  return <TablaDeudores consulta={consulta} onPagina={setPagina} />
}
