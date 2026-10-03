import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  ClipboardList,
  Hexagon,
  LayoutGrid,
  Settings,
  ShoppingBag,
  SquarePlus,
  User,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Permiso } from '@/auth/permisos'

export interface ItemMenu {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  /** Sin permiso = visible para todos */
  permiso?: Permiso
}

/** Menu lateral en el orden de la imagen de referencia (Caja se agrega antes de Ventas). */
export const MENU: ItemMenu[] = [
  { etiqueta: 'Inicio', ruta: '/', icono: LayoutGrid },
  { etiqueta: 'Productos', ruta: '/productos', icono: Hexagon, permiso: 'productos.ver' },
  { etiqueta: 'Inventario', ruta: '/inventario', icono: ClipboardList, permiso: 'inventario.ver' },
  { etiqueta: 'Movimientos', ruta: '/movimientos', icono: ArrowLeftRight, permiso: 'kardex.ver' },
  { etiqueta: 'Caja', ruta: '/caja', icono: Wallet, permiso: 'caja.usar' },
  { etiqueta: 'Ventas', ruta: '/ventas', icono: ShoppingBag, permiso: 'ventas.ver' },
  { etiqueta: 'Compras', ruta: '/compras', icono: SquarePlus, permiso: 'compras.ver' },
  { etiqueta: 'Proveedores', ruta: '/proveedores', icono: Users, permiso: 'proveedores.ver' },
  { etiqueta: 'Clientes', ruta: '/clientes', icono: User, permiso: 'clientes.ver' },
  { etiqueta: 'Reportes', ruta: '/reportes', icono: ChartNoAxesColumn, permiso: 'reportes.ver' },
  { etiqueta: 'Usuarios', ruta: '/usuarios', icono: UserRound, permiso: 'usuarios.ver' },
  { etiqueta: 'Configuración', ruta: '/configuracion', icono: Settings, permiso: 'configuracion.ver' },
]
