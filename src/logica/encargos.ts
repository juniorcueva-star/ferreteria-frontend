import { aCentimos, dividirRedondeando, escalar } from './decimales'

/**
 * Calculos del encargo, iguales al backend: total = ROUND(cantidad x precio, 2) y recargo informativo frente al
 * precio de lista. El recargo sugerido es de 10 %: el vendedor puede cambiar el precio.
 */
export const RECARGO_SUGERIDO = 10

/** Precio con el recargo sugerido sobre el precio de lista, redondeado a 2 decimales (HALF_UP). */
export function precioConRecargo(precioLista: number, porcentaje = RECARGO_SUGERIDO): number {
  const centimos = dividirRedondeando(escalar(precioLista, 2) * BigInt(100 + porcentaje), 100n)
  return Number(centimos) / 100
}

/** Total del encargo en centimos. */
export function totalEncargoCentimos(cantidad: string, precio: string): number {
  return Number(dividirRedondeando(escalar(cantidad, 3) * escalar(precio, 2), 1000n))
}

/** Recargo en % sobre el precio de lista (null si el precio de lista es 0). */
export function recargoPorcentaje(precio: number, precioLista: number): number | null {
  if (precioLista <= 0) return null
  const diferencia = aCentimos(precio) - aCentimos(precioLista)
  return Number(dividirRedondeando(BigInt(diferencia) * 10_000n, BigInt(aCentimos(precioLista)))) / 100
}
