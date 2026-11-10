import { afterEach, describe, expect, it } from 'vitest'
import { guardarVistaCaja, leerVistaCaja, vistaInicial } from './vistaCaja'

describe('vista de la caja', () => {
  afterEach(() => localStorage.clear())

  it('arranca en fotos en tablet y en lista en laptop', () => {
    expect(vistaInicial(800)).toBe('fotos')
    expect(vistaInicial(1366)).toBe('lista')
  })

  it('recuerda la vista elegida', () => {
    guardarVistaCaja('fotos')
    expect(leerVistaCaja(1366)).toBe('fotos')
  })

  it('ignora valores guardados que no son una vista', () => {
    localStorage.setItem('ferreteria.vistaCaja', 'mosaico')
    expect(leerVistaCaja(1366)).toBe('lista')
  })
})
