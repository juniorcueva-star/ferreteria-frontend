import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errores'

/**
 * Configuracion de TanStack Query: los datos se consideran frescos 15 segundos y solo se reintenta
 * si el servidor no respondio (nunca ante un 4xx, que no cambiaria al repetir).
 */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: (intentos, error) => {
          if (error instanceof ApiError && error.estado !== null && error.estado < 500) {
            return false
          }
          return intentos < 2
        },
      },
      mutations: { retry: false },
    },
  })
}
