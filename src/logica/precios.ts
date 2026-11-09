import { dividirRedondeando, escalar } from './decimales'

/**
 * Precio sugerido de una presentacion, igual que el backend (PrecioSugerido.java):
 *   sugerido = redondear_2(costo x (1 + ganancia / 100) + adicional), con HALF_UP.
 * Se calcula con enteros escalados para no arrastrar errores de punto flotante.
 *
 * @returns el precio en soles, o null si no hay costo de referencia
 */
export function precioSugerido(
  costo: number | null,
  porcentajeGanancia: number | string | null,
  montoAdicional: number | string | null,
): number | null {
  if (costo === null) return null
  const costo4 = escalar(costo, 4) // costo x 10^4
  const ganancia4 = escalar(vacioACero(porcentajeGanancia), 4) // porcentaje x 10^4
  // costo x (1 + ganancia/100) en centimos = costo4 x (10^6 + ganancia4) / 10^8
  const centimos = dividirRedondeando(costo4 * (1_000_000n + ganancia4), 100_000_000n)
  return Number(centimos + escalar(vacioACero(montoAdicional), 2)) / 100
}

function vacioACero(valor: number | string | null): number | string {
  if (valor === null) return 0
  return typeof valor === 'string' && valor.trim() === '' ? 0 : valor
}
