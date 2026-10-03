import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ubicacionesApi } from '@/api/organizacion'
import { useAuth } from '@/auth/contexto'
import { ContextoUbicacion, type ValorUbicacion } from './ubicacion'

const CLAVE = 'todopernos.ubicacion'

function leerGuardada(): number | null {
  const texto = sessionStorage.getItem(CLAVE)
  return texto ? Number(texto) : null
}

/**
 * Ubicacion de trabajo elegida en la barra superior. El ADMIN puede cambiarla (o ver todas);
 * el vendedor y el almacenero siempre trabajan en la suya.
 */
export function ProveedorUbicacion({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const [elegida, setElegida] = useState<number | null>(leerGuardada)

  const consulta = useQuery({
    queryKey: ['ubicaciones', 'activas'],
    queryFn: () => ubicacionesApi.listar({ activo: true, size: 100, sort: 'id' }),
    enabled: usuario != null,
    staleTime: 5 * 60_000,
  })

  const seleccionar = useCallback((id: number | null) => {
    if (id == null) {
      sessionStorage.removeItem(CLAVE)
    } else {
      sessionStorage.setItem(CLAVE, String(id))
    }
    setElegida(id)
  }, [])

  const valor = useMemo<ValorUbicacion>(() => {
    const todas = consulta.data?.contenido ?? []
    const esAdmin = usuario?.rol === 'ADMIN'
    const visibles = esAdmin ? todas : todas.filter((u) => u.id === usuario?.ubicacionId)
    const seleccionadaId = esAdmin
      ? elegida != null && todas.some((u) => u.id === elegida)
        ? elegida
        : null
      : (usuario?.ubicacionId ?? null)
    return {
      visibles,
      todas,
      seleccionadaId,
      seleccionada: todas.find((u) => u.id === seleccionadaId) ?? null,
      puedeCambiar: esAdmin,
      cargando: consulta.isPending,
      seleccionar,
    }
  }, [consulta.data, consulta.isPending, usuario, elegida, seleccionar])

  return <ContextoUbicacion.Provider value={valor}>{children}</ContextoUbicacion.Provider>
}
