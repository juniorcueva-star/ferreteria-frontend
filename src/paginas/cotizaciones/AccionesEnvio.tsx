import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { cotizacionesApi } from '@/api/cotizaciones'
import type { CotizacionResponse, EnlaceWhatsappResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea, CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { nulo, textoOpcional } from '@/logica/validaciones'

const esquemaCorreo = z.object({
  destinatario: z
    .string()
    .trim()
    .min(1, 'Ingrese el correo del cliente')
    .max(150)
    .refine((v) => z.email().safeParse(v).success, 'Correo inválido'),
  mensaje: textoOpcional(500),
})
type DatosCorreo = z.infer<typeof esquemaCorreo>

/** Envia el PDF de la cotizacion como adjunto al correo que se indique. */
export function ModalCorreo({ cotizacion, onCerrar }: { cotizacion: CotizacionResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosCorreo>({ resolver: zodResolver(esquemaCorreo), defaultValues: { destinatario: '', mensaje: '' } })
  const enviar = useMutation({
    mutationFn: (datos: DatosCorreo) => cotizacionesApi.enviarCorreo(cotizacion.id, datos.destinatario, nulo(datos.mensaje)),
    onSuccess: (c, datos) => {
      avisar(`Cotización ${c.codigo} enviada a ${datos.destinatario}`)
      queryClient.setQueryData(['cotizaciones', 'detalle', c.id], c)
      void queryClient.invalidateQueries({ queryKey: ['cotizaciones', 'listado'] })
      onCerrar()
    },
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Enviar ${cotizacion.codigo} por correo`}
      descripcion="El PDF de la cotización va como archivo adjunto."
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-correo" cargando={enviar.isPending}>
            Enviar correo
          </Boton>
        </>
      }
    >
      <form id="form-correo" className="flex flex-col gap-4" onSubmit={handleSubmit((d) => enviar.mutate(d))} noValidate>
        <CampoTexto etiqueta="Correo del cliente" type="email" obligatorio autoFocus error={errors.destinatario?.message} {...register('destinatario')} />
        <CampoArea etiqueta="Mensaje (opcional)" rows={3} error={errors.mensaje?.message} {...register('mensaje')} />
        {enviar.error && <MensajeError error={enviar.error} />}
      </form>
    </Modal>
  )
}

const esquemaWhatsapp = z.object({
  telefono: z
    .string()
    .trim()
    .transform((t) => t.replace(/[\s-]/g, ''))
    .refine((t) => /^(\+?51)?9\d{8}$/.test(t), 'Celular de 9 dígitos que empieza con 9 (Ej: 987654321)'),
})
type EntradaWhatsapp = z.input<typeof esquemaWhatsapp>
type DatosWhatsapp = z.output<typeof esquemaWhatsapp>

/**
 * Genera el enlace de WhatsApp con el resumen y el enlace publico del PDF, y lo abre en una pestana nueva.
 * Si el navegador bloquea la ventana, el enlace queda visible para abrirlo con un clic.
 */
export function ModalWhatsapp({ cotizacion, onCerrar }: { cotizacion: CotizacionResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const [enlace, setEnlace] = useState<EnlaceWhatsappResponse | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EntradaWhatsapp, unknown, DatosWhatsapp>({
    resolver: zodResolver(esquemaWhatsapp),
    defaultValues: { telefono: '' },
  })
  const generar = useMutation({
    mutationFn: (datos: DatosWhatsapp) => cotizacionesApi.enlaceWhatsapp(cotizacion.id, datos.telefono),
    onSuccess: (respuesta) => {
      setEnlace(respuesta)
      void queryClient.invalidateQueries({ queryKey: ['cotizaciones'] })
      window.open(respuesta.url, '_blank', 'noopener')
    },
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Enviar ${cotizacion.codigo} por WhatsApp`}
      descripcion="Se abre WhatsApp con el resumen y un enlace para descargar el PDF."
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            {enlace ? 'Cerrar' : 'Cancelar'}
          </Boton>
          <Boton type="submit" form="form-whatsapp" cargando={generar.isPending} icono={<MessageCircle className="size-4" />}>
            Abrir WhatsApp
          </Boton>
        </>
      }
    >
      <form id="form-whatsapp" className="flex flex-col gap-4" onSubmit={handleSubmit((d) => generar.mutate(d))} noValidate>
        <CampoTexto etiqueta="Celular del cliente" inputMode="tel" obligatorio autoFocus placeholder="987654321" error={errors.telefono?.message} {...register('telefono')} />
        {generar.error && <MensajeError error={generar.error} />}
        {enlace && (
          <div className="rounded-xl bg-crema p-4 text-sm">
            <p className="mb-2 whitespace-pre-line text-tinta-suave">{enlace.mensaje}</p>
            <a href={enlace.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-marca underline" data-testid="enlace-whatsapp">
              Abrir el chat de WhatsApp
            </a>
          </div>
        )}
      </form>
    </Modal>
  )
}
