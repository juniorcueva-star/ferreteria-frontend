import type { CondicionVenta, MetodoPagoResponse, PagoRequest } from '@/api/tipos'
import { aCentimos } from './decimales'

/**
 * Pago mixto, vuelto y saldo, con las mismas reglas del backend (VentaService.aplicarPagos):
 * - CONTADO: los pagos deben cubrir el total. Lo pagado de mas es el vuelto y solo puede salir del
 *   efectivo (no se da vuelto de un Yape o una tarjeta).
 * - CREDITO (fiado): los pagos son un adelanto opcional que no puede superar el total; el resto es deuda.
 * - Los metodos que no son efectivo exigen numero de operacion.
 */

export interface PagoFormulario {
  metodoPago: string
  /** Monto en soles tal como lo escribe el vendedor */
  monto: string
  numeroOperacion: string
}

export interface ResultadoCobro {
  pagadoCentimos: number
  /** Lo que aun falta cobrar (CONTADO) */
  faltaCentimos: number
  vueltoCentimos: number
  /** Deuda que queda (CREDITO) */
  saldoCentimos: number
  errores: string[]
  valido: boolean
}

const PATRON_MONTO = /^\d+(\.\d{1,2})?$/

function montoEnCentimos(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  return PATRON_MONTO.test(limpio) ? aCentimos(limpio) : null
}

/** Revisa cada pago: metodo existente, monto positivo con 2 decimales y numero de operacion si lo exige. */
export function erroresDePagos(pagos: PagoFormulario[], metodos: MetodoPagoResponse[]): string[] {
  const errores: string[] = []
  pagos.forEach((pago, indice) => {
    const numero = indice + 1
    const metodo = metodos.find((m) => m.codigo === pago.metodoPago)
    if (!metodo) {
      errores.push(`Pago ${numero}: elija el método de pago`)
      return
    }
    const monto = montoEnCentimos(pago.monto)
    if (monto === null || monto <= 0) {
      errores.push(`Pago ${numero}: el monto debe ser mayor que 0 (hasta 2 decimales)`)
    }
    if (metodo.requiereReferencia && pago.numeroOperacion.trim() === '') {
      errores.push(`Pago ${numero}: ${metodo.nombre} requiere el número de operación`)
    }
  })
  return errores
}

export function totalPagado(pagos: PagoFormulario[]): number {
  return pagos.reduce((suma, p) => suma + (montoEnCentimos(p.monto) ?? 0), 0)
}

function totalEfectivo(pagos: PagoFormulario[], metodos: MetodoPagoResponse[]): number {
  return pagos
    .filter((p) => metodos.find((m) => m.codigo === p.metodoPago)?.efectivo)
    .reduce((suma, p) => suma + (montoEnCentimos(p.monto) ?? 0), 0)
}

export function calcularCobro(
  totalCentimos: number,
  condicion: CondicionVenta,
  pagos: PagoFormulario[],
  metodos: MetodoPagoResponse[],
): ResultadoCobro {
  const errores = erroresDePagos(pagos, metodos)
  const pagado = totalPagado(pagos)
  let falta = 0
  let vuelto = 0
  let saldo = 0

  if (condicion === 'CONTADO') {
    if (pagos.length === 0) {
      errores.push('Agregue al menos un pago')
    }
    if (pagado < totalCentimos) {
      falta = totalCentimos - pagado
      errores.push('Los pagos no cubren el total. Para dejar saldo, use venta a crédito')
    } else {
      const exceso = pagado - totalCentimos
      if (exceso > totalEfectivo(pagos, metodos)) {
        errores.push('Se pagó de más con métodos que no son efectivo: solo se da vuelto del efectivo')
      } else {
        vuelto = exceso
      }
    }
  } else if (pagado > totalCentimos) {
    errores.push('El adelanto no puede superar el total de la venta')
  } else {
    saldo = totalCentimos - pagado
  }

  return {
    pagadoCentimos: pagado,
    faltaCentimos: falta,
    vueltoCentimos: vuelto,
    saldoCentimos: saldo,
    errores,
    valido: errores.length === 0,
  }
}

/** Abono a una deuda: monto total positivo y sin superar el saldo pendiente. */
export function validarAbono(
  saldoCentimos: number,
  pagos: PagoFormulario[],
  metodos: MetodoPagoResponse[],
): { pagadoCentimos: number; errores: string[] } {
  const errores = erroresDePagos(pagos, metodos)
  const pagado = totalPagado(pagos)
  if (pagos.length === 0) {
    errores.push('Agregue al menos un pago')
  } else if (pagado > saldoCentimos) {
    errores.push('El abono no puede superar el saldo pendiente')
  }
  return { pagadoCentimos: pagado, errores }
}

/** Convierte los pagos del formulario al formato de la API. */
export function aPagosRequest(pagos: PagoFormulario[], metodos: MetodoPagoResponse[]): PagoRequest[] {
  return pagos.map((p) => {
    const metodo = metodos.find((m) => m.codigo === p.metodoPago)
    const operacion = p.numeroOperacion.trim()
    return {
      metodoPago: p.metodoPago,
      monto: aCentimos(p.monto.trim().replace(',', '.')) / 100,
      numeroOperacion: metodo?.requiereReferencia && operacion !== '' ? operacion : null,
    }
  })
}
