import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { motivo } from '@/logica/validaciones'

const esquema = z.object({ motivo: motivo(250) })

/** Pide el motivo obligatorio para anular una venta, compra o traslado. */
export function ConfirmarAnulacion({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  onConfirmar,
  cargando,
  error,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion: string
  onConfirmar: (motivo: string) => void
  cargando: boolean
  error: unknown
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ motivo: string }>({ resolver: zodResolver(esquema), defaultValues: { motivo: '' } })

  useEffect(() => {
    if (abierto) reset({ motivo: '' })
  }, [abierto, reset])

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      descripcion={descripcion}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="peligro" cargando={cargando} onClick={handleSubmit((d) => onConfirmar(d.motivo))}>
            Confirmar anulación
          </Boton>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => onConfirmar(d.motivo))} className="flex flex-col gap-4" noValidate>
        {error !== null && error !== undefined && <MensajeError error={error} />}
        <CampoArea etiqueta="Motivo" obligatorio placeholder="Ej: el cliente cambió de opinión" error={errors.motivo?.message} {...register('motivo')} />
      </form>
    </Modal>
  )
}
