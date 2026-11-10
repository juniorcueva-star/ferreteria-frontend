import { describe, expect, it } from 'vitest'
import { historialParaEnviar, MAXIMO_HISTORIAL, segmentosDe, textoConsultas } from './asistente'

describe('asistente', () => {
  it('manda solo los ultimos mensajes como historial', () => {
    const mensajes = Array.from({ length: 15 }, (_, i) => ({ rol: 'USUARIO' as const, texto: `m${i}` }))
    const historial = historialParaEnviar(mensajes)
    expect(historial).toHaveLength(MAXIMO_HISTORIAL)
    expect(historial[0]?.texto).toBe('m5')
  })

  it('separa las negritas sin interpretar HTML', () => {
    expect(segmentosDe('Hay **40** en <b>tu</b> tienda')).toEqual([
      { texto: 'Hay ', negrita: false },
      { texto: '40', negrita: true },
      { texto: ' en <b>tu</b> tienda', negrita: false },
    ])
  })

  it('dice que consulto en palabras simples', () => {
    expect(textoConsultas([])).toBeNull()
    expect(textoConsultas(['buscar_productos'])).toBe('Revisó: productos')
    expect(textoConsultas(['buscar_productos', 'calcular_precio', 'deudores'])).toBe('Revisó: productos, precio y deudores')
  })
})
