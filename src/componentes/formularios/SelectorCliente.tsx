import { useQuery } from '@tanstack/react-query'
import { Search, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ClienteResponse } from '@/api/tipos'
import { clientesApi } from '@/api/ventas'
import { claseControl } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { useRetraso } from '@/hooks/useRetraso'
import { NOMBRE_DOCUMENTO } from '@/logica/formato'
import { ModalCliente } from './FormularioCliente'

/** Buscar un cliente por nombre o documento, o registrar uno nuevo sin salir de la venta. */
export function SelectorCliente({
  valor,
  onElegir,
  error,
}: {
  valor: ClienteResponse | null
  onElegir: (cliente: ClienteResponse | null) => void
  error?: string
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [nuevo, setNuevo] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const busqueda = useRetraso(texto.trim(), 250)
  const clientes = useQuery({
    queryKey: ['clientes', 'selector', busqueda],
    queryFn: () => clientesApi.listar({ texto: busqueda, activo: true, size: 8 }),
    enabled: abierto && !valor,
  })

  useEffect(() => {
    const alHacerClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [])

  return (
    <div className="relative flex flex-col gap-1.5" ref={contenedor}>
      <span className="text-xs font-semibold text-tinta-suave">Cliente</span>
      {valor ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-borde bg-crema/60 px-3">
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-medium">{valor.nombre}</span>{' '}
            {valor.numeroDocumento && (
              <span className="font-mono text-xs text-tinta-suave">
                {NOMBRE_DOCUMENTO[valor.tipoDocumento]} {valor.numeroDocumento}
              </span>
            )}
          </span>
          <button type="button" onClick={() => onElegir(null)} className="rounded p-1 text-tinta-tenue hover:text-tinta" aria-label="Quitar cliente">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-tenue" aria-hidden />
            <input
              type="text"
              role="combobox"
              aria-expanded={abierto}
              aria-label="Buscar cliente"
              aria-invalid={error ? true : undefined}
              autoComplete="off"
              placeholder="Buscar por nombre o documento…"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setAbierto(true)
              }}
              onFocus={() => setAbierto(true)}
              className={cn(claseControl, 'h-10 pl-9')}
            />
          </div>
          <button
            type="button"
            onClick={() => setNuevo(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-borde bg-white px-3 text-sm font-semibold text-tinta hover:bg-crema"
          >
            <UserPlus className="size-4" aria-hidden /> Nuevo
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs text-peligro" role="alert">
          {error}
        </p>
      )}
      {abierto && !valor && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-borde bg-white py-1 shadow-xl">
          {clientes.isFetching && !clientes.data && <li className="px-3 py-2 text-sm text-tinta-suave">Buscando…</li>}
          {clientes.data?.contenido.length === 0 && <li className="px-3 py-2 text-sm text-tinta-suave">Sin resultados. Use “Nuevo” para registrarlo.</li>}
          {clientes.data?.contenido.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onElegir(c)
                  setAbierto(false)
                  setTexto('')
                }}
                className="block w-full px-3 py-2 text-left hover:bg-crema"
              >
                <span className="block text-sm font-medium">{c.nombre}</span>
                <span className="block font-mono text-xs text-tinta-suave">
                  {c.numeroDocumento ? `${NOMBRE_DOCUMENTO[c.tipoDocumento]} ${c.numeroDocumento}` : 'Sin documento'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {nuevo && <ModalCliente cliente={null} onCerrar={() => setNuevo(false)} onGuardado={(c) => onElegir(c)} />}
    </div>
  )
}
