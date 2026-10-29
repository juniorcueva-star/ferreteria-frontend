import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productosApi } from '@/api/catalogo'
import { cotizacionesApi } from '@/api/ventas'
import FormularioCotizacion from './FormularioCotizacion'

vi.mock('@/api/catalogo', () => ({ productosApi: { obtener: vi.fn() } }))
vi.mock('@/api/ventas', () => ({ cotizacionesApi: { obtener: vi.fn(), actualizar: vi.fn(), crear: vi.fn() } }))
vi.mock('@/contexto/ubicacion', () => ({ useUbicacion: () => ({ seleccionadaId: 1 }) }))
vi.mock('@/componentes/formularios/SelectorCliente', () => ({ SelectorCliente: () => null }))
vi.mock('@/componentes/formularios/SelectorProducto', () => ({ SelectorProducto: () => null }))
vi.mock('@/componentes/ui/notificaciones', () => ({ useAvisos: () => ({ avisar: vi.fn() }) }))

const producto = { id: 10, codigo: 'MAR-01', nombre: 'Martillo', descripcion: null, marca: null, categoriaId: 1, categoriaNombre: 'Herramientas', unidadBase: 'UNIDAD' as const, imagenUrl: null, activo: true, presentaciones: [{ id: 20, nombre: 'Unidad', factor: 1, precioVenta: 1500, codigoBarras: null, principal: true, activo: true }] }
const borrador = { id: 1, codigo: 'COT-001', ubicacionId: 1, ubicacionNombre: 'Central', clienteId: 2, clienteNombre: 'Cliente', usuario: 'Admin', fecha: '2026-01-01', estado: 'BORRADOR' as const, moneda: 'PEN' as const, observacion: null, venta: null, subtotal: 1000, igv: 180, descuento: 0, total: 1180, detalles: [{ productoId: 10, presentacionId: 20, descripcion: 'Martillo', unidadBase: 'UNIDAD' as const, factor: 2, cantidad: 3, cantidadBase: 6, precioUnitario: 1000, descuento: null, ajustePorcentaje: null, subtotal: 3000 }] }
function mostrarFormulario() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/cotizaciones/1/editar']}><Routes><Route path="/cotizaciones/:id/editar" element={<FormularioCotizacion />} /></Routes></MemoryRouter></QueryClientProvider>) }

describe('FormularioCotizacion', () => {
  beforeEach(() => vi.clearAllMocks())
  it('renderiza una cotización nueva sin consultar un detalle', () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/cotizaciones/nueva']}><Routes><Route path="/cotizaciones/nueva" element={<FormularioCotizacion />} /></Routes></MemoryRouter></QueryClientProvider>)
    expect(screen.getByRole('heading', { name: 'Nueva cotización' })).toBeInTheDocument()
    expect(cotizacionesApi.obtener).not.toHaveBeenCalled()
  })

  it('muestra carga al esperar el detalle en edición', () => {
    vi.mocked(cotizacionesApi.obtener).mockImplementation(() => new Promise(() => {}))
    mostrarFormulario()
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })

  it('muestra el error cuando falla el detalle en edición', async () => {
    vi.mocked(cotizacionesApi.obtener).mockRejectedValue(new Error('Detalle no disponible'))
    mostrarFormulario()
    expect(await screen.findByText('Detalle no disponible')).toBeInTheDocument()
  })

  it('reconstruye una sola línea al editar bajo Strict Mode', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(borrador)
    vi.mocked(productosApi.obtener).mockResolvedValue(producto)
    render(<StrictMode><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/cotizaciones/1/editar']}><Routes><Route path="/cotizaciones/:id/editar" element={<FormularioCotizacion />} /></Routes></MemoryRouter></QueryClientProvider></StrictMode>)
    expect(await screen.findByDisplayValue('3')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Cantidad')).toHaveLength(1)
  })

  it('muestra el error cuando falla la carga del catálogo', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ id: 1, codigo: 'COT-001', ubicacionId: 1, ubicacionNombre: 'Central', clienteId: 2, clienteNombre: 'Cliente', usuario: 'Admin', fecha: '2026-01-01', estado: 'BORRADOR', moneda: 'PEN', observacion: null, venta: null, subtotal: 1000, igv: 180, descuento: 0, total: 1180, detalles: [{ productoId: 10, presentacionId: 20, descripcion: 'Martillo', unidadBase: 'UNIDAD', factor: 1, cantidad: 1, cantidadBase: 1, precioUnitario: 1000, descuento: null, ajustePorcentaje: null, subtotal: 1000 }] })
    vi.mocked(productosApi.obtener).mockRejectedValue(new Error('Catálogo no disponible'))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/cotizaciones/1/editar']}><Routes><Route path="/cotizaciones/:id/editar" element={<FormularioCotizacion />} /></Routes></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('Catálogo no disponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar catálogo' })).toBeInTheDocument()
  })

  it('recarga el catálogo al reintentar después de un fallo', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(borrador)
    vi.mocked(productosApi.obtener).mockRejectedValueOnce(new Error('Catálogo no disponible')).mockResolvedValueOnce(producto)
    mostrarFormulario()
    await screen.findByText('Catálogo no disponible')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar catálogo' }))
    await waitFor(() => expect(productosApi.obtener).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText('Catálogo no disponible')).toBeNull())
  })

  it('conserva los snapshots y la cantidad local al reintentar el catálogo', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue(borrador)
    vi.mocked(productosApi.obtener).mockRejectedValueOnce(new Error('Catálogo no disponible')).mockResolvedValueOnce(producto)
    mostrarFormulario()
    await screen.findByText('Catálogo no disponible')
    const cantidad = screen.getByLabelText('Cantidad')
    await userEvent.clear(cantidad); await userEvent.type(cantidad, '4')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar catálogo' }))
    await waitFor(() => expect(productosApi.obtener).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Martillo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByText(/Original/)).toHaveTextContent('4,000.00')
    expect(screen.getByRole('option', { name: 'Unidad' })).toBeInTheDocument()
  })
})
