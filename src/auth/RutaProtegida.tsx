import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { SinPermiso } from '@/componentes/ui/SinPermiso'
import { useAuth } from './contexto'
import { tienePermiso, type Permiso } from './permisos'

/** Sin sesion redirige al login (recordando a donde queria ir); sin permiso muestra un aviso. */
export function RutaProtegida({ children, permiso }: { children: ReactNode; permiso?: Permiso }) {
  const { usuario } = useAuth()
  const ubicacion = useLocation()
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />
  }
  if (permiso && !tienePermiso(usuario.rol, permiso)) {
    return <SinPermiso />
  }
  return children
}
