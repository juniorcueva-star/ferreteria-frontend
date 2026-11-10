import { http } from './cliente'
import type {
  CompletoRequest,
  CompletoResponse,
  AccionLoteRequest,
  AccionLoteResponse,
  CategoriaRequest,
  CategoriaResponse,
  EscalaPrecio,
  HistorialPrecioResponse,
  OfertaRequest,
  PaginaResponse,
  Paginacion,
  PrecioSugeridoResponse,
  PresentacionRequest,
  ProductoActualizarRequest,
  ProductoCrearRequest,
  ProductoResponse,
  UnidadBase,
  UnidadMedidaResponse,
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
  /** Solo los que tienen una oferta vigente hoy */
  enOferta?: boolean
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
  /** Los que se venden en mas ventas de la tienda (ultimos 30 dias), para el punto de venta */
  frecuentes: (ubicacionId?: number) =>
    http.get<ProductoResponse[]>('/productos/frecuentes', { params: { ubicacionId, limite: 12 } }).then((r) => r.data),
  porCodigoBarras: (codigo: string) =>
    http.get<ProductoResponse>(`/productos/codigo-barras/${encodeURIComponent(codigo)}`).then((r) => r.data),
  crear: (datos: ProductoCrearRequest) => http.post<ProductoResponse>('/productos', datos).then((r) => r.data),
  actualizar: (id: number, datos: ProductoActualizarRequest) =>
    http.put<ProductoResponse>(`/productos/${id}`, datos).then((r) => r.data),
  agregarPresentacion: (id: number, datos: PresentacionRequest) =>
    http.post<ProductoResponse>(`/productos/${id}/presentaciones`, datos).then((r) => r.data),
  actualizarPresentacion: (id: number, presentacionId: number, datos: PresentacionRequest) =>
    http.put<ProductoResponse>(`/productos/${id}/presentaciones/${presentacionId}`, datos).then((r) => r.data),
  /** Precio por mayor de una presentacion: reemplaza sus escalas (lista vacia = sin precio por mayor). Solo ADMIN */
  actualizarEscalas: (id: number, presentacionId: number, escalas: EscalaPrecio[]) =>
    http.put<ProductoResponse>(`/productos/${id}/presentaciones/${presentacionId}/escalas`, { escalas }).then((r) => r.data),
  /** Oferta de una presentacion entre dos fechas (solo ADMIN) */
  actualizarOferta: (id: number, presentacionId: number, datos: OfertaRequest) =>
    http.put<ProductoResponse>(`/productos/${id}/presentaciones/${presentacionId}/oferta`, datos).then((r) => r.data),
  quitarOferta: (id: number, presentacionId: number) =>
    http.delete<ProductoResponse>(`/productos/${id}/presentaciones/${presentacionId}/oferta`).then((r) => r.data),
  /** Lista de precios en PDF para el cliente (con fotos, ofertas y precio por mayor) */
  listaPrecios: (categoriaId?: number) =>
    http.get<Blob>('/productos/lista-precios', { params: { categoriaId }, responseType: 'blob' }).then((r) => r.data),
  /** Etiquetas con codigo de barras: hoja A4 de 3 x 8 */
  etiquetas: (productoIds: number[], copias: number, todas: boolean) =>
    http
      .get<Blob>('/productos/etiquetas', { params: { productoIds: productoIds.join(','), copias, todas }, responseType: 'blob' })
      .then((r) => r.data),
  subirImagen: (id: number, archivo: File) => {
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    return http.post<ProductoResponse>(`/productos/${id}/imagen`, formulario).then((r) => r.data)
  },
  eliminarImagen: (id: number) => http.delete<ProductoResponse>(`/productos/${id}/imagen`).then((r) => r.data),
  /** Completos: el producto con otras piezas a precio propio (solo ADMIN) */
  crearCompleto: (id: number, datos: CompletoRequest) =>
    http.post<CompletoResponse>(`/productos/${id}/completos`, datos).then((r) => r.data),
  actualizarCompleto: (id: number, completoId: number, datos: CompletoRequest) =>
    http.put<CompletoResponse>(`/productos/${id}/completos/${completoId}`, datos).then((r) => r.data),
  /** Costo de referencia, ganancia, adicional y precio sugerido (solo ADMIN). */
  precioSugerido: (id: number, presentacionId: number) =>
    http
      .get<PrecioSugeridoResponse>(`/productos/${id}/presentaciones/${presentacionId}/precio-sugerido`)
      .then((r) => r.data),
  historialPrecios: (id: number, presentacionId: number, filtro: Paginacion) =>
    http
      .get<PaginaResponse<HistorialPrecioResponse>>(`/productos/${id}/presentaciones/${presentacionId}/historial-precios`, {
        params: filtro,
      })
      .then((r) => r.data),
  /** Asignar categoria, activar o desactivar varios productos a la vez (todo o nada). */
  accionLote: (datos: AccionLoteRequest) =>
    http.post<AccionLoteResponse>('/productos/acciones-lote', datos).then((r) => r.data),
}

export const unidadesMedidaApi = {
  listar: () => http.get<UnidadMedidaResponse[]>('/unidades-medida').then((r) => r.data),
}
