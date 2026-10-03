import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

const ANCHOS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

/** Ventana modal accesible: se cierra con Escape o con el fondo, y enfoca el primer campo. */
export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'md',
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: ReactNode
  children: ReactNode
  pie?: ReactNode
  ancho?: keyof typeof ANCHOS
}) {
  const idTitulo = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    const anterior = document.activeElement as HTMLElement | null
    const primero = panel.current?.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    )
    ;(primero ?? panel.current)?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
      anterior?.focus?.()
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="fixed inset-0" onClick={onCerrar} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={cn('relative my-8 w-full rounded-2xl bg-white shadow-xl focus:outline-none', ANCHOS[ancho])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borde px-6 py-4">
          <div>
            <h2 id={idTitulo} className="text-lg font-bold text-tinta">
              {titulo}
            </h2>
            {descripcion && <div className="mt-0.5 text-sm text-tinta-suave">{descripcion}</div>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md p-1 text-tinta-suave hover:bg-beige hover:text-tinta"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-borde px-6 py-4">{pie}</div>}
      </div>
    </div>,
    document.body,
  )
}
