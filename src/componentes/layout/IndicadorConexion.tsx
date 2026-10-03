import { useQuery } from '@tanstack/react-query'
import { Cloud, CloudOff, LoaderCircle } from 'lucide-react'
import { useEffect } from 'react'
import { authApi } from '@/api/auth'
import { useEstadoConexion } from '@/api/conexion'
import { useAuth } from '@/auth/contexto'
import { cn } from '@/componentes/ui/cn'

/**
 * Estado real de la conexion con la API. Ademas de mirar cada respuesta, consulta /api/auth/me cada
 * 30 segundos: asi detecta si el backend se apago y refresca los datos del usuario (rol, tienda).
 */
export function IndicadorConexion() {
  const estado = useEstadoConexion()
  const { refrescarUsuario } = useAuth()
  const latido = useQuery({
    queryKey: ['latido'],
    queryFn: authApi.yo,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })

  useEffect(() => {
    if (latido.data) refrescarUsuario(latido.data)
  }, [latido.data, refrescarUsuario])

  const { refetch } = latido
  useEffect(() => {
    const alVolver = () => void refetch()
    window.addEventListener('online', alVolver)
    window.addEventListener('offline', alVolver)
    return () => {
      window.removeEventListener('online', alVolver)
      window.removeEventListener('offline', alVolver)
    }
  }, [refetch])

  const textos = {
    conectado: 'Sincronizado',
    'sin-conexion': 'Sin conexión',
    verificando: 'Conectando…',
  } as const

  return (
    <button
      type="button"
      onClick={() => void refetch()}
      title={estado === 'sin-conexion' ? 'No se puede conectar con el servidor. Clic para reintentar.' : 'Conectado con el servidor'}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap ring-1 ring-inset',
        estado === 'conectado' && 'bg-exito-claro text-exito ring-exito/20',
        estado === 'sin-conexion' && 'bg-peligro-claro text-peligro ring-peligro/20',
        estado === 'verificando' && 'bg-alerta-claro text-alerta ring-alerta/20',
      )}
      data-estado={estado}
      aria-live="polite"
    >
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {estado === 'conectado' && <Cloud className="size-4 text-marca" aria-hidden />}
      {estado === 'sin-conexion' && <CloudOff className="size-4" aria-hidden />}
      {estado === 'verificando' && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      <span className="hidden sm:inline">{textos[estado]}</span>
    </button>
  )
}
