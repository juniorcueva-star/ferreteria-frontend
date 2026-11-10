/**
 * Como se ven los productos en el punto de venta: en lista (con todas las presentaciones a la vista) o en
 * cuadritos con foto (comodo en tablet: se agrega con un toque). Se recuerda en este navegador.
 */
export type VistaCaja = 'lista' | 'fotos'

const CLAVE = 'ferreteria.vistaCaja'
/** Por debajo de este ancho (tablet en vertical, celular) arranca en cuadritos con foto */
export const ANCHO_TABLET = 1024

export function vistaInicial(ancho: number): VistaCaja {
  return ancho < ANCHO_TABLET ? 'fotos' : 'lista'
}

export function leerVistaCaja(ancho: number): VistaCaja {
  try {
    const guardada = localStorage.getItem(CLAVE)
    return guardada === 'lista' || guardada === 'fotos' ? guardada : vistaInicial(ancho)
  } catch {
    return vistaInicial(ancho)
  }
}

export function guardarVistaCaja(vista: VistaCaja): void {
  try {
    localStorage.setItem(CLAVE, vista)
  } catch {
    // Sin almacenamiento (ventana privada): solo se pierde la preferencia
  }
}
