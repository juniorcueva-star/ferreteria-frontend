import { dividirRedondeando } from './decimales'

/** Billetes y monedas del sol peruano, en centimos, de mayor a menor. */
export const DENOMINACIONES: { centimos: number; nombre: string; tipo: 'Billete' | 'Moneda' }[] = [
  { centimos: 20000, nombre: 'S/ 200', tipo: 'Billete' },
  { centimos: 10000, nombre: 'S/ 100', tipo: 'Billete' },
  { centimos: 5000, nombre: 'S/ 50', tipo: 'Billete' },
  { centimos: 2000, nombre: 'S/ 20', tipo: 'Billete' },
  { centimos: 1000, nombre: 'S/ 10', tipo: 'Billete' },
  { centimos: 500, nombre: 'S/ 5', tipo: 'Moneda' },
  { centimos: 200, nombre: 'S/ 2', tipo: 'Moneda' },
  { centimos: 100, nombre: 'S/ 1', tipo: 'Moneda' },
  { centimos: 50, nombre: 'S/ 0.50', tipo: 'Moneda' },
  { centimos: 20, nombre: 'S/ 0.20', tipo: 'Moneda' },
  { centimos: 10, nombre: 'S/ 0.10', tipo: 'Moneda' },
]

/** Cuantos hay de cada denominacion (texto tal como lo escribe el vendedor; vacio = 0). */
export type Conteo = Record<number, string>

/** Total del conteo en centimos (las cantidades que no son enteros validos cuentan como 0). */
export function totalConteo(conteo: Conteo): number {
  return DENOMINACIONES.reduce((suma, d) => {
    const texto = (conteo[d.centimos] ?? '').trim()
    return /^\d+$/.test(texto) ? suma + Number(texto) * d.centimos : suma
  }, 0)
}

/** Centimos a texto de soles con 2 decimales para el campo "Efectivo contado" (Ej: 12350 -> "123.50"). */
export function centimosATexto(centimos: number): string {
  return (Number(dividirRedondeando(BigInt(centimos), 1n)) / 100).toFixed(2)
}
