import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { inventarioApi } from '@/api/inventario'
import { Boton } from '@/componentes/ui/Boton'
import { Entrada, Selector } from '@/componentes/ui/Campo'
import { cantidadConUnidad, nombreUnidad } from '@/logica/formato'
import { baseDeLinea, decimalesDeLinea, lineaVacia, type LineaEditable } from '@/logica/lineas'
import { presentacionesActivas } from '@/logica/presentaciones'
import { SelectorProducto } from './SelectorProducto'

/**
 * Lista editable de productos con presentacion opcional y cantidad. Muestra la equivalencia en unidad
 * base y, si se indica una ubicacion, el stock disponible ahi.
 */
export function EditorLineas({
  lineas,
  onCambiar,
  errores,
  ubicacionStockId,
  maximo = 200,
}: {
  lineas: LineaEditable[]
  onCambiar: (lineas: LineaEditable[]) => void
  errores: Map<number, string>
  ubicacionStockId?: number | null
  maximo?: number
}) {
  const actualizar = (clave: number, cambios: Partial<LineaEditable>) =>
    onCambiar(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)))

  return (
    <div className="flex flex-col gap-3">
      {lineas.map((linea, i) => (
        <FilaLinea
          key={linea.clave}
          numero={i + 1}
          linea={linea}
          error={errores.get(linea.clave)}
          ubicacionStockId={ubicacionStockId}
          onActualizar={(cambios) => actualizar(linea.clave, cambios)}
          onQuitar={lineas.length > 1 ? () => onCambiar(lineas.filter((l) => l.clave !== linea.clave)) : undefined}
        />
      ))}
      <div>
        <Boton
          variante="secundario"
          tamano="sm"
          icono={<Plus className="size-4" />}
          onClick={() => onCambiar([...lineas, lineaVacia()])}
          disabled={lineas.length >= maximo}
        >
          Agregar producto
        </Boton>
      </div>
    </div>
  )
}

function FilaLinea({
  numero,
  linea,
  error,
  ubicacionStockId,
  onActualizar,
  onQuitar,
}: {
  numero: number
  linea: LineaEditable
  error?: string
  ubicacionStockId?: number | null
  onActualizar: (cambios: Partial<LineaEditable>) => void
  onQuitar?: () => void
}) {
  const producto = linea.producto
  const stock = useQuery({
    queryKey: ['inventario', 'stock', 'linea', producto?.id, ubicacionStockId],
    queryFn: () => inventarioApi.stock({ productoId: producto?.id, ubicacionId: ubicacionStockId ?? undefined, size: 5 }),
    enabled: producto !== null && ubicacionStockId != null,
  })
  const disponible = stock.data?.contenido.find((s) => s.ubicacionId === ubicacionStockId)?.cantidad ?? 0
  const base = baseDeLinea(linea)

  return (
    <div className="grid gap-3 rounded-xl border border-borde p-3 md:grid-cols-12" data-testid={`linea-${numero}`}>
      <SelectorProducto
        className="md:col-span-5"
        etiqueta={`Producto ${numero}`}
        valor={producto}
        onElegir={(p) => onActualizar({ producto: p, presentacionId: '' })}
      />
      <div className="flex flex-col gap-1.5 md:col-span-3">
        <span className="text-xs font-semibold text-tinta-suave">Presentación</span>
        <Selector
          aria-label={`Presentación ${numero}`}
          value={linea.presentacionId}
          onChange={(e) => onActualizar({ presentacionId: e.target.value })}
          disabled={!producto}
        >
          <option value="">{producto ? `${nombreUnidad(producto.unidadBase)} (unidad base)` : '—'}</option>
          {producto &&
            presentacionesActivas(producto)
              .filter((p) => p.factor !== 1)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.factor})
                </option>
              ))}
        </Selector>
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-3">
        <span className="text-xs font-semibold text-tinta-suave">Cantidad</span>
        <Entrada
          aria-label={`Cantidad ${numero}`}
          inputMode={decimalesDeLinea(linea) > 0 ? 'decimal' : 'numeric'}
          value={linea.cantidad}
          onChange={(e) => onActualizar({ cantidad: e.target.value })}
          aria-invalid={error ? true : undefined}
          className="font-mono"
        />
      </div>
      <div className="flex items-end justify-end md:col-span-1">
        {onQuitar && (
          <Boton variante="fantasma" tamano="sm" onClick={onQuitar} aria-label={`Quitar producto ${numero}`} icono={<Trash2 className="size-4" />} />
        )}
      </div>
      {(producto || error) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:col-span-12">
          {producto && base > 0 && (
            <span className="font-mono text-tinta-suave">= {cantidadConUnidad(base, producto.unidadBase)}</span>
          )}
          {producto && ubicacionStockId != null && (
            <span className={base > disponible ? 'font-mono text-peligro' : 'font-mono text-tinta-suave'}>
              Disponible: {stock.isPending ? '…' : cantidadConUnidad(disponible, producto.unidadBase)}
            </span>
          )}
          {error && (
            <span className="text-peligro" role="alert">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
