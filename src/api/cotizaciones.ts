import { http } from './cliente'
import type {
  AnulacionRequest,
  ConversionCotizacionRequest,
  CotizacionRequest,
  CotizacionResponse,
  EnlaceWhatsappResponse,
  EstadoCotizacion,
  PaginaResponse,
  Paginacion,
} from './tipos'

export interface FiltroCotizaciones extends Paginacion {
  estado?: EstadoCotizacion
  ubicacionId?: number
  clienteId?: number
  texto?: string
}

/** Cotizaciones: PDF, correo, WhatsApp y conversion en nota de venta. */
export const cotizacionesApi = {
  listar: (filtro: FiltroCotizaciones) =>
    http.get<PaginaResponse<CotizacionResponse>>('/cotizaciones', { params: filtro }).then((r) => r.data),
  obtener: (id: number) => http.get<CotizacionResponse>(`/cotizaciones/${id}`).then((r) => r.data),
  crear: (datos: CotizacionRequest) => http.post<CotizacionResponse>('/cotizaciones', datos).then((r) => r.data),
  actualizar: (id: number, datos: CotizacionRequest) =>
    http.put<CotizacionResponse>(`/cotizaciones/${id}`, datos).then((r) => r.data),
  emitir: (id: number) => http.post<CotizacionResponse>(`/cotizaciones/${id}/emitir`).then((r) => r.data),
  anular: (id: number, datos: AnulacionRequest) =>
    http.post<CotizacionResponse>(`/cotizaciones/${id}/anular`, datos).then((r) => r.data),
  convertirEnVenta: (id: number, datos: ConversionCotizacionRequest) =>
    http.post<CotizacionResponse>(`/cotizaciones/${id}/convertir-venta`, datos).then((r) => r.data),
  /** El PDF se pide con el token de sesion, por eso se descarga como archivo (Blob) y no con un enlace directo. */
  pdf: (id: number) => http.get<Blob>(`/cotizaciones/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
  enviarCorreo: (id: number, destinatario: string, mensaje: string | null) =>
    http.post<CotizacionResponse>(`/cotizaciones/${id}/enviar-correo`, { destinatario, mensaje }).then((r) => r.data),
  enlaceWhatsapp: (id: number, telefono: string) =>
    http
      .get<EnlaceWhatsappResponse>(`/cotizaciones/${id}/enlace-whatsapp`, { params: { telefono } })
      .then((r) => r.data),
}
