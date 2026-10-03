import type { EstadoCaja, EstadoCompra, EstadoTraslado, EstadoVenta } from '@/api/tipos'
import type { TonoInsignia } from './Insignia'

/** Color de la insignia de cada estado. */
export const TONO_TRASLADO: Record<EstadoTraslado, TonoInsignia> = { ENVIADO: 'alerta', RECIBIDO: 'exito', ANULADO: 'peligro' }
export const TONO_VENTA: Record<EstadoVenta, TonoInsignia> = { EMITIDA: 'exito', ANULADA: 'peligro' }
export const TONO_COMPRA: Record<EstadoCompra, TonoInsignia> = { REGISTRADA: 'exito', ANULADA: 'peligro' }
export const TONO_CAJA: Record<EstadoCaja, TonoInsignia> = { ABIERTA: 'exito', CERRADA: 'neutro' }
