import { describe, expect, it } from 'vitest'
import { cantidad, fecha, hoyLima, iniciales, inicioMesLima, soles } from './formato'

describe('formatos', () => {
  it('precios con S/ y dos decimales, sin cortar la linea', () => {
    expect(soles(0.35)).toBe('S/ 0.35')
    expect(soles(1234.5)).toBe('S/ 1,234.50')
    expect(soles(null)).toBe('S/ 0.00')
  })

  it('stock sin separador de miles y con decimales solo si los tiene', () => {
    expect(cantidad(5000)).toBe('5000')
    expect(cantidad(25.5)).toBe('25.5')
    expect(cantidad(1.25)).toBe('1.25')
  })

  it('el dia de hoy se calcula en hora de Lima', () => {
    // 3 de octubre 04:30 UTC todavia es 2 de octubre en Lima (UTC-5)
    expect(hoyLima(new Date('2026-10-03T04:30:00Z'))).toBe('2026-10-02')
    expect(inicioMesLima(new Date('2026-10-03T15:00:00Z'))).toBe('2026-10-01')
  })

  it('una fecha sin hora no se corre de dia', () => {
    expect(fecha('2026-10-01')).toContain('1 oct')
  })

  it('iniciales del usuario', () => {
    expect(iniciales('Admin Principal')).toBe('AP')
    expect(iniciales('Administrador')).toBe('AD')
  })
})
