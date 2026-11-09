import { http } from './cliente'
import type {
  ComprasPorProveedorResponse,
  OrdenProductos,
  PaginaResponse,
  Paginacion,
  ProductoVendidoResponse,
  StockResponse,
  TrasladosPorTiendaResponse,
  VentasPorTiendaResponse,
} from './tipos'

/** Rango obligatorio de los reportes: dias de Lima en formato AAAA-MM-DD, ambos inclusive. */
export interface RangoFechas extends Paginacion {
  desde: string
  hasta: string
}

export const reportesApi = {
  ventasPorTienda: (filtro: RangoFechas & { ubicacionId?: number }) =>
    http
      .get<PaginaResponse<VentasPorTiendaResponse>>('/reportes/ventas-por-tienda', { params: filtro })
      .then((r) => r.data),
  productosMasVendidos: (filtro: RangoFechas & { ubicacionId?: number; orden?: OrdenProductos }) =>
    http
      .get<PaginaResponse<ProductoVendidoResponse>>('/reportes/productos-mas-vendidos', { params: filtro })
      .then((r) => r.data),
  trasladosPorTienda: (filtro: RangoFechas & { origenId?: number }) =>
    http
      .get<PaginaResponse<TrasladosPorTiendaResponse>>('/reportes/traslados-por-tienda', { params: filtro })
      .then((r) => r.data),
  comprasPorProveedor: (filtro: RangoFechas & { ubicacionId?: number; empresaId?: number }) =>
    http
      .get<PaginaResponse<ComprasPorProveedorResponse>>('/reportes/compras-por-proveedor', { params: filtro })
      .then((r) => r.data),
  stockBajo: (filtro: Paginacion & { ubicacionId?: number }) =>
    http.get<PaginaResponse<StockResponse>>('/reportes/stock-bajo', { params: filtro }).then((r) => r.data),
}

/** Reportes en Excel (.xlsx): llegan como archivo (Blob) porque se piden con el token de sesion. */
export const excelApi = {
  ventas: (filtro: RangoFechas & { ubicacionId?: number }) =>
    http.get<Blob>('/reportes/excel/ventas', { params: filtro, responseType: 'blob' }).then((r) => r.data),
  stock: (filtro: { ubicacionId?: number; soloBajo?: boolean }) =>
    http.get<Blob>('/reportes/excel/stock', { params: filtro, responseType: 'blob' }).then((r) => r.data),
  deudores: (filtro: { ubicacionId?: number }) =>
    http.get<Blob>('/reportes/excel/deudores', { params: filtro, responseType: 'blob' }).then((r) => r.data),
}
