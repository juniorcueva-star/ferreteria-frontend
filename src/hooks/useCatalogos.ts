import { useQuery } from '@tanstack/react-query'
import { categoriasApi } from '@/api/catalogo'
import { proveedoresApi } from '@/api/compras'
import { empresasApi } from '@/api/organizacion'

/** Categorias activas para los filtros y formularios. */
export function useCategorias(soloActivas = true) {
  return useQuery({
    queryKey: ['categorias', 'lista', soloActivas],
    queryFn: () => categoriasApi.listar({ activo: soloActivas ? true : undefined, size: 100, sort: 'nombre' }),
    staleTime: 5 * 60_000,
    select: (pagina) => pagina.contenido,
  })
}

export function useProveedoresActivos(habilitado = true) {
  return useQuery({
    queryKey: ['proveedores', 'lista'],
    queryFn: () => proveedoresApi.listar({ activo: true, size: 100, sort: 'razonSocial' }),
    staleTime: 60_000,
    enabled: habilitado,
    select: (pagina) => pagina.contenido,
  })
}

export function useEmpresasActivas(habilitado = true) {
  return useQuery({
    queryKey: ['empresas', 'lista'],
    queryFn: () => empresasApi.listar({ activo: true, size: 100, sort: 'id' }),
    staleTime: 5 * 60_000,
    enabled: habilitado,
    select: (pagina) => pagina.contenido,
  })
}
