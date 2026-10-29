import { describe, expect, it } from 'vitest'
import {
  actualizarLinea,
  agregarAlCarrito,
  aDetallesVenta,
  cambiarPresentacion,
  calcularLinea,
  calcularAjusteGeneral,
  calcularTotales,
  quitarLinea,
  separarIgv,
  type LineaCarrito,
} from './carrito'

const ciento = {
  productoId: 1,
  productoNombre: 'Clavo de acero 2"',
  unidadBase: 'UNIDAD' as const,
  presentacionId: 2,
  presentacionNombre: 'Ciento',
  factor: 100,
  precio: 8,
}
const cableMetro = {
  productoId: 13,
  productoNombre: 'Cable THW 14 AWG',
  unidadBase: 'METRO' as const,
  presentacionId: 22,
  presentacionNombre: 'Metro',
  factor: 1,
  precio: 1.3,
}
const medioKilo = {
  productoId: 11,
  productoNombre: 'Clavo para madera 3"',
  unidadBase: 'KILO' as const,
  presentacionId: 18,
  presentacionNombre: 'Medio kilo',
  factor: 0.5,
  precio: 3.8,
}
const millar = { ...ciento, presentacionId: 3, presentacionNombre: 'Millar', factor: 1000, precio: 70 }

function linea(base: typeof ciento | typeof cableMetro | typeof medioKilo, cantidad: string, descuento = ''): LineaCarrito {
  return { ...base, cantidad, descuento, descuentoPorcentaje: '', incrementoPorcentaje: '' }
}

