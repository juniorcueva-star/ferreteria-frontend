import { cn } from './cn'

export interface Pestana<T extends string> {
  id: T
  etiqueta: string
}

/** Pestanas para cambiar de seccion dentro de una pagina. */
export function Pestanas<T extends string>({
  pestanas,
  activa,
  onCambiar,
}: {
  pestanas: Pestana<T>[]
  activa: T
  onCambiar: (id: T) => void
}) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-borde">
      {pestanas.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={p.id === activa}
          onClick={() => onCambiar(p.id)}
          className={cn(
            '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
            p.id === activa
              ? 'border-marca text-marca'
              : 'border-transparent text-tinta-suave hover:border-borde-fuerte hover:text-tinta',
          )}
        >
          {p.etiqueta}
        </button>
      ))}
    </div>
  )
}
