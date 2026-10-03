import { describe, expect, it } from 'vitest'
import { aCentimos, dividirRedondeando, esDecimalValido, escalar } from './decimales'

describe('decimales', () => {
  it('convierte a centimos sin errores de punto flotante', () => {
    expect(aCentimos(0.1) + aCentimos(0.2)).toBe(30)
    expect(aCentimos('12.35')).toBe(1235)
    expect(aCentimos('7')).toBe(700)
  })

  it('redondea HALF_UP como BigDecimal y PostgreSQL', () => {
    expect(escalar('2.345', 2)).toBe(235n)
    expect(escalar('2.344', 2)).toBe(234n)
    expect(escalar('-2.345', 2)).toBe(-235n)
    expect(escalar('0.0005', 3)).toBe(1n)
    expect(dividirRedondeando(5n, 2n)).toBe(3n)
    expect(dividirRedondeando(-5n, 2n)).toBe(-3n)
  })

  it('acepta coma decimal y rechaza textos invalidos', () => {
    expect(escalar('1,5', 1)).toBe(15n)
    expect(() => escalar('abc', 2)).toThrow()
    expect(esDecimalValido('10.25', 2)).toBe(true)
    expect(esDecimalValido('10.255', 2)).toBe(false)
    expect(esDecimalValido('3', 0)).toBe(true)
    expect(esDecimalValido('3.5', 0)).toBe(false)
    expect(esDecimalValido('', 2)).toBe(false)
  })
})
