import type { MensajeChat } from '@/api/tipos'

/**
 * Mascota flotante del asistente: se puede arrastrar a cualquier lugar de la pantalla (para que no tape nada) y
 * recuerda donde quedo. La conversacion se guarda mientras dure la sesion del navegador: cerrar el chat o cambiar de
 * pantalla no la borra; solo "Nueva conversacion" o cerrar el navegador.
 */
export interface Punto {
  x: number
  y: number
}

export interface Tamano {
  ancho: number
  alto: number
}

/** Espacio minimo con el borde de la pantalla */
export const MARGEN = 8
/** Desde cuantos pixeles de movimiento se considera arrastre (si no, es un toque que abre el chat) */
export const UMBRAL_ARRASTRE = 6
const CLAVE_POSICION = 'ferreteria.asistente.posicion'
const CLAVE_CONVERSACION = 'ferreteria.asistente.conversacion'
const MAXIMO_GUARDADO = 40

/** Mantiene la mascota completa dentro de la pantalla. */
export function limitar(punto: Punto, mascota: Tamano, ventana: Tamano): Punto {
  return {
    x: Math.round(Math.min(Math.max(punto.x, MARGEN), Math.max(MARGEN, ventana.ancho - mascota.ancho - MARGEN))),
    y: Math.round(Math.min(Math.max(punto.y, MARGEN), Math.max(MARGEN, ventana.alto - mascota.alto - MARGEN))),
  }
}

/** Abajo a la derecha, a la izquierda del boton de ayuda. */
export function posicionInicial(mascota: Tamano, ventana: Tamano): Punto {
  return limitar({ x: ventana.ancho - mascota.ancho - 76, y: ventana.alto - mascota.alto - 12 }, mascota, ventana)
}

/**
 * El chat se abre junto a la mascota sin taparla: primero arriba o abajo (donde haya mas espacio), si no entra, a un
 * costado; si no entra en ningun lado (pantalla chica), lo mas cerca posible dentro de la pantalla.
 */
export function posicionPanel(mascota: Punto & Tamano, panel: Tamano, ventana: Tamano): Punto {
  const enLaDerecha = mascota.x + mascota.ancho / 2 > ventana.ancho / 2
  const enLaParteBaja = mascota.y + mascota.alto / 2 > ventana.alto / 2
  const alineadoX = enLaDerecha ? mascota.x + mascota.ancho - panel.ancho : mascota.x
  const alineadoY = enLaParteBaja ? mascota.y + mascota.alto - panel.alto : mascota.y
  const arriba = { x: alineadoX, y: mascota.y - panel.alto - MARGEN }
  const abajo = { x: alineadoX, y: mascota.y + mascota.alto + MARGEN }
  const izquierda = { x: mascota.x - panel.ancho - MARGEN, y: alineadoY }
  const derecha = { x: mascota.x + mascota.ancho + MARGEN, y: alineadoY }
  const opciones = [
    ...(enLaParteBaja ? [arriba, abajo] : [abajo, arriba]),
    ...(enLaDerecha ? [izquierda, derecha] : [derecha, izquierda]),
  ]
  // Cada opcion se acomoda dentro de la pantalla; se usa la primera que asi no tapa a la mascota
  const elegida = opciones.map((p) => limitar(p, panel, ventana)).find((p) => noSeCruza(p, panel, mascota))
  return elegida ?? limitar(opciones[0] ?? abajo, panel, ventana)
}

/** true si el chat en esa posicion no tapa a la mascota. */
function noSeCruza(p: Punto, panel: Tamano, mascota: Punto & Tamano): boolean {
  return p.x + panel.ancho <= mascota.x || mascota.x + mascota.ancho <= p.x || p.y + panel.alto <= mascota.y || mascota.y + mascota.alto <= p.y
}

export function seMovio(inicio: Punto, actual: Punto): boolean {
  return Math.abs(actual.x - inicio.x) > UMBRAL_ARRASTRE || Math.abs(actual.y - inicio.y) > UMBRAL_ARRASTRE
}

/** Posicion guardada en este navegador para el usuario; null si no hay o no se puede leer. */
export function leerPosicion(usuarioId: number): Punto | null {
  try {
    const valor = JSON.parse(localStorage.getItem(`${CLAVE_POSICION}.${usuarioId}`) ?? 'null') as unknown
    if (valor && typeof valor === 'object' && 'x' in valor && 'y' in valor && typeof valor.x === 'number' && typeof valor.y === 'number') {
      return { x: valor.x, y: valor.y }
    }
  } catch {
    // Sin almacenamiento o dato danado: se usa la posicion inicial
  }
  return null
}

export function guardarPosicion(usuarioId: number, punto: Punto): void {
  try {
    localStorage.setItem(`${CLAVE_POSICION}.${usuarioId}`, JSON.stringify(punto))
  } catch {
    // Ventana privada: solo se pierde la preferencia
  }
}

export interface MensajeGuardado extends MensajeChat {
  consultas?: string[]
}

/** Conversacion de la sesion del navegador (se borra al cerrar el navegador). */
export function leerConversacion(usuarioId: number): MensajeGuardado[] {
  try {
    const valor = JSON.parse(sessionStorage.getItem(`${CLAVE_CONVERSACION}.${usuarioId}`) ?? '[]') as unknown
    if (!Array.isArray(valor)) return []
    return valor.filter(
      (m): m is MensajeGuardado =>
        typeof m === 'object' && m !== null && (m.rol === 'USUARIO' || m.rol === 'ASISTENTE') && typeof m.texto === 'string',
    )
  } catch {
    return []
  }
}

export function guardarConversacion(usuarioId: number, mensajes: MensajeGuardado[]): void {
  try {
    if (mensajes.length === 0) {
      sessionStorage.removeItem(`${CLAVE_CONVERSACION}.${usuarioId}`)
    } else {
      sessionStorage.setItem(`${CLAVE_CONVERSACION}.${usuarioId}`, JSON.stringify(mensajes.slice(-MAXIMO_GUARDADO)))
    }
  } catch {
    // Sin almacenamiento: la conversacion vive solo en memoria
  }
}
