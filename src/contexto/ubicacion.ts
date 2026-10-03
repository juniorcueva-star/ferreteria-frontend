import { createContext, useContext } from 'react'
import type { UbicacionResponse } from '@/api/tipos'

export interface ValorUbicacion {
  /** Ubicaciones activas que el usuario puede ver (ADMIN: todas; los demas: la suya) */
  visibles: UbicacionResponse[]
  /** Todas las ubicaciones activas (para elegir destinos de traslado, por ejemplo) */
  todas: UbicacionResponse[]
  /** Ubicacion elegida en la barra superior; null = todas (solo ADMIN) */
  seleccionadaId: number | null
  seleccionada: UbicacionResponse | null
  puedeCambiar: boolean
  cargando: boolean
  seleccionar: (id: number | null) => void
}

export const ContextoUbicacion = createContext<ValorUbicacion | null>(null)

export function useUbicacion(): ValorUbicacion {
  const valor = useContext(ContextoUbicacion)
  if (!valor) {
    throw new Error('useUbicacion debe usarse dentro de ProveedorUbicacion')
  }
  return valor
}

/** Nombre corto para encabezados de columna: "Tienda Centro" -> "Centro", "Almacen Central" -> "Almacén". */
export function nombreCorto(ubicacion: UbicacionResponse, todas: UbicacionResponse[]): string {
  if (ubicacion.tipo === 'TIENDA') {
    return ubicacion.nombre.replace(/^tienda\s+/i, '')
  }
  const almacenes = todas.filter((u) => u.tipo === 'ALMACEN').length
  return almacenes <= 1 ? 'Almacén' : ubicacion.nombre
}
