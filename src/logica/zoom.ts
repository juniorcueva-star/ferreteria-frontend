/**
 * Tamano de letra de toda la pantalla (pedido del dueno: lectura comoda para personas adultas).
 * Se cambia el tamano de letra base de la pagina; como Tailwind mide todo en rem, crecen letras, botones y espacios.
 */
export const NIVELES_ZOOM = [90, 100, 110, 125, 140, 160] as const
export const ZOOM_NORMAL = 100
/** Tamano con el que arranca el sistema (pedido del dueno: letra mas grande por defecto) */
export const ZOOM_INICIAL = 110
export const ZOOM_MINIMO = 90
export const ZOOM_MAXIMO = 160
const CLAVE = 'ferreteria.zoom'

export function ajustarNivel(nivel: number): number {
  return NIVELES_ZOOM.reduce((cercano, n) => (Math.abs(n - nivel) < Math.abs(cercano - nivel) ? n : cercano), ZOOM_NORMAL)
}

export function acercar(nivel: number): number {
  return NIVELES_ZOOM.find((n) => n > nivel) ?? ZOOM_MAXIMO
}

export function alejar(nivel: number): number {
  return [...NIVELES_ZOOM].reverse().find((n) => n < nivel) ?? ZOOM_MINIMO
}

/** Nivel guardado en este navegador (110 si no hay o si el navegador no deja leerlo). */
export function leerZoom(): number {
  try {
    const guardado = Number(localStorage.getItem(CLAVE))
    return guardado > 0 ? ajustarNivel(guardado) : ZOOM_INICIAL
  } catch {
    return ZOOM_INICIAL
  }
}

/** Aplica el nivel a la pagina y lo recuerda para la proxima vez. */
export function aplicarZoom(nivel: number): void {
  document.documentElement.style.fontSize = nivel === ZOOM_NORMAL ? '' : `${nivel}%`
  try {
    localStorage.setItem(CLAVE, String(nivel))
  } catch {
    // Sin almacenamiento (modo privado): el zoom funciona igual, solo que no se recuerda
  }
}
