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
  /** Uno o varios criterios: 'nombre,asc' */
  sort?: string | string[]
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
  /** Datos que se imprimen en la cotizacion y la nota de venta */
  telefono: string | null
  lema: string | null
  /** Cuentas para depositos, una por linea */
  datosBancarios: string | null
  activo: boolean
}

export interface EmpresaRequest {
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  direccion: string | null
  telefono: string | null
  lema: string | null
  datosBancarios: string | null
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
  /** Decimales que acepta al vender o comprar (0 = solo enteros) */
  decimales: number
  /** Precio por mayor, de menor a mayor cantidad (vacio si no tiene) */
  escalas: EscalaPrecio[]
}

/** Desde cantidadMinima (en la presentacion) cada una cuesta precio. Ej: desde 100 a S/ 0.40 */
export interface EscalaPrecio {
  cantidadMinima: number
  precio: number
}

/** De donde sale el precio de una linea: lista, por mayor u oferta */
export type TipoPrecio = 'LISTA' | 'MAYOR' | 'OFERTA'

export interface PresentacionRequest {
  nombre: string
  factor: number
  precioVenta: number
  codigoBarras: string | null
  /** null = no cambia (al editar) */
  principal: boolean | null
  activo: boolean | null
  /** null = 0 para productos por UNIDAD y 3 para KILO o METRO (al crear) o no cambia (al editar) */
  decimales: number | null
  /** Ganancia para el precio sugerido (Ej: 30 = 30 %); al editar, null no cambia */
  porcentajeGanancia: number | null
  /** Monto fijo que se suma al precio sugerido; al editar, null no cambia */
  montoAdicional: number | null
}

/** Costo y precio sugerido de una presentacion (solo ADMIN). */
export interface PrecioSugeridoResponse {
  presentacionId: number
  presentacionNombre: string
  costoReferencia: number | null
  porcentajeGanancia: number | null
  montoAdicional: number | null
  precioSugerido: number | null
  precioVenta: number
}

export interface HistorialPrecioResponse {
  id: number
  precioAnterior: number
  precioNuevo: number
  usuario: string | null
  fecha: string
}

/** Unidad de venta para armar presentaciones (docena, ciento, kilo...). */
export interface UnidadMedidaResponse {
  id: number
  codigo: string
  nombre: string
  decimales: number
  /** Unidades base que suele contener; null si depende del producto (caja, rollo...) */
  factorSugerido: number | null
}

export type AccionLote = 'ASIGNAR_CATEGORIA' | 'ACTIVAR' | 'DESACTIVAR'

export interface AccionLoteRequest {
  productoIds: number[]
  accion: AccionLote
  categoriaId: number | null
}

export interface AccionLoteResponse {
  accion: AccionLote
  productosActualizados: number
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
  tipo: string | null
  acabado: string | null
  medida: string | null
  /** Completos: el producto con otras piezas a precio propio (Ej: perno + tuerca + arandela) */
  completos: CompletoResponse[]
}

export interface CompletoComponenteResponse {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  presentacionId: number
  presentacionNombre: string
  cantidad: number
  /** Lo que se descuenta del stock de la pieza por cada completo */
  cantidadBase: number
  precioUnitario: number
  disponible: boolean
}

export interface CompletoResponse {
  id: number
  productoId: number
  nombre: string
  precioVenta: number
  /** Suma de las piezas a precio de lista */
  precioSugerido: number
  activo: boolean
  /** Ej: "1 Perno (Unidad) + 1 Tuerca (Unidad)" */
  composicion: string
  componentes: CompletoComponenteResponse[]
}

export interface CompletoRequest {
  nombre: string
  /** null = suma de las piezas */
  precioVenta: number | null
  activo: boolean
  componentes: { presentacionId: number; cantidad: number }[]
}

export interface ProductoCrearRequest {
  codigo: string
  nombre: string
  descripcion: string | null
  marca: string | null
  categoriaId: number
  unidadBase: UnidadBase
  presentaciones: PresentacionRequest[]
  tipo: string | null
  acabado: string | null
  medida: string | null
}

