import type { UbicacionResponse } from '@/api/tipos'

export interface EmpresaResumen {
  id: number
  ruc: string
  razonSocial: string
}

/**
 * Empresas (RUC) a partir de las tiendas. GET /api/empresas es solo para el ADMIN, pero cada tienda trae su
 * empresa en GET /api/ubicaciones, que pueden consultar todos (lo necesita el almacenero para comprar).
 */
export function empresasDeUbicaciones(ubicaciones: UbicacionResponse[]): EmpresaResumen[] {
  const mapa = new Map<number, EmpresaResumen>()
  for (const u of ubicaciones) {
    if (u.empresaId !== null && !mapa.has(u.empresaId)) {
      mapa.set(u.empresaId, { id: u.empresaId, ruc: u.empresaRuc ?? '', razonSocial: u.empresaRazonSocial ?? '' })
    }
  }
  return [...mapa.values()].sort((a, b) => a.id - b.id)
}
