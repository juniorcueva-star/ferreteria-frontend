import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { aApiError, corregirTildes } from './errores'

function errorAxios(status: number | null, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const respuesta = status === null ? undefined : { status, statusText: '', headers: {}, config, data }
  return new AxiosError('fallo', 'ERR', config, null, respuesta)
}

describe('errores de la API', () => {
  it('conserva el formato del backend (codigo, mensaje, detalle) y corrige las tildes', () => {
    const error = aApiError(
      errorAxios(422, { codigo: 'REGLA_NEGOCIO', mensaje: 'El pago con Yape requiere el numero de operacion', detalle: [], fecha: '' }),
    )
    expect(error.codigo).toBe('REGLA_NEGOCIO')
    expect(error.message).toBe('El pago con Yape requiere el número de operación')
    expect(error.estado).toBe(422)
  })

  it('sin respuesta del servidor indica que no hay conexion', () => {
    expect(aApiError(errorAxios(null)).codigo).toBe('SIN_CONEXION')
  })

  it('si la respuesta no tiene el formato del backend usa un mensaje por estado', () => {
    const error = aApiError(errorAxios(403, '<html>'))
    expect(error.codigo).toBe('HTTP_403')
    expect(error.message).toMatch(/permiso/)
  })

  it('corrige solo palabras completas y respeta mayusculas', () => {
    expect(corregirTildes('Usuario o contrasena incorrectos')).toBe('Usuario o contraseña incorrectos')
    expect(corregirTildes('Ubicacion invalida en Almacen')).toBe('Ubicación invalida en Almacén')
    expect(corregirTildes('numerosos')).toBe('numerosos')
  })
})
