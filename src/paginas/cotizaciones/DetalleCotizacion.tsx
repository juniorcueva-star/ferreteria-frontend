import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Download, FileCheck2, Mail, MessageCircle, Pencil, Printer, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { cotizacionesApi } from '@/api/cotizaciones'
import type { CotizacionResponse } from '@/api/tipos'
import { ConfirmarAnulacion } from '@/componentes/formularios/ConfirmarAnulacion'
import { Boton } from '@/componentes/ui/Boton'
import { Dato } from '@/componentes/ui/Dato'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useDocumentoPdf } from '@/hooks/useDocumentoPdf'
import { NOMBRE_COTIZACION, TONO_COTIZACION } from '@/logica/cotizaciones'
import { cantidad, fecha, hoyLima, soles } from '@/logica/formato'
import { ModalCorreo, ModalWhatsapp } from './AccionesEnvio'
import { ModalConversion } from './ModalConversion'

type Dialogo = 'correo' | 'whatsapp' | 'convertir' | 'anular' | null

/** Detalle de una cotizacion con sus acciones: PDF, imprimir, correo, WhatsApp, convertir en venta, emitir y anular. */
export default function DetalleCotizacion() {
  const { id } = useParams()
  const cotizacionId = Number(id)
  const consulta = useQuery({ queryKey: ['cotizaciones', 'detalle', cotizacionId], queryFn: () => cotizacionesApi.obtener(cotizacionId) })

  if (consulta.isPending) return <Cargando />
  if (consulta.isError) return <MensajeError error={consulta.error} />
  return <Ficha c={consulta.data} />
}

