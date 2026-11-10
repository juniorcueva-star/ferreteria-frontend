import { describe, expect, it } from 'vitest'
import { centimosATexto, totalConteo } from './denominaciones'

describe('conteo de billetes y monedas', () => {
  it('suma cada denominacion por su valor', () => {
    // 2 x 100 + 1 x 50 + 3 x 10 + 4 x 1 + 1 x 0.50 + 2 x 0.10 = 284.70
    expect(totalConteo({ 10000: '2', 5000: '1', 1000: '3', 100: '4', 50: '1', 10: '2' })).toBe(28470)
    expect(centimosATexto(28470)).toBe('284.70')
  })

  it('ignora lo vacio o mal escrito', () => {
    expect(totalConteo({})).toBe(0)
    expect(totalConteo({ 2000: '', 500: 'x', 200: '1.5' })).toBe(0)
  })
})
