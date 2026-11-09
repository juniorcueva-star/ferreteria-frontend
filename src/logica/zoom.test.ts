import { afterEach, describe, expect, it } from 'vitest'
import { acercar, ajustarNivel, alejar, aplicarZoom, leerZoom } from './zoom'

describe('zoom de la letra', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.style.fontSize = ''
  })

  it('sube y baja por niveles sin pasar los limites', () => {
    expect(acercar(100)).toBe(110)
    expect(acercar(160)).toBe(160)
    expect(alejar(100)).toBe(90)
    expect(alejar(90)).toBe(90)
    expect(ajustarNivel(123)).toBe(125)
  })

  it('aplica el tamano a la pagina y lo recuerda', () => {
    expect(leerZoom()).toBe(110)
    aplicarZoom(125)
    expect(document.documentElement.style.fontSize).toBe('125%')
    expect(leerZoom()).toBe(125)
    aplicarZoom(100)
    expect(document.documentElement.style.fontSize).toBe('')
  })
})
