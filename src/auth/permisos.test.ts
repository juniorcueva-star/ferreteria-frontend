import { describe, expect, it } from 'vitest'
import type { UsuarioResponse } from '@/api/tipos'
import { MENU } from '@/componentes/layout/menu'
import { puedeAnularTraslado, puedeOperarEn, puedeRecibirTraslado, tienePermiso } from './permisos'

const usuario = (rol: UsuarioResponse['rol'], ubicacionId: number | null): UsuarioResponse => ({
  id: 1,
  nombres: 'Prueba',
  username: 'prueba',
  rol,
  ubicacionId,
  ubicacionNombre: null,
  activo: true,
})

const menuDe = (rol: UsuarioResponse['rol']) =>
  MENU.filter((i) => !i.permiso || tienePermiso(rol, i.permiso)).map((i) => i.etiqueta)

describe('permisos por rol (igual que SecurityConfig del backend)', () => {
  it('el ADMIN ve todo el menu', () => {
    expect(menuDe('ADMIN')).toEqual(MENU.map((i) => i.etiqueta))
  })

  it('el VENDEDOR ve caja, ventas y clientes, pero no compras, proveedores ni administracion', () => {
    expect(menuDe('VENDEDOR')).toEqual([
      'Inicio',
      'Productos',
      'Inventario',
      'Movimientos',
      'Caja',
      'Ventas',
      'Clientes',
      'Reportes',
    ])
  })

  it('el ALMACENERO ve compras y proveedores, pero no caja, ventas ni clientes', () => {
    expect(menuDe('ALMACENERO')).toEqual([
      'Inicio',
      'Productos',
      'Inventario',
      'Movimientos',
      'Compras',
      'Proveedores',
      'Reportes',
    ])
  })

  it('acciones puntuales', () => {
    expect(tienePermiso('VENDEDOR', 'productos.editar')).toBe(false)
    expect(tienePermiso('ALMACENERO', 'inventario.ajustar')).toBe(true)
    expect(tienePermiso('ALMACENERO', 'inventario.inicial')).toBe(false)
    expect(tienePermiso('ALMACENERO', 'compras.anular')).toBe(false)
    expect(tienePermiso('ADMIN', 'compras.anular')).toBe(true)
    expect(tienePermiso('VENDEDOR', 'reportes.compras')).toBe(false)
    expect(tienePermiso('ALMACENERO', 'reportes.ventas')).toBe(false)
    expect(tienePermiso(null, 'productos.ver')).toBe(false)
  })
})

describe('permisos por tienda', () => {
  it('solo el ADMIN opera en cualquier ubicacion', () => {
    expect(puedeOperarEn(usuario('ADMIN', null), 3)).toBe(true)
    expect(puedeOperarEn(usuario('VENDEDOR', 2), 2)).toBe(true)
    expect(puedeOperarEn(usuario('VENDEDOR', 2), 3)).toBe(false)
  })

  it('recibe el traslado quien trabaja en el destino, si esta en camino', () => {
    const traslado = { estado: 'ENVIADO', origenId: 1, destinoId: 2 }
    expect(puedeRecibirTraslado(usuario('VENDEDOR', 2), traslado)).toBe(true)
    expect(puedeRecibirTraslado(usuario('VENDEDOR', 3), traslado)).toBe(false)
    expect(puedeRecibirTraslado(usuario('VENDEDOR', 2), { ...traslado, estado: 'RECIBIDO' })).toBe(false)
  })

  it('anula el traslado el ADMIN o el almacenero del origen, nunca el vendedor', () => {
    const traslado = { estado: 'ENVIADO', origenId: 1, destinoId: 2 }
    expect(puedeAnularTraslado(usuario('ALMACENERO', 1), traslado)).toBe(true)
    expect(puedeAnularTraslado(usuario('ADMIN', null), traslado)).toBe(true)
    expect(puedeAnularTraslado(usuario('VENDEDOR', 2), traslado)).toBe(false)
  })
})
