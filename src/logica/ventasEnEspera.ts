import type { ClienteResponse, CondicionVenta } from '@/api/tipos'
import type { LineaCarrito } from './carrito'

/**
 * Ventas en espera del punto de venta: el vendedor pausa un carrito (el cliente fue a buscar dinero) y atiende a otro.
 * Se guardan en este navegador por usuario, asi sobreviven a recargar la pagina. Maximo 5.
 */
export interface VentaEnEspera {
  id: string
  /** Fecha y hora en que se puso en espera (ISO) */
  guardada: string
  carrito: LineaCarrito[]
  condicion: CondicionVenta
  cliente: ClienteResponse | null
  totalCentimos: number
}

export const MAXIMO_EN_ESPERA = 5

function clave(usuarioId: number): string {
  return `ferreteria.ventasEnEspera.${usuarioId}`
}

export function leerEnEspera(usuarioId: number): VentaEnEspera[] {
  try {
    const guardado: unknown = JSON.parse(localStorage.getItem(clave(usuarioId)) ?? '[]')
    return Array.isArray(guardado) ? (guardado as VentaEnEspera[]).filter((v) => Array.isArray(v?.carrito)) : []
  } catch {
    return []
  }
}

export function guardarEnEspera(usuarioId: number, ventas: VentaEnEspera[]): void {
  try {
    localStorage.setItem(clave(usuarioId), JSON.stringify(ventas))
  } catch {
    // Sin almacenamiento (modo privado): las ventas en espera se pierden al recargar, pero funcionan
  }
}

/** Agrega una venta en espera (la mas reciente al final); null si ya hay el maximo. */
export function ponerEnEspera(ventas: VentaEnEspera[], venta: Omit<VentaEnEspera, 'id' | 'guardada'>, ahora = new Date()): VentaEnEspera[] | null {
  if (ventas.length >= MAXIMO_EN_ESPERA) return null
  return [...ventas, { ...venta, id: `${ahora.getTime().toString(36)}${ventas.length}`, guardada: ahora.toISOString() }]
}

/** Texto corto para el boton: "Juan Perez · 3 productos" o "Venta de las 10:32 · 1 producto". */
export function etiquetaEnEspera(venta: VentaEnEspera): string {
  const hora = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Lima' }).format(new Date(venta.guardada))
  const quien = venta.cliente?.nombre ?? `Venta de las ${hora}`
  return `${quien} · ${venta.carrito.length} producto${venta.carrito.length === 1 ? '' : 's'}`
}
