import type { HTMLAttributes } from 'react'

/**
 * Filtra lo que se escribe segun el tipo de dato (pedido del dueño: no letras donde van números ni negativos):
 * numeric = solo digitos; decimal = digitos y un separador (punto o coma); tel = digitos, espacios, guion y "/".
 */
export function filtrarEntrada(valor: string, modo: HTMLAttributes<HTMLInputElement>['inputMode']): string {
  if (modo === 'numeric') return valor.replace(/\D/g, '')
  if (modo === 'tel') return valor.replace(/[^\d\s/-]/g, '')
  if (modo === 'decimal') {
    const limpio = valor.replace(/[^\d.,]/g, '')
    const separador = limpio.search(/[.,]/)
    return separador === -1 ? limpio : limpio.slice(0, separador + 1) + limpio.slice(separador + 1).replace(/[.,]/g, '')
  }
  return valor
}
