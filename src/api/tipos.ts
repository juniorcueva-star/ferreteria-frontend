/**
 * Tipos de las respuestas y peticiones de la API, uno por cada DTO del backend (paquete com.ferreteria.dto).
 * Los montos y cantidades llegan como numeros JSON (BigDecimal en el backend).
 * Las fechas con hora llegan en ISO 8601 (OffsetDateTime) y las fechas sin hora como "AAAA-MM-DD" (LocalDate).
 */

// ---------- Enums ----------

export type Rol = 'ADMIN' | 'VENDEDOR' | 'ALMACENERO'
export type TipoUbicacion = 'ALMACEN' | 'TIENDA'
export type UnidadBase = 'UNIDAD' | 'KILO' | 'METRO'
export type EstadoCaja = 'ABIERTA' | 'CERRADA'
export type EstadoCompra = 'REGISTRADA' | 'ANULADA'
export type EstadoPago = 'VALIDO' | 'ANULADO'
export type EstadoTraslado = 'ENVIADO' | 'RECIBIDO' | 'ANULADO'
export type EstadoVenta = 'EMITIDA' | 'ANULADA'
export type CondicionVenta = 'CONTADO' | 'CREDITO'
export type TipoComprobanteCompra = 'FACTURA' | 'BOLETA' | 'NOTA_VENTA' | 'SIN_COMPROBANTE'
export type TipoDocumentoIdentidad = 'NINGUNO' | 'DNI' | 'RUC' | 'CE'
export type TipoDocumentoVenta = 'NOTA_VENTA' | 'BOLETA' | 'FACTURA'
export type TipoPago = 'VENTA' | 'ABONO'
export type TipoAjuste = 'ENTRADA' | 'SALIDA'
export type OrdenProductos = 'MONTO' | 'CANTIDAD'
export type TipoMovimiento =
  | 'INVENTARIO_INICIAL'
  | 'COMPRA'
  | 'ANULACION_COMPRA'
  | 'VENTA'
  | 'ANULACION_VENTA'
  | 'TRASLADO_SALIDA'
  | 'TRASLADO_ENTRADA'
  | 'ANULACION_TRASLADO'
  | 'AJUSTE_ENTRADA'
  | 'AJUSTE_SALIDA'

// ---------- Comunes ----------

/** Formato unico de error de la API. */
export interface ErrorResponse {
  codigo: string
  mensaje: string
  detalle: string[]
  fecha: string
}

/** Pagina de resultados: todos los listados la devuelven. */
export interface PaginaResponse<T> {
  contenido: T[]
  pagina: number
  tamano: number
  totalElementos: number
  totalPaginas: number
}

/** Parametros de paginacion de Spring (page empieza en 0, size maximo 100). */
export interface Paginacion {
  page?: number
  size?: number
  sort?: string
}

export interface AnulacionRequest {
  motivo: string
}

// ---------- Autenticacion y organizacion ----------

export interface UsuarioResponse {
  id: number
  nombres: string
  username: string
  rol: Rol
  ubicacionId: number | null
  ubicacionNombre: string | null
  activo: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  tipo: string
  expiraEn: string
  usuario: UsuarioResponse
}

export interface CambiarPasswordRequest {
  passwordActual: string
  passwordNueva: string
}

export interface UsuarioCrearRequest {
  nombres: string
  username: string
  password: string
  rol: Rol
  ubicacionId: number | null
}

export interface UsuarioActualizarRequest {
  nombres: string
  rol: Rol
  ubicacionId: number | null
  activo: boolean
}

export interface EmpresaResponse {
  id: number
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  direccion: string | null
  activo: boolean
}

export interface EmpresaRequest {
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  direccion: string | null
  activo: boolean
}

export interface UbicacionResponse {
  id: number
  nombre: string
  tipo: TipoUbicacion
  empresaId: number | null
  empresaRuc: string | null
  empresaRazonSocial: string | null
  direccion: string | null
  activo: boolean
}

export interface UbicacionRequest {
  nombre: string
  tipo: TipoUbicacion
  empresaId: number | null
  direccion: string | null
  activo: boolean
}

// ---------- Catalogo ----------

export interface CategoriaResponse {
  id: number
  nombre: string
  activo: boolean
}

