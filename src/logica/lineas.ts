import type { LineaProductoRequest, ProductoResponse } from '@/api/tipos'
import { esDecimalValido, textoANumero } from './decimales'
import { cantidadBase, permiteDecimales } from './presentaciones'

/**
 * Lineas de producto para ajustes, inventario inicial y traslados. Si no se elige presentacion,
 * la cantidad esta en unidad base (unidades, kilos o metros).
 */
export interface LineaEditable {
  clave: number
  producto: ProductoResponse | null
  /** '' = unidad base */
  presentacionId: string
  cantidad: string
}

let siguienteClave = 1

export function lineaVacia(): LineaEditable {
  return { clave: siguienteClave++, producto: null, presentacionId: '', cantidad: '' }
}

export function factorDeLinea(linea: LineaEditable): number {
  if (!linea.producto || linea.presentacionId === '') return 1
  return linea.producto.presentaciones.find((p) => p.id === Number(linea.presentacionId))?.factor ?? 1
}

/** Decimales permitidos: en unidad base de un producto por UNIDAD, enteros; en otros casos hasta 3. */
export function decimalesDeLinea(linea: LineaEditable): number {
  if (!linea.producto) return 3
  return permiteDecimales(linea.producto.unidadBase) ? 3 : 0
}

/** Cantidad en unidad base de la linea (0 si aun no es valida). */
export function baseDeLinea(linea: LineaEditable): number {
  if (!linea.producto || !esDecimalValido(linea.cantidad, 3)) return 0
  return cantidadBase(linea.cantidad.replace(',', '.'), factorDeLinea(linea))
}

/** Errores por linea (clave -> mensaje) y error general. */
export function validarLineas(lineas: LineaEditable[]): { porLinea: Map<number, string>; general: string | null } {
  const porLinea = new Map<number, string>()
  const productos = new Set<number>()
  if (lineas.length === 0) {
    return { porLinea, general: 'Agregue al menos un producto' }
  }
  for (const linea of lineas) {
    if (!linea.producto) {
      porLinea.set(linea.clave, 'Elija un producto')
      continue
    }
    const decimales = decimalesDeLinea(linea)
    if (!esDecimalValido(linea.cantidad, decimales) || textoANumero(linea.cantidad) <= 0) {
      porLinea.set(linea.clave, decimales === 0 ? 'Cantidad entera mayor que 0' : 'Cantidad mayor que 0 (hasta 3 decimales)')
    } else if (textoANumero(linea.cantidad) > 1_000_000) {
      porLinea.set(linea.clave, 'Máximo 1 000 000')
    }
    const claveProducto = linea.producto.id * 100_000 + Number(linea.presentacionId || 0)
    if (productos.has(claveProducto)) {
      porLinea.set(linea.clave, 'Producto repetido: sume la cantidad en una sola línea')
    }
    productos.add(claveProducto)
  }
  return { porLinea, general: null }
}

export function aLineasRequest(lineas: LineaEditable[]): LineaProductoRequest[] {
  return lineas
    .filter((l) => l.producto !== null)
    .map((l) => ({
      productoId: l.producto?.id ?? 0,
      presentacionId: l.presentacionId === '' ? null : Number(l.presentacionId),
      cantidad: textoANumero(l.cantidad),
    }))
}
