/**
 * Seleccion multiple en una tabla paginada. Se guardan ids, asi la seleccion se mantiene al cambiar de pagina.
 */

/** Agrega el id si no estaba seleccionado y lo quita si ya estaba. */
export function alternar(seleccion: ReadonlySet<number>, id: number): Set<number> {
  const nueva = new Set(seleccion)
  if (nueva.has(id)) {
    nueva.delete(id)
  } else {
    nueva.add(id)
  }
  return nueva
}

/** Si todos los ids de la pagina estan seleccionados los quita; si no, los agrega. */
export function alternarPagina(seleccion: ReadonlySet<number>, idsPagina: number[]): Set<number> {
  const nueva = new Set(seleccion)
  if (todosSeleccionados(seleccion, idsPagina)) {
    idsPagina.forEach((id) => nueva.delete(id))
  } else {
    idsPagina.forEach((id) => nueva.add(id))
  }
  return nueva
}

export function todosSeleccionados(seleccion: ReadonlySet<number>, idsPagina: number[]): boolean {
  return idsPagina.length > 0 && idsPagina.every((id) => seleccion.has(id))
}

/** Texto de confirmacion para una accion en lote. */
export function textoAccionLote(accion: 'ASIGNAR_CATEGORIA' | 'ACTIVAR' | 'DESACTIVAR', cantidad: number, categoria?: string): string {
  const productos = cantidad === 1 ? '1 producto' : `${cantidad} productos`
  if (accion === 'ASIGNAR_CATEGORIA') return `Se asignará la categoría “${categoria ?? ''}” a ${productos}.`
  if (accion === 'ACTIVAR') return `${cantidad === 1 ? 'Se activará' : 'Se activarán'} ${productos}.`
  return `${cantidad === 1 ? 'Se desactivará' : 'Se desactivarán'} ${productos}: ya no se podrán vender.`
}
