import { useSyncExternalStore } from 'react'

/**
 * Estado real de la conexion con la API. Lo actualiza el cliente HTTP con cada respuesta
 * (o falta de respuesta) y lo muestra el indicador "Sincronizado" de la barra superior.
 */
export type EstadoConexion = 'verificando' | 'conectado' | 'sin-conexion'

let estado: EstadoConexion = 'verificando'
const oyentes = new Set<() => void>()

export function marcarConexion(nuevo: EstadoConexion): void {
  if (nuevo !== estado) {
    estado = nuevo
    oyentes.forEach((oyente) => oyente())
  }
}

export function estadoConexionActual(): EstadoConexion {
  return estado
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function useEstadoConexion(): EstadoConexion {
  return useSyncExternalStore(suscribir, estadoConexionActual)
}
