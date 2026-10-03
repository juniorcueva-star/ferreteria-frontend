import axios from 'axios'
import { tokenActual } from '@/auth/sesion'
import { marcarConexion } from './conexion'
import { aApiError } from './errores'

/** URL del backend: variable VITE_API_URL (por defecto http://localhost:8080). */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

/**
 * Cliente HTTP de toda la aplicacion.
 * - Agrega el token en cada peticion.
 * - Convierte los errores al formato del backend (ApiError).
 * - Si la API responde 401, avisa a la sesion para volver al login.
 * - Los arreglos se envian repetidos (productoIds=1&productoIds=2), como los espera Spring.
 */
export const http = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30_000,
  paramsSerializer: { indexes: null },
})

let alPerderSesion: (() => void) | null = null

/** Lo registra el proveedor de autenticacion: se llama cuando la API responde 401. */
export function registrarAlPerderSesion(manejador: (() => void) | null): void {
  alPerderSesion = manejador
}

http.interceptors.request.use((config) => {
  const token = tokenActual()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.params && typeof config.params === 'object') {
    config.params = limpiarParametros(config.params as Record<string, unknown>)
  }
  return config
})

http.interceptors.response.use(
  (respuesta) => {
    marcarConexion('conectado')
    return respuesta
  },
  (error: unknown) => {
    const apiError = aApiError(error)
    if (apiError.codigo === 'SIN_CONEXION') {
      marcarConexion('sin-conexion')
    } else {
      marcarConexion('conectado')
    }
    const esLogin = axios.isAxiosError(error) && error.config?.url?.includes('/auth/login')
    if (apiError.estado === 401 && !esLogin) {
      alPerderSesion?.()
    }
    return Promise.reject(apiError)
  },
)

/** Quita los filtros vacios para no enviar "texto=" o "estado=" sin valor. */
export function limpiarParametros(parametros: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(parametros).filter(([, valor]) => {
      if (valor === undefined || valor === null || valor === '') {
        return false
      }
      return !(Array.isArray(valor) && valor.length === 0)
    }),
  )
}

/** Foto del producto: el backend devuelve una URL completa; si fuera relativa se completa con la del API. */
export function urlImagen(url: string | null): string | null {
  if (!url) {
    return null
  }
  return url.startsWith('/') ? `${API_URL}${url}` : url
}
