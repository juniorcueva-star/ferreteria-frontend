import type { UnidadBase, VentaDetalleRequest } from '@/api/tipos'
import { aCentimos, deMilesimas, dividirRedondeando, escalar } from './decimales'
import { permiteDecimales } from './presentaciones'

/**
 * Carrito del punto de venta. Replica el calculo del backend (VentaService) para mostrar el total
 * exacto antes de cobrar:
 *   importe   = ROUND(cantidad x precio, 2)
 *   subtotal  = importe - descuento de la linea
 *   total     = suma de subtotales (los precios ya incluyen IGV)
 *   base      = ROUND(total / 1.18, 2);  IGV = total - base
 * Todo se calcula en centimos enteros para no arrastrar errores de punto flotante.
 */

export interface LineaCarrito {
  productoId: number
  productoNombre: string
  unidadBase: UnidadBase
  presentacionId: number
  presentacionNombre: string
  factor: number
  /** Precio de la presentacion con IGV */
  precio: number
  /** Cantidad en la presentacion elegida, tal como la escribe el vendedor */
  cantidad: string
  /** Descuento en soles para toda la linea */
  descuento: string
}

export interface CalculoLinea {
  cantidadValida: boolean
  descuentoValido: boolean
  /** cantidad x factor, en unidad base */
  cantidadBase: number
  importeCentimos: number
  descuentoCentimos: number
  subtotalCentimos: number
  error: string | null
}

export interface TotalesCarrito {
  lineas: CalculoLinea[]
  totalCentimos: number
  baseCentimos: number
  igvCentimos: number
  descuentoCentimos: number
  valido: boolean
}

const MAXIMA_CANTIDAD = 1_000_000

function cantidadEsValida(texto: string, unidad: UnidadBase): boolean {
  const limpio = texto.trim().replace(',', '.')
  const patron = permiteDecimales(unidad) ? /^\d+(\.\d{1,3})?$/ : /^\d+$/
  if (!patron.test(limpio)) {
    return false
  }
  const valor = Number(limpio)
  return valor > 0 && valor <= MAXIMA_CANTIDAD
}

function descuentoEsValido(texto: string): boolean {
  const limpio = texto.trim().replace(',', '.')
  return limpio === '' || /^\d+(\.\d{1,2})?$/.test(limpio)
}

export function calcularLinea(linea: LineaCarrito): CalculoLinea {
  const cantidadValida = cantidadEsValida(linea.cantidad, linea.unidadBase)
  const descuentoValido = descuentoEsValido(linea.descuento)
  if (!cantidadValida) {
    return {
      cantidadValida,
      descuentoValido,
      cantidadBase: 0,
      importeCentimos: 0,
      descuentoCentimos: 0,
      subtotalCentimos: 0,
      error: permiteDecimales(linea.unidadBase)
        ? 'Cantidad inválida (mayor que 0, hasta 3 decimales)'
        : 'Cantidad inválida (número entero mayor que 0)',
    }
  }
  const cantidadMilesimas = escalar(linea.cantidad, 3)
  const importe = Number(dividirRedondeando(cantidadMilesimas * escalar(linea.precio, 2), 1000n))
  const cantidadBase = deMilesimas(
    Number(dividirRedondeando(cantidadMilesimas * escalar(linea.factor, 3), 1000n)),
  )
  const descuento = descuentoValido && linea.descuento.trim() !== '' ? aCentimos(linea.descuento) : 0
  let error: string | null = null
  if (!descuentoValido) {
    error = 'Descuento inválido (hasta 2 decimales)'
  } else if (descuento > importe) {
    error = 'El descuento supera el importe de la línea'
  } else if (cantidadBase <= 0) {
    error = 'La cantidad es demasiado pequeña'
  }
  return {
    cantidadValida,
    descuentoValido,
    cantidadBase,
    importeCentimos: importe,
    descuentoCentimos: descuento,
    subtotalCentimos: importe - descuento,
    error,
  }
}

/** Separa la base imponible y el IGV de un total con IGV incluido (18 %). */
export function separarIgv(totalCentimos: number): { baseCentimos: number; igvCentimos: number } {
  const base = Number(dividirRedondeando(BigInt(totalCentimos) * 100n, 118n))
  return { baseCentimos: base, igvCentimos: totalCentimos - base }
}

export function calcularTotales(lineas: LineaCarrito[]): TotalesCarrito {
  const calculos = lineas.map(calcularLinea)
  const total = calculos.reduce((suma, c) => suma + c.subtotalCentimos, 0)
  const descuento = calculos.reduce((suma, c) => suma + c.descuentoCentimos, 0)
  const { baseCentimos, igvCentimos } = separarIgv(total)
  return {
    lineas: calculos,
    totalCentimos: total,
    baseCentimos,
    igvCentimos,
    descuentoCentimos: descuento,
    valido: lineas.length > 0 && total > 0 && calculos.every((c) => c.error === null),
  }
}

/** Agrega una presentacion al carrito; si ya estaba, suma la cantidad a la linea existente. */
export function agregarAlCarrito(
  lineas: LineaCarrito[],
  nueva: Omit<LineaCarrito, 'cantidad' | 'descuento'>,
  cantidad = '1',
): LineaCarrito[] {
  const existente = lineas.find((l) => l.presentacionId === nueva.presentacionId)
  if (!existente) {
    return [...lineas, { ...nueva, cantidad, descuento: '' }]
  }
  return lineas.map((l) => {
    if (l.presentacionId !== nueva.presentacionId) {
      return l
    }
    const actual = cantidadEsValida(l.cantidad, l.unidadBase) ? escalar(l.cantidad, 3) : 0n
    const suma = actual + escalar(cantidad, 3)
    return { ...l, cantidad: String(deMilesimas(Number(suma))) }
  })
}

export function actualizarLinea(
  lineas: LineaCarrito[],
  presentacionId: number,
  cambios: Partial<Pick<LineaCarrito, 'cantidad' | 'descuento'>>,
): LineaCarrito[] {
  return lineas.map((l) => (l.presentacionId === presentacionId ? { ...l, ...cambios } : l))
}

export function quitarLinea(lineas: LineaCarrito[], presentacionId: number): LineaCarrito[] {
  return lineas.filter((l) => l.presentacionId !== presentacionId)
}

/** Detalle que se envia al backend: el precio no se envia, lo pone el sistema. */
export function aDetallesVenta(lineas: LineaCarrito[]): VentaDetalleRequest[] {
  return lineas.map((l) => {
    const descuento = l.descuento.trim() === '' ? 0 : aCentimos(l.descuento)
    return {
      presentacionId: l.presentacionId,
      cantidad: Number(l.cantidad.trim().replace(',', '.')),
      descuento: descuento > 0 ? descuento / 100 : null,
    }
  })
}
