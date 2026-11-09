import { describe, expect, it } from 'vitest'
import type { ResumenStockResponse } from '@/api/tipos'
import { estadoStock, otrasUbicacionesConStock } from './disponibilidad'

const resumen: ResumenStockResponse = {
  productoId: 3,
  productoCodigo: 'PER-3802',
  productoNombre: 'Perno hexagonal',
  unidadBase: 'UNIDAD',
  categoriaNombre: 'Pernos',
  total: 325,
  ubicaciones: [
    { ubicacionId: 2, ubicacionNombre: 'Tienda Centro', tipo: 'TIENDA', cantidad: 25, stockMinimo: 0, bajo: false },
    { ubicacionId: 3, ubicacionNombre: 'Tienda Norte', tipo: 'TIENDA', cantidad: 0, stockMinimo: 0, bajo: false },
    { ubicacionId: 1, ubicacionNombre: 'Almacen Central', tipo: 'ALMACEN', cantidad: 300, stockMinimo: 0, bajo: false },
  ],
}

describe('disponibilidad', () => {
  it('marca en cero, bajo o normal', () => {
    expect(estadoStock({ cantidad: 0, bajo: false })).toBe('cero')
    expect(estadoStock({ cantidad: 5, bajo: true })).toBe('bajo')
    expect(estadoStock({ cantidad: 5, bajo: false })).toBe('normal')
  })

  it('en el punto de venta muestra solo las otras ubicaciones con stock', () => {
    expect(otrasUbicacionesConStock(resumen, 2).map((u) => u.ubicacionNombre)).toEqual(['Almacen Central'])
    expect(otrasUbicacionesConStock(resumen, undefined)).toHaveLength(2)
  })
})
