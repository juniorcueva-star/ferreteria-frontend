import { describe, expect, it } from 'vitest'
import { precioSugerido } from './precios'

describe('precio sugerido (igual al backend)', () => {
  it('aplica ganancia y adicional', () => {
    expect(precioSugerido(100, 30, 0.5)).toBe(130.5)
    expect(precioSugerido(3.3333, '30', '')).toBe(4.33)
  })

  it('redondea HALF_UP: 2.345 -> 2.35', () => {
    expect(precioSugerido(2.345, 0, 0)).toBe(2.35)
    expect(precioSugerido(2, 12.5, null)).toBe(2.25)
  })

  it('sin costo no hay sugerido', () => {
    expect(precioSugerido(null, 30, 1)).toBeNull()
  })
})
