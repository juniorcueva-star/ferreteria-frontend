import { http } from './cliente'
import type {
  AbonoRequest,
  AnulacionRequest,
  AperturaCajaRequest,
  CajaResponse,
  CierreCajaRequest,
  ClienteRequest,
  ClienteResponse,
  CondicionVenta,
  DeudorResponse,
  EstadoCaja,
  EstadoVenta,
  MetodoPagoResponse,
  PaginaResponse,
  Paginacion,
  VentaRequest,
  VentaResponse,
} from './tipos'

export interface FiltroClientes extends Paginacion {
  texto?: string
  activo?: boolean
}

export interface FiltroCajas extends Paginacion {
  ubicacionId?: number
  usuarioId?: number
  estado?: EstadoCaja
  desde?: string
  hasta?: string
}

export interface FiltroVentas extends Paginacion {
  ubicacionId?: number
  usuarioId?: number
  clienteId?: number
  cajaId?: number
  condicion?: CondicionVenta
  estado?: EstadoVenta
  conSaldo?: boolean
  desde?: string
  hasta?: string
}

export interface FiltroDeudas extends Paginacion {
  ubicacionId?: number
  clienteId?: number
  soloVencidas?: boolean
}

export interface FiltroDeudores extends Paginacion {
  ubicacionId?: number
}

export const clientesApi = {
  listar: (filtro: FiltroClientes) =>
    http.get<PaginaResponse<ClienteResponse>>('/clientes', { params: filtro }).then((r) => r.data),
  obtener: (id: number) => http.get<ClienteResponse>(`/clientes/${id}`).then((r) => r.data),
  crear: (datos: ClienteRequest) => http.post<ClienteResponse>('/clientes', datos).then((r) => r.data),
  actualizar: (id: number, datos: ClienteRequest) =>
    http.put<ClienteResponse>(`/clientes/${id}`, datos).then((r) => r.data),
}

export const metodosPagoApi = {
  listar: () =>
    http.get<PaginaResponse<MetodoPagoResponse>>('/metodos-pago', { params: { size: 50 } }).then((r) => r.data),
}

export const cajasApi = {
  abrir: (datos: AperturaCajaRequest) => http.post<CajaResponse>('/cajas/abrir', datos).then((r) => r.data),
  /** Caja abierta del usuario conectado; responde 404 si no tiene una. */
  actual: () => http.get<CajaResponse>('/cajas/actual').then((r) => r.data),
  obtener: (id: number) => http.get<CajaResponse>(`/cajas/${id}`).then((r) => r.data),
  cerrar: (id: number, datos: CierreCajaRequest) =>
    http.post<CajaResponse>(`/cajas/${id}/cerrar`, datos).then((r) => r.data),
  listar: (filtro: FiltroCajas) =>
    http.get<PaginaResponse<CajaResponse>>('/cajas', { params: filtro }).then((r) => r.data),
}

export const ventasApi = {
  registrar: (datos: VentaRequest) => http.post<VentaResponse>('/ventas', datos).then((r) => r.data),
  obtener: (id: number) => http.get<VentaResponse>(`/ventas/${id}`).then((r) => r.data),
  listar: (filtro: FiltroVentas) =>
    http.get<PaginaResponse<VentaResponse>>('/ventas', { params: filtro }).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<VentaResponse>(`/ventas/${id}/anular`, datos).then((r) => r.data),
}

export const fiadoApi = {
  abonar: (ventaId: number, datos: AbonoRequest) =>
    http.post<VentaResponse>(`/fiado/ventas/${ventaId}/abonos`, datos).then((r) => r.data),
  deudas: (filtro: FiltroDeudas) =>
    http.get<PaginaResponse<VentaResponse>>('/fiado/deudas', { params: filtro }).then((r) => r.data),
  deudores: (filtro: FiltroDeudores) =>
    http.get<PaginaResponse<DeudorResponse>>('/fiado/deudores', { params: filtro }).then((r) => r.data),
}
