import { useQuery } from '@tanstack/react-query'
import { metodosPagoApi } from '@/api/ventas'

/** Catalogo de metodos de pago activos (cambia muy poco: se guarda 30 minutos). */
export function useMetodosPago() {
  return useQuery({
    queryKey: ['metodos-pago'],
    queryFn: metodosPagoApi.listar,
    staleTime: 30 * 60_000,
    select: (pagina) => pagina.contenido.filter((m) => m.activo),
  })
}
