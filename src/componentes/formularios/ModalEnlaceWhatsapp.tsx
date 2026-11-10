import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { EnlaceWhatsappResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { telefono } from '@/logica/validaciones'

const esquema = z.object({ telefono })
type Datos = z.infer<typeof esquema>

/**
 * Pide el celular (opcional: vacio = el del cliente), genera el enlace de WhatsApp con el mensaje y lo abre. Si el
 * navegador bloquea la ventana, el enlace queda visible para abrirlo con un clic.
 */
export function ModalEnlaceWhatsapp({
  titulo,
  descripcion,
  telefonoInicial,
  generar,
  onCerrar,
}: {
  titulo: string
  descripcion: string
  telefonoInicial?: string | null
  generar: (telefono: string | null) => Promise<EnlaceWhatsappResponse>
  onCerrar: () => void
}) {
  const [enlace, setEnlace] = useState<EnlaceWhatsappResponse | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { telefono: telefonoInicial ?? '' } })
  const abrir = useMutation({
    mutationFn: (d: Datos) => generar(d.telefono.trim() === '' ? null : d.telefono.replace(/[\s-]/g, '')),
    onSuccess: (respuesta) => {
      setEnlace(respuesta)
      window.open(respuesta.url, '_blank', 'noopener')
    },
  })
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={titulo}
      descripcion={descripcion}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            {enlace ? 'Cerrar' : 'Cancelar'}
          </Boton>
          <Boton type="submit" form="form-enlace-whatsapp" cargando={abrir.isPending} icono={<MessageCircle className="size-4" />}>
            Abrir WhatsApp
          </Boton>
        </>
      }
    >
      <form id="form-enlace-whatsapp" className="flex flex-col gap-4" onSubmit={handleSubmit((d) => abrir.mutate(d))} noValidate>
        <CampoTexto
          etiqueta="Celular"
          inputMode="tel"
          maxLength={11}
          placeholder="Vacío = celular del cliente"
          autoFocus
          error={errors.telefono?.message}
          {...register('telefono')}
        />
        {abrir.error && <MensajeError error={abrir.error} />}
        {enlace && (
          <div className="rounded-xl bg-crema p-4 text-sm">
            <p className="mb-2 whitespace-pre-line text-tinta-suave">{enlace.mensaje}</p>
            <a href={enlace.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-marca-texto underline" data-testid="enlace-whatsapp">
              Abrir el chat de WhatsApp
            </a>
          </div>
        )}
      </form>
    </Modal>
  )
}
