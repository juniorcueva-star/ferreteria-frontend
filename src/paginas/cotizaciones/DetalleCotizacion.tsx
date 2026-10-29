import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Pencil, Send, ShoppingCart } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { cotizacionesApi } from '@/api/ventas'
import { Boton } from '@/componentes/ui/Boton'
import { Cargando, MensajeError } from '@/componentes/ui/Estados'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { fechaHora, soles } from '@/logica/formato'
import { useUsuario } from '@/auth/contexto'

export default function DetalleCotizacion() {
  const { id } = useParams(); const cotizacionId = Number(id); const nav = useNavigate(); const qc = useQueryClient(); const { avisar } = useAvisos(); const usuario = useUsuario()
  const consulta = useQuery({ queryKey: ['cotizaciones', 'detalle', cotizacionId], queryFn: () => cotizacionesApi.obtener(cotizacionId) })
  const emitir = useMutation({ mutationFn: () => cotizacionesApi.emitir(cotizacionId), onSuccess: (c) => { avisar('Cotización emitida'); qc.setQueryData(['cotizaciones', 'detalle', c.id], c); void qc.invalidateQueries({ queryKey: ['cotizaciones'] }) } })
  const anular = useMutation({ mutationFn: () => cotizacionesApi.anular(cotizacionId), onSuccess: (c) => { avisar('Cotización anulada'); qc.setQueryData(['cotizaciones', 'detalle', c.id], c); void qc.invalidateQueries({ queryKey: ['cotizaciones'] }) } })
  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <MensajeError error={consulta.error} />
  const c = consulta.data; const ocupado = emitir.isPending || anular.isPending
  return <div><Link to="/cotizaciones">Volver a cotizaciones</Link><div className="my-4 flex justify-between"><div><h1 className="text-2xl font-bold">{c.codigo}</h1><p>{c.clienteNombre} · {c.ubicacionNombre} · {fechaHora(c.fecha)}</p></div>{c.estado === 'BORRADOR' && <div className="flex gap-2"><Boton icono={<Pencil className="size-4" />} disabled={ocupado} onClick={() => nav(`/cotizaciones/${c.id}/editar`)}>Editar</Boton><Boton icono={<Send className="size-4" />} cargando={emitir.isPending} disabled={ocupado} onClick={() => { if (window.confirm('¿Emitir cotización?')) emitir.mutate() }}>Emitir</Boton><Boton variante="secundario" icono={<Ban className="size-4" />} cargando={anular.isPending} disabled={ocupado} onClick={() => { if (window.confirm('¿Anular cotización?')) anular.mutate() }}>Anular</Boton></div>}{c.estado === 'EMITIDA' && !c.venta && (usuario.rol === 'ADMIN' || usuario.rol === 'VENDEDOR') && <Boton icono={<ShoppingCart className="size-4" />} onClick={() => nav(`/ventas?cotizacionId=${c.id}`)}>Pasar al POS</Boton>}</div>{c.venta && <div className="mb-4 rounded-xl border border-borde bg-superficie p-4"><strong>Convertida en venta {c.venta.numeroDocumento}</strong> · {c.venta.estado === 'ANULADA' ? 'Venta anulada' : 'Venta emitida'} · {soles(c.venta.total)} · {fechaHora(c.venta.fecha)} <Link className="ml-3 text-marca underline" to={`/ventas/${c.venta.id}`}>Ver venta</Link></div>}{(emitir.isError || anular.isError) && <MensajeError error={emitir.error ?? anular.error} className="mb-4" />}<Tarjeta className="p-5"><p>Estado: <b>{c.estado}</b></p>{c.observacion && <p>{c.observacion}</p>}<ul className="mt-4 divide-y divide-borde">{c.detalles.map((d) => <li key={d.presentacionId} className="flex justify-between py-2"><span>{d.descripcion} · {d.cantidad}</span><span>{soles(d.precioUnitario)} · <b>{soles(d.subtotal)}</b></span></li>)}</ul><p className="mt-4 text-right">IGV {soles(c.igv)} · <b>Total {soles(c.total)}</b></p></Tarjeta></div>
}
