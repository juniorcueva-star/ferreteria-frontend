import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { authApi } from '@/api/auth'
import { Boton } from '@/componentes/ui/Boton'
import { CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { contrasena } from '@/logica/validaciones'

const esquema = z
  .object({
    passwordActual: z.string().min(1, 'Ingrese su contraseña actual'),
    passwordNueva: contrasena,
    confirmacion: z.string(),
  })
  .refine((d) => d.passwordNueva === d.confirmacion, { path: ['confirmacion'], message: 'Las contraseñas no coinciden' })
  .refine((d) => d.passwordNueva !== d.passwordActual, {
    path: ['passwordNueva'],
    message: 'La nueva contraseña debe ser distinta de la actual',
  })
type Datos = z.infer<typeof esquema>

/** Cambio de la propia contrasena (cualquier usuario). */
export function FormularioCambiarPassword({ onListo }: { onListo?: () => void }) {
  const { avisar } = useAvisos()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { passwordActual: '', passwordNueva: '', confirmacion: '' },
  })
  const cambio = useMutation({
    mutationFn: (d: Datos) => authApi.cambiarPassword({ passwordActual: d.passwordActual, passwordNueva: d.passwordNueva }),
    onSuccess: () => {
      reset()
      avisar('Contraseña actualizada')
      onListo?.()
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => cambio.mutate(d))} className="flex flex-col gap-4" noValidate>
      {cambio.error && <MensajeError error={cambio.error} />}
      <CampoTexto etiqueta="Contraseña actual" type="password" autoComplete="current-password" error={errors.passwordActual?.message} {...register('passwordActual')} />
      <CampoTexto
        etiqueta="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        ayuda="Entre 8 y 72 caracteres."
        error={errors.passwordNueva?.message}
        {...register('passwordNueva')}
      />
      <CampoTexto etiqueta="Repite la nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmacion?.message} {...register('confirmacion')} />
      <div className="flex justify-end">
        <Boton type="submit" cargando={cambio.isPending}>
          Cambiar contraseña
        </Boton>
      </div>
    </form>
  )
}

export function CambiarPassword({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Cambiar contraseña" ancho="sm">
      <FormularioCambiarPassword onListo={onCerrar} />
    </Modal>
  )
}
