import { Store, Warehouse } from 'lucide-react'
import { useUbicacion } from '@/contexto/ubicacion'

/** Selector de ubicacion de la barra superior. El ADMIN elige; los demas ven su tienda o almacen fijo. */
export function SelectorUbicacion() {
  const { visibles, seleccionadaId, seleccionada, puedeCambiar, seleccionar } = useUbicacion()
  const Icono = seleccionada?.tipo === 'ALMACEN' ? Warehouse : Store
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-borde bg-crema/60 pr-1 pl-3 focus-within:border-marca">
      <Icono className="size-4 shrink-0 text-marca" aria-hidden />
      <span className="sr-only">Ubicación de trabajo</span>
      <select
        value={seleccionadaId ?? ''}
        onChange={(e) => seleccionar(e.target.value === '' ? null : Number(e.target.value))}
        disabled={!puedeCambiar}
        className="h-8 max-w-56 cursor-pointer rounded-md border border-borde-fuerte/70 bg-white px-2 text-sm font-medium text-tinta focus:outline-none disabled:cursor-default disabled:appearance-none disabled:border-transparent disabled:bg-transparent"
        data-testid="selector-ubicacion"
      >
        {puedeCambiar && <option value="">Todas las ubicaciones</option>}
        {visibles.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}
