import type { LoginResponse, UsuarioResponse } from '@/api/tipos'

/**
 * La sesion se guarda en sessionStorage: dura mientras la pestana del navegador este abierta
 * y se borra al cerrarla. Nunca se usa localStorage para el token.
 */
const CLAVE = 'todopernos.sesion'

export interface Sesion {
  token: string
  expiraEn: string
  usuario: UsuarioResponse
}

export function leerSesion(): Sesion | null {
  try {
    const texto = sessionStorage.getItem(CLAVE)
    if (!texto) {
      return null
    }
    const sesion = JSON.parse(texto) as Sesion
    if (!sesion.token || new Date(sesion.expiraEn).getTime() <= Date.now()) {
      sessionStorage.removeItem(CLAVE)
      return null
    }
    return sesion
  } catch {
    return null
  }
}

export function guardarSesion(login: LoginResponse): Sesion {
  const sesion: Sesion = { token: login.token, expiraEn: login.expiraEn, usuario: login.usuario }
  sessionStorage.setItem(CLAVE, JSON.stringify(sesion))
  return sesion
}

export function actualizarUsuarioSesion(usuario: UsuarioResponse): void {
  const sesion = leerSesion()
  if (sesion) {
    sessionStorage.setItem(CLAVE, JSON.stringify({ ...sesion, usuario }))
  }
}

export function borrarSesion(): void {
  sessionStorage.removeItem(CLAVE)
}

export function tokenActual(): string | null {
  return leerSesion()?.token ?? null
}
