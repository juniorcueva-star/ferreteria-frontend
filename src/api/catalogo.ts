import { http } from './cliente'
import type {
  CategoriaRequest,
  CategoriaResponse,
  PaginaResponse,
  Paginacion,
  PresentacionRequest,
  ProductoActualizarRequest,
  ProductoCrearRequest,
  ProductoResponse,
  UnidadBase,
} from './tipos'

export interface FiltroCategorias extends Paginacion {
  texto?: string
  activo?: boolean
}

export interface FiltroProductos extends Paginacion {
  texto?: string
  categoriaId?: number
  unidadBase?: UnidadBase
  activo?: boolean
}

export const categoriasApi = {
  listar: (filtro: FiltroCategorias) =>
    http.get<PaginaResponse<CategoriaResponse>>('/categorias', { params: filtro }).then((r) => r.data),
  crear: (datos: CategoriaRequest) => http.post<CategoriaResponse>('/categorias', datos).then((r) => r.data),
  actualizar: (id: number, datos: CategoriaRequest) =>
    http.put<CategoriaResponse>(`/categorias/${id}`, datos).then((r) => r.data),
}

export const productosApi = {
  listar: (filtro: FiltroProductos) =>
    http.get<PaginaResponse<ProductoResponse>>('/productos', { params: filtro }).then((r) => r.data),
  obtener: (id: number) => http.get<ProductoResponse>(`/productos/${id}`).then((r) => r.data),
  porCodigoBarras: (codigo: string) =>
    http.get<ProductoResponse>(`/productos/codigo-barras/${encodeURIComponent(codigo)}`).then((r) => r.data),
  crear: (datos: ProductoCrearRequest) => http.post<ProductoResponse>('/productos', datos).then((r) => r.data),
  actualizar: (id: number, datos: ProductoActualizarRequest) =>
    http.put<ProductoResponse>(`/productos/${id}`, datos).then((r) => r.data),
  agregarPresentacion: (id: number, datos: PresentacionRequest) =>
    http.post<ProductoResponse>(`/productos/${id}/presentaciones`, datos).then((r) => r.data),
  actualizarPresentacion: (id: number, presentacionId: number, datos: PresentacionRequest) =>
    http.put<ProductoResponse>(`/productos/${id}/presentaciones/${presentacionId}`, datos).then((r) => r.data),
  subirImagen: (id: number, archivo: File) => {
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    return http.post<ProductoResponse>(`/productos/${id}/imagen`, formulario).then((r) => r.data)
  },
  eliminarImagen: (id: number) => http.delete<ProductoResponse>(`/productos/${id}/imagen`).then((r) => r.data),
}
