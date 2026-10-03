import { CircleHelp, Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { cn } from '@/componentes/ui/cn'
import { Modal } from '@/componentes/ui/Modal'
import { BarraLateral } from './BarraLateral'
import { BusquedaGlobal } from './BusquedaGlobal'
import { CampanaAlertas } from './CampanaAlertas'
import { IndicadorConexion } from './IndicadorConexion'
import { SelectorUbicacion } from './SelectorUbicacion'

/**
 * Estructura de todas las pantallas: barra lateral fija en laptop (en tablet se abre con el boton de menu),
 * barra superior y el contenido de la pagina.
 */
export function Layout() {
  const [lateralAbierta, setLateralAbierta] = useState(true)
  const [lateralMovil, setLateralMovil] = useState(false)
  const [ayuda, setAyuda] = useState(false)
  const { pathname } = useLocation()

  const alternarMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setLateralAbierta((v) => !v)
    } else {
      setLateralMovil((v) => !v)
    }
  }

  return (
    <div className="flex h-full">
      {/* Laptop: barra lateral fija (se puede ocultar) */}
      <div className={cn('hidden shrink-0 lg:block', !lateralAbierta && 'lg:hidden')}>
        <div className="sticky top-0 h-screen">
          <BarraLateral />
        </div>
      </div>
      {/* Tablet: barra lateral como panel deslizable */}
      {lateralMovil && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLateralMovil(false)} aria-hidden />
          <div className="relative h-full w-64">
            <BarraLateral onNavegar={() => setLateralMovil(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borde bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={alternarMenu}
            className="rounded-lg p-2 text-tinta-suave hover:bg-beige hover:text-tinta"
            aria-label="Mostrar u ocultar el menú"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <SelectorUbicacion />
          <div className="hidden flex-1 md:block">
            <BusquedaGlobal />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IndicadorConexion />
            <CampanaAlertas />
          </div>
        </header>
        <main key={pathname} className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        onClick={() => setAyuda(true)}
        className="fixed right-5 bottom-5 z-20 flex size-11 items-center justify-center rounded-full bg-lateral text-white shadow-lg hover:bg-black"
        aria-label="Ayuda"
      >
        <CircleHelp className="size-5" aria-hidden />
      </button>
      <Modal abierto={ayuda} onCerrar={() => setAyuda(false)} titulo="Ayuda rápida">
        <ul className="list-disc space-y-2 pl-5 text-sm text-tinta">
          <li>El selector de arriba indica la ubicación con la que trabajas. Solo el administrador puede cambiarla.</li>
          <li>“Sincronizado” indica que hay conexión con el servidor. Si dice “Sin conexión”, revisa que el backend esté encendido.</li>
          <li>La campana avisa de los productos que llegaron a su stock mínimo.</li>
          <li>Para vender, primero abre tu caja en el menú <strong>Caja</strong>.</li>
          <li>El stock siempre se muestra en la unidad base del producto (unidades, kilos o metros).</li>
        </ul>
      </Modal>
    </div>
  )
}
