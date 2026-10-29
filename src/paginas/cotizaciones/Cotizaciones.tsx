import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { cotizacionesApi } from '@/api/ventas'
import type { EstadoCotizacion } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { useUbicacion } from '@/contexto/ubicacion'
import { fechaHora, soles } from '@/logica/formato'

/** Listado inicial de propuestas. La edicion detallada se habilita desde BORRADOR tras validar el flujo aislado. */
export default function Cotizaciones() {
  const { seleccionadaId } = useUbicacion(); const [estado, setEstado] = useState<EstadoCotizacion | ''>(''); const navegar = useNavigate()
  const consulta = useQuery({ queryKey: ['cotizaciones', seleccionadaId, estado], queryFn: () => cotizacionesApi.listar({ ubicacionId: seleccionadaId ?? undefined, estado: estado || undefined, page: 0, size: 50, sort: 'id,desc' }) })
  return <div><EncabezadoPagina titulo="Cotizaciones" subtitulo="Propuestas comerciales sin reserva ni movimiento de stock." acciones={<Boton icono={<Plus className="size-4" />} onClick={() => navegar('/cotizaciones/nueva')}>Nueva cotización</Boton>} />
    <div className="mb-5 max-w-xs"><CampoSelector etiqueta="Estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoCotizacion | '')}><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="EMITIDA">Emitida</option><option value="ANULADA">Anulada</option></CampoSelector></div>
    {consulta.isPending && <Cargando />}{consulta.isError && <MensajeError error={consulta.error} />}{consulta.data?.contenido.length === 0 && <EstadoVacio titulo="Sin cotizaciones" descripcion="Aún no hay propuestas comerciales para esta tienda." />}
    <div className="space-y-2">{consulta.data?.contenido.map((c) => <button type="button" onClick={() => navegar(`/cotizaciones/${c.id}`)} key={c.id} className="w-full rounded-xl border border-borde bg-superficie p-4 text-left hover:bg-crema"><div className="flex justify-between gap-3"><div><p className="font-mono font-semibold">{c.codigo}</p><p className="text-sm text-tinta-suave">{c.clienteNombre} · {c.ubicacionNombre}</p></div><div className="text-right"><p className="font-mono font-bold">{soles(c.total)}</p><p className="text-xs text-tinta-suave">{c.venta ? `Convertida · ${c.venta.numeroDocumento}` : c.estado === 'EMITIDA' ? 'Emitida · pendiente de venta' : c.estado} · {fechaHora(c.fecha)}</p></div></div></button>)}</div>
  </div>
}
