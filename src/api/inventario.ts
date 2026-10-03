import { http } from './cliente'
import type {
  AjusteRequest,
  AnulacionRequest,
  EstadoTraslado,
  InventarioInicialRequest,
  KardexResponse,
  PaginaResponse,
  Paginacion,
  StockMinimoRequest,
  StockResponse,
  TipoMovimiento,
  TrasladoRequest,
  TrasladoResponse,
} from './tipos'

export interface FiltroStock extends Paginacion {
  ubicacionId?: number
  productoId?: number
  productoIds?: number[]
  texto?: string
  soloBajo?: boolean
}

export interface FiltroKardex extends Paginacion {
  productoId?: number
  ubicacionId?: number
  tipo?: TipoMovimiento
  desde?: string
  hasta?: string
}

export interface FiltroTraslados extends Paginacion {
  ubicacionId?: number
  origenId?: number
  destinoId?: number
  estado?: EstadoTraslado
  desde?: string
  hasta?: string
}

export const inventarioApi = {
  stock: (filtro: FiltroStock) =>
    http.get<PaginaResponse<StockResponse>>('/inventario/stock', { params: filtro }).then((r) => r.data),
  definirMinimo: (datos: StockMinimoRequest) =>
    http.put<StockResponse>('/inventario/stock/minimo', datos).then((r) => r.data),
  ajustar: (datos: AjusteRequest) => http.post<KardexResponse[]>('/inventario/ajustes', datos).then((r) => r.data),
  inventarioInicial: (datos: InventarioInicialRequest) =>
    http.post<KardexResponse[]>('/inventario/inicial', datos).then((r) => r.data),
  kardex: (filtro: FiltroKardex) =>
    http.get<PaginaResponse<KardexResponse>>('/inventario/kardex', { params: filtro }).then((r) => r.data),
}

export const trasladosApi = {
  listar: (filtro: FiltroTraslados) =>
    http.get<PaginaResponse<TrasladoResponse>>('/traslados', { params: filtro }).then((r) => r.data),
  obtener: (id: number) => http.get<TrasladoResponse>(`/traslados/${id}`).then((r) => r.data),
  enviar: (datos: TrasladoRequest) => http.post<TrasladoResponse>('/traslados', datos).then((r) => r.data),
  recibir: (id: number) => http.post<TrasladoResponse>(`/traslados/${id}/recibir`).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<TrasladoResponse>(`/traslados/${id}/anular`, datos).then((r) => r.data),
}
