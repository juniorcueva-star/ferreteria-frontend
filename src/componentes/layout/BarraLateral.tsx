import { KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '@/auth/contexto'
import { tienePermiso } from '@/auth/permisos'
import { cn } from '@/componentes/ui/cn'
import { iniciales, NOMBRE_ROL } from '@/logica/formato'
import { CambiarPassword } from '@/paginas/configuracion/CambiarPassword'
import { Logo } from './Logo'
import { MENU } from './menu'

/** Barra lateral oscura con el menu segun el rol y el usuario conectado abajo. */
export function BarraLateral({ onNavegar }: { onNavegar?: () => void }) {
  const { usuario, cerrarSesion } = useAuth()
  const [menuUsuario, setMenuUsuario] = useState(false)
  const [cambiarPassword, setCambiarPassword] = useState(false)
  if (!usuario) return null
  const items = MENU.filter((item) => !item.permiso || tienePermiso(usuario.rol, item.permiso))

  return (
    <aside className="flex h-full w-64 flex-col bg-lateral text-lateral-texto">
      <div className="px-5 pt-6 pb-7">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Menú principal">
        <ul className="flex flex-col gap-1">
          {items.map(({ etiqueta, ruta, icono: Icono }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                end={ruta === '/'}
                onClick={onNavegar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                    isActive ? 'bg-lateral-activo text-marca' : 'hover:bg-lateral-hover hover:text-white',
                  )
                }
              >
                <Icono className="size-5" strokeWidth={1.8} aria-hidden />
                {etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="relative border-t border-white/10 px-3 py-4">
        {menuUsuario && (
          <div className="absolute right-3 bottom-full left-3 mb-2 overflow-hidden rounded-xl border border-white/10 bg-lateral-hover shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenuUsuario(false)
                setCambiarPassword(true)
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-white/5 hover:text-white"
            >
              <KeyRound className="size-4" aria-hidden /> Cambiar contraseña
            </button>
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden /> Cerrar sesión
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuUsuario((v) => !v)}
          aria-expanded={menuUsuario}
          aria-label="Opciones de usuario"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-lateral-hover"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-white">
            {iniciales(usuario.nombres)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-white">{usuario.nombres}</span>
            <span className="block truncate text-xs text-tinta-tenue">
              {NOMBRE_ROL[usuario.rol]}
              {usuario.ubicacionNombre ? ` · ${usuario.ubicacionNombre}` : ''}
            </span>
          </span>
        </button>
      </div>
      <CambiarPassword abierto={cambiarPassword} onCerrar={() => setCambiarPassword(false)} />
    </aside>
  )
}
