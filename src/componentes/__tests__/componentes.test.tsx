import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errores'
import type { Rol, UsuarioResponse } from '@/api/tipos'
import { ContextoAuth, type ValorAuth } from '@/auth/contexto'
import { BarraLateral } from '@/componentes/layout/BarraLateral'
import { MensajeError } from '@/componentes/ui/Estados'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { ProveedorNotificaciones } from '@/componentes/ui/ProveedorNotificaciones'

function conProveedores(rol: Rol, hijos: ReactNode) {
  const usuario: UsuarioResponse = {
    id: 1,
    nombres: 'Admin Principal',
    username: 'admin',
    rol,
    ubicacionId: rol === 'ADMIN' ? null : 2,
    ubicacionNombre: rol === 'ADMIN' ? null : 'Tienda Centro',
    activo: true,
  }
  const auth: ValorAuth = {
    usuario,
    sesionExpirada: false,
    iniciarSesion: vi.fn(),
    cerrarSesion: vi.fn(),
    refrescarUsuario: vi.fn(),
  }
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ProveedorNotificaciones>
        <ContextoAuth.Provider value={auth}>
          <MemoryRouter initialEntries={['/productos']}>{hijos}</MemoryRouter>
        </ContextoAuth.Provider>
      </ProveedorNotificaciones>
    </QueryClientProvider>
  )
}

describe('MensajeError', () => {
  it('muestra el mensaje, el detalle por campo y el código del backend', () => {
    render(<MensajeError error={new ApiError('VALIDACION', 'Los datos enviados no son validos', ['cantidad: debe ser mayor que 0'], 400)} />)
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Los datos enviados no son validos')
    expect(alerta).toHaveTextContent('cantidad: debe ser mayor que 0')
    expect(alerta).toHaveTextContent('Código: VALIDACION')
  })
})

describe('BarraLateral', () => {
  it('muestra al ADMIN todo el menú, con el ítem activo, sus iniciales y su rol', () => {
    render(conProveedores('ADMIN', <BarraLateral />))
    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    expect(within(menu).getAllByRole('link')).toHaveLength(12)
    expect(within(menu).getByRole('link', { name: 'Productos' })).toHaveClass('text-marca')
    expect(screen.getByText('AP')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
  })

  it('al VENDEDOR no le muestra compras, proveedores ni administración', () => {
    render(conProveedores('VENDEDOR', <BarraLateral />))
    const menu = screen.getByRole('navigation', { name: 'Menú principal' })
    expect(within(menu).queryByRole('link', { name: 'Compras' })).toBeNull()
    expect(within(menu).queryByRole('link', { name: 'Usuarios' })).toBeNull()
    expect(within(menu).getByRole('link', { name: 'Caja' })).toBeInTheDocument()
    expect(screen.getByText('Vendedor · Tienda Centro')).toBeInTheDocument()
  })

  it('el menú del usuario permite cerrar sesión', async () => {
    const usuario = userEvent.setup()
    render(conProveedores('ALMACENERO', <BarraLateral />))
    await usuario.click(screen.getByRole('button', { name: 'Opciones de usuario' }))
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })
})

describe('Paginacion', () => {
  it('indica el rango mostrado y cambia de página', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()
    render(
      <Paginacion
        pagina={{ contenido: Array.from({ length: 20 }, (_, i) => i), pagina: 1, tamano: 20, totalElementos: 45, totalPaginas: 3 }}
        onCambiar={alCambiar}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent('Mostrando 21–40 de 45')
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await usuario.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(alCambiar).toHaveBeenCalledWith(2)
  })

  it('no se muestra si no hay resultados', () => {
    const { container } = render(<Paginacion pagina={{ contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 }} onCambiar={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
