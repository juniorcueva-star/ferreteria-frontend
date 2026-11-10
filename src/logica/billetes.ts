/**
 * Billetes rapidos para cobrar en efectivo: el vendedor toca con que billete paga el cliente y el vuelto sale solo.
 * Propone los montos redondos mas comunes que alcanzan el total: el siguiente multiplo de 10, 20, 50, 100 y 200.
 */
const MULTIPLOS = [10, 20, 50, 100, 200]

export function billetesSugeridos(totalCentimos: number, maximo = 4): number[] {
  if (totalCentimos <= 0) return []
  const total = totalCentimos / 100
  const montos = new Set<number>()
  for (const m of MULTIPLOS) {
    const monto = Math.ceil(total / m - 1e-9) * m
    // Si el total ya es redondo (Ej: S/ 20.00) ese monto es "Exacto", no un billete
    if (monto > total + 1e-9) montos.add(monto)
  }
  return [...montos].sort((a, b) => a - b).slice(0, maximo)
}
