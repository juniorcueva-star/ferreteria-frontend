import { z } from 'zod'
import { esDecimalValido } from './decimales'

/**
 * Reglas de validacion reutilizables (zod), iguales a las del backend (Bean Validation).
 * Los numeros se validan como texto (lo que escribe el usuario) y se convierten al enviar.
 */

/** Contrasena: 8 a 72 caracteres y como maximo 72 bytes (limite de BCrypt). */
export const contrasena = z
  .string()
  .min(8, 'Debe tener al menos 8 caracteres')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'Es demasiado larga (máximo 72 bytes)')

export function textoOpcional(maximo: number) {
  return z.string().trim().max(maximo, `Máximo ${maximo} caracteres`)
}

export function textoObligatorio(maximo: number, mensaje = 'Este campo es obligatorio') {
  return z.string().trim().min(1, mensaje).max(maximo, `Máximo ${maximo} caracteres`)
}

/** Monto en soles: 0 o mas, hasta 2 decimales. */
export const monto = z
  .string()
  .trim()
  .refine((v) => esDecimalValido(v, 2), 'Monto inválido (use números con hasta 2 decimales)')

/** Monto mayor que cero. */
export const montoPositivo = monto.refine((v) => Number(v.replace(',', '.')) > 0, 'Debe ser mayor que 0')

/** Cantidad positiva con hasta 3 decimales (o entera si `decimales` = 0). */
export function cantidad(decimales = 3) {
  return z
    .string()
    .trim()
    .refine(
      (v) => esDecimalValido(v, decimales),
      decimales === 0 ? 'Use un número entero' : `Cantidad inválida (hasta ${decimales} decimales)`,
    )
    .refine((v) => Number(v.replace(',', '.')) > 0, 'Debe ser mayor que 0')
    .refine((v) => Number(v.replace(',', '.')) <= 1_000_000, 'Máximo 1 000 000')
}

/** Motivo de anulacion o ajuste (queda en el historial). */
export function motivo(maximo = 250) {
  return z.string().trim().min(5, 'Escriba un motivo de al menos 5 caracteres').max(maximo, `Máximo ${maximo} caracteres`)
}

export const ruc = z.string().trim().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos')

/** Convierte "" en null para los campos opcionales de la API. */
export function nulo(texto: string | undefined | null): string | null {
  const limpio = (texto ?? '').trim()
  return limpio === '' ? null : limpio
}
