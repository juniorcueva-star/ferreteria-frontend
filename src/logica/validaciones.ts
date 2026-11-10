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

/** RUC peruano: 11 digitos que empiezan con 10, 15, 16, 17 o 20 (igual que el backend). */
export const RUC_VALIDO = /^(10|15|16|17|20)\d{9}$/
export const MENSAJE_RUC = 'RUC inválido: 11 dígitos que empiezan con 10, 15, 16, 17 o 20'
export const ruc = z.string().trim().regex(RUC_VALIDO, MENSAJE_RUC)

/** Celular peruano: 9 digitos que empiezan con 9 (se aceptan espacios o guiones al escribirlo). */
export function esCelular(texto: string): boolean {
  return /^9\d{8}$/.test(texto.replace(/[\s-]/g, ''))
}
export const MENSAJE_CELULAR = 'Celular de 9 dígitos que empieza con 9 (Ej: 987654321)'

/** Telefono opcional: vacio o celular valido. */
export const telefono = z
  .string()
  .trim()
  .refine((v) => v === '' || esCelular(v), MENSAJE_CELULAR)

/** Uno o varios celulares separados por "/" (Ej: 950 104 503 / 947 319 013). Opcional. */
export const telefonos = z
  .string()
  .trim()
  .max(60, 'Máximo 60 caracteres')
  .refine((v) => v === '' || v.split('/').every((parte) => esCelular(parte.trim())), `Cada número: ${MENSAJE_CELULAR.toLowerCase()}`)

/** Nombre de persona: solo letras (con tildes y ñ), espacios, punto, apóstrofo o guion. */
export const NOMBRE_PERSONA = /^\p{L}[\p{L} .'-]*$/u
export const MENSAJE_NOMBRE_PERSONA = 'Solo letras (sin números ni símbolos)'
export function nombrePersona(maximo: number, obligatorio = true) {
  return z
    .string()
    .trim()
    .max(maximo, `Máximo ${maximo} caracteres`)
    .refine((v) => !obligatorio || v !== '', 'Este campo es obligatorio')
    .refine((v) => v === '' || NOMBRE_PERSONA.test(v), MENSAJE_NOMBRE_PERSONA)
}

/** Nombres de empresas, productos, tiendas o categorias: pueden llevar números, pero no solo números. */
export const TIENE_LETRA = /\p{L}/u
export function conLetras(maximo: number, obligatorio = true, mensajeVacio = 'Este campo es obligatorio') {
  return z
    .string()
    .trim()
    .max(maximo, `Máximo ${maximo} caracteres`)
    .refine((v) => !obligatorio || v !== '', mensajeVacio)
    .refine((v) => v === '' || TIENE_LETRA.test(v), 'Debe tener letras, no solo números o símbolos')
}

/** Convierte "" en null para los campos opcionales de la API. */
export function nulo(texto: string | undefined | null): string | null {
  const limpio = (texto ?? '').trim()
  return limpio === '' ? null : limpio
}
