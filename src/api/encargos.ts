import { http } from './cliente'
import type {
  AnulacionRequest,
  EncargoRequest,
  EncargoResponse,
  EntregaEncargoRequest,
  EstadoEncargo,
  PaginaResponse,
  Paginacion,
} from './tipos'

export interface FiltroEncargos extends Paginacion {
  estado?: EstadoEncargo
  ubicacionId?: number
  clienteId?: number
}

/** Encargos de productos sin stock: no tocan el stock hasta que se entregan (se crea la venta). */
export const encargosApi = {
  listar: (filtro: FiltroEncargos) =>
    http.get<PaginaResponse<EncargoResponse>>('/encargos', { params: filtro }).then((r) => r.data),
  obtener: (id: number) => http.get<EncargoResponse>(`/encargos/${id}`).then((r) => r.data),
  crear: (datos: EncargoRequest) => http.post<EncargoResponse>('/encargos', datos).then((r) => r.data),
  entregar: (id: number, datos: EntregaEncargoRequest) =>
    http.post<EncargoResponse>(`/encargos/${id}/entregar`, datos).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<EncargoResponse>(`/encargos/${id}/anular`, datos).then((r) => r.data),
}
