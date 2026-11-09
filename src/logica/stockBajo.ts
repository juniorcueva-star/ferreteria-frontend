/**
 * Aviso de stock bajo en el punto de venta: cuanto queda en la tienda despues de vender lo del carrito.
 * Se avisa cuando lo que queda llega al stock minimo (o a 0), para que el vendedor pida reposicion.
 * Las cantidades estan en unidad base; varias lineas del mismo producto (unidad y docena) se suman antes.
 */
export interface AvisoStock {
  restante: number
  agotado: boolean
}

export function avisoStockBajo(disponible: number, enCarritoBase: number, minimo: number): AvisoStock | null {
  const restante = Math.round((disponible - enCarritoBase) * 1000) / 1000
  if (enCarritoBase <= 0 || restante < 0) return null // sin cantidad, o falta stock (eso tiene su propio mensaje)
  if (restante === 0) return { restante, agotado: true }
  return restante <= minimo ? { restante, agotado: false } : null
}
