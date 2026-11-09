import { http } from './cliente'
import type { AuditoriaResponse, EntidadAuditada, PaginaResponse, Paginacion } from './tipos'

export interface FiltroAuditoria extends Paginacion {
  entidad?: EntidadAuditada
  entidadId?: number
  usuarioId?: number
  texto?: string
  desde?: string
  hasta?: string
}

/** Auditoria de cambios (solo ADMIN). */
export const auditoriaApi = {
  listar: (filtro: FiltroAuditoria) =>
    http.get<PaginaResponse<AuditoriaResponse>>('/auditoria', { params: filtro }).then((r) => r.data),
}
