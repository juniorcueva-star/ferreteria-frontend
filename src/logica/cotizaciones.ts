import type {
  CompletoResponse,
  CotizacionDetalleRequest,
  CotizacionDetalleResponse,
  EstadoCotizacion,
  PresentacionResponse,
  ProductoResponse,
} from '@/api/tipos'
import { separarIgv } from './carrito'
import { aCentimos, dividirRedondeando, esDecimalValido, escalar, textoANumero } from './decimales'
import { precioSegunCantidad } from './precioMayor'

/**
 * Lineas de una cotizacion en el formulario. El calculo es igual al backend (CotizacionService):
 * importe = ROUND(cantidad x precio, 2); subtotal = importe - descuento; total = suma; base = total / 1.18.
 */
export interface LineaCotizacion {
  clave: number
  producto: ProductoResponse
  /** Presentacion elegida, o null si la linea es de un completo */
  presentacionId: number | null
  /** Completo elegido (Ej: perno + tuerca + arandela); se cotiza por unidades enteras */
  completoId: number | null
  cantidad: string
  /** Precio por presentacion con IGV (editable; empieza con el de lista) */
  precio: string
  descuento: string
}

export interface CalculoLineaCotizacion {
  subtotalCentimos: number
  error: string | null
}

export const TONO_COTIZACION: Record<EstadoCotizacion, 'info' | 'exito' | 'neutro'> = {
  BORRADOR: 'info',
  EMITIDA: 'exito',
  ANULADA: 'neutro',
}

export const NOMBRE_COTIZACION: Record<EstadoCotizacion, string> = { BORRADOR: 'Borrador', EMITIDA: 'Emitida', ANULADA: 'Anulada' }

let siguienteClave = 1

export function nuevaLinea(producto: ProductoResponse, presentacion: PresentacionResponse): LineaCotizacion {
  return {
    clave: siguienteClave++,
    producto,
    presentacionId: presentacion.id,
    completoId: null,
    cantidad: '1',
    precio: presentacion.precioVenta.toFixed(2),
    descuento: '',
  }
}

export function presentacionDe(linea: LineaCotizacion): PresentacionResponse | undefined {
  return linea.producto.presentaciones.find((p) => p.id === linea.presentacionId)
}

export function completoDe(linea: LineaCotizacion): CompletoResponse | undefined {
  return linea.producto.completos.find((c) => c.id === linea.completoId)
}

/** Valor de la lista "Presentación": "p5" (presentacion 5) o "c3" (completo 3). */
export function opcionDe(linea: Pick<LineaCotizacion, 'presentacionId' | 'completoId'>): string {
  return linea.completoId != null ? `c${linea.completoId}` : `p${linea.presentacionId ?? ''}`
}

/** Cambia la presentacion o el completo de la linea; el precio vuelve al de lista de lo elegido. */
export function elegirOpcion(linea: LineaCotizacion, opcion: string): LineaCotizacion {
  const id = Number(opcion.slice(1))
  if (opcion.startsWith('c')) {
    const completo = linea.producto.completos.find((c) => c.id === id)
    return completo ? { ...linea, presentacionId: null, completoId: id, precio: completo.precioVenta.toFixed(2) } : linea
  }
  const presentacion = linea.producto.presentaciones.find((p) => p.id === id)
  return presentacion ? { ...linea, presentacionId: id, completoId: null, precio: presentacion.precioVenta.toFixed(2) } : linea
}

/** Precio de lista de lo elegido (presentacion o completo). */
export function precioListaDe(linea: LineaCotizacion): number | undefined {
  return linea.completoId != null ? completoDe(linea)?.precioVenta : presentacionDe(linea)?.precioVenta
}

/** Precio que pone el sistema para la cantidad escrita: el de lista o el por mayor (los completos no tienen). */
export function precioAutomaticoDe(linea: LineaCotizacion): number | undefined {
  if (linea.completoId != null) return completoDe(linea)?.precioVenta
  const presentacion = presentacionDe(linea)
  if (!presentacion) return undefined
  const cantidad = Number(linea.cantidad.trim().replace(',', '.'))
  return precioSegunCantidad(presentacion.precioVenta, presentacion.escalas, Number.isFinite(cantidad) ? cantidad : 0).precio
}

