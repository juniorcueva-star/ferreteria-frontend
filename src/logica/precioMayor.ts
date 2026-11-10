import type { EscalaPrecio, PresentacionResponse, TipoPrecio } from '@/api/tipos'

/**
 * Precio que se cobra, igual que el backend (Presentacion.precioPara): el menor entre la lista, la oferta vigente
 * y la escala mas alta que alcanza la cantidad. Ej: Unidad a S/ 0.50 y "desde 100 a S/ 0.40": 120 -> S/ 0.40.
 *
 * @param precioOferta precio de oferta vigente hoy (ver ofertaVigente), o null
 */
export function precioSegunCantidad(
  precioLista: number,
  escalas: EscalaPrecio[] | undefined,
  cantidad: number,
  precioOferta: number | null = null,
): { precio: number; tipo: TipoPrecio } {
  let precio = precioLista
  let tipo: TipoPrecio = 'LISTA'
  if (precioOferta !== null && precioOferta < precioLista) {
    precio = precioOferta
    tipo = 'OFERTA'
  }
  for (const e of escalas ?? []) {
    if (cantidad >= e.cantidadMinima && e.precio < precio) {
      precio = e.precio
      tipo = 'MAYOR'
    }
  }
  return { precio, tipo }
}

/** Precio de oferta si esta vigente el dia indicado (yyyy-MM-dd, hora de Lima) y es menor que la lista; si no, null. */
export function ofertaVigente(
  p: Pick<PresentacionResponse, 'precioVenta' | 'precioOferta' | 'ofertaDesde' | 'ofertaHasta'>,
  hoy: string,
): number | null {
  if (p.precioOferta === null || p.ofertaDesde === null || p.ofertaHasta === null) return null
  if (hoy < p.ofertaDesde || hoy > p.ofertaHasta || p.precioOferta >= p.precioVenta) return null
  return p.precioOferta
}

/** Texto corto de las escalas para mostrar junto al precio. Ej: "100+ a S/ 0.40 · 500+ a S/ 0.35" */
export function resumenEscalas(presentacion: Pick<PresentacionResponse, 'escalas'>, soles: (n: number) => string): string {
  return presentacion.escalas.map((e) => `${e.cantidadMinima}+ a ${soles(e.precio)}`).join(' · ')
}

/** Etiqueta para una linea con precio especial; null si es de lista. */
export function etiquetaTipoPrecio(tipo: TipoPrecio | undefined): string | null {
  return tipo === 'MAYOR' ? 'Precio por mayor' : tipo === 'OFERTA' ? 'Oferta' : null
}
