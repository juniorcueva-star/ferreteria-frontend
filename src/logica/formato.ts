import type {
  CondicionVenta,
  EstadoTraslado,
  Rol,
  TipoComprobanteCompra,
  TipoDocumentoIdentidad,
  TipoMovimiento,
  UnidadBase,
} from '@/api/tipos'

/** Zona horaria del negocio: los "dias" de los reportes y filtros son dias de Lima. */
export const ZONA_NEGOCIO = 'America/Lima'

const SOLES = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ENTERO_AGRUPADO = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 })
const FECHA = new Intl.DateTimeFormat('es-PE', { timeZone: ZONA_NEGOCIO, dateStyle: 'medium' })
const FECHA_HORA = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA_NEGOCIO,
  dateStyle: 'medium',
  timeStyle: 'short',
})
const DIA_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Precio con formato "S/ 0.35" (separador de miles con coma). */
export function soles(valor: number | null | undefined): string {
  return `S/ ${SOLES.format(valor ?? 0)}`
}

/** Monto en centimos con formato "S/ 0.35". */
export function solesDeCentimos(centimos: number): string {
  return soles(centimos / 100)
}

/** Sufijo corto de la unidad base: u, kg, m. */
export function sufijoUnidad(unidad: UnidadBase): string {
  return { UNIDAD: 'u', KILO: 'kg', METRO: 'm' }[unidad]
}

export function nombreUnidad(unidad: UnidadBase, plural = false): string {
  const nombres: Record<UnidadBase, [string, string]> = {
    UNIDAD: ['Unidad', 'Unidades'],
    KILO: ['Kilo', 'Kilos'],
    METRO: ['Metro', 'Metros'],
  }
  return nombres[unidad][plural ? 1 : 0]
}

/** Stock sin separador de miles, como en la tabla de productos ("5000", "25.5"). */
export function cantidad(valor: number | null | undefined): string {
  const numero = valor ?? 0
  return Number.isInteger(numero) ? String(numero) : String(Number(numero.toFixed(3)))
}

/** Cantidad con separador de miles ("1,000"). */
export function cantidadAgrupada(valor: number): string {
  return ENTERO_AGRUPADO.format(valor)
}

/** Cantidad con su unidad ("25.5 kg"). */
export function cantidadConUnidad(valor: number, unidad: UnidadBase): string {
  return `${cantidadAgrupada(valor)} ${sufijoUnidad(unidad)}`
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  // Una fecha sin hora (AAAA-MM-DD) se muestra tal cual, sin moverla de zona horaria
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [anio, mes, dia] = iso.split('-').map(Number)
    return FECHA.format(new Date(Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1, 12)))
  }
  return FECHA.format(new Date(iso))
}

export function fechaHora(iso: string | null | undefined): string {
  return iso ? FECHA_HORA.format(new Date(iso)) : '—'
}

/** Dia de hoy en Lima en formato AAAA-MM-DD (lo que esperan los filtros del backend). */
export function hoyLima(ahora: Date = new Date()): string {
  return DIA_ISO.format(ahora)
}

/** Primer dia del mes actual en Lima (AAAA-MM-01). */
export function inicioMesLima(ahora: Date = new Date()): string {
  return `${hoyLima(ahora).slice(0, 8)}01`
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  const letras = partes.length >= 2 ? `${partes[0]?.[0] ?? ''}${partes[1]?.[0] ?? ''}` : nombre.slice(0, 2)
  return letras.toUpperCase()
}

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ALMACENERO: 'Almacenero',
}

export const NOMBRE_MOVIMIENTO: Record<TipoMovimiento, string> = {
  INVENTARIO_INICIAL: 'Inventario inicial',
  COMPRA: 'Compra',
  ANULACION_COMPRA: 'Anulación de compra',
  VENTA: 'Venta',
  ANULACION_VENTA: 'Anulación de venta',
  TRASLADO_SALIDA: 'Traslado (salida)',
  TRASLADO_ENTRADA: 'Traslado (entrada)',
  ANULACION_TRASLADO: 'Anulación de traslado',
  AJUSTE_ENTRADA: 'Ajuste (entrada)',
  AJUSTE_SALIDA: 'Ajuste (salida)',
}

export const NOMBRE_ESTADO_TRASLADO: Record<EstadoTraslado, string> = {
  ENVIADO: 'En camino',
  RECIBIDO: 'Recibido',
  ANULADO: 'Anulado',
}

export const NOMBRE_COMPROBANTE: Record<TipoComprobanteCompra, string> = {
  FACTURA: 'Factura',
  BOLETA: 'Boleta',
  NOTA_VENTA: 'Nota de venta',
  SIN_COMPROBANTE: 'Sin comprobante',
}

export const NOMBRE_DOCUMENTO: Record<TipoDocumentoIdentidad, string> = {
  NINGUNO: 'Sin documento',
  DNI: 'DNI',
  RUC: 'RUC',
  CE: 'Carné de extranjería',
}

export const NOMBRE_CONDICION: Record<CondicionVenta, string> = {
  CONTADO: 'Contado',
  CREDITO: 'Crédito',
}

/**
 * Nombres de los metodos de pago (catalogo fijo de la migracion V2) con su ortografia correcta.
 * Si llega un codigo nuevo se muestra el nombre que envia la API.
 */
const NOMBRE_METODO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  DEPOSITO: 'Depósito bancario',
  TRANSFERENCIA: 'Transferencia bancaria',
  TARJETA: 'Tarjeta de débito o crédito',
  OTRO_QR: 'Otro pago con QR',
}

export function nombreMetodoPago(codigo: string, nombreApi?: string): string {
  return NOMBRE_METODO_PAGO[codigo] ?? nombreApi ?? codigo
}
