import type { EscalaPrecio, TipoPrecio, UnidadBase, VentaDetalleRequest } from '@/api/tipos'
import { aCentimos, deMilesimas, dividirRedondeando, esDecimalValido, escalar } from './decimales'
import { precioSegunCantidad } from './precioMayor'

/**
 * Carrito del punto de venta. Replica el calculo del backend (VentaService) para mostrar el total
 * exacto antes de cobrar:
 *   importe   = ROUND(cantidad x precio, 2)
 *   subtotal  = importe - descuento de la linea
 *   total     = suma de subtotales (los precios ya incluyen IGV)
 *   base      = ROUND(total / 1.18, 2);  IGV = total - base
 * Todo se calcula en centimos enteros para no arrastrar errores de punto flotante.
 */

/** Pieza de un completo: producto y lo que se descuenta de su stock por cada completo (unidad base) */
export interface PiezaCompleto {
  productoId: number
  cantidadBase: number
}

/**
 * Linea del carrito: de una presentacion (Ej: Docena) o de un completo (Ej: perno + tuerca + arandela). En un
 * completo: presentacionId null, factor 1, decimales 0 y sus piezas para calcular el stock.
 */
export interface LineaCarrito {
  productoId: number
  productoNombre: string
  unidadBase: UnidadBase
  presentacionId: number | null
  completoId?: number | null
  /** Piezas del completo, Ej: "1 Perno (Unidad) + 1 Tuerca (Unidad)" */
  composicion?: string | null
  piezas?: PiezaCompleto[]
  /** Nombre de la presentacion o del completo */
  presentacionNombre: string
  factor: number
  /** Decimales que acepta la presentacion (0 = solo enteros) */
  decimales: number
  /** Precio de la presentacion con IGV */
  precio: number
  /** Precio por mayor de la presentacion (el precio baja solo al llegar a la cantidad) */
  escalas?: EscalaPrecio[]
  /** Precio de oferta vigente al agregarla (null si no tiene) */
  precioOferta?: number | null
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
  /** Precio que se cobra por presentacion: el de lista o el por mayor segun la cantidad */
  precioUnitario: number
  tipoPrecio: TipoPrecio
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

function cantidadEsValida(texto: string, decimales: number): boolean {
  const limpio = texto.trim().replace(',', '.')
  if (!esDecimalValido(limpio, decimales)) {
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
  const cantidadValida = cantidadEsValida(linea.cantidad, linea.decimales)
  const descuentoValido = descuentoEsValido(linea.descuento)
  if (!cantidadValida) {
    return {
      cantidadValida,
      descuentoValido,
      cantidadBase: 0,
      precioUnitario: linea.precio,
      tipoPrecio: 'LISTA',
      importeCentimos: 0,
      descuentoCentimos: 0,
      subtotalCentimos: 0,
      error:
        linea.decimales > 0
          ? `Cantidad inválida (mayor que 0, hasta ${linea.decimales} decimales)`
          : `${linea.presentacionNombre} no acepta fracciones: escriba un número entero mayor que 0`,
    }
  }
  const cantidadMilesimas = escalar(linea.cantidad, 3)
  const { precio, tipo } = precioSegunCantidad(linea.precio, linea.escalas, Number(linea.cantidad.trim().replace(',', '.')), linea.precioOferta ?? null)
  const importe = Number(dividirRedondeando(cantidadMilesimas * escalar(precio, 2), 1000n))
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
    precioUnitario: precio,
    tipoPrecio: tipo,
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

/** Identifica una linea: "p5" (presentacion 5) o "c3" (completo 3). */
export function claveLinea(linea: Pick<LineaCarrito, 'presentacionId' | 'completoId'>): string {
  return linea.completoId != null ? `c${linea.completoId}` : `p${linea.presentacionId ?? ''}`
}

/** Agrega una presentacion o un completo al carrito; si ya estaba, suma la cantidad a la linea existente. */
export function agregarAlCarrito(
  lineas: LineaCarrito[],
  nueva: Omit<LineaCarrito, 'cantidad' | 'descuento'>,
  cantidad = '1',
): LineaCarrito[] {
  const clave = claveLinea(nueva)
  const existente = lineas.find((l) => claveLinea(l) === clave)
  if (!existente) {
    return [...lineas, { ...nueva, cantidad, descuento: '' }]
  }
  return lineas.map((l) => {
    if (claveLinea(l) !== clave) {
      return l
    }
    const actual = cantidadEsValida(l.cantidad, l.decimales) ? escalar(l.cantidad, 3) : 0n
    const suma = actual + escalar(cantidad, 3)
    return { ...l, cantidad: String(deMilesimas(Number(suma))) }
  })
}

export function actualizarLinea(
  lineas: LineaCarrito[],
  clave: string,
  cambios: Partial<Pick<LineaCarrito, 'cantidad' | 'descuento'>>,
): LineaCarrito[] {
  return lineas.map((l) => (claveLinea(l) === clave ? { ...l, ...cambios } : l))
}

export function quitarLinea(lineas: LineaCarrito[], clave: string): LineaCarrito[] {
  return lineas.filter((l) => claveLinea(l) !== clave)
}

/**
 * Unidad base que se lleva de cada producto, sumando todas las lineas: 1 docena + 3 unidades = 15, y cada completo
 * suma sus piezas (10 completos de perno + tuerca = 10 pernos y 10 tuercas).
 */
export function consumoPorProducto(lineas: LineaCarrito[], calculos: CalculoLinea[]): Map<number, number> {
  const consumo = new Map<number, number>()
  const sumar = (productoId: number, milesimas: bigint) =>
    consumo.set(productoId, deMilesimas(Number(escalar(consumo.get(productoId) ?? 0, 3) + milesimas)))
  lineas.forEach((l, i) => {
    const base = calculos[i]?.cantidadBase ?? 0
    if (base <= 0) return
    if (l.completoId != null) {
      for (const pieza of l.piezas ?? []) {
        sumar(pieza.productoId, dividirRedondeando(escalar(base, 3) * escalar(pieza.cantidadBase, 3), 1000n))
      }
    } else {
      sumar(l.productoId, escalar(base, 3))
    }
  })
  return consumo
}

/** Productos del carrito y piezas de sus completos (para pedir su stock). */
export function productosDelCarrito(lineas: LineaCarrito[]): number[] {
  return lineas.flatMap((l) => [l.productoId, ...(l.piezas ?? []).map((p) => p.productoId)])
}

/** Cuantos completos alcanzan con el stock de sus piezas (el menor de todas). */
export function completosDisponibles(piezas: PiezaCompleto[], stockDe: (productoId: number) => number): number {
  if (piezas.length === 0) return 0
  return Math.min(...piezas.map((p) => (p.cantidadBase > 0 ? Math.floor(stockDe(p.productoId) / p.cantidadBase + 1e-9) : 0)))
}

/** Detalle que se envia al backend: el precio no se envia, lo pone el sistema. */
export function aDetallesVenta(lineas: LineaCarrito[]): VentaDetalleRequest[] {
  return lineas.map((l) => {
    const descuento = l.descuento.trim() === '' ? 0 : aCentimos(l.descuento)
    return {
      presentacionId: l.completoId != null ? null : l.presentacionId,
      completoId: l.completoId ?? null,
      cantidad: Number(l.cantidad.trim().replace(',', '.')),
      descuento: descuento > 0 ? descuento / 100 : null,
    }
  })
}
