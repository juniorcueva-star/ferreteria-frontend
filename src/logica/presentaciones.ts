import type { PresentacionResponse, ProductoResponse, UnidadBase } from '@/api/tipos'
import { aMilesimas, deMilesimas, dividirRedondeando, escalar } from './decimales'
import { cantidadAgrupada, sufijoUnidad } from './formato'

/**
 * Conversion de presentaciones a unidad base. El stock siempre esta en la unidad base del producto
 * (UNIDAD, KILO o METRO) y cada presentacion indica cuantas unidades base contiene (factor).
 * Ej: 2 "Caja x100" = 2 x 100 = 200 unidades; 3 "Medio kilo" = 3 x 0.5 = 1.5 kg.
 */

/** Cantidad en unidad base = ROUND(cantidad x factor, 3), igual que el CHECK ck_venta_det_base. */
export function cantidadBase(cantidadPresentacion: number | string, factor: number | string): number {
  const milesimas = dividirRedondeando(escalar(cantidadPresentacion, 3) * escalar(factor, 3), 1000n)
  return deMilesimas(Number(milesimas))
}

/** Cuantas presentaciones completas caben en un stock (Ej: 250 unidades = 2 cajas de 100). */
export function presentacionesDisponibles(stockBase: number, factor: number): number {
  if (factor <= 0) {
    return 0
  }
  return Math.floor(aMilesimas(stockBase) / aMilesimas(factor))
}

/** Solo los productos por KILO o METRO se venden con decimales (2.5 kg, 1.75 m). */
export function permiteDecimales(unidad: UnidadBase): boolean {
  return unidad !== 'UNIDAD'
}

/** Decimales permitidos al escribir una cantidad de esta unidad. */
export function decimalesCantidad(unidad: UnidadBase): number {
  return permiteDecimales(unidad) ? 3 : 0
}

/** Un producto por UNIDAD no acepta factores con decimales (no existe "media unidad" de un perno). */
export function factorValido(factor: number, unidad: UnidadBase): boolean {
  if (!(factor > 0)) {
    return false
  }
  return permiteDecimales(unidad) || Number.isInteger(factor)
}

/** Texto del chip de presentacion: "Caja x100 · 100 u", "Millar · 1,000 u", "Medio kilo · 0.5 kg". */
export function textoChip(presentacion: Pick<PresentacionResponse, 'nombre' | 'factor'>, unidad: UnidadBase): string {
  return `${presentacion.nombre} · ${cantidadAgrupada(presentacion.factor)} ${sufijoUnidad(unidad)}`
}

/** Presentacion principal (la que se muestra por defecto); si no hubiera, la primera activa. */
export function presentacionPrincipal(producto: ProductoResponse): PresentacionResponse | undefined {
  return (
    producto.presentaciones.find((p) => p.principal && p.activo) ?? producto.presentaciones.find((p) => p.activo)
  )
}

/** Presentaciones activas, la principal primero y luego de menor a mayor factor. */
export function presentacionesActivas(producto: ProductoResponse): PresentacionResponse[] {
  return producto.presentaciones
    .filter((p) => p.activo)
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.factor - b.factor)
}
