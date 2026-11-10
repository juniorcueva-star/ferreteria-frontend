import type { PresentacionResponse } from '@/api/tipos'
import { dividirRedondeando, esDecimalValido, escalar } from './decimales'

/** Pieza de un completo mientras se edita: producto, presentacion elegida y cantidad por cada completo. */
export interface PiezaEditable {
  clave: number
  productoId: number
  productoNombre: string
  presentaciones: PresentacionResponse[]
  presentacionId: number
  cantidad: string
}

export function presentacionDePieza(pieza: PiezaEditable): PresentacionResponse | undefined {
  return pieza.presentaciones.find((p) => p.id === pieza.presentacionId)
}

/** Error de la cantidad de una pieza (respeta los decimales de su presentacion), o null si es valida. */
export function errorPieza(pieza: PiezaEditable): string | null {
  const presentacion = presentacionDePieza(pieza)
  const decimales = presentacion?.decimales ?? 0
  if (!esDecimalValido(pieza.cantidad, decimales) || Number(pieza.cantidad.replace(',', '.')) <= 0) {
    return decimales === 0 ? 'Cantidad entera mayor que 0' : `Mayor que 0, hasta ${decimales} decimales`
  }
  return null
}

/** Suma de las piezas a precio de lista, en centimos: ROUND(cantidad x precio, 2) por pieza (igual que el backend). */
export function sumaPiezasCentimos(piezas: PiezaEditable[]): number {
  return piezas.reduce((suma, p) => {
    const presentacion = presentacionDePieza(p)
    if (!presentacion || errorPieza(p)) return suma
    return suma + Number(dividirRedondeando(escalar(p.cantidad, 3) * escalar(presentacion.precioVenta, 2), 1000n))
  }, 0)
}

/** Errores generales del completo: sin piezas, piezas repetidas o con cantidad invalida. */
export function erroresCompleto(nombre: string, piezas: PiezaEditable[], precio: string): string[] {
  const usadas = new Set<number>()
  const repetida = piezas.some((p) => (usadas.has(p.presentacionId) ? true : (usadas.add(p.presentacionId), false)))
  return [
    ...(nombre.trim() === '' ? ['Escriba el nombre del completo (Ej: Completo, Con tuerca)'] : []),
    ...(piezas.length === 0 ? ['Agregue al menos una pieza'] : []),
    ...(repetida ? ['Hay una pieza repetida: sume la cantidad en una sola línea'] : []),
    ...(piezas.some((p) => errorPieza(p) !== null) ? ['Revise las cantidades de las piezas'] : []),
    ...(precio.trim() !== '' && !esDecimalValido(precio, 2) ? ['Precio inválido (hasta 2 decimales)'] : []),
  ]
}
