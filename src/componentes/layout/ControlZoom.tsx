import { ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import { acercar, alejar, aplicarZoom, leerZoom, ZOOM_MAXIMO, ZOOM_MINIMO, ZOOM_NORMAL } from '@/logica/zoom'

const claseBoton =
  'flex size-9 items-center justify-center rounded-lg text-tinta hover:bg-marca hover:text-sobre-marca disabled:opacity-40 disabled:hover:bg-transparent'

/** Lupa con menos y mas para agrandar o achicar la letra de todo el sistema. El numero vuelve al 100 %. */
export function ControlZoom() {
  const [nivel, setNivel] = useState(leerZoom)
  const cambiar = (nuevo: number) => {
    aplicarZoom(nuevo)
    setNivel(nuevo)
  }

  return (
    <div className="flex items-center rounded-xl border border-borde bg-white" role="group" aria-label="Tamaño de la letra">
      <button type="button" className={claseBoton} onClick={() => cambiar(alejar(nivel))} disabled={nivel === ZOOM_MINIMO} aria-label="Achicar la letra" title="Achicar la letra">
        <ZoomOut className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        className="min-w-12 px-1 font-mono text-xs font-semibold text-tinta hover:underline"
        onClick={() => cambiar(ZOOM_NORMAL)}
        aria-label={`Letra al ${nivel} %. Volver al tamaño normal`}
        title="Volver al tamaño normal"
      >
        {nivel} %
      </button>
      <button
        type="button"
        className={claseBoton}
        onClick={() => cambiar(acercar(nivel))}
        disabled={nivel === ZOOM_MAXIMO}
        aria-label="Agrandar la letra"
        title="Agrandar la letra"
      >
        <ZoomIn className="size-5" aria-hidden />
      </button>
    </div>
  )
}
