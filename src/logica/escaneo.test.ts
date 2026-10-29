import { describe, expect, it, vi } from 'vitest'
import type { ProductoResponse } from '@/api/tipos'
import { crearColaEscaneos, presentacionEscaneada } from './escaneo'

const producto: ProductoResponse = {
  id: 1,
  codigo: 'PER-001',
  nombre: 'Perno de prueba',
  descripcion: null,
  marca: null,
  categoriaId: 1,
  categoriaNombre: 'Pernos',
  unidadBase: 'UNIDAD',
  imagenUrl: null,
  activo: true,
  presentaciones: [
    { id: 1, nombre: 'Unidad', factor: 1, precioVenta: 0.5, codigoBarras: '7750001', principal: true, activo: true },
    { id: 2, nombre: 'Ciento', factor: 100, precioVenta: 40, codigoBarras: '7750100', principal: false, activo: true },
    { id: 3, nombre: 'Millar', factor: 1000, precioVenta: 350, codigoBarras: '7751000', principal: false, activo: false },
  ],
}

describe('presentacionEscaneada', () => {
  it('identifica la presentacion exacta y conserva su factor de conversion', () => {
    expect(presentacionEscaneada(producto, ' 7750100 ')).toMatchObject({ id: 2, nombre: 'Ciento', factor: 100 })
  })

  it('no acepta codigos inexistentes ni presentaciones inactivas', () => {
    expect(presentacionEscaneada(producto, 'no-existe')).toBeUndefined()
    expect(presentacionEscaneada(producto, '7751000')).toBeUndefined()
  })
})

describe('crearColaEscaneos', () => {
  it('procesa lecturas consecutivas en orden, sin consultas simultaneas', async () => {
    const procesados: string[] = []
    let terminarPrimera!: () => void
    const primera = new Promise<void>((resolve) => {
      terminarPrimera = resolve
    })
    const procesar = vi.fn(async (codigo: string) => {
      procesados.push(codigo)
      if (codigo === '7750001') await primera
    })
    const cola = crearColaEscaneos(procesar)

    cola.encolar('7750001')
    cola.encolar('7750100')
    expect(procesados).toEqual(['7750001'])

    terminarPrimera()
    await vi.waitFor(() => expect(procesados).toEqual(['7750001', '7750100']))
    expect(procesar).toHaveBeenCalledTimes(2)
  })

  it('continua con la siguiente lectura si una consulta de red falla', async () => {
    const procesar = vi.fn(async (codigo: string) => {
      if (codigo === 'sin-red') throw new Error('Network Error')
    })
    const cola = crearColaEscaneos(procesar)

    cola.encolar('sin-red')
    cola.encolar('7750100')

    await vi.waitFor(() => expect(procesar).toHaveBeenCalledTimes(2))
    expect(procesar.mock.calls.map(([codigo]) => codigo)).toEqual(['sin-red', '7750100'])
  })
})
