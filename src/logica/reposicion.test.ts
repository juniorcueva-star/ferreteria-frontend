import { describe, expect, it } from 'vitest'
import { errorCantidad, ponerLinea, type LineaReposicion } from './reposicion'

const perno: LineaReposicion = { productoId: 1, productoCodigo: 'PER', productoNombre: 'Perno', unidadBase: 'UNIDAD', cantidad: '7' }
const cable: LineaReposicion = { productoId: 2, productoCodigo: 'CAB', productoNombre: 'Cable', unidadBase: 'METRO', cantidad: '2.5' }

describe('pedidos de reposicion', () => {
  it('valida enteros por unidad y decimales por metro, kilo o litro', () => {
    expect(errorCantidad(perno)).toBeNull()
    expect(errorCantidad({ ...perno, cantidad: '1.5' })).toBe('Cantidad entera')
    expect(errorCantidad(cable)).toBeNull()
    expect(errorCantidad({ ...perno, cantidad: '0' })).toBe('Mayor que 0')
    expect(errorCantidad({ ...perno, cantidad: '0' }, true)).toBeNull()
  })

  it('no repite productos: reemplaza la cantidad', () => {
    expect(ponerLinea([perno], { ...perno, cantidad: '10' })).toEqual([{ ...perno, cantidad: '10' }])
    expect(ponerLinea([perno], cable)).toHaveLength(2)
  })
})
