import type { TipoComprobanteCompra } from '@/api/tipos'
import { dividirRedondeando, esDecimalValido, escalar } from './decimales'
import { separarIgv } from './carrito'

/**
 * Calculo de una compra igual al backend (CompraService):
 *   subtotal de linea = ROUND(cantidad x precio por presentacion, 2)
 *   total = suma de lineas (precios con IGV)
 *   con FACTURA se separa base e IGV (credito fiscal); con otros comprobantes el IGV es 0.
 */
export interface LineaCompraCalculo {
  cantidad: string
  precioUnitario: string
}

export function subtotalCompraCentimos(linea: LineaCompraCalculo): number {
  if (!esDecimalValido(linea.cantidad, 3) || !esDecimalValido(linea.precioUnitario, 4)) return 0
  const producto = escalar(linea.cantidad, 3) * escalar(linea.precioUnitario, 4)
  return Number(dividirRedondeando(producto, 100_000n))
}

export function totalesCompra(lineas: LineaCompraCalculo[], comprobante: TipoComprobanteCompra) {
  const totalCentimos = lineas.reduce((suma, l) => suma + subtotalCompraCentimos(l), 0)
  if (comprobante !== 'FACTURA') {
    return { totalCentimos, baseCentimos: totalCentimos, igvCentimos: 0 }
  }
  return { totalCentimos, ...separarIgv(totalCentimos) }
}
