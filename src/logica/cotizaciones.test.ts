import { describe, expect, it } from 'vitest'
import type { ProductoResponse } from '@/api/tipos'
import { calcularLineaCotizacion, cambiarCantidad, nuevaLinea, totalesCotizacion } from './cotizaciones'

const perno: ProductoResponse = {
  id: 3,
  codigo: 'PER-3802',
  nombre: 'Perno hexagonal',
  descripcion: null,
  marca: 'VARIADO',
  categoriaId: 1,
  categoriaNombre: 'Pernos',
  unidadBase: 'UNIDAD',
  imagenUrl: null,
  activo: true,
  tipo: null,
  acabado: null,
  medida: null,
  completos: [],
  presentaciones: [
    { id: 6, nombre: 'Unidad', factor: 1, precioVenta: 0.5, codigoBarras: null, principal: true, activo: true, decimales: 0, precioOferta: null, ofertaDesde: null, ofertaHasta: null, escalas: [] },
    { id: 7, nombre: 'Docena', factor: 12, precioVenta: 5.5, codigoBarras: null, principal: false, activo: true, decimales: 0, precioOferta: null, ofertaDesde: null, ofertaHasta: null, escalas: [] },
  ],
}

describe('cotizaciones', () => {
  it('empieza con el precio de lista y calcula igual que el backend (14.00 = 11.86 + 2.14)', () => {
    const unidad = { ...nuevaLinea(perno, perno.presentaciones[0]!), cantidad: '10' }
    const docena = { ...nuevaLinea(perno, perno.presentaciones[1]!), cantidad: '2', precio: '5.00', descuento: '1' }
    expect(unidad.precio).toBe('0.50')
    const totales = totalesCotizacion([unidad, docena])
    expect(totales.totalCentimos).toBe(1400)
    expect(totales.baseCentimos).toBe(1186)
    expect(totales.igvCentimos).toBe(214)
    expect(totales.valido).toBe(true)
  })

  it('al subir la cantidad pasa al precio por mayor, pero respeta un precio escrito a mano', () => {
    const conEscala = { ...perno, presentaciones: [{ ...perno.presentaciones[0]!, escalas: [{ cantidadMinima: 100, precio: 0.4 }] }] }
    const linea = nuevaLinea(conEscala, conEscala.presentaciones[0]!)
    expect(cambiarCantidad(linea, '100').precio).toBe('0.40')
    expect(cambiarCantidad(cambiarCantidad(linea, '100'), '20').precio).toBe('0.50')
    expect(cambiarCantidad({ ...linea, precio: '0.45' }, '150').precio).toBe('0.45')
  })

  it('respeta los decimales de la presentacion y el tope del descuento', () => {
    expect(calcularLineaCotizacion({ ...nuevaLinea(perno, perno.presentaciones[1]!), cantidad: '1.5' }).error).toBe(
      'Docena no acepta fracciones',
    )
    expect(calcularLineaCotizacion({ ...nuevaLinea(perno, perno.presentaciones[0]!), descuento: '1' }).error).toMatch(/descuento supera/)
  })

  it('rechaza lineas repetidas y cotizaciones vacias', () => {
    const linea = nuevaLinea(perno, perno.presentaciones[0]!)
    expect(totalesCotizacion([linea, { ...linea, clave: 99 }]).errores).toContain(
      'Hay presentaciones repetidas: sume la cantidad en una sola línea',
    )
    expect(totalesCotizacion([]).valido).toBe(false)
  })
})
