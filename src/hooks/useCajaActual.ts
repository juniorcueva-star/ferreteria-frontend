import { useQuery } from '@tanstack/react-query'
import { aApiError } from '@/api/errores'
import { cajasApi } from '@/api/ventas'

/** Caja abierta del usuario conectado (null si no tiene). Se refresca cada 15 segundos. */
export function useCajaActual(habilitado = true) {
  return useQuery({
    queryKey: ['cajas', 'actual'],
    queryFn: async () => {
      try {
        return await cajasApi.actual()
      } catch (e) {
        if (aApiError(e).estado === 404) return null
        throw e
      }
    },
    refetchInterval: 15_000,
    enabled: habilitado,
  })
}
