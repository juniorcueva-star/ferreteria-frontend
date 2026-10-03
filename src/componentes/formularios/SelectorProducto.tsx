import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { productosApi } from '@/api/catalogo'
import type { ProductoResponse } from '@/api/tipos'
import { claseControl } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { FotoProducto } from '@/componentes/ui/FotoProducto'
import { useRetraso } from '@/hooks/useRetraso'
import { nombreUnidad } from '@/logica/formato'

/**
 * Buscador de productos activos por codigo o nombre. Al elegir uno devuelve el producto completo
 * (con sus presentaciones). Se usa en ajustes, traslados, compras y el kardex.
 */
export function SelectorProducto({
  valor,
  onElegir,
  etiqueta = 'Producto',
  placeholder = 'Buscar por código o nombre…',
  error,
  excluir = [],
  className,
}: {
  valor: ProductoResponse | null
  onElegir: (producto: ProductoResponse | null) => void
  etiqueta?: string
  placeholder?: string
  error?: string
  excluir?: number[]
  className?: string
}) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const busqueda = useRetraso(texto.trim(), 250)

  const consulta = useQuery({
    queryKey: ['productos', 'selector', busqueda],
    queryFn: () => productosApi.listar({ texto: busqueda, activo: true, size: 8 }),
    enabled: abierto && valor === null,
  })

  useEffect(() => {
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [])

  const resultados = (consulta.data?.contenido ?? []).filter((p) => !excluir.includes(p.id))

  return (
    <div className={cn('relative flex flex-col gap-1.5', className)} ref={contenedor}>
      {etiqueta && (
        <label htmlFor={id} className="text-xs font-semibold text-tinta-suave">
          {etiqueta}
        </label>
      )}
      {valor ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-borde bg-crema/60 px-2">
          <FotoProducto url={valor.imagenUrl} nombre={valor.nombre} className="size-7" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium text-tinta">{valor.nombre}</span>{' '}
            <span className="font-mono text-xs text-tinta-suave">{valor.codigo}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onElegir(null)
              setTexto('')
            }}
            className="rounded p-1 text-tinta-tenue hover:text-tinta"
            aria-label="Quitar producto"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-tenue" aria-hidden />
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={abierto}
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            value={texto}
            placeholder={placeholder}
            onChange={(e) => {
              setTexto(e.target.value)
              setAbierto(true)
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAbierto(false)
              if (e.key === 'Enter') {
                e.preventDefault()
                const primero = resultados[0]
                if (primero) {
                  onElegir(primero)
                  setAbierto(false)
                }
              }
            }}
            className={cn(claseControl, 'h-10 pl-9')}
          />
        </div>
      )}
      {error && (
        <p className="text-xs text-peligro" role="alert">
          {error}
        </p>
      )}
      {abierto && !valor && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-borde bg-white py-1 shadow-xl">
          {consulta.isFetching && resultados.length === 0 && <li className="px-3 py-2 text-sm text-tinta-suave">Buscando…</li>}
          {!consulta.isFetching && resultados.length === 0 && (
            <li className="px-3 py-2 text-sm text-tinta-suave">No se encontraron productos activos.</li>
          )}
          {resultados.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onElegir(p)
                  setAbierto(false)
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-crema"
              >
                <FotoProducto url={p.imagenUrl} nombre={p.nombre} className="size-8" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-tinta">{p.nombre}</span>
                  <span className="block font-mono text-xs text-tinta-suave">
                    {p.codigo} · {nombreUnidad(p.unidadBase)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