export interface CategoriaRequest {
  nombre: string
  activo: boolean
}

export interface PresentacionResponse {
  id: number
  nombre: string
  factor: number
  precioVenta: number
  codigoBarras: string | null
  principal: boolean
  activo: boolean
}

export interface PresentacionRequest {
  nombre: string
  factor: number
  precioVenta: number
  codigoBarras: string | null
  /** null = no cambia (al editar) */
  principal: boolean | null
  activo: boolean | null
}

export interface ProductoResponse {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  marca: string | null
  categoriaId: number
  categoriaNombre: string
  unidadBase: UnidadBase
  imagenUrl: string | null
  activo: boolean
  presentaciones: PresentacionResponse[]
}

export interface ProductoCrearRequest {
  codigo: string
  nombre: string
  descripcion: string | null
  marca: string | null
  categoriaId: number
  unidadBase: UnidadBase
  presentaciones: PresentacionRequest[]
}

export interface ProductoActualizarRequest {
  codigo: string
  nombre: string
  descripcion: string | null
  marca: string | null
  categoriaId: number
  activo: boolean
}

// ---------- Inventario y traslados ----------

export interface StockResponse {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  ubicacionId: number
  ubicacionNombre: string
  cantidad: number
  stockMinimo: number
  bajo: boolean
}

export interface StockMinimoRequest {
  productoId: number
  ubicacionId: number
  stockMinimo: number
}

/** Linea de traslados, ajustes e inventario inicial. Sin presentacion, la cantidad esta en unidad base. */
export interface LineaProductoRequest {
  productoId: number
  presentacionId: number | null
  cantidad: number
}

export interface AjusteRequest {
  ubicacionId: number | null
  tipo: TipoAjuste
  motivo: string
  detalles: LineaProductoRequest[]
}

export interface InventarioInicialRequest {
  ubicacionId: number
  detalles: LineaProductoRequest[]
}

export interface KardexResponse {
  id: number
  fecha: string
  productoId: number
  productoNombre: string
  ubicacionId: number
  ubicacionNombre: string
  tipo: TipoMovimiento
  cantidad: number
  saldoResultante: number
  costoUnitario: number | null
  documento: string | null
  usuario: string
  motivo: string | null
}

export interface TrasladoDetalle {
  productoId: number
  productoNombre: string
  unidadBase: UnidadBase
  presentacionNombre: string | null
  cantidad: number
  cantidadBase: number
}

export interface TrasladoResponse {
  id: number
  codigo: string
  origenId: number
  origenNombre: string
  destinoId: number
  destinoNombre: string
  estado: EstadoTraslado
  usuarioEnvia: string
  usuarioRecibe: string | null
  fechaEnvio: string
  fechaRecepcion: string | null
  observacion: string | null
  detalles: TrasladoDetalle[]
}

export interface TrasladoRequest {
  origenId: number | null
  destinoId: number
  observacion: string | null
  detalles: LineaProductoRequest[]
}

// ---------- Compras ----------

export interface ProveedorResponse {
  id: number
  ruc: string | null
  razonSocial: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
}

export interface ProveedorRequest {
  ruc: string | null
  razonSocial: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
}

export interface CompraDetalleResponse {
  id: number
  productoId: number
  productoNombre: string
  presentacionId: number | null
  presentacionNombre: string | null
  cantidad: number
  cantidadBase: number
  costoUnitario: number
  subtotal: number
}

export interface CompraResponse {
  id: number
  empresaId: number
  empresaRazonSocial: string
  proveedorId: number
  proveedorRazonSocial: string
  ubicacionId: number
  ubicacionNombre: string
  usuario: string
  tipoComprobante: TipoComprobanteCompra
  serieNumero: string | null
  fechaEmision: string
  subtotal: number
  igv: number
  total: number
  estado: EstadoCompra
  observacion: string | null
  createdAt: string
  detalles: CompraDetalleResponse[]
}

export interface CompraDetalleRequest {
  productoId: number
  presentacionId: number | null
  cantidad: number
  precioUnitario: number
}

export interface CompraRequest {
  empresaId: number
  proveedorId: number
  ubicacionId: number | null
  tipoComprobante: TipoComprobanteCompra
  serieNumero: string | null
  fechaEmision: string
  observacion: string | null
  detalles: CompraDetalleRequest[]
}

