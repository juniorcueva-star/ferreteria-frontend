import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Layers, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useAuth } from '@/auth/contexto'
import { Boton } from '@/componentes/ui/Boton'
import { Campo, Entrada } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'

const esquema = z.object({
  username: z.string().trim().min(1, 'Ingrese su usuario').max(50, 'Máximo 50 caracteres'),
  password: z.string().min(1, 'Ingrese su contraseña').max(72, 'Máximo 72 caracteres'),
})
type DatosLogin = z.infer<typeof esquema>

export function Login() {
  const { usuario, iniciarSesion, sesionExpirada } = useAuth()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosLogin>({ resolver: zodResolver(esquema), defaultValues: { username: '', password: '' } })

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'
  if (usuario) {
    return <Navigate to={destino} replace />
  }

  const enviar = async (datos: DatosLogin) => {
    setError(null)
    try {
      await iniciarSesion(datos.username, datos.password)
      navegar(destino, { replace: true })
    } catch (e) {
      setError(e)
    }
  }

  return (
    <div className="flex min-h-full">
      <div className="hidden w-[42%] flex-col justify-between bg-lateral p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-marca">
            <Layers className="size-6" strokeWidth={2.4} aria-hidden />
          </div>
          <div>
            <p className="text-xl font-bold">TodoPernos</p>
            <p className="text-sm text-tinta-tenue">Sistema ERP</p>
          </div>
        </div>
        <div>
          <p className="text-3xl leading-snug font-bold">
            Ventas, inventario y caja de tus tiendas <span className="text-marca">en un solo lugar.</span>
          </p>
          <p className="mt-4 max-w-md text-sm text-lateral-texto">
            Controla el stock de cada tienda y del almacén, registra compras, traslados y ventas al contado o al fiado.
          </p>
        </div>
        <p className="text-xs text-tinta-tenue">Uso interno · Ferretería</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={handleSubmit(enviar)} className="w-full max-w-sm" noValidate>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-marca text-white">
              <Layers className="size-5" aria-hidden />
            </div>
            <p className="text-lg font-bold">TodoPernos</p>
          </div>
          <h1 className="text-2xl font-bold text-tinta">Iniciar sesión</h1>
          <p className="mt-1 mb-6 text-sm text-tinta-suave">Ingresa con tu usuario y contraseña.</p>

          {sesionExpirada && !error && (
            <p className="mb-4 rounded-xl border border-alerta/30 bg-alerta-claro px-4 py-3 text-sm text-tinta" role="status">
              Tu sesión expiró o fue cerrada. Vuelve a ingresar.
            </p>
          )}
          {error !== null && <MensajeError error={error} className="mb-4" />}

          <div className="flex flex-col gap-4">
            <Campo etiqueta="Usuario" error={errors.username?.message}>
              {(id, desc) => (
                <Entrada
                  id={id}
                  autoComplete="username"
                  autoFocus
                  aria-invalid={errors.username ? true : undefined}
                  aria-describedby={desc}
                  className="h-11"
                  {...register('username')}
                />
              )}
            </Campo>
            <Campo etiqueta="Contraseña" error={errors.password?.message}>
              {(id, desc) => (
                <div className="relative">
                  <Entrada
                    id={id}
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={desc}
                    className="h-11 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-tinta-tenue hover:text-tinta"
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </Campo>
            <Boton type="submit" tamano="lg" cargando={isSubmitting} icono={<LogIn className="size-4" />} className="mt-2 w-full">
              Ingresar
            </Boton>
          </div>
        </form>
      </div>
    </div>
  )
}
