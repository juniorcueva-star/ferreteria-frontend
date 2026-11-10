import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  ClipboardList,
  FileText,
  Boxes,
  Hexagon,
  LayoutGrid,
  PackagePlus,
  PackageSearch,
  Settings,
  ShoppingBag,
  ShieldCheck,
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
  { etiqueta: 'Disponibilidad', ruta: '/disponibilidad', icono: Boxes, permiso: 'disponibilidad.ver' },
  { etiqueta: 'Movimientos', ruta: '/movimientos', icono: ArrowLeftRight, permiso: 'kardex.ver' },
  { etiqueta: 'Reposición', ruta: '/reposicion', icono: PackagePlus, permiso: 'reposicion.ver' },
  { etiqueta: 'Caja', ruta: '/caja', icono: Wallet, permiso: 'caja.usar' },
  { etiqueta: 'Ventas', ruta: '/ventas', icono: ShoppingBag, permiso: 'ventas.ver' },
  { etiqueta: 'Cotizaciones', ruta: '/cotizaciones', icono: FileText, permiso: 'cotizaciones.ver' },
  { etiqueta: 'Encargos', ruta: '/encargos', icono: PackageSearch, permiso: 'encargos.ver' },
  { etiqueta: 'Compras', ruta: '/compras', icono: SquarePlus, permiso: 'compras.ver' },
  { etiqueta: 'Proveedores', ruta: '/proveedores', icono: Users, permiso: 'proveedores.ver' },
  { etiqueta: 'Clientes', ruta: '/clientes', icono: User, permiso: 'clientes.ver' },
  { etiqueta: 'Reportes', ruta: '/reportes', icono: ChartNoAxesColumn, permiso: 'reportes.ver' },
  { etiqueta: 'Usuarios', ruta: '/usuarios', icono: UserRound, permiso: 'usuarios.ver' },
  { etiqueta: 'Auditoría', ruta: '/auditoria', icono: ShieldCheck, permiso: 'auditoria.ver' },
  { etiqueta: 'Configuración', ruta: '/configuracion', icono: Settings, permiso: 'configuracion.ver' },
]
