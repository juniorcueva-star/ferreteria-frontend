import type { ResumenStockResponse, StockUbicacion } from '@/api/tipos'

/**
 * Disponibilidad de productos en todas las ubicaciones (solo lectura). Sirve para responder pedidos grandes:
 * cuanto hay en cada tienda y en el almacen.
 */

export type EstadoStock = 'cero' | 'bajo' | 'normal'

/** Cero o en stock minimo se resaltan en rojo. */
export function estadoStock(stock: Pick<StockUbicacion, 'cantidad' | 'bajo'>): EstadoStock {
  if (stock.cantidad <= 0) return 'cero'
  return stock.bajo ? 'bajo' : 'normal'
}

/** Ubicaciones distintas a la propia que tienen stock (para el punto de venta). */
export function otrasUbicacionesConStock(resumen: ResumenStockResponse, propiaId: number | undefined): StockUbicacion[] {
  return resumen.ubicaciones.filter((u) => u.ubicacionId !== propiaId && u.cantidad > 0)
}
