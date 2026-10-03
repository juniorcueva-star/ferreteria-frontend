import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { reportesApi } from '@/api/reportes'
import { useUbicacion } from '@/contexto/ubicacion'
import { cantidadConUnidad } from '@/logica/formato'

/** Campana con los productos que llegaron a su stock minimo en la ubicacion elegida. */
export function CampanaAlertas() {
  const { seleccionadaId } = useUbicacion()
  const [abierta, setAbierta] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const consulta = useQuery({
    queryKey: ['reportes', 'stock-bajo', 'campana', seleccionadaId],
    queryFn: () => reportesApi.stockBajo({ ubicacionId: seleccionadaId ?? undefined, size: 8 }),
    refetchInterval: 60_000,
  })
  const total = consulta.data?.totalElementos ?? 0

  useEffect(() => {
    if (!abierta) return
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierta(false)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [abierta])

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="relative rounded-lg p-2 text-tinta-suave hover:bg-beige hover:text-tinta"
        aria-label={total > 0 ? `Alertas de stock bajo: ${total}` : 'Alertas de stock bajo'}
        aria-expanded={abierta}
      >
        <Bell className="size-5" aria-hidden />
        {total > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-peligro ring-2 ring-white" />}
      </button>
      {abierta && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-borde bg-white shadow-xl">
          <div className="border-b border-borde px-4 py-3">
            <p className="text-sm font-bold text-tinta">Stock bajo</p>
            <p className="text-xs text-tinta-suave">
              {total === 0 ? 'Ningún producto llegó a su stock mínimo.' : `${total} producto(s) en o bajo su mínimo`}
            </p>
          </div>
          <ul className="max-h-72 divide-y divide-borde overflow-y-auto">
            {consulta.data?.contenido.map((s) => (
              <li key={`${s.productoId}-${s.ubicacionId}`} className="px-4 py-2.5">
                <p className="text-sm font-medium text-tinta">{s.productoNombre}</p>
                <p className="text-xs text-tinta-suave">
                  {s.ubicacionNombre} ·{' '}
                  <span className="font-mono text-peligro">{cantidadConUnidad(s.cantidad, s.unidadBase)}</span> de mínimo{' '}
                  <span className="font-mono">{cantidadConUnidad(s.stockMinimo, s.unidadBase)}</span>
                </p>
              </li>
            ))}
          </ul>
          <Link
            to="/inventario?soloBajo=1"
            onClick={() => setAbierta(false)}
            className="block border-t border-borde px-4 py-2.5 text-center text-sm font-semibold text-marca hover:bg-crema"
          >
            Ver inventario con stock bajo
          </Link>
        </div>
      )}
    </div>
  )
}
