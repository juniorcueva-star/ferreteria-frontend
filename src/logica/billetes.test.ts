import { describe, expect, it } from 'vitest'
import { billetesSugeridos } from './billetes'

describe('billetes rapidos', () => {
  it('propone los billetes redondos que alcanzan el total', () => {
    expect(billetesSugeridos(3750)).toEqual([40, 50, 100, 200])
    expect(billetesSugeridos(700)).toEqual([10, 20, 50, 100])
    expect(billetesSugeridos(18490)).toEqual([190, 200])
  })

  it('no repite el total cuando ya es redondo y no propone nada sin total', () => {
    expect(billetesSugeridos(2000)).toEqual([50, 100, 200])
    expect(billetesSugeridos(0)).toEqual([])
  })
})
