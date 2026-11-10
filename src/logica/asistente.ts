import type { MensajeChat } from '@/api/tipos'

/** Mensajes anteriores que se mandan con cada pregunta (el servidor acepta hasta 20). */
export const MAXIMO_HISTORIAL = 10
export const MAXIMO_PREGUNTA = 500

/** Los ultimos mensajes del chat para dar contexto a la siguiente pregunta, sin pasar el limite. */
export function historialParaEnviar(mensajes: MensajeChat[]): MensajeChat[] {
  return mensajes.slice(-MAXIMO_HISTORIAL)
}

export interface Segmento {
  texto: string
  negrita: boolean
}

/** Separa el **texto en negrita** que a veces usa la IA, sin interpretar HTML (se muestra como texto). */
export function segmentosDe(linea: string): Segmento[] {
  return linea
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((parte) => parte !== '')
    .map((parte) => (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4 ? { texto: parte.slice(2, -2), negrita: true } : { texto: parte, negrita: false }))
}

const CONSULTAS: Record<string, string> = {
  buscar_productos: 'productos',
  calcular_precio: 'precio',
  productos_bajo_minimo: 'stock mínimo',
  pedidos_reposicion_pendientes: 'pedidos',
  ventas_por_tienda: 'ventas',
  productos_mas_vendidos: 'más vendidos',
  deudores: 'deudores',
}

/** "Revisó: productos y precio" para mostrar de donde salio la respuesta. */
export function textoConsultas(consultas: string[]): string | null {
  if (consultas.length === 0) return null
  const nombres = consultas.map((c) => CONSULTAS[c] ?? c)
  return `Revisó: ${nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`}`
}
