import { createContext, useContext } from 'react'

export type TipoAviso = 'exito' | 'error' | 'info'

export interface ValorNotificaciones {
  avisar: (mensaje: string, tipo?: TipoAviso) => void
}

export const ContextoNotificaciones = createContext<ValorNotificaciones | null>(null)

export function useAvisos(): ValorNotificaciones {
  const valor = useContext(ContextoNotificaciones)
  if (!valor) {
    throw new Error('useAvisos debe usarse dentro de ProveedorNotificaciones')
  }
  return valor
}
