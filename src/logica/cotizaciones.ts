import type {
  CotizacionDetalleRequest,
  CotizacionDetalleResponse,
  EstadoCotizacion,
  PresentacionResponse,
  ProductoResponse,
} from '@/api/tipos'
import { separarIgv } from './carrito'
import { aCentimos, dividirRedondeando, esDecimalValido, escalar, textoANumero } from './decimales'

/**
 * Lineas de una cotizacion en el formulario. El calculo es igual al backend (CotizacionService):
 * importe = ROUND(cantidad x precio, 2); subtotal = importe - descuento; total = suma; base = total / 1.18.
 */
export interface LineaCotizacion {
  clave: number
  producto: ProductoResponse
  presentacionId: number
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
    cantidad: '1',
    precio: presentacion.precioVenta.toFixed(2),
    descuento: '',
  }
}

export function presentacionDe(linea: LineaCotizacion): PresentacionResponse | undefined {
  return linea.producto.presentaciones.find((p) => p.id === linea.presentacionId)
}

export function calcularLineaCotizacion(linea: LineaCotizacion): CalculoLineaCotizacion {
  const presentacion = presentacionDe(linea)
  const decimales = presentacion?.decimales ?? 0
  if (!esDecimalValido(linea.cantidad, decimales) || Number(linea.cantidad.replace(',', '.')) <= 0) {
    return {
      subtotalCentimos: 0,
      error: decimales === 0 ? `${presentacion?.nombre ?? 'La presentación'} no acepta fracciones` : `Cantidad mayor que 0 (hasta ${decimales} decimales)`,
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
  const repetidas = new Set<number>()
  const vistas = new Set<number>()
  lineas.forEach((l) => (vistas.has(l.presentacionId) ? repetidas.add(l.presentacionId) : vistas.add(l.presentacionId)))
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
    cantidad: String(detalle.cantidad),
    precio: detalle.precioUnitario.toFixed(2),
    descuento: detalle.descuento > 0 ? detalle.descuento.toFixed(2) : '',
  }
}

/** Lineas para el backend: el precio siempre se envia (el vendedor puede haberlo cambiado). */
export function aDetallesRequest(lineas: LineaCotizacion[]): CotizacionDetalleRequest[] {
  return lineas.map((l) => ({
    presentacionId: l.presentacionId,
    cantidad: textoANumero(l.cantidad),
    precioUnitario: textoANumero(l.precio),
    descuento: l.descuento.trim() === '' ? null : textoANumero(l.descuento),
  }))
}
