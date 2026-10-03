import { http } from './cliente'
import type {
  EmpresaRequest,
  EmpresaResponse,
  PaginaResponse,
  Paginacion,
  Rol,
  TipoUbicacion,
  UbicacionRequest,
  UbicacionResponse,
  UsuarioActualizarRequest,
  UsuarioCrearRequest,
  UsuarioResponse,
} from './tipos'

export interface FiltroEmpresas extends Paginacion {
  texto?: string
  activo?: boolean
}

export interface FiltroUbicaciones extends Paginacion {
  tipo?: TipoUbicacion
  empresaId?: number
  activo?: boolean
}

export interface FiltroUsuarios extends Paginacion {
  texto?: string
  rol?: Rol
  ubicacionId?: number
  activo?: boolean
}

export const empresasApi = {
  listar: (filtro: FiltroEmpresas) =>
    http.get<PaginaResponse<EmpresaResponse>>('/empresas', { params: filtro }).then((r) => r.data),
  crear: (datos: EmpresaRequest) => http.post<EmpresaResponse>('/empresas', datos).then((r) => r.data),
  actualizar: (id: number, datos: EmpresaRequest) =>
    http.put<EmpresaResponse>(`/empresas/${id}`, datos).then((r) => r.data),
}

export const ubicacionesApi = {
  listar: (filtro: FiltroUbicaciones) =>
    http.get<PaginaResponse<UbicacionResponse>>('/ubicaciones', { params: filtro }).then((r) => r.data),
  crear: (datos: UbicacionRequest) => http.post<UbicacionResponse>('/ubicaciones', datos).then((r) => r.data),
  actualizar: (id: number, datos: UbicacionRequest) =>
    http.put<UbicacionResponse>(`/ubicaciones/${id}`, datos).then((r) => r.data),
}

export const usuariosApi = {
  listar: (filtro: FiltroUsuarios) =>
    http.get<PaginaResponse<UsuarioResponse>>('/usuarios', { params: filtro }).then((r) => r.data),
  crear: (datos: UsuarioCrearRequest) => http.post<UsuarioResponse>('/usuarios', datos).then((r) => r.data),
  actualizar: (id: number, datos: UsuarioActualizarRequest) =>
    http.put<UsuarioResponse>(`/usuarios/${id}`, datos).then((r) => r.data),
  restablecerPassword: (id: number, passwordNueva: string) =>
    http.put<void>(`/usuarios/${id}/password`, { passwordNueva }).then(() => undefined),
}
