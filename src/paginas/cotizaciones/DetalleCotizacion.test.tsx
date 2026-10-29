import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cotizacionesApi } from '@/api/ventas'
import DetalleCotizacion from './DetalleCotizacion'

vi.mock('@/api/ventas', () => ({ cotizacionesApi: { obtener: vi.fn(), emitir: vi.fn(), anular: vi.fn() } }))
vi.mock('@/auth/contexto', () => ({ useUsuario: vi.fn() }))
vi.mock('@/componentes/ui/notificaciones', () => ({ useAvisos: () => ({ avisar: vi.fn() }) }))

const { useUsuario } = await import('@/auth/contexto')
const base = { id: 42, codigo: 'COT-0001', ubicacionId: 1, ubicacionNombre: 'Tienda', clienteId: 2, clienteNombre: 'Cliente', usuario: 'vendedor', fecha: '2026-01-01T10:00:00Z', moneda: 'PEN' as const, observacion: null, venta: null, subtotal: 296.61, igv: 53.39, descuento: 0, total: 350, detalles: [{ productoId: 3, presentacionId: 4, descripcion: 'Perno - MILLAR', cantidad: 0.5, factor: 1000, cantidadBase: 500, unidadBase: 'UNIDAD' as const, precioUnitario: 700, descuento: 0, ajustePorcentaje: null, subtotal: 350 }] }

function Ubicacion() { return <p data-testid="ubicacion">{useLocation().pathname}{useLocation().search}</p> }
function mostrar() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/cotizaciones/42']}><Routes><Route path="/cotizaciones/:id" element={<DetalleCotizacion />} /><Route path="/ventas" element={<Ubicacion />} /></Routes></MemoryRouter></QueryClientProvider>)
}

describe('DetalleCotizacion: pasar al POS', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(useUsuario).mockReturnValue({ rol: 'ADMIN' } as never) })

  it('muestra el boton para una cotizacion emitida y navega con su id', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ ...base, estado: 'EMITIDA' })
    mostrar()
    await userEvent.click(await screen.findByRole('button', { name: 'Pasar al POS' }))
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/ventas?cotizacionId=42')
  })

  it('muestra la venta vinculada y evita ofrecer una segunda conversión', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ ...base, estado: 'EMITIDA', venta: { id: 7, numeroDocumento: 'NV01-000007', fecha: '2026-01-01T10:00:00Z', total: 350, estado: 'EMITIDA' } })
    mostrar()
    expect(await screen.findByRole('link', { name: 'Ver venta' })).toHaveAttribute('href', '/ventas/7')
    expect(screen.queryByRole('button', { name: 'Pasar al POS' })).toBeNull()
  })

  it('no muestra el boton para un borrador', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ ...base, estado: 'BORRADOR' })
    mostrar()
    await screen.findByText('COT-0001')
    expect(screen.queryByRole('button', { name: 'Pasar al POS' })).toBeNull()
  })

  it('no muestra el boton para una cotizacion anulada', async () => {
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ ...base, estado: 'ANULADA' })
    mostrar()
    await screen.findByText('COT-0001')
    expect(screen.queryByRole('button', { name: 'Pasar al POS' })).toBeNull()
  })

  it('no muestra el boton para almacenero', async () => {
    vi.mocked(useUsuario).mockReturnValue({ rol: 'ALMACENERO' } as never)
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ ...base, estado: 'EMITIDA' })
    mostrar()
    await screen.findByText('COT-0001')
    expect(screen.queryByRole('button', { name: 'Pasar al POS' })).toBeNull()
  })
})
