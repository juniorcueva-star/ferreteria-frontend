/** Paginas a mostrar: primera, ultima y las vecinas de la actual (null = puntos suspensivos). */
export function paginasVisibles(actual: number, total: number): Array<number | null> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i)
  }
  const resultado: Array<number | null> = [0]
  const inicio = Math.max(1, actual - 1)
  const fin = Math.min(total - 2, actual + 1)
  if (inicio > 1) resultado.push(null)
  for (let i = inicio; i <= fin; i++) resultado.push(i)
  if (fin < total - 2) resultado.push(null)
  resultado.push(total - 1)
  return resultado
}
