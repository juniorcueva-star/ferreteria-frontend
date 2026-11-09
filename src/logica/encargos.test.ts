import { describe, expect, it } from 'vitest'
import { precioConRecargo, recargoPorcentaje, totalEncargoCentimos } from './encargos'

describe('encargos', () => {
  it('propone el precio de lista + 10 % redondeado a 2 decimales', () => {
    expect(precioConRecargo(35)).toBe(38.5)
    expect(precioConRecargo(6.45)).toBe(7.1) // 7.095 -> 7.10 (HALF_UP)
  })

  it('calcula el total en centimos', () => {
    expect(totalEncargoCentimos('2', '115')).toBe(23000)
    expect(totalEncargoCentimos('1.5', '7.10')).toBe(1065)
  })

  it('muestra el recargo frente al precio de lista', () => {
    expect(recargoPorcentaje(115, 100)).toBe(15)
    expect(recargoPorcentaje(40, 35)).toBe(14.29)
    expect(recargoPorcentaje(10, 0)).toBeNull()
  })
})
