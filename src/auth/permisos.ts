import type { Rol, UsuarioResponse } from '@/api/tipos'

/**
 * Permisos por rol, copiados de la tabla del backend (SecurityConfig.permisosPorRol).
 * La interfaz solo muestra los menus y botones que el backend va a aceptar: asi el usuario nunca ve
 * una accion que termina en 403. El backend sigue siendo la autoridad: esta tabla solo oculta opciones.
 */
const TODOS: readonly Rol[] = ['ADMIN', 'VENDEDOR', 'ALMACENERO']
const ADMIN: readonly Rol[] = ['ADMIN']
const ADMIN_VENDEDOR: readonly Rol[] = ['ADMIN', 'VENDEDOR']
const ADMIN_ALMACENERO: readonly Rol[] = ['ADMIN', 'ALMACENERO']

export const PERMISOS = {
  // Catalogo: todos consultan, solo el ADMIN modifica
  'productos.ver': TODOS,
  'productos.editar': ADMIN,
  'categorias.editar': ADMIN,
  // Inventario
  'inventario.ver': TODOS,
  'inventario.ajustar': ADMIN_ALMACENERO,
  'inventario.inicial': ADMIN,
  'inventario.minimo': ADMIN,
  'kardex.ver': TODOS,
  // Traslados: enviar y anular desde el almacen; recibir, quien trabaja en el destino
  'traslados.ver': TODOS,
  'traslados.enviar': ADMIN_ALMACENERO,
  'traslados.anular': ADMIN_ALMACENERO,
  'traslados.recibir': TODOS,
  // Punto de venta
  'caja.usar': ADMIN_VENDEDOR,
  'ventas.ver': ADMIN_VENDEDOR,
  'ventas.registrar': ADMIN_VENDEDOR,
  'ventas.anular': ADMIN_VENDEDOR,
  'clientes.ver': ADMIN_VENDEDOR,
  'fiado.ver': ADMIN_VENDEDOR,
  // Compras
  'compras.ver': ADMIN_ALMACENERO,
  'compras.registrar': ADMIN_ALMACENERO,
  'compras.anular': ADMIN,
  'proveedores.ver': ADMIN_ALMACENERO,
  // Reportes
  'reportes.ver': TODOS,
  'reportes.ventas': ADMIN_VENDEDOR,
  'reportes.productos': ADMIN_VENDEDOR,
  'reportes.traslados': ADMIN_ALMACENERO,
  'reportes.compras': ADMIN_ALMACENERO,
  'reportes.stockBajo': TODOS,
  'reportes.deudores': ADMIN_VENDEDOR,
  // Administracion
  'usuarios.ver': ADMIN,
  'configuracion.ver': ADMIN,
} as const satisfies Record<string, readonly Rol[]>

export type Permiso = keyof typeof PERMISOS

export function tienePermiso(rol: Rol | null | undefined, permiso: Permiso): boolean {
  return rol != null && (PERMISOS[permiso] as readonly Rol[]).includes(rol)
}

/**
 * Seguridad por tienda: el ADMIN opera en cualquier ubicacion; los demas solo en la suya
 * (igual que AccesoUbicacionService del backend).
 */
export function puedeOperarEn(usuario: UsuarioResponse | null, ubicacionId: number | null | undefined): boolean {
  if (!usuario || ubicacionId == null) {
    return false
  }
  return usuario.rol === 'ADMIN' || usuario.ubicacionId === ubicacionId
}

/** Recibir un traslado: solo si esta en camino y el usuario trabaja en el destino (o es ADMIN). */
export function puedeRecibirTraslado(
  usuario: UsuarioResponse | null,
  traslado: { estado: string; destinoId: number },
): boolean {
  return traslado.estado === 'ENVIADO' && puedeOperarEn(usuario, traslado.destinoId)
}

/** Anular un traslado: en camino, por ADMIN o ALMACENERO del almacen de origen. */
export function puedeAnularTraslado(
  usuario: UsuarioResponse | null,
  traslado: { estado: string; origenId: number },
): boolean {
  return (
    traslado.estado === 'ENVIADO' &&
    tienePermiso(usuario?.rol, 'traslados.anular') &&
    puedeOperarEn(usuario, traslado.origenId)
  )
}
