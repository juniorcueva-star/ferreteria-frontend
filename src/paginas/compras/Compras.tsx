import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { comprasApi } from '@/api/compras'
import type { EstadoCompra } from '@/api/tipos'
import { usePermiso } from '@/auth/contexto'
import { ConfirmarAnulacion } from '@/componentes/formularios/ConfirmarAnulacion'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { Dato } from '@/componentes/ui/Dato'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { TONO_COMPRA } from '@/componentes/ui/tonos'
import { useUbicacion } from '@/contexto/ubicacion'
import { useProveedoresActivos } from '@/hooks/useCatalogos'
import { cantidad, fecha, fechaHora, NOMBRE_COMPROBANTE, soles } from '@/logica/formato'

/** Compras a proveedores: listado con filtros, detalle y anulacion (solo ADMIN). */
export default function Compras() {
  const navegar = useNavigate()
  const puedeRegistrar = usePermiso('compras.registrar')
  const { seleccionadaId, seleccionada } = useUbicacion()
  const proveedores = useProveedoresActivos()
  const [proveedorId, setProveedorId] = useState('')
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(0)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const filtro = {
    ubicacionId: seleccionadaId ?? undefined,
    proveedorId: proveedorId ? Number(proveedorId) : undefined,
    estado: (estado || undefined) as EstadoCompra | undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    page: pagina,
    size: 20,
    sort: 'id,desc',
  }
  const compras = useQuery({
    queryKey: ['compras', 'listado', filtro],
    queryFn: () => comprasApi.listar(filtro),
    placeholderData: keepPreviousData,
  })
  const cambiar = (fn: (v: string) => void) => (v: string) => {
    fn(v)
    setPagina(0)
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Compras"
        subtitulo={`${compras.data?.totalElementos ?? '…'} compras · ${seleccionada?.nombre ?? 'Todas las ubicaciones'}`}
        acciones={
          puedeRegistrar && (
            <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => navegar('/compras/nueva')}>
              Registrar compra
            </Boton>
          )
        }
      />
      <Tarjeta className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <CampoSelector etiqueta="Proveedor" value={proveedorId} onChange={(e) => cambiar(setProveedorId)(e.target.value)}>
          <option value="">Todos</option>
          {proveedores.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.razonSocial}
            </option>
          ))}
        </CampoSelector>
        <CampoSelector etiqueta="Estado" value={estado} onChange={(e) => cambiar(setEstado)(e.target.value)}>
          <option value="">Todos</option>
          <option value="REGISTRADA">Registradas</option>
          <option value="ANULADA">Anuladas</option>
        </CampoSelector>
        <CampoTexto etiqueta="Emitidas desde" type="date" value={desde} onChange={(e) => cambiar(setDesde)(e.target.value)} />
        <CampoTexto etiqueta="Hasta" type="date" value={hasta} onChange={(e) => cambiar(setHasta)(e.target.value)} />
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>N.°</Th>
              <Th>Emisión</Th>
              <Th>Comprobante</Th>
              <Th>Proveedor</Th>
              <Th>Empresa</Th>
              <Th>Ingresó a</Th>
              <Th alinear="derecha">Total</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <Tbody>
            {compras.isPending && (
              <FilaCompleta columnas={8}>
                <Cargando />
              </FilaCompleta>
            )}
            {compras.isError && (
              <FilaCompleta columnas={8}>
                <MensajeError error={compras.error} />
              </FilaCompleta>
            )}
            {compras.data?.contenido.length === 0 && (
              <FilaCompleta columnas={8}>
                <EstadoVacio titulo="Sin compras" descripcion="No hay compras con estos filtros." />
              </FilaCompleta>
            )}
            {compras.data?.contenido.map((c) => (
              <Tr key={c.id} onClick={() => setDetalleId(c.id)} data-testid={`compra-${c.serieNumero ?? c.id}`}>
                <Td className="font-mono">{c.id}</Td>
                <Td className="text-tinta-suave">{fecha(c.fechaEmision)}</Td>
                <Td>
                  <p className="text-sm">{NOMBRE_COMPROBANTE[c.tipoComprobante]}</p>
                  <p className="font-mono text-xs text-tinta-tenue">{c.serieNumero ?? '—'}</p>
                </Td>
                <Td className="font-medium">{c.proveedorRazonSocial}</Td>
                <Td className="text-xs text-tinta-suave">{c.empresaRazonSocial}</Td>
                <Td className="text-tinta-suave">{c.ubicacionNombre}</Td>
                <Td alinear="derecha" className="font-mono font-semibold">{soles(c.total)}</Td>
                <Td>
                  <Insignia tono={TONO_COMPRA[c.estado]}>{c.estado === 'REGISTRADA' ? 'Registrada' : 'Anulada'}</Insignia>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={compras.data} onCambiar={setPagina} />
      </Tarjeta>
      {detalleId !== null && <DetalleCompra id={detalleId} onCerrar={() => setDetalleId(null)} />}
    </div>
  )
}

function DetalleCompra({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const puedeAnular = usePermiso('compras.anular')
  const [anulando, setAnulando] = useState(false)
  const compra = useQuery({ queryKey: ['compras', 'detalle', id], queryFn: () => comprasApi.obtener(id) })
  const anular = useMutation({
    mutationFn: (motivo: string) => comprasApi.anular(id, { motivo }),
    onSuccess: (c) => {
      setAnulando(false)
      avisar(`Compra N.° ${c.id} anulada: se retiró del stock lo que había entrado`)
      queryClient.setQueryData(['compras', 'detalle', id], c)
      void queryClient.invalidateQueries({ queryKey: ['compras'] })
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
    },
  })
  const c = compra.data

  return (
    <>
      <Modal
        abierto={!anulando}
        onCerrar={onCerrar}
        titulo={`Compra N.° ${id}`}
        descripcion={c ? `${c.proveedorRazonSocial} · ${NOMBRE_COMPROBANTE[c.tipoComprobante]} ${c.serieNumero ?? ''}` : undefined}
        ancho="lg"
        pie={
          c &&
          puedeAnular &&
          c.estado === 'REGISTRADA' && (
            <Boton variante="secundario" icono={<Ban className="size-4" />} onClick={() => setAnulando(true)}>
              Anular compra
            </Boton>
          )
        }
      >
        {compra.isPending && <Cargando />}
        {compra.isError && <MensajeError error={compra.error} />}
        {c && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Dato titulo="Estado">
                <Insignia tono={TONO_COMPRA[c.estado]}>{c.estado === 'REGISTRADA' ? 'Registrada' : 'Anulada'}</Insignia>
              </Dato>
              <Dato titulo="Empresa">{c.empresaRazonSocial}</Dato>
              <Dato titulo="Ingresó a">{c.ubicacionNombre}</Dato>
              <Dato titulo="Emisión">{fecha(c.fechaEmision)}</Dato>
              <Dato titulo="Registrada">
                {fechaHora(c.createdAt)} · {c.usuario}
              </Dato>
            </div>
            {c.observacion && <p className="rounded-lg bg-crema px-3 py-2 text-sm text-tinta-suave">{c.observacion}</p>}
            <div className="overflow-hidden rounded-xl border border-borde">
              <Tabla>
                <Thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th>Presentación</Th>
                    <Th alinear="derecha">Cantidad</Th>
                    <Th alinear="derecha">Cant. base</Th>
                    <Th alinear="derecha">Costo unit. base</Th>
                    <Th alinear="derecha">Subtotal</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {c.detalles.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-medium">{d.productoNombre}</Td>
                      <Td className="text-tinta-suave">{d.presentacionNombre ?? 'Unidad base'}</Td>
                      <Td alinear="derecha" className="font-mono">{cantidad(d.cantidad)}</Td>
                      <Td alinear="derecha" className="font-mono">{cantidad(d.cantidadBase)}</Td>
                      <Td alinear="derecha" className="font-mono text-tinta-suave">S/ {d.costoUnitario.toFixed(4)}</Td>
                      <Td alinear="derecha" className="font-mono font-semibold">{soles(d.subtotal)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Tabla>
            </div>
            <dl className="ml-auto w-64 space-y-1 text-sm">
              <div className="flex justify-between text-tinta-suave">
                <dt>Base imponible</dt>
                <dd className="font-mono">{soles(c.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-tinta-suave">
                <dt>IGV</dt>
                <dd className="font-mono">{soles(c.igv)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Total</dt>
                <dd className="font-mono">{soles(c.total)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
      <ConfirmarAnulacion
        abierto={anulando}
        onCerrar={() => {
          anular.reset()
          setAnulando(false)
        }}
        titulo={`Anular compra N.° ${id}`}
        descripcion="Se retira del stock la mercadería que entró con esta compra. Si ya se vendió o trasladó, no se podrá anular."
        cargando={anular.isPending}
        error={anular.error}
        onConfirmar={(motivo) => anular.mutate(motivo)}
      />
    </>
  )
}
