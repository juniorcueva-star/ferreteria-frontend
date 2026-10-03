import { describe, expect, it } from 'vitest'
import type { MetodoPagoResponse } from '@/api/tipos'
import { aPagosRequest, calcularCobro, validarAbono, type PagoFormulario } from './pagos'

const metodos: MetodoPagoResponse[] = [
  { id: 1, codigo: 'EFECTIVO', nombre: 'Efectivo', requiereReferencia: false, efectivo: true, activo: true },
  { id: 2, codigo: 'YAPE', nombre: 'Yape', requiereReferencia: true, efectivo: false, activo: true },
  { id: 3, codigo: 'PLIN', nombre: 'Plin', requiereReferencia: true, efectivo: false, activo: true },
  { id: 4, codigo: 'DEPOSITO', nombre: 'Deposito bancario', requiereReferencia: true, efectivo: false, activo: true },
]

const pago = (metodoPago: string, monto: string, numeroOperacion = ''): PagoFormulario => ({
  metodoPago,
  monto,
  numeroOperacion,
})

describe('cobro al contado', () => {
  it('calcula el vuelto cuando se paga de mas en efectivo', () => {
    const r = calcularCobro(3600, 'CONTADO', [pago('EFECTIVO', '50')], metodos)
    expect(r.valido).toBe(true)
    expect(r.vueltoCentimos).toBe(1400)
    expect(r.faltaCentimos).toBe(0)
  })

  it('pago mixto exacto: efectivo + Yape con numero de operacion', () => {
    const r = calcularCobro(3600, 'CONTADO', [pago('EFECTIVO', '20'), pago('YAPE', '16', '00123456')], metodos)
    expect(r.valido).toBe(true)
    expect(r.pagadoCentimos).toBe(3600)
    expect(r.vueltoCentimos).toBe(0)
  })

  it('pago mixto con vuelto: el vuelto sale solo del efectivo', () => {
    const r = calcularCobro(3600, 'CONTADO', [pago('PLIN', '30', '987'), pago('EFECTIVO', '10')], metodos)
    expect(r.valido).toBe(true)
    expect(r.vueltoCentimos).toBe(400)
  })

  it('rechaza pagar de mas con metodos que no son efectivo', () => {
    const r = calcularCobro(3600, 'CONTADO', [pago('YAPE', '40', '111')], metodos)
    expect(r.valido).toBe(false)
    expect(r.errores.join()).toMatch(/vuelto del efectivo/)
  })

  it('indica cuanto falta si los pagos no cubren el total', () => {
    const r = calcularCobro(3600, 'CONTADO', [pago('EFECTIVO', '30')], metodos)
    expect(r.valido).toBe(false)
    expect(r.faltaCentimos).toBe(600)
  })

  it('exige numero de operacion para Yape, Plin y deposito', () => {
    const r = calcularCobro(3600, 'CONTADO', [pago('DEPOSITO', '36')], metodos)
    expect(r.valido).toBe(false)
    expect(r.errores[0]).toMatch(/número de operación/)
  })

  it('rechaza montos invalidos o sin metodo', () => {
    expect(calcularCobro(100, 'CONTADO', [pago('EFECTIVO', '1.005')], metodos).valido).toBe(false)
    expect(calcularCobro(100, 'CONTADO', [pago('', '1')], metodos).valido).toBe(false)
    expect(calcularCobro(100, 'CONTADO', [], metodos).valido).toBe(false)
  })
})

describe('venta a credito (fiado)', () => {
  it('sin adelanto todo queda como deuda', () => {
    const r = calcularCobro(6000, 'CREDITO', [], metodos)
    expect(r.valido).toBe(true)
    expect(r.saldoCentimos).toBe(6000)
  })

  it('el adelanto reduce el saldo y no puede superar el total', () => {
    expect(calcularCobro(6000, 'CREDITO', [pago('YAPE', '20', '00123456')], metodos).saldoCentimos).toBe(4000)
    expect(calcularCobro(6000, 'CREDITO', [pago('EFECTIVO', '61')], metodos).valido).toBe(false)
  })
})

describe('abonos', () => {
  it('no permite abonar mas que la deuda', () => {
    expect(validarAbono(2000, [pago('EFECTIVO', '20')], metodos).errores).toEqual([])
    expect(validarAbono(2000, [pago('EFECTIVO', '25')], metodos).errores.join()).toMatch(/saldo pendiente/)
    expect(validarAbono(2000, [], metodos).errores.length).toBe(1)
  })
})

describe('formato para la API', () => {
  it('convierte montos y solo envia numero de operacion cuando corresponde', () => {
    expect(aPagosRequest([pago('EFECTIVO', '50', 'x'), pago('YAPE', '16,5', ' 00123 ')], metodos)).toEqual([
      { metodoPago: 'EFECTIVO', monto: 50, numeroOperacion: null },
      { metodoPago: 'YAPE', monto: 16.5, numeroOperacion: '00123' },
    ])
  })
})
