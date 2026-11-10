import { http } from './cliente'
import type {
  AnulacionRequest,
  AtencionSolicitudRequest,
  EstadoSolicitud,
  PaginaResponse,
  Paginacion,
  SolicitudReposicionRequest,
  SolicitudReposicionResponse,
  SugerenciaReposicionResponse,
} from './tipos'

export interface FiltroSolicitudes extends Paginacion {
  estado?: EstadoSolicitud
  ubicacionId?: number
}

/** Pedidos de reposicion: la tienda pide al almacen y el almacen los atiende con un traslado. */
export const reposicionApi = {
  listar: (filtro: FiltroSolicitudes) =>
    http.get<PaginaResponse<SolicitudReposicionResponse>>('/solicitudes-reposicion', { params: filtro }).then((r) => r.data),
  crear: (datos: SolicitudReposicionRequest) =>
    http.post<SolicitudReposicionResponse>('/solicitudes-reposicion', datos).then((r) => r.data),
  sugerencias: (ubicacionId?: number) =>
    http
      .get<SugerenciaReposicionResponse[]>('/solicitudes-reposicion/sugerencias', { params: { ubicacionId } })
      .then((r) => r.data),
  atender: (id: number, datos: AtencionSolicitudRequest) =>
    http.post<SolicitudReposicionResponse>(`/solicitudes-reposicion/${id}/atender`, datos).then((r) => r.data),
  rechazar: (id: number, datos: AnulacionRequest) =>
    http.post<SolicitudReposicionResponse>(`/solicitudes-reposicion/${id}/rechazar`, datos).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<SolicitudReposicionResponse>(`/solicitudes-reposicion/${id}/anular`, datos).then((r) => r.data),
}
