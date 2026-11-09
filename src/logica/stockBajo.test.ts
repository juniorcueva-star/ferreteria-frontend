import { describe, expect, it } from 'vitest'
import { avisoStockBajo } from './stockBajo'

describe('aviso de stock bajo al vender', () => {
  it('avisa cuando lo que queda llega al minimo', () => {
    expect(avisoStockBajo(10, 8, 5)).toEqual({ restante: 2, agotado: false })
    expect(avisoStockBajo(10, 5, 5)).toEqual({ restante: 5, agotado: false })
  })

  it('no avisa si queda mas que el minimo', () => {
    expect(avisoStockBajo(10, 4, 5)).toBeNull()
  })

  it('avisa que se agota aunque no haya minimo configurado', () => {
    expect(avisoStockBajo(3, 3, 0)).toEqual({ restante: 0, agotado: true })
  })

  it('no avisa si falta stock (ya hay otro mensaje) ni sin cantidad', () => {
    expect(avisoStockBajo(3, 4, 5)).toBeNull()
    expect(avisoStockBajo(3, 0, 5)).toBeNull()
  })

  it('maneja decimales sin errores de redondeo', () => {
    expect(avisoStockBajo(1, 0.7, 0.5)).toEqual({ restante: 0.3, agotado: false })
  })
})
