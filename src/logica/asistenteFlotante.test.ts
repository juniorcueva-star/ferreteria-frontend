import { afterEach, describe, expect, it } from 'vitest'
import {
  guardarConversacion,
  guardarPosicion,
  leerConversacion,
  leerPosicion,
  limitar,
  MARGEN,
  posicionInicial,
  posicionPanel,
  seMovio,
} from './asistenteFlotante'

const ventana = { ancho: 1366, alto: 860 }
const mascota = { ancho: 80, alto: 96 }

describe('mascota flotante del asistente', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('no deja que la mascota salga de la pantalla', () => {
    expect(limitar({ x: -50, y: -10 }, mascota, ventana)).toEqual({ x: MARGEN, y: MARGEN })
    expect(limitar({ x: 5000, y: 5000 }, mascota, ventana)).toEqual({ x: 1366 - 80 - MARGEN, y: 860 - 96 - MARGEN })
  })

  it('arranca abajo a la derecha, dejando libre el boton de ayuda', () => {
    const inicio = posicionInicial(mascota, ventana)
    expect(inicio.x + mascota.ancho).toBeLessThanOrEqual(ventana.ancho - 70)
    expect(inicio.y + mascota.alto).toBeGreaterThan(ventana.alto - 20)
  })

  it('abre el chat del lado con mas espacio', () => {
    const panel = { ancho: 400, alto: 500 }
    // Abajo a la derecha: el chat va arriba y alineado a la derecha
    const abajoDerecha = posicionPanel({ x: 1200, y: 740, ...mascota }, panel, ventana)
    expect(abajoDerecha.x + panel.ancho).toBe(1280)
    expect(abajoDerecha.y + panel.alto).toBeLessThanOrEqual(740)
    // Arriba a la izquierda: el chat va abajo y alineado a la izquierda
    expect(posicionPanel({ x: 20, y: 30, ...mascota }, panel, ventana)).toEqual({ x: 20, y: 30 + 96 + MARGEN })
  })

  it('en el centro de la pantalla abre el chat a un costado para no tapar la mascota', () => {
    const panel = { ancho: 416, alto: 576 }
    const centro = { x: 660, y: 380, ...mascota }
    const lugar = posicionPanel(centro, panel, ventana)
    const tapa = lugar.x < centro.x + centro.ancho && centro.x < lugar.x + panel.ancho && lugar.y < centro.y + centro.alto && centro.y < lugar.y + panel.alto
    expect(tapa).toBe(false)
    expect(lugar.x + panel.ancho).toBeLessThanOrEqual(centro.x)
  })

  it('distingue un toque de un arrastre', () => {
    expect(seMovio({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(false)
    expect(seMovio({ x: 10, y: 10 }, { x: 30, y: 10 })).toBe(true)
  })

  it('recuerda la posicion por usuario e ignora datos danados', () => {
    guardarPosicion(7, { x: 100, y: 200 })
    expect(leerPosicion(7)).toEqual({ x: 100, y: 200 })
    expect(leerPosicion(8)).toBeNull()
    localStorage.setItem('ferreteria.asistente.posicion.9', '{malo')
    expect(leerPosicion(9)).toBeNull()
  })

  it('guarda la conversacion de la sesion y la borra al vaciarla', () => {
    guardarConversacion(7, [
      { rol: 'USUARIO', texto: 'Hola' },
      { rol: 'ASISTENTE', texto: 'Hola, ¿en qué te ayudo?', consultas: [] },
    ])
    expect(leerConversacion(7)).toHaveLength(2)
    guardarConversacion(7, [])
    expect(leerConversacion(7)).toEqual([])
    sessionStorage.setItem('ferreteria.asistente.conversacion.7', JSON.stringify([{ rol: 'OTRO', texto: 1 }]))
    expect(leerConversacion(7)).toEqual([])
  })
})
