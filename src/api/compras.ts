import { http } from './cliente'
import type {
  AnulacionRequest,
  CompraRequest,
  CompraResponse,
  EstadoCompra,
  PaginaResponse,
  Paginacion,
  ProveedorRequest,
  ProveedorResponse,
} from './tipos'

export interface FiltroProveedores extends Paginacion {
  texto?: string
  activo?: boolean
}

export interface FiltroCompras extends Paginacion {
  proveedorId?: number
  empresaId?: number
  ubicacionId?: number
  estado?: EstadoCompra
  desde?: string
  hasta?: string
}

export const proveedoresApi = {
  listar: (filtro: FiltroProveedores) =>
    http.get<PaginaResponse<ProveedorResponse>>('/proveedores', { params: filtro }).then((r) => r.data),
  crear: (datos: ProveedorRequest) => http.post<ProveedorResponse>('/proveedores', datos).then((r) => r.data),
  actualizar: (id: number, datos: ProveedorRequest) =>
    http.put<ProveedorResponse>(`/proveedores/${id}`, datos).then((r) => r.data),
}

export const comprasApi = {
  listar: (filtro: FiltroCompras) =>
    http.get<PaginaResponse<CompraResponse>>('/compras', { params: filtro }).then((r) => r.data),
  obtener: (id: number) => http.get<CompraResponse>(`/compras/${id}`).then((r) => r.data),
  registrar: (datos: CompraRequest) => http.post<CompraResponse>('/compras', datos).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<CompraResponse>(`/compras/${id}/anular`, datos).then((r) => r.data),
}
