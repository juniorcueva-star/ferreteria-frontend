import { describe, expect, it } from 'vitest'
import { subtotalCompraCentimos, totalesCompra } from './compras'

describe('calculo de compras', () => {
  it('multiplica cantidad por precio de la presentacion y redondea a centimos', () => {
    expect(subtotalCompraCentimos({ cantidad: '5', precioUnitario: '100' })).toBe(50000)
    expect(subtotalCompraCentimos({ cantidad: '3', precioUnitario: '0.3333' })).toBe(100)
    expect(subtotalCompraCentimos({ cantidad: 'x', precioUnitario: '1' })).toBe(0)
  })

  it('con factura separa el IGV; con boleta no hay IGV deducible', () => {
    const lineas = [
      { cantidad: '5', precioUnitario: '100' },
      { cantidad: '2', precioUnitario: '90' },
    ]
    expect(totalesCompra(lineas, 'FACTURA')).toEqual({ totalCentimos: 68000, baseCentimos: 57627, igvCentimos: 10373 })
    expect(totalesCompra(lineas, 'BOLETA')).toEqual({ totalCentimos: 68000, baseCentimos: 68000, igvCentimos: 0 })
  })
})