function Ficha({ c }: { c: CotizacionResponse }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const activa = c.estado !== 'ANULADA'
  const convertible = activa && c.ventaId === null
  const vencida = c.fechaValidez < hoyLima()

  const alCambiar = (actualizada: CotizacionResponse, mensaje: string) => {
    avisar(mensaje)
    queryClient.setQueryData(['cotizaciones', 'detalle', actualizada.id], actualizada)
    void queryClient.invalidateQueries({ queryKey: ['cotizaciones', 'listado'] })
  }
  const emitir = useMutation({
    mutationFn: () => cotizacionesApi.emitir(c.id),
    onSuccess: (r) => alCambiar(r, `Cotización ${r.codigo} emitida: ya no se puede editar`),
  })
  const anular = useMutation({
    mutationFn: (motivo: string) => cotizacionesApi.anular(c.id, { motivo }),
    onSuccess: (r) => {
      setDialogo(null)
      alCambiar(r, `Cotización ${r.codigo} anulada`)
    },
  })
  const pdf = useDocumentoPdf(() => cotizacionesApi.pdf(c.id), `${c.codigo}.pdf`)
  const errorAccion = emitir.error ?? pdf.error

  return (
    <div>
      <Link to="/cotizaciones" className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca-texto">
        <ArrowLeft className="size-4" /> Volver a cotizaciones
      </Link>
      <EncabezadoPagina
        titulo={`Cotización ${c.codigo}`}
        subtitulo={`${c.empresaRazonSocial} (RUC ${c.empresaRuc}) · ${c.ubicacionNombre}`}
        acciones={
          <>
            {c.estado === 'BORRADOR' && (
              <>
                <Boton variante="secundario" icono={<Pencil className="size-4" />} onClick={() => navegar(`/cotizaciones/${c.id}/editar`)}>
                  Editar
                </Boton>
                <Boton variante="secundario" icono={<FileCheck2 className="size-4" />} cargando={emitir.isPending} onClick={() => emitir.mutate()}>
                  Emitir
                </Boton>
              </>
            )}
            {convertible && (
              <Boton icono={<ShoppingCart className="size-4" />} onClick={() => setDialogo('convertir')}>
                Convertir en nota de venta
              </Boton>
            )}
          </>
        }
      />

      {activa && (
        <Tarjeta className="mb-5 flex flex-wrap gap-2 p-4" aria-label="Acciones de la cotización">
          <Boton variante="secundario" icono={<Download className="size-4" />} cargando={pdf.descargando} onClick={pdf.descargar}>
            Descargar PDF
          </Boton>
          <Boton
            variante="secundario"
            icono={<Printer className="size-4" />}
            cargando={pdf.imprimiendo}
            onClick={pdf.imprimir}
          >
            Imprimir
          </Boton>
          <Boton variante="secundario" icono={<Mail className="size-4" />} onClick={() => setDialogo('correo')}>
            Enviar por correo
          </Boton>
          <Boton variante="secundario" icono={<MessageCircle className="size-4" />} onClick={() => setDialogo('whatsapp')}>
            Enviar por WhatsApp
          </Boton>
          {c.ventaId === null && (
            <Boton variante="fantasma" icono={<Ban className="size-4" />} onClick={() => setDialogo('anular')} className="ml-auto">
              Anular
            </Boton>
          )}
        </Tarjeta>
      )}
      {errorAccion && <MensajeError error={errorAccion} className="mb-5" />}
      {c.ventaId !== null && (
        <p className="mb-5 rounded-xl border border-exito/20 bg-exito-claro px-4 py-3 text-sm" role="status" data-testid="venta-de-cotizacion">
          Convertida en la nota de venta{' '}
          <Link to={`/ventas/${c.ventaId}`} className="font-mono font-semibold text-marca-texto underline">
            {c.ventaNumero}
          </Link>
          .
        </p>
      )}
      {convertible && vencida && (
        <p className="mb-5 rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="status">
          La cotización venció el {fecha(c.fechaValidez)}. Revise los precios con el cliente antes de convertirla.
        </p>
      )}

      <Tarjeta className="mb-5 grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Dato titulo="Estado">
          <Insignia tono={TONO_COTIZACION[c.estado]}>{NOMBRE_COTIZACION[c.estado]}</Insignia>
        </Dato>
        <Dato titulo="Fecha">{fecha(c.fecha)}</Dato>
        <Dato titulo="Válida hasta">{fecha(c.fechaValidez)}</Dato>
        <Dato titulo="Atendido por">{c.usuario}</Dato>
        <Dato titulo="Cliente">
          {c.clienteNombre ?? 'Cliente varios'}
          {c.clienteDocumento && <span className="block font-mono text-xs text-tinta-tenue">{c.clienteDocumento}</span>}
        </Dato>
        {c.observacion && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Dato titulo="Observación">{c.observacion}</Dato>
          </div>
        )}
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
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
            {c.detalles.map((d) => (
              <Tr key={d.presentacionId}>
                <Td className="font-medium">{d.descripcion}</Td>
                <Td alinear="derecha" className="font-mono">
                  {cantidad(d.cantidad)}
                </Td>
                <Td alinear="derecha" className="font-mono">
                  {soles(d.precioUnitario)}
                </Td>
                <Td alinear="derecha" className="font-mono text-tinta-suave">
                  {d.descuento > 0 ? soles(d.descuento) : '—'}
                </Td>
                <Td alinear="derecha" className="font-mono font-semibold">
                  {soles(d.subtotal)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <dl className="space-y-1 border-t border-borde bg-crema/50 px-5 py-4 text-sm">
          <Linea titulo="Op. gravada" valor={soles(c.subtotal)} />
          <Linea titulo="IGV (18 %)" valor={soles(c.igv)} />
          {c.descuento > 0 && <Linea titulo="Descuentos" valor={`−${soles(c.descuento)}`} />}
          <div className="flex justify-between pt-1 text-lg font-bold">
            <dt>Total</dt>
            <dd className="font-mono" data-testid="total-cotizacion">
              {soles(c.total)}
            </dd>
          </div>
        </dl>
      </Tarjeta>

      {dialogo === 'correo' && <ModalCorreo cotizacion={c} onCerrar={() => setDialogo(null)} />}
      {dialogo === 'whatsapp' && <ModalWhatsapp cotizacion={c} onCerrar={() => setDialogo(null)} />}
      {dialogo === 'convertir' && <ModalConversion cotizacion={c} onCerrar={() => setDialogo(null)} />}
      <ConfirmarAnulacion
        abierto={dialogo === 'anular'}
        onCerrar={() => {
          anular.reset()
          setDialogo(null)
        }}
        titulo={`Anular cotización ${c.codigo}`}
        descripcion="La cotización no tocó el stock. Anulada ya no se puede enviar ni convertir en venta."
        cargando={anular.isPending}
        error={anular.error}
        onConfirmar={(motivo) => anular.mutate(motivo)}
      />
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
