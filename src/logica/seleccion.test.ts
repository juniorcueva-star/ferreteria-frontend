import { describe, expect, it } from 'vitest'
import { alternar, alternarPagina, textoAccionLote, todosSeleccionados } from './seleccion'

describe('seleccion multiple', () => {
  it('alterna un id', () => {
    const una = alternar(new Set(), 5)
    expect([...una]).toEqual([5])
    expect([...alternar(una, 5)]).toEqual([])
  })

  it('selecciona y deselecciona la pagina completa sin tocar otras paginas', () => {
    const inicial = new Set([99])
    const conPagina = alternarPagina(inicial, [1, 2, 3])
    expect(todosSeleccionados(conPagina, [1, 2, 3])).toBe(true)
    expect([...alternarPagina(conPagina, [1, 2, 3])]).toEqual([99])
  })

  it('una pagina vacia nunca cuenta como seleccionada', () => {
    expect(todosSeleccionados(new Set([1]), [])).toBe(false)
  })

  it('arma el texto de confirmacion', () => {
    expect(textoAccionLote('ASIGNAR_CATEGORIA', 2, 'Pernos')).toBe('Se asignará la categoría “Pernos” a 2 productos.')
    expect(textoAccionLote('DESACTIVAR', 1)).toBe('Se desactivará 1 producto: ya no se podrán vender.')
  })
})
