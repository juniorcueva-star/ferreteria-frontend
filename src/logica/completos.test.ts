import { describe, expect, it } from 'vitest'
import type { PresentacionResponse } from '@/api/tipos'
import { completosDisponibles, consumoPorProducto, calcularTotales, type LineaCarrito } from './carrito'
import { erroresCompleto, sumaPiezasCentimos, type PiezaEditable } from './completos'

const unidad = (id: number, precio: number, decimales = 0): PresentacionResponse => ({
  id, nombre: 'Unidad', factor: 1, precioVenta: precio, codigoBarras: null, principal: true, activo: true, decimales,
})
const pieza = (clave: number, productoId: number, p: PresentacionResponse, cantidad: string): PiezaEditable => ({
  clave, productoId, productoNombre: `P${productoId}`, presentaciones: [p], presentacionId: p.id, cantidad,
})

describe('completos', () => {
  it('suma las piezas a precio de lista como el backend (perno 0.50 + tuerca 0.20 + 6 tornillos 0.05 = 1.00)', () => {
    const piezas = [pieza(1, 1, unidad(1, 0.5), '1'), pieza(2, 2, unidad(2, 0.2), '1'), pieza(3, 3, unidad(3, 0.05), '6')]
    expect(sumaPiezasCentimos(piezas)).toBe(100)
    expect(erroresCompleto('Completo', piezas, '')).toEqual([])
  })

  it('valida nombre, piezas repetidas, fracciones y precio', () => {
    const perno = unidad(1, 0.5)
    expect(erroresCompleto('', [], '1.234')).toHaveLength(3)
    expect(erroresCompleto('Doble', [pieza(1, 1, perno, '1'), pieza(2, 1, perno, '1')], '')).toContain(
      'Hay una pieza repetida: sume la cantidad en una sola línea',
    )
    expect(erroresCompleto('Medio', [pieza(1, 1, perno, '0.5')], '')).toContain('Revise las cantidades de las piezas')
  })

  it('cada completo del carrito consume sus piezas y lo disponible es lo que alcanza la pieza mas escasa', () => {
    const linea: LineaCarrito = {
      productoId: 1, productoNombre: 'Perno', unidadBase: 'UNIDAD', presentacionId: null, completoId: 9,
      piezas: [{ productoId: 1, cantidadBase: 1 }, { productoId: 2, cantidadBase: 1 }, { productoId: 3, cantidadBase: 6 }],
      presentacionNombre: 'Completo', factor: 1, decimales: 0, precio: 0.9, cantidad: '10', descuento: '',
    }
    const unidadPerno: LineaCarrito = { ...linea, completoId: null, piezas: [], presentacionId: 4, presentacionNombre: 'Unidad', cantidad: '5' }
    const totales = calcularTotales([linea, unidadPerno])
    const consumo = consumoPorProducto([linea, unidadPerno], totales.lineas)
    expect(consumo.get(1)).toBe(15)
    expect(consumo.get(2)).toBe(10)
    expect(consumo.get(3)).toBe(60)
    const stock = new Map([[1, 500], [2, 80], [3, 300]])
    expect(completosDisponibles(linea.piezas ?? [], (id) => stock.get(id) ?? 0)).toBe(50) // 300 tornillos / 6
  })
})