// ---------- Clientes, caja, ventas y fiado ----------

export interface ClienteResponse {
  id: number
  nombre: string
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string | null
  telefono: string | null
  direccion: string | null
  activo: boolean
}

export interface ClienteRequest {
  nombre: string
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string | null
  telefono: string | null
  direccion: string | null
  activo: boolean
}

export interface MetodoPagoResponse {
  id: number
  codigo: string
  nombre: string
  requiereReferencia: boolean
  efectivo: boolean
  activo: boolean
}

export interface CobroPorMetodo {
  codigo: string
  nombre: string
  efectivo: boolean
  monto: number
}

export interface ResumenCaja {
  cantidadVentas: number
  totalVendido: number
  totalCredito: number
  totalCobrado: number
  totalAbonos: number
  cobrosPorMetodo: CobroPorMetodo[]
  efectivoEsperado: number
}

export interface CajaResponse {
  id: number
  ubicacionId: number
  ubicacionNombre: string
  usuarioId: number
  usuario: string
  fechaApertura: string
  montoApertura: number
  fechaCierre: string | null
  efectivoEsperado: number | null
  efectivoContado: number | null
  diferencia: number | null
  estado: EstadoCaja
  /** null en los listados */
  resumen: ResumenCaja | null
}

export interface AperturaCajaRequest {
  ubicacionId: number | null
  montoApertura: number
}

export interface CierreCajaRequest {
  efectivoContado: number
}

export interface PagoRequest {
  metodoPago: string
  monto: number
  numeroOperacion: string | null
}

export interface PagoResponse {
  id: number
  tipo: TipoPago
  metodoPago: string
  monto: number
  numeroOperacion: string | null
  cajaId: number
  usuario: string
  fecha: string
  estado: EstadoPago
}

export interface VentaDetalleRequest {
  presentacionId: number
  cantidad: number
  descuento: number | null
}

export interface VentaRequest {
  condicion: CondicionVenta
  clienteId: number | null
  fechaVencimiento: string | null
  detalles: VentaDetalleRequest[]
  pagos: PagoRequest[]
}

export interface VentaDetalle {
  productoId: number
  presentacionId: number
  descripcion: string
  cantidad: number
  factor: number
  cantidadBase: number
  precioUnitario: number
  descuento: number
  subtotal: number
}

export interface VentaResponse {
  id: number
  tipoDocumento: TipoDocumentoVenta
  numeroDocumento: string
  fecha: string
  ubicacionId: number
  ubicacionNombre: string
  empresaRuc: string
  empresaRazonSocial: string
  vendedor: string
  cajaId: number
  clienteId: number | null
  clienteNombre: string | null
  condicion: CondicionVenta
  fechaVencimiento: string | null
  subtotal: number
  igv: number
  descuento: number
  total: number
  saldoPendiente: number
  estado: EstadoVenta
  motivoAnulacion: string | null
  vuelto: number
  /** vacio en los listados */
  detalles: VentaDetalle[]
  /** vacio en los listados */
  pagos: PagoResponse[]
}

export interface AbonoRequest {
  pagos: PagoRequest[]
}

export interface DeudorResponse {
  clienteId: number
  clienteNombre: string
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string | null
  telefono: string | null
  cantidadVentas: number
  deudaTotal: number
  deudaMasAntigua: string
  proximoVencimiento: string | null
}

// ---------- Reportes ----------

export interface VentasPorTiendaResponse {
  ubicacionId: number
  ubicacionNombre: string
  empresaRuc: string
  cantidadVentas: number
  totalVendido: number
  totalContado: number
  totalCredito: number
  saldoPendiente: number
  cantidadAnuladas: number
}

export interface ProductoVendidoResponse {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  cantidadVendida: number
  montoVendido: number
  numeroVentas: number
}

export interface TrasladosPorTiendaResponse {
  destinoId: number
  destinoNombre: string
  cantidadTraslados: number
  recibidos: number
  enCamino: number
  anulados: number
}

export interface ComprasPorProveedorResponse {
  proveedorId: number
  proveedorRuc: string | null
  proveedorRazonSocial: string
  cantidadCompras: number
  totalComprado: number
  ultimaCompra: string
}
