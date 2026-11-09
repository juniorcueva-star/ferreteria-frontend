import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { encargosApi } from '@/api/encargos'
import type { EncargoResponse, EstadoEncargo } from '@/api/tipos'
import { ConfirmarAnulacion } from '@/componentes/formularios/ConfirmarAnulacion'
import { Boton } from '@/componentes/ui/Boton'
import { Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { cantidad, fechaHora, soles } from '@/logica/formato'
import { ModalEntregaEncargo } from './ModalEntregaEncargo'

const TONO: Record<EstadoEncargo, 'alerta' | 'exito' | 'neutro'> = { PENDIENTE: 'alerta', ENTREGADO: 'exito', ANULADO: 'neutro' }
const NOMBRE: Record<EstadoEncargo, string> = { PENDIENTE: 'Pendiente', ENTREGADO: 'Entregado', ANULADO: 'Anulado' }

/** Encargos de productos sin stock: pendientes de entregar, entregados (con su venta) y anulados. */
export default function Encargos() {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [estado, setEstado] = useState<EstadoEncargo | ''>('PENDIENTE')
  const [pagina, setPagina] = useState(0)
  const [entregando, setEntregando] = useState<EncargoResponse | null>(null)
  const [anulando, setAnulando] = useState<EncargoResponse | null>(null)
  const filtro = { estado: estado || undefined, page: pagina, size: 20, sort: 'id,desc' }
  const encargos = useQuery({
    queryKey: ['encargos', 'listado', filtro],
    queryFn: () => encargosApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  const anular = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => encargosApi.anular(id, { motivo }),
    onSuccess: (e) => {
      avisar(`Encargo ${e.codigo} anulado`)
      setAnulando(null)
      void queryClient.invalidateQueries({ queryKey: ['encargos'] })
    },
  })

  return (
    <div>
      <EncabezadoPagina
        titulo="Encargos"
        subtitulo="Productos sin stock que se consiguen fuera y se venden con precio propio. Se registran desde el punto de venta."
      />
      <Tarjeta className="mb-5 flex flex-wrap items-center gap-3 p-5">
        <Selector
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoEncargo | '')
            setPagina(0)
          }}
          aria-label="Filtrar por estado"
          className="h-11 w-56 rounded-xl"
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="ENTREGADO">Entregados</option>
          <option value="ANULADO">Anulados</option>
          <option value="">Todos</option>
        </Selector>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Encargo</Th>
              <Th>Producto</Th>
              <Th>Cliente</Th>
              <Th alinear="derecha">Cantidad</Th>
              <Th alinear="derecha">Precio</Th>
              <Th alinear="derecha">Total</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {encargos.isPending && (
              <FilaCompleta columnas={8}>
                <Cargando texto="Cargando encargos…" />
              </FilaCompleta>
            )}
            {encargos.isError && (
              <FilaCompleta columnas={8}>
                <MensajeError error={encargos.error} />
              </FilaCompleta>
            )}
            {encargos.data?.contenido.length === 0 && (
              <FilaCompleta columnas={8}>
                <EstadoVacio titulo="No hay encargos" descripcion="Los encargos se registran desde el punto de venta cuando falta stock." />
              </FilaCompleta>
            )}
            {encargos.data?.contenido.map((e) => (
              <Tr key={e.id} data-testid={`encargo-${e.codigo}`}>
                <Td>
                  <p className="font-mono font-semibold">{e.codigo}</p>
                  <p className="text-xs text-tinta-tenue">
                    {fechaHora(e.createdAt)} · {e.ubicacionNombre}
                  </p>
                </Td>
                <Td className="min-w-48">
                  <p className="font-semibold">{e.productoNombre}</p>
                  <p className="text-xs text-tinta-tenue">
                    {e.presentacionNombre}
                    {e.observacion && ` · ${e.observacion}`}
                  </p>
                </Td>
                <Td>{e.clienteNombre ?? '—'}</Td>
                <Td alinear="derecha" className="font-mono">
                  {cantidad(e.cantidad)}
                </Td>
                <Td alinear="derecha" className="font-mono">
                  {soles(e.precioUnitario)}
                  {e.recargoPorcentaje !== null && e.recargoPorcentaje > 0 && (
                    <p className="text-xs text-tinta-tenue">+{e.recargoPorcentaje.toFixed(2)} %</p>
                  )}
                </Td>
                <Td alinear="derecha" className="font-mono font-semibold">
                  {soles(e.total)}
                </Td>
                <Td>
                  <Insignia tono={TONO[e.estado]}>{NOMBRE[e.estado]}</Insignia>
                  {e.ventaId !== null && (
                    <Link to={`/ventas/${e.ventaId}`} className="mt-1 block font-mono text-xs text-marca-texto underline">
                      {e.ventaNumero}
                    </Link>
                  )}
                </Td>
                <Td alinear="derecha">
                  {e.estado === 'PENDIENTE' && (
                    <div className="flex justify-end gap-1">
                      <Boton tamano="sm" icono={<PackageCheck className="size-4" />} onClick={() => setEntregando(e)}>
                        Entregar
                      </Boton>
                      <Boton tamano="sm" variante="fantasma" icono={<XCircle className="size-4" />} onClick={() => setAnulando(e)}>
                        Anular
                      </Boton>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={encargos.data} onCambiar={setPagina} />
      </Tarjeta>

      {entregando && <ModalEntregaEncargo encargo={entregando} onCerrar={() => setEntregando(null)} />}
      <ConfirmarAnulacion
        abierto={anulando !== null}
        onCerrar={() => setAnulando(null)}
        titulo={`Anular encargo ${anulando?.codigo ?? ''}`}
        descripcion="El encargo no tocó el stock, así que anularlo no cambia el inventario."
        onConfirmar={(motivo) => anulando && anular.mutate({ id: anulando.id, motivo })}
        cargando={anular.isPending}
        error={anular.error}
      />
    </div>
  )
}
