import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Download, HandCoins, MessageCircle, Printer, Receipt } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ventasApi } from '@/api/ventas'
import { usePermiso } from '@/auth/contexto'
import { ConfirmarAnulacion } from '@/componentes/formularios/ConfirmarAnulacion'
import { ModalAbono } from '@/componentes/formularios/ModalAbono'
import { ModalEnlaceWhatsapp } from '@/componentes/formularios/ModalEnlaceWhatsapp'
import { Boton } from '@/componentes/ui/Boton'
import { Dato } from '@/componentes/ui/Dato'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { TONO_VENTA } from '@/componentes/ui/tonos'
import { useDocumentoPdf } from '@/hooks/useDocumentoPdf'
import { cantidad, fecha, fechaHora, NOMBRE_CONDICION, nombreMetodoPago, soles } from '@/logica/formato'
import { etiquetaTipoPrecio } from '@/logica/precioMayor'

/** Detalle de una venta: lineas, pagos y abonos; permite anular y registrar abonos. */
export default function DetalleVenta() {
  const { id } = useParams()
  const ventaId = Number(id)
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const puedeAnular = usePermiso('ventas.anular')
  const puedeAbonar = usePermiso('fiado.ver')
  const [anulando, setAnulando] = useState(false)
  const [abonando, setAbonando] = useState(false)
  const [whatsapp, setWhatsapp] = useState(false)
  const consulta = useQuery({ queryKey: ['ventas', 'detalle', ventaId], queryFn: () => ventasApi.obtener(ventaId) })
  const pdf = useDocumentoPdf(() => ventasApi.pdf(ventaId), `${consulta.data?.numeroDocumento ?? `venta-${ventaId}`}.pdf`)
  const ticket = useDocumentoPdf(() => ventasApi.ticket(ventaId), `ticket-${consulta.data?.numeroDocumento ?? ventaId}.pdf`)
  const anular = useMutation({
    mutationFn: (motivo: string) => ventasApi.anular(ventaId, { motivo }),
    onSuccess: (v) => {
      setAnulando(false)
      avisar(`Venta ${v.numeroDocumento} anulada: el stock volvió a la tienda`)
      queryClient.setQueryData(['ventas', 'detalle', v.id], v)
      for (const clave of ['ventas', 'inventario', 'cajas', 'fiado', 'reportes', 'inicio']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
    },
  })

  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <MensajeError error={consulta.error} />
  const v = consulta.data

  return (
    <div>
      <Link to="/ventas/historial" className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca-texto">
        <ArrowLeft className="size-4" /> Volver a ventas
      </Link>
      <EncabezadoPagina
        titulo={`Venta ${v.numeroDocumento}`}
        subtitulo={`Nota de venta · ${v.empresaRazonSocial} (RUC ${v.empresaRuc})`}
        acciones={
          <>
            <Boton variante="secundario" icono={<Download className="size-4" />} cargando={pdf.descargando} onClick={pdf.descargar}>
              Descargar PDF
            </Boton>
            <Boton variante="secundario" icono={<Printer className="size-4" />} cargando={pdf.imprimiendo} onClick={pdf.imprimir}>
              Imprimir A4
            </Boton>
            <Boton variante="secundario" icono={<Receipt className="size-4" />} cargando={ticket.imprimiendo} onClick={ticket.imprimir}>
              Ticket
            </Boton>
            <Boton variante="secundario" icono={<MessageCircle className="size-4" />} onClick={() => setWhatsapp(true)}>
              WhatsApp
            </Boton>
            {puedeAbonar && v.estado === 'EMITIDA' && v.saldoPendiente > 0 && (
              <Boton icono={<HandCoins className="size-4" />} onClick={() => setAbonando(true)}>
                Registrar abono
              </Boton>
            )}
            {puedeAnular && v.estado === 'EMITIDA' && (
              <Boton variante="secundario" icono={<Ban className="size-4" />} onClick={() => setAnulando(true)}>
                Anular venta
              </Boton>
            )}
          </>
        }
      />
      {(pdf.error ?? ticket.error) && <MensajeError error={pdf.error ?? ticket.error} className="mb-5" />}
      {v.estado === 'ANULADA' && (
        <p className="mb-5 rounded-xl border border-peligro/20 bg-peligro-claro px-4 py-3 text-sm text-tinta" role="status">
          <strong className="text-peligro">Venta anulada.</strong> Motivo: {v.motivoAnulacion}
        </p>
      )}

      <Tarjeta className="mb-5 grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Dato titulo="Estado">
          <Insignia tono={TONO_VENTA[v.estado]}>{v.estado === 'EMITIDA' ? 'Emitida' : 'Anulada'}</Insignia>
        </Dato>
        <Dato titulo="Fecha">{fechaHora(v.fecha)}</Dato>
        <Dato titulo="Tienda">{v.ubicacionNombre}</Dato>
        <Dato titulo="Vendedor">
          {v.vendedor} · caja N.° {v.cajaId}
        </Dato>
        <Dato titulo="Cliente">{v.clienteNombre ?? 'Público general'}</Dato>
        <Dato titulo="Condición">{NOMBRE_CONDICION[v.condicion]}</Dato>
        {v.condicion === 'CREDITO' && <Dato titulo="Vencimiento">{fecha(v.fechaVencimiento)}</Dato>}
        {v.condicion === 'CREDITO' && (
          <Dato titulo="Saldo pendiente">
            <span className={v.saldoPendiente > 0 ? 'font-mono font-bold text-alerta' : 'font-mono text-exito'}>{soles(v.saldoPendiente)}</span>
          </Dato>
        )}
      </Tarjeta>

      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta className="overflow-hidden xl:col-span-2">
          <TituloTarjeta titulo="Productos" />
          <Tabla>
            <Thead>
              <tr>
                <Th>Descripción</Th>
                <Th alinear="derecha">Cantidad</Th>
                <Th alinear="derecha">Precio</Th>
                <Th alinear="derecha">Descuento</Th>
                <Th alinear="derecha">Subtotal</Th>
              </tr>
            </Thead>
            <Tbody>
              {v.detalles.map((d, i) => (
                <Tr key={i}>
                  <Td>
                    <p className="font-medium">{d.descripcion}</p>
                    {etiquetaTipoPrecio(d.tipoPrecio) && (
                      <span className="mt-0.5 inline-block rounded bg-marca px-1.5 py-px text-[11px] font-bold text-sobre-marca" data-testid="tipo-precio">
                        {etiquetaTipoPrecio(d.tipoPrecio)}
                      </span>
                    )}
                    {d.composicion ? (
                      <p className="text-xs text-tinta-tenue">Incluye: {d.composicion}</p>
                    ) : (
                      <p className="font-mono text-xs text-tinta-tenue">= {cantidad(d.cantidadBase)} en unidad base</p>
                    )}
                  </Td>
                  <Td alinear="derecha" className="font-mono">{cantidad(d.cantidad)}</Td>
                  <Td alinear="derecha" className="font-mono">{soles(d.precioUnitario)}</Td>
                  <Td alinear="derecha" className="font-mono text-tinta-suave">{d.descuento > 0 ? soles(d.descuento) : '—'}</Td>
                  <Td alinear="derecha" className="font-mono font-semibold">{soles(d.subtotal)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Tabla>
          <dl className="space-y-1 border-t border-borde bg-crema/50 px-5 py-4 text-sm">
            <Linea titulo="Op. gravada" valor={soles(v.subtotal)} />
            <Linea titulo="IGV (18 %)" valor={soles(v.igv)} />
            {v.descuento > 0 && <Linea titulo="Descuentos" valor={`−${soles(v.descuento)}`} />}
            <div className="flex justify-between pt-1 text-lg font-bold">
              <dt>Total</dt>
              <dd className="font-mono">{soles(v.total)}</dd>
            </div>
          </dl>
        </Tarjeta>

        <Tarjeta className="self-start overflow-hidden">
          <TituloTarjeta titulo="Pagos y abonos" />
          {v.pagos.length === 0 ? (
            <p className="px-5 py-4 text-sm text-tinta-suave">Sin pagos: todo quedó como deuda.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {v.pagos.map((p) => (
                <li key={p.id} className="px-5 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {nombreMetodoPago(p.metodoPago)} {p.tipo === 'ABONO' && <Insignia tono="info">Abono</Insignia>}
                    </span>
                    <span className={p.estado === 'ANULADO' ? 'font-mono text-tinta-tenue line-through' : 'font-mono font-semibold'}>{soles(p.monto)}</span>
                  </div>
                  <p className="text-xs text-tinta-tenue">
                    {fechaHora(p.fecha)} · {p.usuario} · caja {p.cajaId}
                    {p.numeroOperacion && <> · Op. <span className="font-mono">{p.numeroOperacion}</span></>}
                    {p.estado === 'ANULADO' && ' · anulado'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <ConfirmarAnulacion
        abierto={anulando}
        onCerrar={() => {
          anular.reset()
          setAnulando(false)
        }}
        titulo={`Anular venta ${v.numeroDocumento}`}
        descripcion="Se devuelve el stock, se anulan los pagos (salen del cuadre de caja) y la deuda queda en 0."
        cargando={anular.isPending}
        error={anular.error}
        onConfirmar={(motivo) => anular.mutate(motivo)}
      />
      {abonando && <ModalAbono venta={v} onCerrar={() => setAbonando(false)} />}
      {whatsapp && (
        <ModalEnlaceWhatsapp
          titulo={`Enviar ${v.numeroDocumento} por WhatsApp`}
          descripcion="Se abre WhatsApp con el resumen y un enlace para descargar la nota de venta en PDF."
          generar={(telefono) => ventasApi.enlaceWhatsapp(v.id, telefono)}
          onCerrar={() => setWhatsapp(false)}
        />
      )}
    </div>
  )
}

function Linea({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-tinta-suave">
      <dt>{titulo}</dt>
      <dd className="font-mono">{valor}</dd>
    </div>
  )
}
