import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginaResponse } from '@/api/tipos'
import { paginasVisibles } from '@/logica/paginacion'
import { cn } from './cn'

/** Paginacion del servidor: "Mostrando 1–20 de 45" y botones de pagina. */
export function Paginacion<T>({
  pagina,
  onCambiar,
}: {
  pagina: PaginaResponse<T> | undefined
  onCambiar: (numero: number) => void
}) {
  if (!pagina || pagina.totalElementos === 0) {
    return null
  }
  const desde = pagina.pagina * pagina.tamano + 1
  const hasta = desde + pagina.contenido.length - 1
  const actual = pagina.pagina
  const total = pagina.totalPaginas
  const numeros = paginasVisibles(actual, total)

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-borde px-5 py-3 text-xs text-tinta-suave"
      aria-label="Paginación"
    >
      <span>
        Mostrando <strong className="font-mono text-tinta">{desde}</strong>–
        <strong className="font-mono text-tinta">{hasta}</strong> de{' '}
        <strong className="font-mono text-tinta">{pagina.totalElementos}</strong>
      </span>
      {total > 1 && (
        <div className="flex items-center gap-1">
          <BotonPagina onClick={() => onCambiar(actual - 1)} disabled={actual === 0} etiqueta="Página anterior">
            <ChevronLeft className="size-4" />
          </BotonPagina>
          {numeros.map((n, i) =>
            n === null ? (
              <span key={`hueco-${i}`} className="px-1">
                …
              </span>
            ) : (
              <BotonPagina key={n} onClick={() => onCambiar(n)} activo={n === actual} etiqueta={`Página ${n + 1}`}>
                {n + 1}
              </BotonPagina>
            ),
          )}
          <BotonPagina onClick={() => onCambiar(actual + 1)} disabled={actual >= total - 1} etiqueta="Página siguiente">
            <ChevronRight className="size-4" />
          </BotonPagina>
        </div>
      )}
    </nav>
  )
}

function BotonPagina({
  children,
  onClick,
  disabled,
  activo,
  etiqueta,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  activo?: boolean
  etiqueta: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      aria-current={activo ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 font-mono text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        activo ? 'bg-marca text-white' : 'text-tinta hover:bg-beige',
      )}
    >
      {children}
    </button>
  )
}
