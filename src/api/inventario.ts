import { http } from './cliente'
import type {
  AjusteRequest,
  AnulacionRequest,
  EstadoTraslado,
  InventarioInicialRequest,
  KardexResponse,
  PaginaResponse,
  Paginacion,
  ResumenStockResponse,
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

export interface FiltroResumen extends Paginacion {
  productoIds?: number[]
  texto?: string
  categoriaId?: number
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
  /** Stock de todas las tiendas y el almacen por producto (solo lectura, para cualquier usuario). */
  resumen: (filtro: FiltroResumen) =>
    http.get<PaginaResponse<ResumenStockResponse>>('/inventario/resumen', { params: filtro }).then((r) => r.data),
  definirMinimo: (datos: StockMinimoRequest) =>
    http.put<StockResponse>('/inventario/stock/minimo', datos).then((r) => r.data),
  /** Donde esta el producto dentro de la ubicacion (ADMIN o ALMACENERO en su almacen) */
  definirUbicacionFisica: (datos: { productoId: number; ubicacionId: number; ubicacionFisica: string | null }) =>
    http.put<StockResponse>('/inventario/stock/ubicacion-fisica', datos).then((r) => r.data),
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
  /** Guia de traslado en PDF (membrete, productos con su ubicacion en el origen y firmas) */
  guia: (id: number) => http.get<Blob>(`/traslados/${id}/guia`, { responseType: 'blob' }).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<TrasladoResponse>(`/traslados/${id}/anular`, datos).then((r) => r.data),
}
