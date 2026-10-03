import { createContext, useContext } from 'react'
import type { UsuarioResponse } from '@/api/tipos'
import { tienePermiso, type Permiso } from './permisos'

export interface ValorAuth {
  usuario: UsuarioResponse | null
  /** true si se volvio al login porque la API respondio 401 */
  sesionExpirada: boolean
  iniciarSesion: (username: string, password: string) => Promise<UsuarioResponse>
  cerrarSesion: () => void
  refrescarUsuario: (usuario: UsuarioResponse) => void
}

export const ContextoAuth = createContext<ValorAuth | null>(null)

export function useAuth(): ValorAuth {
  const valor = useContext(ContextoAuth)
  if (!valor) {
    throw new Error('useAuth debe usarse dentro de ProveedorAuth')
  }
  return valor
}

/** Usuario conectado (solo dentro de las rutas protegidas). */
export function useUsuario() {
  const { usuario } = useAuth()
  if (!usuario) {
    throw new Error('No hay un usuario conectado')
  }
  return usuario
}

export function usePermiso(permiso: Permiso): boolean {
  const { usuario } = useAuth()
  return tienePermiso(usuario?.rol, permiso)
}
