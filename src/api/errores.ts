import { isAxiosError } from 'axios'
import type { ErrorResponse } from './tipos'

/**
 * Error de la API ya normalizado con el formato del backend (codigo, mensaje, detalle).
 * Si el servidor no responde se usa el codigo SIN_CONEXION.
 */
export class ApiError extends Error {
  readonly codigo: string
  readonly detalle: string[]
  readonly estado: number | null

  constructor(codigo: string, mensaje: string, detalle: string[] = [], estado: number | null = null) {
    super(mensaje)
    this.name = 'ApiError'
    this.codigo = codigo
    this.detalle = detalle
    this.estado = estado
  }
}

function esErrorResponse(valor: unknown): valor is ErrorResponse {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }
  const posible = valor as Record<string, unknown>
  return typeof posible.codigo === 'string' && typeof posible.mensaje === 'string'
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró lo que buscabas.',
  500: 'Ocurrió un error en el servidor. Inténtalo nuevamente.',
}

/**
 * El backend escribe sus mensajes sin tildes ("contrasena", "ubicacion"). Para que la interfaz se lea en espanol
 * correcto se corrigen las palabras mas frecuentes de esos mensajes. Solo se aplica a mensajes de error, nunca a datos.
 */
const TILDES: Record<string, string> = {
  almacen: 'almacén',
  anulacion: 'anulación',
  categoria: 'categoría',
  codigo: 'código',
  condicion: 'condición',
  contrasena: 'contraseña',
  credito: 'crédito',
  dia: 'día',
  digitos: 'dígitos',
  emision: 'emisión',
  extranjeria: 'extranjería',
  mas: 'más',
  maximo: 'máximo',
  metodo: 'método',
  numero: 'número',
  operacion: 'operación',
  pequena: 'pequeña',
  presentacion: 'presentación',
  sesion: 'sesión',
  telefono: 'teléfono',
  ubicacion: 'ubicación',
  validacion: 'validación',
  valido: 'válido',
  validos: 'válidos',
}

export function corregirTildes(texto: string): string {
  return texto.replace(/[A-Za-z]+/g, (palabra) => {
    const correccion = TILDES[palabra.toLowerCase()]
    if (!correccion) return palabra
    return palabra[0] === palabra[0]?.toUpperCase() ? correccion.charAt(0).toUpperCase() + correccion.slice(1) : correccion
  })
}

/** Convierte cualquier error (Axios, red, codigo) en un ApiError con un mensaje claro en espanol. */
export function aApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }
  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(
        'SIN_CONEXION',
        'No se pudo conectar con el servidor. Revisa que el backend esté encendido y tu conexión.',
      )
    }
    const { status, data } = error.response
    if (esErrorResponse(data)) {
      const detalle = Array.isArray(data.detalle) ? data.detalle.map(corregirTildes) : []
      return new ApiError(data.codigo, corregirTildes(data.mensaje), detalle, status)
    }
    return new ApiError(
      `HTTP_${status}`,
      MENSAJES_POR_ESTADO[status] ?? `El servidor respondió con el estado ${status}.`,
      [],
      status,
    )
  }
  if (error instanceof Error) {
    return new ApiError('ERROR_CLIENTE', error.message)
  }
  return new ApiError('ERROR_CLIENTE', 'Ocurrió un error inesperado.')
}
