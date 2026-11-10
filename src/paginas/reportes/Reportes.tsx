import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { FileSpreadsheet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { almacenApi, excelApi, reportesApi } from '@/api/reportes'
import type { OrdenProductos } from '@/api/tipos'
import { fiadoApi } from '@/api/ventas'
import { useUsuario } from '@/auth/contexto'
import { tienePermiso, type Permiso } from '@/auth/permisos'
import { TablaDeudores } from '@/componentes/tablas/TablaDeudores'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { Pestanas } from '@/componentes/ui/Pestanas'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { guardarArchivo } from '@/hooks/useDocumentoPdf'
import { cantidad, cantidadConUnidad, fecha, hoyLima, inicioMesLima, nombreUnidad, soles } from '@/logica/formato'

type IdReporte = 'ventas' | 'productos' | 'traslados' | 'compras' | 'stock' | 'deudores' | 'pedido' | 'valor'

const REPORTES: { id: IdReporte; etiqueta: string; permiso: Permiso; conFechas: boolean }[] = [
  { id: 'ventas', etiqueta: 'Ventas por tienda', permiso: 'reportes.ventas', conFechas: true },
  { id: 'productos', etiqueta: 'Más vendidos', permiso: 'reportes.productos', conFechas: true },
  { id: 'traslados', etiqueta: 'Traslados por tienda', permiso: 'reportes.traslados', conFechas: true },
  { id: 'compras', etiqueta: 'Compras por proveedor', permiso: 'reportes.compras', conFechas: true },
  { id: 'stock', etiqueta: 'Stock bajo', permiso: 'reportes.stockBajo', conFechas: false },
  { id: 'deudores', etiqueta: 'Deudores', permiso: 'reportes.deudores', conFechas: false },
  { id: 'pedido', etiqueta: 'Pedido sugerido', permiso: 'reportes.almacen', conFechas: false },
  { id: 'valor', etiqueta: 'Valor del inventario', permiso: 'reportes.almacen', conFechas: false },
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
      <EncabezadoPagina
        titulo="Reportes"
        subtitulo={`${activo.etiqueta} · ${seleccionada?.nombre ?? 'Todas las ubicaciones'}`}
        acciones={<ExportarExcel desde={desde} hasta={hasta} rangoValido={Boolean(desde && hasta) && !rangoInvalido} />}
      />
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
          {activo.id === 'pedido' && <PedidoSugerido />}
          {activo.id === 'valor' && <ValorInventario />}
        </>
      )}
    </div>
  )
}

interface Rango {
  desde: string
  hasta: string
}

type Exportable = 'ventas' | 'stock' | 'deudores'

/**
 * Botones para descargar en Excel las ventas (rango de fechas elegido), el stock y los deudores de la ubicacion
 * elegida arriba. Cada rol solo ve los que puede exportar.
 */
