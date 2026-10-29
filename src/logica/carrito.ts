import type { UnidadBase, VentaDetalleRequest } from '@/api/tipos'
import { aCentimos, deMilesimas, dividirRedondeando, escalar } from './decimales'
import { permiteDecimales } from './presentaciones'

/** Replica el calculo de VentaService: el servidor sigue siendo la autoridad al registrar. */
export interface LineaCarrito {
  productoId: number
  productoNombre: string
  unidadBase: UnidadBase
  presentacionId: number
  presentacionNombre: string
  factor: number
  precio: number
  cantidad: string
  /** Descuento en soles para toda la linea. No se combina con porcentajes. */
  descuento: string
  descuentoPorcentaje: string
  incrementoPorcentaje: string
}

export interface CalculoLinea {
  cantidadValida: boolean
  descuentoValido: boolean
  ajustePorcentajeValido: boolean
  cantidadBase: number
  importeCentimos: number
  descuentoCentimos: number
  incrementoCentimos: number
  ajustePorcentaje: number | null
  subtotalCentimos: number
  error: string | null
}

export interface TotalesCarrito {
  lineas: CalculoLinea[]
  totalCentimos: number
  baseCentimos: number
  igvCentimos: number
  descuentoCentimos: number
  incrementoCentimos: number
  valido: boolean
}

/** Calculo aislado para una futura regla de ajuste general; no se envia al backend ni registra ventas. */
export function calcularAjusteGeneral(totalCentimos: number, porcentaje: string): { valido: boolean; ajusteCentimos: number; totalCentimos: number } {
  const limpio = porcentaje.trim().replace(',', '.')
  if (!/^-?\d+(\.\d{1,4})?$/.test(limpio)) return { valido: false, ajusteCentimos: 0, totalCentimos }
  const porcentajeDiezMilesimas = escalar(limpio, 4)
  if (porcentajeDiezMilesimas < -1_000_000n) return { valido: false, ajusteCentimos: 0, totalCentimos }
  const totalAjustado = Number(dividirRedondeando(BigInt(totalCentimos) * (1_000_000n + porcentajeDiezMilesimas), 1_000_000n))
  return { valido: totalAjustado >= 0, ajusteCentimos: totalAjustado - totalCentimos, totalCentimos: totalAjustado }
}

const MAXIMA_CANTIDAD = 1_000_000

function cantidadEsValida(linea: Pick<LineaCarrito, 'cantidad' | 'unidadBase' | 'factor'>): boolean {
  const limpio = linea.cantidad.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(limpio)) return false
  const valor = Number(limpio)
  if (valor <= 0 || valor > MAXIMA_CANTIDAD) return false
  if (linea.unidadBase !== 'UNIDAD') return true
  return (escalar(limpio, 3) * escalar(linea.factor, 3)) % 1_000_000n === 0n
}

function descuentoEsValido(texto: string): boolean {
  const limpio = texto.trim().replace(',', '.')
  return limpio === '' || /^\d+(\.\d{1,2})?$/.test(limpio)
}

function porcentajeEsValido(texto: string): boolean {
  const limpio = texto.trim().replace(',', '.')
  return limpio === '' || /^\d+(\.\d{1,4})?$/.test(limpio)
}

function porcentajeEnDiezMilesimas(texto: string): bigint {
  return escalar(texto.trim().replace(',', '.'), 4)
}

export function calcularLinea(linea: LineaCarrito): CalculoLinea {
  const cantidadValida = cantidadEsValida(linea)
  const descuentoValido = descuentoEsValido(linea.descuento)
  const ajustePorcentajeValido = porcentajeEsValido(linea.descuentoPorcentaje) && porcentajeEsValido(linea.incrementoPorcentaje)
  if (!cantidadValida) {
    return { cantidadValida, descuentoValido, ajustePorcentajeValido, cantidadBase: 0, importeCentimos: 0, descuentoCentimos: 0, incrementoCentimos: 0, ajustePorcentaje: null, subtotalCentimos: 0, error: permiteDecimales(linea.unidadBase) ? 'Cantidad inválida (mayor que 0, hasta 3 decimales)' : 'Cantidad inválida (debe convertirse en un número entero de unidades)' }
  }
  const cantidadMilesimas = escalar(linea.cantidad, 3)
  const importe = Number(dividirRedondeando(cantidadMilesimas * escalar(linea.precio, 2), 1000n))
  const cantidadBase = deMilesimas(Number(dividirRedondeando(cantidadMilesimas * escalar(linea.factor, 3), 1000n)))
  const descuento = descuentoValido && linea.descuento.trim() !== '' ? aCentimos(linea.descuento) : 0
  const tieneDescuento = linea.descuentoPorcentaje.trim() !== ''
  const tieneIncremento = linea.incrementoPorcentaje.trim() !== ''
  const descuentoPorcentaje = tieneDescuento && porcentajeEsValido(linea.descuentoPorcentaje) ? porcentajeEnDiezMilesimas(linea.descuentoPorcentaje) : 0n
  const incrementoPorcentaje = tieneIncremento && porcentajeEsValido(linea.incrementoPorcentaje) ? porcentajeEnDiezMilesimas(linea.incrementoPorcentaje) : 0n
  const porcentajeFirmado = tieneDescuento ? -descuentoPorcentaje : incrementoPorcentaje
  const subtotalPorcentaje = Number(dividirRedondeando(BigInt(importe) * (1_000_000n + porcentajeFirmado), 1_000_000n))
  const descuentoPorcentajeCentimos = tieneDescuento ? importe - subtotalPorcentaje : 0
  const incrementoCentimos = tieneIncremento ? subtotalPorcentaje - importe : 0
  const ajustePorcentaje = tieneDescuento ? -Number(descuentoPorcentaje) / 10_000 : tieneIncremento ? Number(incrementoPorcentaje) / 10_000 : null
  let error: string | null = null
  if (!descuentoValido) error = 'Descuento inválido (hasta 2 decimales)'
  else if (!ajustePorcentajeValido) error = 'El ajuste porcentual es inválido (hasta 4 decimales)'
  else if (tieneDescuento && tieneIncremento) error = 'Use descuento o incremento porcentual, no ambos'
  else if (descuento > 0 && (tieneDescuento || tieneIncremento)) error = 'No combine descuento monetario con ajuste porcentual'
  else if (descuento > importe) error = 'El descuento supera el importe de la línea'
  else if (descuentoPorcentaje > 1_000_000n) error = 'El descuento porcentual no puede superar 100 %'
  else if (cantidadBase <= 0) error = 'La cantidad es demasiado pequeña'
  return { cantidadValida, descuentoValido, ajustePorcentajeValido, cantidadBase, importeCentimos: importe, descuentoCentimos: descuento + descuentoPorcentajeCentimos, incrementoCentimos, ajustePorcentaje, subtotalCentimos: importe - descuento + (tieneDescuento || tieneIncremento ? subtotalPorcentaje - importe : 0), error }
}

