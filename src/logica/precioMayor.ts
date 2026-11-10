import type { EscalaPrecio, PresentacionResponse, TipoPrecio } from '@/api/tipos'

/**
 * Precio por mayor, igual que el backend (Presentacion.precioPara): se cobra el precio de la escala mas alta que
 * alcanza la cantidad, si es menor que el de lista. Ej: Unidad a S/ 0.50 y "desde 100 a S/ 0.40": 120 -> S/ 0.40.
 */
export function precioSegunCantidad(precioLista: number, escalas: EscalaPrecio[] | undefined, cantidad: number): { precio: number; tipo: TipoPrecio } {
  let precio = precioLista
  for (const e of escalas ?? []) {
    if (cantidad >= e.cantidadMinima && e.precio < precio) precio = e.precio
  }
  return { precio, tipo: precio < precioLista ? 'MAYOR' : 'LISTA' }
}

/** Texto corto de las escalas para mostrar junto al precio. Ej: "100+ a S/ 0.40 · 500+ a S/ 0.35" */
export function resumenEscalas(presentacion: Pick<PresentacionResponse, 'escalas'>, soles: (n: number) => string): string {
  return presentacion.escalas.map((e) => `${e.cantidadMinima}+ a ${soles(e.precio)}`).join(' · ')
}

/** Etiqueta para una linea con precio especial; null si es de lista. */
export function etiquetaTipoPrecio(tipo: TipoPrecio | undefined): string | null {
  return tipo === 'MAYOR' ? 'Precio por mayor' : tipo === 'OFERTA' ? 'Oferta' : null
}