/**
 * Cambia la cantidad; si el precio era el que puso el sistema, pasa al de la nueva cantidad (Ej: al llegar a 100
 * baja al precio por mayor). Un precio escrito a mano por el vendedor se respeta.
 */
export function cambiarCantidad(linea: LineaCotizacion, cantidad: string): LineaCotizacion {
  const antes = precioAutomaticoDe(linea)
  const nueva = { ...linea, cantidad }
  const despues = precioAutomaticoDe(nueva)
  if (antes !== undefined && despues !== undefined && linea.precio === antes.toFixed(2)) {
    return { ...nueva, precio: despues.toFixed(2) }
  }
  return nueva
}

export function calcularLineaCotizacion(linea: LineaCotizacion): CalculoLineaCotizacion {
  const presentacion = presentacionDe(linea)
  const completo = completoDe(linea)
  const decimales = completo ? 0 : (presentacion?.decimales ?? 0)
  const nombre = completo?.nombre ?? presentacion?.nombre
  if (!esDecimalValido(linea.cantidad, decimales) || Number(linea.cantidad.replace(',', '.')) <= 0) {
    return {
      subtotalCentimos: 0,
      error: decimales === 0 ? `${nombre ?? 'La presentación'} no acepta fracciones` : `Cantidad mayor que 0 (hasta ${decimales} decimales)`,
    }
  }
  if (!esDecimalValido(linea.precio, 2)) return { subtotalCentimos: 0, error: 'Precio inválido (hasta 2 decimales)' }
  const descuentoTexto = linea.descuento.trim()
  if (descuentoTexto !== '' && !esDecimalValido(descuentoTexto, 2)) {
    return { subtotalCentimos: 0, error: 'Descuento inválido (hasta 2 decimales)' }
  }
  const importe = Number(dividirRedondeando(escalar(linea.cantidad, 3) * escalar(linea.precio, 2), 1000n))
  const descuento = descuentoTexto === '' ? 0 : aCentimos(descuentoTexto)
  if (descuento > importe) return { subtotalCentimos: 0, error: 'El descuento supera el importe de la línea' }
  return { subtotalCentimos: importe - descuento, error: null }
}

export function totalesCotizacion(lineas: LineaCotizacion[]) {
  const calculos = lineas.map(calcularLineaCotizacion)
  const totalCentimos = calculos.reduce((suma, c) => suma + c.subtotalCentimos, 0)
  const repetidas = new Set<string>()
  const vistas = new Set<string>()
  lineas.forEach((l) => (vistas.has(opcionDe(l)) ? repetidas.add(opcionDe(l)) : vistas.add(opcionDe(l))))
  const errores = [
    ...(lineas.length === 0 ? ['Agregue al menos un producto'] : []),
    ...(repetidas.size > 0 ? ['Hay presentaciones repetidas: sume la cantidad en una sola línea'] : []),
    ...(lineas.length > 0 && totalCentimos <= 0 ? ['El total debe ser mayor que 0'] : []),
  ]
  return { calculos, totalCentimos, ...separarIgv(totalCentimos), errores, valido: errores.length === 0 && calculos.every((c) => c.error === null) }
}

/** Linea editable a partir de una linea guardada (para editar un borrador). */
export function lineaDesdeDetalle(detalle: CotizacionDetalleResponse, producto: ProductoResponse): LineaCotizacion {
  return {
    clave: siguienteClave++,
    producto,
    presentacionId: detalle.presentacionId,
    completoId: detalle.completoId,
    cantidad: String(detalle.cantidad),
    precio: detalle.precioUnitario.toFixed(2),
    descuento: detalle.descuento > 0 ? detalle.descuento.toFixed(2) : '',
  }
}

/** Lineas para el backend: el precio siempre se envia (el vendedor puede haberlo cambiado). */
export function aDetallesRequest(lineas: LineaCotizacion[]): CotizacionDetalleRequest[] {
  return lineas.map((l) => ({
    presentacionId: l.completoId != null ? null : l.presentacionId,
    completoId: l.completoId,
    cantidad: textoANumero(l.cantidad),
    precioUnitario: textoANumero(l.precio),
    descuento: l.descuento.trim() === '' ? null : textoANumero(l.descuento),
  }))
}