export function separarIgv(totalCentimos: number): { baseCentimos: number; igvCentimos: number } {
  const base = Number(dividirRedondeando(BigInt(totalCentimos) * 100n, 118n))
  return { baseCentimos: base, igvCentimos: totalCentimos - base }
}

export function calcularTotales(lineas: LineaCarrito[]): TotalesCarrito {
  const calculos = lineas.map(calcularLinea)
  const total = calculos.reduce((suma, c) => suma + c.subtotalCentimos, 0)
  const { baseCentimos, igvCentimos } = separarIgv(total)
  return { lineas: calculos, totalCentimos: total, baseCentimos, igvCentimos, descuentoCentimos: calculos.reduce((suma, c) => suma + c.descuentoCentimos, 0), incrementoCentimos: calculos.reduce((suma, c) => suma + c.incrementoCentimos, 0), valido: lineas.length > 0 && total > 0 && calculos.every((c) => c.error === null) }
}

type NuevaLinea = Omit<LineaCarrito, 'cantidad' | 'descuento' | 'descuentoPorcentaje' | 'incrementoPorcentaje'>

export function agregarAlCarrito(lineas: LineaCarrito[], nueva: NuevaLinea, cantidad = '1'): LineaCarrito[] {
  const existente = lineas.find((l) => l.presentacionId === nueva.presentacionId)
  if (!existente) return [...lineas, { ...nueva, cantidad, descuento: '', descuentoPorcentaje: '', incrementoPorcentaje: '' }]
  return lineas.map((l) => l.presentacionId !== nueva.presentacionId ? l : { ...l, cantidad: String(deMilesimas(Number((cantidadEsValida(l) ? escalar(l.cantidad, 3) : 0n) + escalar(cantidad, 3))) ) })
}

export function cambiarPresentacion(lineas: LineaCarrito[], presentacionActualId: number, nueva: NuevaLinea): LineaCarrito[] {
  const actual = lineas.find((linea) => linea.presentacionId === presentacionActualId)
  if (!actual || actual.productoId !== nueva.productoId || lineas.some((linea) => linea.presentacionId === nueva.presentacionId)) return lineas
  return lineas.map((linea) => linea.presentacionId === presentacionActualId ? { ...nueva, cantidad: linea.cantidad, descuento: linea.descuento, descuentoPorcentaje: linea.descuentoPorcentaje, incrementoPorcentaje: linea.incrementoPorcentaje } : linea)
}

export function actualizarLinea(lineas: LineaCarrito[], presentacionId: number, cambios: Partial<Pick<LineaCarrito, 'cantidad' | 'descuento' | 'descuentoPorcentaje' | 'incrementoPorcentaje'>>): LineaCarrito[] {
  return lineas.map((l) => l.presentacionId === presentacionId ? { ...l, ...cambios } : l)
}

export function quitarLinea(lineas: LineaCarrito[], presentacionId: number): LineaCarrito[] {
  return lineas.filter((l) => l.presentacionId !== presentacionId)
}

/** Detalle sin precio: el backend relee el precio vigente y valida el ajuste. */
export function aDetallesVenta(lineas: LineaCarrito[]): VentaDetalleRequest[] {
  return lineas.map((l) => {
    const descuento = l.descuento.trim() === '' ? 0 : aCentimos(l.descuento)
    const ajustePorcentaje = l.descuentoPorcentaje.trim() !== '' ? -Number(porcentajeEnDiezMilesimas(l.descuentoPorcentaje)) / 10_000 : l.incrementoPorcentaje.trim() !== '' ? Number(porcentajeEnDiezMilesimas(l.incrementoPorcentaje)) / 10_000 : null
    return { presentacionId: l.presentacionId, cantidad: Number(l.cantidad.trim().replace(',', '.')), descuento: descuento > 0 ? descuento / 100 : null, ajustePorcentaje }
  })
}