export interface ProductoActualizarRequest {
  codigo: string
  nombre: string
  descripcion: string | null
  marca: string | null
  categoriaId: number
  activo: boolean
  tipo: string | null
  acabado: string | null
  medida: string | null
}

// ---------- Inventario y traslados ----------

/** Stock de un producto en una ubicacion activa (solo lectura). */
export interface StockUbicacion {
  ubicacionId: number
  ubicacionNombre: string
  tipo: TipoUbicacion
  cantidad: number
  stockMinimo: number
  bajo: boolean
}

/** Disponibilidad de un producto en todas las tiendas y el almacen, con su total. */
export interface ResumenStockResponse {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  categoriaNombre: string
  ubicaciones: StockUbicacion[]
  total: number
}

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
  /** Donde esta el producto dentro de la ubicacion, Ej: "Pasillo 3 - Estante B" */
  ubicacionFisica: string | null
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

/** Linea de venta: de una presentacion o de un completo (solo uno) */
export interface VentaDetalleRequest {
  presentacionId: number | null
  completoId?: number | null
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
  /** null en las lineas de completo */
  presentacionId: number | null
  completoId: number | null
  /** Piezas del completo al vender */
  composicion: string | null
  descripcion: string
  cantidad: number
  factor: number
  cantidadBase: number
  precioUnitario: number
  descuento: number
  subtotal: number
  tipoPrecio: TipoPrecio
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

// ---------- Encargos ----------

export type EstadoEncargo = 'PENDIENTE' | 'ENTREGADO' | 'ANULADO'

export interface EncargoRequest {
  /** Tienda; el VENDEDOR la omite (su tienda), el ADMIN la indica */
  ubicacionId: number | null
  clienteId: number | null
  presentacionId: number
  cantidad: number
  /** Precio acordado con IGV por presentacion */
  precioUnitario: number
  /** Lo que cuesta conseguirlo; null = costo de la ultima compra */
  costoReferencia: number | null
  observacion: string | null
}

export interface EntregaEncargoRequest {
  condicion: CondicionVenta
  /** null = cliente del encargo */
  clienteId: number | null
  fechaVencimiento: string | null
  pagos: PagoRequest[]
}

export interface EncargoResponse {
  id: number
  codigo: string
  ubicacionId: number
  ubicacionNombre: string
  clienteId: number | null
  clienteNombre: string | null
  productoId: number
  productoCodigo: string
  productoNombre: string
  presentacionId: number
  presentacionNombre: string
  cantidad: number
  precioUnitario: number
  total: number
  precioLista: number
  recargoPorcentaje: number | null
  costoReferencia: number | null
  observacion: string | null
  estado: EstadoEncargo
  ventaId: number | null
  ventaNumero: string | null
  usuario: string
  createdAt: string
  updatedAt: string
}

// ---------- Cotizaciones ----------

export type EstadoCotizacion = 'BORRADOR' | 'EMITIDA' | 'ANULADA'

export interface CotizacionDetalleRequest {
  /** null en las lineas de completo */
  presentacionId: number | null
  completoId?: number | null
  cantidad: number
  /** null = precio de lista */
  precioUnitario: number | null
  descuento: number | null
}

export interface CotizacionRequest {
  /** Tienda; el VENDEDOR la omite (su tienda), el ADMIN la indica */
  ubicacionId: number | null
  clienteId: number | null
  diasValidez: number | null
  observacion: string | null
  detalles: CotizacionDetalleRequest[]
}

export interface CotizacionDetalleResponse {
  productoId: number
  presentacionId: number | null
  completoId: number | null
  composicion: string | null
  descripcion: string
  cantidad: number
  factor: number
  cantidadBase: number
  precioUnitario: number
  descuento: number
  subtotal: number
  decimales: number
  tipoPrecio: TipoPrecio
}

export interface CotizacionResponse {
  id: number
  codigo: string
  ubicacionId: number
  ubicacionNombre: string
  empresaRuc: string
  empresaRazonSocial: string
  clienteId: number | null
  clienteNombre: string | null
  clienteDocumento: string | null
  usuario: string
  fecha: string
  fechaValidez: string
  estado: EstadoCotizacion
  observacion: string | null
  subtotal: number
  igv: number
  descuento: number
  total: number
  ventaId: number | null
  ventaNumero: string | null
  detalles: CotizacionDetalleResponse[]
}

export interface ConversionCotizacionRequest {
  condicion: CondicionVenta
  /** null = cliente de la cotizacion */
  clienteId: number | null
  fechaVencimiento: string | null
  pagos: PagoRequest[]
}

export interface EnlaceWhatsappResponse {
  url: string
  mensaje: string
}

// ---------- Auditoria ----------

export type EntidadAuditada = 'PRODUCTO' | 'PRECIO' | 'STOCK' | 'VENTA' | 'COMPRA' | 'USUARIO' | 'EMPRESA'

export interface AuditoriaResponse {
  id: number
  fecha: string
  usuario: string | null
  usuarioNombre: string | null
  entidad: EntidadAuditada
  entidadId: number | null
  accion: string
  descripcion: string
}

// ---------- Pedidos de reposicion ----------

export type EstadoSolicitud = 'PENDIENTE' | 'ATENDIDA' | 'RECHAZADA' | 'ANULADA'

export interface SolicitudReposicionRequest {
  /** El VENDEDOR la omite (su tienda); el ADMIN la indica */
  ubicacionId: number | null
  observacion: string | null
  /** Cantidades en unidad base */
  detalles: { productoId: number; cantidad: number }[]
}

export interface SolicitudReposicionResponse {
  id: number
  codigo: string
  ubicacionId: number
  ubicacionNombre: string
  estado: EstadoSolicitud
  observacion: string | null
  usuario: string
  fecha: string
  atendidaPor: string | null
  atendidaAt: string | null
  motivo: string | null
  trasladoId: number | null
  trasladoCodigo: string | null
  detalles: { productoId: number; productoCodigo: string; productoNombre: string; unidadBase: UnidadBase; cantidad: number }[]
}

export interface AtencionSolicitudRequest {
  /** El ALMACENERO lo omite (su almacen); el ADMIN lo indica */
  origenId: number | null
  observacion: string | null
  /** Cantidad a enviar por producto (0 = no se envia); vacio = lo pedido */
  detalles: { productoId: number; cantidad: number }[]
}

export interface SugerenciaReposicionResponse {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  stockTienda: number
  stockMinimo: number
  stockAlmacen: number
  cantidadSugerida: number
}

// ---------- Reportes del almacen ----------

export interface PedidoSugeridoResponse {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  stock: number
  stockMinimo: number
  /** Hasta el doble del minimo, en unidad base */
  cantidadSugerida: number
  ultimoProveedor: string | null
  fechaUltimaCompra: string | null
  /** Costo por unidad base de la ultima compra */
  ultimoCosto: number | null
  montoEstimado: number | null
}

export interface ValorInventarioFila {
  productoId: number
  productoCodigo: string
  productoNombre: string
  unidadBase: UnidadBase
  ubicacionId: number
  ubicacionNombre: string
  cantidad: number
  costoUnitario: number | null
  valor: number | null
  ultimaSalida: string | null
  diasSinSalida: number | null
}

export interface ValorInventarioResponse {
  valorTotal: number
  productos: number
  productosSinCosto: number
  filas: ValorInventarioFila[]
}

// ---------- Inventario fisico ----------

export interface ConteoRequest {
  /** El ALMACENERO la omite (su almacen); el ADMIN la indica */
  ubicacionId: number | null
  observacion: string | null
  /** Lo contado de cada producto, en unidad base */
  detalles: { productoId: number; cantidadContada: number }[]
}

export interface ConteoResponse {
  ubicacionId: number
  ubicacionNombre: string
  productosContados: number
  conDiferencia: number
  lineas: {
    productoId: number
    productoCodigo: string
    productoNombre: string
    unidadBase: UnidadBase
    sistema: number
    contado: number
    /** contado - sistema (positivo: sobraba; negativo: faltaba) */
    diferencia: number
  }[]
}
