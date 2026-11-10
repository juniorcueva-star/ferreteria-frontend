import type { UnidadBase } from '@/api/tipos'
import { esDecimalValido } from './decimales'

/** Linea de un pedido de reposicion o de un traslado sugerido: cantidad en unidad base. */
export interface LineaReposicion {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  cantidad: string
}

/** UNIDAD: solo enteros; kilo, metro y litro: hasta 3 decimales (igual que el backend). */
export function decimalesDeUnidad(unidad: UnidadBase): number {
  return unidad === 'UNIDAD' ? 0 : 3
}

export function errorCantidad(linea: LineaReposicion, permitirCero = false): string | null {
  const decimales = decimalesDeUnidad(linea.unidadBase)
  const texto = linea.cantidad.trim()
  if (!esDecimalValido(texto, decimales)) {
    return decimales === 0 ? 'Cantidad entera' : 'Hasta 3 decimales'
  }
  return !permitirCero && Number(texto.replace(',', '.')) <= 0 ? 'Mayor que 0' : null
}

/** Agrega o reemplaza la linea de un producto (no repite productos). */
export function ponerLinea(lineas: LineaReposicion[], nueva: LineaReposicion): LineaReposicion[] {
  return lineas.some((l) => l.productoId === nueva.productoId)
    ? lineas.map((l) => (l.productoId === nueva.productoId ? { ...l, cantidad: nueva.cantidad } : l))
    : [...lineas, nueva]
}
