import { describe, expect, it } from 'vitest'
import { etiquetaTipoPrecio, precioSegunCantidad, resumenEscalas } from './precioMayor'

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
})
