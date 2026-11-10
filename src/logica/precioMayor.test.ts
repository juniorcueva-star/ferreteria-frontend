import { describe, expect, it } from 'vitest'
import { etiquetaTipoPrecio, ofertaVigente, precioSegunCantidad, resumenEscalas } from './precioMayor'

const escalas = [
  { cantidadMinima: 100, precio: 0.4 },
  { cantidadMinima: 500, precio: 0.35 },
]

describe('precio por mayor', () => {
  it('usa el de lista por debajo de la primera escala', () => {
    expect(precioSegunCantidad(0.5, escalas, 99)).toEqual({ precio: 0.5, tipo: 'LISTA' })
  })

  it('aplica la escala mas alta que alcanza la cantidad', () => {
    expect(precioSegunCantidad(0.5, escalas, 100)).toEqual({ precio: 0.4, tipo: 'MAYOR' })
    expect(precioSegunCantidad(0.5, escalas, 700)).toEqual({ precio: 0.35, tipo: 'MAYOR' })
  })

  it('no sube el precio si la escala quedo mas cara que la lista', () => {
    expect(precioSegunCantidad(0.3, escalas, 600)).toEqual({ precio: 0.3, tipo: 'LISTA' })
  })

  it('resume las escalas y nombra el tipo de precio', () => {
    expect(resumenEscalas({ escalas }, (n) => `S/ ${n.toFixed(2)}`)).toBe('100+ a S/ 0.40 · 500+ a S/ 0.35')
    expect(etiquetaTipoPrecio('MAYOR')).toBe('Precio por mayor')
    expect(etiquetaTipoPrecio('LISTA')).toBeNull()
  })

  it('cobra la oferta vigente salvo que el precio por mayor sea menor', () => {
    expect(precioSegunCantidad(0.5, escalas, 10, 0.45)).toEqual({ precio: 0.45, tipo: 'OFERTA' })
    expect(precioSegunCantidad(0.5, escalas, 150, 0.45)).toEqual({ precio: 0.4, tipo: 'MAYOR' })
    expect(precioSegunCantidad(0.5, escalas, 150, 0.38)).toEqual({ precio: 0.38, tipo: 'OFERTA' })
  })

  it('la oferta solo vale entre sus fechas, inclusive', () => {
    const p = { precioVenta: 0.5, precioOferta: 0.45, ofertaDesde: '2026-11-10', ofertaHasta: '2026-11-20' }
    expect(ofertaVigente(p, '2026-11-09')).toBeNull()
    expect(ofertaVigente(p, '2026-11-10')).toBe(0.45)
    expect(ofertaVigente(p, '2026-11-20')).toBe(0.45)
    expect(ofertaVigente(p, '2026-11-21')).toBeNull()
    expect(ofertaVigente({ ...p, precioOferta: null, ofertaDesde: null, ofertaHasta: null }, '2026-11-15')).toBeNull()
  })
})