function ExportarExcel({ desde, hasta, rangoValido }: { desde: string; hasta: string; rangoValido: boolean }) {
  const usuario = useUsuario()
  const { seleccionadaId } = useUbicacion()
  const ubicacionId = seleccionadaId ?? undefined
  const exportar = useMutation({
    mutationFn: async (que: Exportable) => {
      if (que === 'ventas') return { archivo: await excelApi.ventas({ desde, hasta, ubicacionId }), nombre: `ventas-${desde}-a-${hasta}.xlsx` }
      if (que === 'stock') return { archivo: await excelApi.stock({ ubicacionId }), nombre: `stock-${hoyLima()}.xlsx` }
      return { archivo: await excelApi.deudores({ ubicacionId }), nombre: `deudores-${hoyLima()}.xlsx` }
    },
    onSuccess: ({ archivo, nombre }) => guardarArchivo(archivo, nombre),
  })
  const botones: { id: Exportable; etiqueta: string; permiso: Permiso }[] = [
    { id: 'ventas', etiqueta: 'Ventas', permiso: 'reportes.ventas' },
    { id: 'stock', etiqueta: 'Stock', permiso: 'reportes.stockBajo' },
    { id: 'deudores', etiqueta: 'Deudores', permiso: 'reportes.deudores' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Exportar a Excel">
      {botones
        .filter((b) => tienePermiso(usuario.rol, b.permiso))
        .map((b) => (
          <Boton
            key={b.id}
            variante="secundario"
            icono={<FileSpreadsheet className="size-4 text-exito" />}
            cargando={exportar.isPending && exportar.variables === b.id}
            disabled={b.id === 'ventas' && !rangoValido}
            onClick={() => exportar.mutate(b.id)}
            title={b.id === 'ventas' ? 'Ventas del rango de fechas elegido' : undefined}
          >
            {b.etiqueta} en Excel
          </Boton>
        ))}
      {exportar.error && <MensajeError error={exportar.error} className="w-full" />}
    </div>
  )
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

/** Ubicacion para los reportes del almacen: la elegida arriba o, si el ADMIN ve todas, el primer almacen. */
function useUbicacionAlmacen(): number | undefined {
  const usuario = useUsuario()
  const { seleccionadaId, todas } = useUbicacion()
  if (usuario.rol !== 'ADMIN') return undefined
  return seleccionadaId ?? todas.find((u) => u.tipo === 'ALMACEN')?.id
}

/** Lo que conviene comprar: productos en su minimo, cuanto (hasta el doble del minimo), ultimo proveedor y costo. */
function PedidoSugerido() {
  const ubicacionId = useUbicacionAlmacen()
  const consulta = useQuery({
    queryKey: ['reportes', 'pedido-sugerido', ubicacionId],
    queryFn: () => almacenApi.pedidoSugerido(ubicacionId),
  })
  const excel = useMutation({
    mutationFn: () => excelApi.pedidoSugerido({ ubicacionId }),
    onSuccess: (archivo) => guardarArchivo(archivo, `pedido-sugerido-${hoyLima()}.xlsx`),
  })
  const total = (consulta.data ?? []).reduce((suma, f) => suma + (f.montoEstimado ?? 0), 0)
  return (
    <TablaReporte
      encabezados={
        <>
          <Th>Producto</Th>
          <Th alinear="derecha">Stock</Th>
          <Th alinear="derecha">Mínimo</Th>
          <Th alinear="derecha">Comprar</Th>
          <Th>Último proveedor</Th>
          <Th alinear="derecha">Último costo</Th>
          <Th alinear="derecha">Monto estimado</Th>
        </>
      }
      pie={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde px-5 py-3">
          <p className="text-sm">
            Total estimado: <span className="font-mono font-bold">{soles(total)}</span>
          </p>
          <Boton variante="secundario" tamano="sm" icono={<FileSpreadsheet className="size-4 text-exito" />} cargando={excel.isPending} onClick={() => excel.mutate()}>
            Descargar en Excel
          </Boton>
        </div>
      }
    >
      {consulta.isPending && (
        <FilaCompleta columnas={7}>
          <Cargando />
        </FilaCompleta>
      )}
      {consulta.isError && (
        <FilaCompleta columnas={7}>
          <MensajeError error={consulta.error} />
        </FilaCompleta>
      )}
      {consulta.data?.length === 0 && (
        <FilaCompleta columnas={7}>
          <EstadoVacio titulo="Nada que comprar" descripcion="Ningún producto llegó a su stock mínimo en esta ubicación." />
        </FilaCompleta>
      )}
      {consulta.data?.map((f) => (
        <Tr key={f.productoId} data-testid={`pedido-sugerido-${f.productoCodigo}`}>
          <Td>
            <p className="font-semibold">{f.productoNombre}</p>
            <p className="font-mono text-xs text-tinta-tenue">{f.productoCodigo}</p>
          </Td>
          <Td alinear="derecha" className="font-mono text-peligro">{cantidad(f.stock)}</Td>
          <Td alinear="derecha" className="font-mono">{cantidad(f.stockMinimo)}</Td>
          <Td alinear="derecha" className="font-mono font-bold">{cantidadConUnidad(f.cantidadSugerida, f.unidadBase)}</Td>
          <Td className="text-sm">
            {f.ultimoProveedor ?? '—'}
            {f.fechaUltimaCompra && <p className="text-xs text-tinta-tenue">{fecha(f.fechaUltimaCompra)}</p>}
          </Td>
          <Td alinear="derecha" className="font-mono">{f.ultimoCosto === null ? '—' : `S/ ${f.ultimoCosto.toFixed(4)}`}</Td>
          <Td alinear="derecha" className="font-mono font-semibold">{f.montoEstimado === null ? '—' : soles(f.montoEstimado)}</Td>
        </Tr>
      ))}
    </TablaReporte>
  )
}

/** Cuanto dinero hay en stock (cantidad x costo de la ultima compra) y que productos no salen. */
function ValorInventario() {
  const usuario = useUsuario()
  const { seleccionadaId } = useUbicacion()
  const ubicacionId = usuario.rol === 'ADMIN' ? (seleccionadaId ?? undefined) : undefined
  const [dias, setDias] = useState('')
  const filtro = { ubicacionId, diasSinSalida: dias === '' ? undefined : Number(dias) }
  const consulta = useQuery({
    queryKey: ['reportes', 'valor-inventario', filtro],
    queryFn: () => almacenApi.valorInventario(filtro),
    placeholderData: keepPreviousData,
  })
  const excel = useMutation({
    mutationFn: () => excelApi.valorInventario(filtro),
    onSuccess: (archivo) => guardarArchivo(archivo, `valor-inventario-${hoyLima()}.xlsx`),
  })
  return (
    <>
      <Tarjeta className="mb-5 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-tinta-tenue uppercase">Valor del inventario</p>
          <p className="font-mono text-2xl font-bold" data-testid="valor-total">{soles(consulta.data?.valorTotal ?? 0)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-tinta-tenue uppercase">Productos</p>
          <p className="font-mono text-2xl font-bold">{consulta.data?.productos ?? 0}</p>
          {(consulta.data?.productosSinCosto ?? 0) > 0 && (
            <p className="text-xs text-tinta-tenue">{consulta.data?.productosSinCosto} sin compras registradas (no suman)</p>
          )}
        </div>
        <CampoSelector etiqueta="Productos a mostrar" value={dias} onChange={(e) => setDias(e.target.value)}>
          <option value="">Todo el stock</option>
          <option value="30">Sin salida hace 30 días o más</option>
          <option value="60">Sin salida hace 60 días o más</option>
          <option value="90">Sin salida hace 90 días o más</option>
          <option value="180">Sin salida hace 180 días o más</option>
        </CampoSelector>
        <Boton variante="secundario" icono={<FileSpreadsheet className="size-4 text-exito" />} cargando={excel.isPending} onClick={() => excel.mutate()} className="self-end">
          Descargar en Excel
        </Boton>
      </Tarjeta>
      <TablaReporte
        encabezados={
          <>
            <Th>Producto</Th>
            <Th>Ubicación</Th>
            <Th alinear="derecha">Cantidad</Th>
            <Th alinear="derecha">Costo unitario</Th>
            <Th alinear="derecha">Valor</Th>
            <Th>Última salida</Th>
          </>
        }
      >
        {consulta.isPending && (
          <FilaCompleta columnas={6}>
            <Cargando />
          </FilaCompleta>
        )}
        {consulta.isError && (
          <FilaCompleta columnas={6}>
            <MensajeError error={consulta.error} />
          </FilaCompleta>
        )}
        {consulta.data?.filas.length === 0 && (
          <FilaCompleta columnas={6}>
            <EstadoVacio titulo="Sin productos" descripcion="No hay stock con estos filtros." />
          </FilaCompleta>
        )}
        {consulta.data?.filas.map((f) => (
          <Tr key={`${f.productoId}-${f.ubicacionId}`}>
            <Td>
              <p className="font-semibold">{f.productoNombre}</p>
              <p className="font-mono text-xs text-tinta-tenue">{f.productoCodigo}</p>
            </Td>
            <Td className="text-tinta-suave">{f.ubicacionNombre}</Td>
            <Td alinear="derecha" className="font-mono">{cantidadConUnidad(f.cantidad, f.unidadBase)}</Td>
            <Td alinear="derecha" className="font-mono">{f.costoUnitario === null ? '—' : `S/ ${f.costoUnitario.toFixed(4)}`}</Td>
            <Td alinear="derecha" className="font-mono font-semibold">{f.valor === null ? '—' : soles(f.valor)}</Td>
            <Td className="text-sm">
              {f.ultimaSalida ? (
                <>
                  {fecha(f.ultimaSalida)}
                  <p className={f.diasSinSalida !== null && f.diasSinSalida >= 90 ? 'text-xs text-peligro' : 'text-xs text-tinta-tenue'}>
                    hace {f.diasSinSalida} días
                  </p>
                </>
              ) : (
                <span className="text-xs text-peligro">Nunca salió</span>
              )}
            </Td>
          </Tr>
        ))}
      </TablaReporte>
    </>
  )
}
