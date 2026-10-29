import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PuntoVenta from './PuntoVenta'
import { clientesApi, cotizacionesApi, ventasApi } from '@/api/ventas'
import { productosApi } from '@/api/catalogo'
import { inventarioApi } from '@/api/inventario'

vi.mock('@/api/ventas', () => ({ clientesApi: { obtener: vi.fn() }, cotizacionesApi: { obtener: vi.fn() }, ventasApi: { registrar: vi.fn(), registrarDesdeCotizacion: vi.fn() } }))
vi.mock('@/api/catalogo', () => ({ productosApi: { listar: vi.fn().mockResolvedValue({ contenido: [] }), porCodigoBarras: vi.fn() } }))
vi.mock('@/api/inventario', () => ({ inventarioApi: { disponibilidad: vi.fn().mockResolvedValue([]), stock: vi.fn().mockResolvedValue({ contenido: [{ productoId: 3, cantidad: 600, ubicacionId: 1, ubicacionNombre: 'Tienda' }] }) } }))
vi.mock('@/hooks/useCajaActual', () => ({ useCajaActual: () => ({ data: { id: 1, ubicacionId: 1, ubicacionNombre: 'Tienda' } }) }))
vi.mock('@/hooks/useMetodosPago', () => ({ useMetodosPago: () => ({ data: [{ codigo: 'EFECTIVO', nombre: 'Efectivo', efectivo: true, requiereReferencia: false, activo: true }] }) }))
vi.mock('@/hooks/useRetraso', () => ({ useRetraso: (v: string) => v }))
vi.mock('@/auth/contexto', () => ({ useUsuario: () => ({ rol: 'ADMIN' }) }))
vi.mock('@/componentes/formularios/SelectorCliente', () => ({ SelectorCliente: ({ valor }: { valor: { nombre: string } | null }) => <p>Cliente: {valor?.nombre}</p> }))
vi.mock('@/componentes/formularios/EditorPagos', () => ({ EditorPagos: ({ onCambiar }: { onCambiar: (v: unknown) => void }) => <button onClick={() => onCambiar([{ metodoPago: 'EFECTIVO', monto: '350', numeroOperacion: '' }])}>Pagar 350</button> }))

const cotizacion = { id: 42, codigo: 'COT-0042', ubicacionId: 1, ubicacionNombre: 'Tienda', clienteId: 2, clienteNombre: 'Cliente', usuario: 'admin', fecha: '2026-01-01', estado: 'EMITIDA' as const, moneda: 'PEN' as const, observacion: null, venta: null, subtotal: 296.61, igv: 53.39, descuento: 0, total: 350, detalles: [{ productoId: 3, presentacionId: 4, descripcion: 'Perno - MILLAR', cantidad: 0.5, factor: 1000, cantidadBase: 500, unidadBase: 'UNIDAD' as const, precioUnitario: 700, descuento: 0, ajustePorcentaje: null, subtotal: 350 }] }
function mostrar() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/ventas?cotizacionId=42']}><Routes><Route path="/ventas" element={<PuntoVenta />} /></Routes></MemoryRouter></QueryClientProvider>) }

describe('PuntoVenta desde cotizacion', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(cotizacionesApi.obtener).mockResolvedValue(cotizacion); vi.mocked(clientesApi.obtener).mockResolvedValue({ id: 2, nombre: 'Cliente', tipoDocumento: 'DNI', numeroDocumento: null, telefono: null, direccion: null, activo: true }); vi.mocked(ventasApi.registrarDesdeCotizacion).mockResolvedValue({ id: 9, numeroDocumento: 'NV01-000001', ubicacionNombre: 'Tienda', total: 350, condicion: 'CONTADO', vuelto: 0 } as never) })

  it('precarga snapshots y bloquea el carrito', async () => {
    mostrar()
    expect(await screen.findByText(/Cotización COT-0042/)).toBeInTheDocument()
    const linea = await screen.findByTestId('carrito-linea-1')
    expect(linea).toHaveTextContent(/MILLAR.*700.00/)
    expect(screen.getByTestId('total-venta')).toHaveTextContent('350.00')
    expect(linea.parentElement?.parentElement).toHaveClass('pointer-events-none')
  })

  it('confirma solo mediante el endpoint de conversión y bloquea doble clic', async () => {
    let resolver: (v: never) => void = () => {}
    vi.mocked(ventasApi.registrarDesdeCotizacion).mockImplementation(() => new Promise((resolve) => { resolver = resolve as (v: never) => void }))
    mostrar()
    await screen.findByText(/Cotización COT-0042/)
    await userEvent.click(screen.getByRole('button', { name: 'Pagar 350' }))
    const cobrar = screen.getByRole('button', { name: /Cobrar S\/\s*350.00/ })
    await userEvent.dblClick(cobrar)
    expect(ventasApi.registrarDesdeCotizacion).toHaveBeenCalledTimes(1)
    expect(ventasApi.registrarDesdeCotizacion).toHaveBeenCalledWith(42, expect.objectContaining({ condicion: 'CONTADO' }))
    expect(ventasApi.registrar).not.toHaveBeenCalled()
    resolver({ id: 9, numeroDocumento: 'NV01-000001', ubicacionNombre: 'Tienda', total: 350, condicion: 'CONTADO', vuelto: 0 } as never)
  })

  it('advierte cuando dos presentaciones juntas superan el stock del producto', async () => {
    const primero = cotizacion.detalles[0]!
    vi.mocked(cotizacionesApi.obtener).mockResolvedValue({ ...cotizacion, detalles: [primero, { ...primero, presentacionId: 5, cantidad: 0.2, cantidadBase: 200 }] })
    mostrar()
    expect(await screen.findAllByText(/Stock insuficiente entre las presentaciones \(hay 600/)).toHaveLength(2)
  })

  it('muestra la disponibilidad de otras ubicaciones en los resultados', async () => {
    vi.mocked(productosApi.listar).mockResolvedValue({ contenido: [{ id: 3, codigo: 'PER-1', nombre: 'Perno', unidadBase: 'UNIDAD', imagenUrl: null, presentaciones: [] }] } as never)
    vi.mocked(inventarioApi.disponibilidad).mockResolvedValue([{ productoId: 3, ubicacionId: 2, ubicacionNombre: 'Almacén Central', cantidad: 200 }])
    mostrar()
    expect(await screen.findByText(/Otras ubicaciones: Almacén Central/)).toHaveTextContent('200')
  })

  it('muestra error sin confirmar venta', async () => {
    vi.mocked(ventasApi.registrarDesdeCotizacion).mockRejectedValue(new Error('Stock insuficiente'))
    mostrar()
    await screen.findByText(/Cotización COT-0042/)
    await userEvent.click(screen.getByRole('button', { name: 'Pagar 350' }))
    await userEvent.click(screen.getByRole('button', { name: /Cobrar S\/\s*350.00/ }))
    expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument()
    expect(screen.queryByText('Venta registrada')).toBeNull()
  })
})