describe('carrito del punto de venta', () => {
  it('calcula importe, subtotal y cantidad base de una linea', () => {
    const c = calcularLinea(linea(ciento, '3'))
    expect(c.importeCentimos).toBe(2400)
    expect(c.subtotalCentimos).toBe(2400)
    expect(c.cantidadBase).toBe(300)
    expect(c.error).toBeNull()
  })

  it('acepta fracciones que terminan en unidades enteras y rechaza las ambiguas', () => {
    expect(calcularLinea(linea(cableMetro, '2.5')).importeCentimos).toBe(325)
    expect(calcularLinea(linea(medioKilo, '3')).cantidadBase).toBe(1.5)
    expect(calcularLinea(linea(millar, '0.5')).cantidadBase).toBe(500)
    expect(calcularLinea(linea(ciento, '0.005')).error).toMatch(/convertirse/)
    expect(calcularLinea(linea(ciento, '0')).error).not.toBeNull()
  })

  it('redondea el importe a centimos con HALF_UP', () => {
    // 1.235 m x S/ 1.30 = 1.6055 -> 1.61
    expect(calcularLinea(linea(cableMetro, '1.235')).importeCentimos).toBe(161)
  })

  it('aplica el descuento por linea y no deja que supere el importe', () => {
    expect(calcularLinea(linea(ciento, '2', '1.50')).subtotalCentimos).toBe(1450)
    expect(calcularLinea(linea(ciento, '1', '9')).error).toMatch(/supera/)
    expect(calcularLinea(linea(ciento, '1', '1.555')).error).toMatch(/Descuento/)
  })

  it('suma el total y separa base imponible e IGV (precios con IGV incluido)', () => {
    const totales = calcularTotales([linea(ciento, '3'), linea(cableMetro, '10', '1')])
    // 24.00 + (13.00 - 1.00) = 36.00
    expect(totales.totalCentimos).toBe(3600)
    expect(totales.descuentoCentimos).toBe(100)
    expect(totales.baseCentimos).toBe(3051) // 36 / 1.18 = 30.508 -> 30.51
    expect(totales.igvCentimos).toBe(549)
    expect(totales.valido).toBe(true)
  })

  it('separa el IGV igual que el backend', () => {
    expect(separarIgv(11800)).toEqual({ baseCentimos: 10000, igvCentimos: 1800 })
    expect(separarIgv(100)).toEqual({ baseCentimos: 85, igvCentimos: 15 })
  })

  it('un carrito vacio o con lineas invalidas no se puede cobrar', () => {
    expect(calcularTotales([]).valido).toBe(false)
    expect(calcularTotales([linea(ciento, 'abc')]).valido).toBe(false)
  })

  it('agrega, suma cantidades de la misma presentacion, actualiza y quita', () => {
    let carrito: LineaCarrito[] = []
    carrito = agregarAlCarrito(carrito, ciento)
    carrito = agregarAlCarrito(carrito, ciento, '2')
    carrito = agregarAlCarrito(carrito, cableMetro, '1.5')
    carrito = agregarAlCarrito(carrito, cableMetro, '0.25')
    expect(carrito).toHaveLength(2)
    expect(carrito[0]?.cantidad).toBe('3')
    expect(carrito[1]?.cantidad).toBe('1.75')
    carrito = actualizarLinea(carrito, 2, { descuento: '2' })
    expect(carrito[0]?.descuento).toBe('2')
    carrito = quitarLinea(carrito, 22)
    expect(carrito.map((l) => l.presentacionId)).toEqual([2])
  })

  it('calcula ajustes generales aislados sin habilitar su registro', () => {
    expect(calcularAjusteGeneral(10000, '-5')).toEqual({ valido: true, ajusteCentimos: -500, totalCentimos: 9500 })
    expect(calcularAjusteGeneral(10000, '10')).toEqual({ valido: true, ajusteCentimos: 1000, totalCentimos: 11000 })
    expect(calcularAjusteGeneral(10000, '20')).toEqual({ valido: true, ajusteCentimos: 2000, totalCentimos: 12000 })
    expect(calcularAjusteGeneral(10000, '-100.01').valido).toBe(false)
  })

  it.each([
    ['5', 760],
    ['10', 720],
    ['20', 640],
  ])('aplica descuento porcentual de %s %%', (porcentaje, subtotal) => {
    expect(calcularLinea({ ...linea(ciento, '1'), descuentoPorcentaje: porcentaje }).subtotalCentimos).toBe(subtotal)
  })

  it.each([
    ['5', 840],
    ['10', 880],
    ['20', 960],
  ])('aplica incremento porcentual de %s %%', (porcentaje, subtotal) => {
    expect(calcularLinea({ ...linea(ciento, '1'), incrementoPorcentaje: porcentaje }).subtotalCentimos).toBe(subtotal)
  })

  it('muestra error para porcentajes incompletos sin romper el carrito', () => {
    for (const invalido of ['.', 'abc', '10.']) {
      expect(calcularLinea({ ...linea(ciento, '1'), descuentoPorcentaje: invalido }).error).toContain('porcentual')
      expect(calcularLinea({ ...linea(ciento, '1'), incrementoPorcentaje: invalido }).error).toContain('porcentual')
    }
  })

  it('redondea ajustes porcentuales, conserva ajustes al cambiar presentacion y rechaza combinaciones', () => {
    expect(calcularLinea({ ...linea(cableMetro, '1.235'), descuentoPorcentaje: '5' }).subtotalCentimos).toBe(153)
    // S/ 1.00 con 0.5 % resulta S/ 0.995 y se redondea el subtotal final a S/ 1.00.
    expect(calcularLinea({ ...linea(ciento, '1'), precio: 1, descuentoPorcentaje: '0.5' }).subtotalCentimos).toBe(100)
    expect(calcularLinea({ ...linea(ciento, '1'), descuentoPorcentaje: '0' }).subtotalCentimos).toBe(800)
    expect(calcularLinea({ ...linea(ciento, '1'), descuentoPorcentaje: '100.01' }).error).toMatch(/100/)
    expect(calcularLinea({ ...linea(ciento, '1', '1'), incrementoPorcentaje: '5' }).error).toMatch(/combine/)
    expect(cambiarPresentacion([{ ...linea(ciento, '0.5'), incrementoPorcentaje: '10' }], 2, millar)[0]?.incrementoPorcentaje).toBe('10')
  })

  it('cambia de presentacion conservando cantidad y descuento sin duplicar lineas', () => {
    const carrito = [linea(ciento, '0.5', '1.50')]
    const cambiado = cambiarPresentacion(carrito, 2, millar)
    expect(cambiado).toEqual([linea(millar, '0.5', '1.50')])
    expect(calcularLinea(cambiado[0]!).cantidadBase).toBe(500)
    expect(cambiarPresentacion([...cambiado, linea(ciento, '1')], 3, ciento)).toHaveLength(2)
  })

  it('arma el detalle para la API sin enviar el precio', () => {
    const detalle = aDetallesVenta([linea(ciento, '3', '1.50'), linea(cableMetro, '2,5')])
    expect(detalle).toEqual([
      { presentacionId: 2, cantidad: 3, descuento: 1.5, ajustePorcentaje: null },
      { presentacionId: 22, cantidad: 2.5, descuento: null, ajustePorcentaje: null },
    ])
  })
})
