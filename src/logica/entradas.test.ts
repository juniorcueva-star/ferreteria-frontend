import { describe, expect, it } from 'vitest'
import { filtrarEntrada } from './entradas'
import { conLetras, nombrePersona, telefono, telefonos } from './validaciones'

describe('lo que se puede escribir', () => {
  it('en los numeros no entran letras ni el signo menos', () => {
    expect(filtrarEntrada('-12abc', 'numeric')).toBe('12')
    expect(filtrarEntrada('-2.5kg', 'decimal')).toBe('2.5')
    expect(filtrarEntrada('1,5,0', 'decimal')).toBe('1,50')
    expect(filtrarEntrada('987 654 321 abc', 'tel')).toBe('987 654 321 ')
    expect(filtrarEntrada('Perno 3/8', 'text')).toBe('Perno 3/8')
  })

  it('celulares de 9 digitos que empiezan con 9', () => {
    expect(telefono.safeParse('987654321').success).toBe(true)
    expect(telefono.safeParse('987 654 321').success).toBe(true)
    expect(telefono.safeParse('').success).toBe(true)
    expect(telefono.safeParse('014567890').success).toBe(false)
    expect(telefono.safeParse('98765432').success).toBe(false)
    expect(telefonos.safeParse('950 104 503 / 947 319 013').success).toBe(true)
    expect(telefonos.safeParse('950104503 / 12345').success).toBe(false)
  })

  it('nombres de personas solo con letras; otros nombres con al menos una letra', () => {
    expect(nombrePersona(50).safeParse('José Ñañez-Quispe').success).toBe(true)
    expect(nombrePersona(50).safeParse('Ana 2').success).toBe(false)
    expect(nombrePersona(50).safeParse('').success).toBe(false)
    expect(nombrePersona(50, false).safeParse('').success).toBe(true)
    expect(conLetras(50).safeParse('Perno 3/8').success).toBe(true)
    expect(conLetras(50).safeParse('12345').success).toBe(false)
  })
})
