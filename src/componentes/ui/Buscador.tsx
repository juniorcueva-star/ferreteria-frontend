import { Search, X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { claseControl } from './Campo'
import { cn } from './cn'

/** Campo de busqueda con lupa y boton para limpiar. */
export function Buscador({
  valor,
  onCambiar,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { valor: string; onCambiar: (valor: string) => void }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-tenue" aria-hidden />
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className={cn(claseControl, 'h-11 rounded-xl pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')}
        {...props}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onCambiar('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-tinta-tenue hover:text-tinta"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
