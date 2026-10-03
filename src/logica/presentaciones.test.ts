import { describe, expect, it } from 'vitest'
import type { ProductoResponse } from '@/api/tipos'
import {
  cantidadBase,
  factorValido,
  permiteDecimales,
  presentacionPrincipal,
  presentacionesActivas,
  presentacionesDisponibles,
  textoChip,
} from './presentaciones'

const clavo: ProductoResponse = {
  id: 1,
  codigo: 'CLA-02',
  nombre: 'Clavo de acero 2"',
  descripcion: null,
  marca: null,
  categoriaId: 2,
  categoriaNombre: 'Clavos y tornillos',
  unidadBase: 'UNIDAD',
  imagenUrl: null,
  activo: true,
  presentaciones: [
    { id: 3, nombre: 'Millar', factor: 1000, precioVenta: 70, codigoBarras: null, principal: false, activo: true },
    { id: 1, nombre: 'Unidad', factor: 1, precioVenta: 0.1, codigoBarras: null, principal: true, activo: true },
    { id: 2, nombre: 'Ciento', factor: 100, precioVenta: 8, codigoBarras: null, principal: false, activo: true },
    { id: 4, nombre: 'Caja vieja', factor: 500, precioVenta: 30, codigoBarras: null, principal: false, activo: false },
  ],
}

describe('conversion de presentaciones a unidad base', () => {
  it('multiplica la cantidad por el factor', () => {
    expect(cantidadBase(2, 100)).toBe(200)
    expect(cantidadBase(3, 0.5)).toBe(1.5)
    expect(cantidadBase('2.5', 1)).toBe(2.5)
    expect(cantidadBase(1, 1000)).toBe(1000)
  })

  it('redondea la cantidad base a 3 decimales como el CHECK de la base de datos', () => {
    expect(cantidadBase('0.333', 0.25)).toBe(0.083)
  })

  it('calcula cuantas presentaciones completas hay en el stock', () => {
    expect(presentacionesDisponibles(250, 100)).toBe(2)
    expect(presentacionesDisponibles(1.6, 0.5)).toBe(3)
    expect(presentacionesDisponibles(10, 0)).toBe(0)
  })

  it('solo KILO y METRO admiten decimales y factores fraccionarios', () => {
    expect(permiteDecimales('UNIDAD')).toBe(false)
    expect(permiteDecimales('KILO')).toBe(true)
    expect(factorValido(0.5, 'UNIDAD')).toBe(false)
    expect(factorValido(0.5, 'KILO')).toBe(true)
    expect(factorValido(100, 'UNIDAD')).toBe(true)
    expect(factorValido(0, 'METRO')).toBe(false)
  })

  it('arma el texto del chip como en la imagen de referencia', () => {
    expect(textoChip({ nombre: 'Caja x100', factor: 100 }, 'UNIDAD')).toBe('Caja x100 · 100 u')
    expect(textoChip({ nombre: 'Millar', factor: 1000 }, 'UNIDAD')).toBe('Millar · 1,000 u')
    expect(textoChip({ nombre: 'Medio kilo', factor: 0.5 }, 'KILO')).toBe('Medio kilo · 0.5 kg')
  })

  it('ordena las presentaciones activas con la principal primero', () => {
    expect(presentacionPrincipal(clavo)?.nombre).toBe('Unidad')
    expect(presentacionesActivas(clavo).map((p) => p.nombre)).toEqual(['Unidad', 'Ciento', 'Millar'])
  })
})
