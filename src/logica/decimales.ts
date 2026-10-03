/**
 * Aritmetica decimal exacta para dinero y cantidades.
 *
 * En JavaScript 0.1 + 0.2 = 0.30000000000000004, asi que los montos no se suman como numeros:
 * se convierten a enteros escalados (centimos para el dinero, milesimas para las cantidades) y se
 * redondea con HALF_UP, igual que el backend (BigDecimal) y PostgreSQL (ROUND). Asi el total que
 * se muestra en pantalla es exactamente el que calcula el servidor.
 */

const PATRON_DECIMAL = /^(-?)(\d*)(?:\.(\d*))?$/

/** Convierte un numero o texto decimal a entero escalado (10^decimales) redondeando HALF_UP. */
export function escalar(valor: number | string, decimales: number): bigint {
  let texto = typeof valor === 'number' ? String(valor) : valor.trim().replace(',', '.')
  if (/e/i.test(texto)) {
    texto = Number(texto).toFixed(12)
  }
  const partes = PATRON_DECIMAL.exec(texto)
  if (!partes || ((partes[2] ?? '') === '' && (partes[3] ?? '') === '')) {
    throw new Error(`Número inválido: ${String(valor)}`)
  }
  const negativo = partes[1] === '-'
  const entero = partes[2] || '0'
  const fraccion = `${partes[3] ?? ''}${'0'.repeat(decimales + 1)}`.slice(0, decimales + 1)
  // Un digito extra para decidir el redondeo: +5 y se descarta (HALF_UP sobre la magnitud)
  const magnitud = (BigInt(entero + fraccion) + 5n) / 10n
  return negativo ? -magnitud : magnitud
}

/** Division entera con redondeo HALF_UP (alejandose de cero en el empate). */
export function dividirRedondeando(dividendo: bigint, divisor: bigint): bigint {
  if (divisor === 0n) {
    throw new Error('División entre cero')
  }
  const negativo = dividendo < 0n !== divisor < 0n
  const a = dividendo < 0n ? -dividendo : dividendo
  const b = divisor < 0n ? -divisor : divisor
  const resultado = (2n * a + b) / (2n * b)
  return negativo ? -resultado : resultado
}

/** Dinero a centimos (2 decimales). */
export function aCentimos(valor: number | string): number {
  return Number(escalar(valor, 2))
}

/** Cantidad a milesimas (3 decimales, como NUMERIC(14,3)). */
export function aMilesimas(valor: number | string): number {
  return Number(escalar(valor, 3))
}

/** Centimos a soles para enviar a la API (Ej: 1235 -> 12.35). */
export function deCentimos(centimos: number): number {
  return centimos / 100
}

/** Milesimas a cantidad para enviar a la API (Ej: 2500 -> 2.5). */
export function deMilesimas(milesimas: number): number {
  return milesimas / 1000
}

/** True si el texto es un decimal positivo valido con como maximo `decimales` decimales. */
export function esDecimalValido(texto: string, decimales: number): boolean {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') {
    return false
  }
  const patron = decimales === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimales}})?$`)
  return patron.test(limpio)
}

/** Convierte el texto de un campo numerico (acepta coma decimal) a numero. */
export function textoANumero(texto: string): number {
  return Number(texto.trim().replace(',', '.'))
}
