import { afterEach, describe, expect, it } from 'vitest'
import type { LineaCarrito } from './carrito'
import { etiquetaEnEspera, guardarEnEspera, leerEnEspera, MAXIMO_EN_ESPERA, ponerEnEspera } from './ventasEnEspera'

const linea: LineaCarrito = {
  productoId: 1, productoNombre: 'Perno', unidadBase: 'UNIDAD', presentacionId: 2, presentacionNombre: 'Unidad',
  factor: 1, decimales: 0, precio: 0.5, cantidad: '3', descuento: '',
}
const venta = { carrito: [linea], condicion: 'CONTADO' as const, cliente: null, totalCentimos: 150 }

describe('ventas en espera', () => {
  afterEach(() => localStorage.clear())

  it('guarda y lee por usuario', () => {
    const lista = ponerEnEspera([], venta, new Date('2026-11-10T15:32:00Z'))
    expect(lista).toHaveLength(1)
    guardarEnEspera(7, lista ?? [])
    expect(leerEnEspera(7)).toEqual(lista)
    expect(leerEnEspera(8)).toEqual([])
    expect(etiquetaEnEspera(lista![0]!)).toBe('Venta de las 10:32 · 1 producto')
  })

  it('no pasa del maximo y tolera datos dañados', () => {
    let lista = [] as ReturnType<typeof leerEnEspera>
    for (let i = 0; i < MAXIMO_EN_ESPERA; i++) lista = ponerEnEspera(lista, venta) ?? lista
    expect(lista).toHaveLength(MAXIMO_EN_ESPERA)
    expect(ponerEnEspera(lista, venta)).toBeNull()
    localStorage.setItem('ferreteria.ventasEnEspera.9', '{roto')
    expect(leerEnEspera(9)).toEqual([])
  })
})
