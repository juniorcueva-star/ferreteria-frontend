import { Check, PackageSearch } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CompletoResponse, ProductoResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { cn } from '@/componentes/ui/cn'
import { FotoProducto } from '@/componentes/ui/FotoProducto'
import { Modal } from '@/componentes/ui/Modal'
import { cantidadConUnidad, soles } from '@/logica/formato'
import { presentacionesActivas } from '@/logica/presentaciones'

interface Props {
  productos: ProductoResponse[]
  /** Tienda de la caja abierta; sin caja no se muestra el stock */
  tiendaId?: number
  stockDe: (productoId: number) => number
  onAgregar: (producto: ProductoResponse, presentacionId: number) => void
  onAgregarCompleto: (producto: ProductoResponse, completo: CompletoResponse) => void
  onEncargo: (producto: ProductoResponse) => void
}

const completosVendibles = (p: ProductoResponse) => p.completos.filter((c) => c.activo && c.componentes.every((x) => x.disponible))

/**
 * Productos del punto de venta en cuadritos con foto, pensado para tablet: con un toque se agrega la unica
 * presentacion; si el producto tiene varias (o completos) se elige en una ventanita.
 */
export function MosaicoProductos({ productos, tiendaId, stockDe, onAgregar, onAgregarCompleto, onEncargo }: Props) {
  const [eligiendo, setEligiendo] = useState<ProductoResponse | null>(null)
  const [agregado, setAgregado] = useState<number | null>(null)

  useEffect(() => {
    if (agregado === null) return
    const t = setTimeout(() => setAgregado(null), 900)
    return () => clearTimeout(t)
  }, [agregado])

  const tocar = (producto: ProductoResponse) => {
    const presentaciones = presentacionesActivas(producto)
    const unica = presentaciones[0]
    if (unica && presentaciones.length === 1 && completosVendibles(producto).length === 0) {
      onAgregar(producto, unica.id)
      setAgregado(producto.id)
    } else {
      setEligiendo(producto)
    }
  }

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 p-4" data-testid="pos-mosaico">
        {productos.map((producto) => {
          const presentaciones = presentacionesActivas(producto)
          const disponible = stockDe(producto.id)
          const sinStock = tiendaId !== undefined && disponible <= 0
          const varias = presentaciones.length + completosVendibles(producto).length > 1
          return (
            <li key={producto.id}>
              <button
                type="button"
                onClick={() => tocar(producto)}
                disabled={presentaciones.length === 0}
                aria-label={`Elegir ${producto.nombre}`}
                className={cn(
                  'relative flex h-full w-full flex-col overflow-hidden rounded-xl border-2 bg-white text-left transition',
                  'hover:border-marca hover:shadow-md focus-visible:border-marca disabled:opacity-50',
                  agregado === producto.id ? 'border-exito' : 'border-borde',
                )}
              >
                <FotoProducto url={producto.imagenUrl} nombre={producto.nombre} className="aspect-[4/3] size-auto w-full rounded-none" />
                {agregado === producto.id && (
                  <span className="absolute inset-x-0 top-0 flex aspect-[4/3] items-center justify-center bg-exito/70 text-white">
                    <Check className="size-10" aria-hidden />
                    <span className="sr-only">Agregado</span>
                  </span>
                )}
                {sinStock && <span className="absolute top-2 left-2 rounded-md bg-peligro px-1.5 py-0.5 text-[11px] font-bold text-white">Sin stock</span>}
                <span className="flex flex-1 flex-col gap-0.5 p-2.5">
                  <span className="line-clamp-2 text-sm leading-tight font-semibold text-tinta">{producto.nombre}</span>
                  {presentaciones.length > 0 && (
                    <span className="font-mono text-sm font-bold whitespace-nowrap text-marca-texto">
                      {varias && <span className="mr-1 font-sans text-[11px] font-normal text-tinta-tenue">desde</span>}
                      {soles(Math.min(...presentaciones.map((p) => p.precioVenta)))}
                    </span>
                  )}
                  {tiendaId !== undefined && !sinStock && (
                    <span className="font-mono text-[11px] text-tinta-tenue">Stock: {cantidadConUnidad(disponible, producto.unidadBase)}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {eligiendo && (
        <Modal abierto onCerrar={() => setEligiendo(null)} titulo={eligiendo.nombre} descripcion="Toque lo que lleva el cliente">
          <div className="grid gap-2 sm:grid-cols-2">
            {presentacionesActivas(eligiendo).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onAgregar(eligiendo, p.id)
                  setAgregado(eligiendo.id)
                  setEligiendo(null)
                }}
                className="flex flex-col rounded-xl border-2 border-borde px-4 py-3 text-left transition hover:border-marca hover:bg-marca-claro"
                aria-label={`Agregar ${eligiendo.nombre} ${p.nombre}`}
              >
                <span className="font-semibold text-tinta">{p.nombre}</span>
                <span className="font-mono text-lg font-bold text-marca-texto">{soles(p.precioVenta)}</span>
              </button>
            ))}
            {completosVendibles(eligiendo).map((c) => (
              <button
                key={`c${c.id}`}
                type="button"
                onClick={() => {
                  onAgregarCompleto(eligiendo, c)
                  setAgregado(eligiendo.id)
                  setEligiendo(null)
                }}
                className="flex flex-col rounded-xl border-2 border-marca bg-marca-claro px-4 py-3 text-left transition hover:bg-marca"
                aria-label={`Agregar ${eligiendo.nombre} ${c.nombre}`}
              >
                <span className="font-semibold text-tinta">{c.nombre}</span>
                <span className="text-xs text-tinta-suave">Incluye: {c.composicion}</span>
                <span className="font-mono text-lg font-bold text-tinta">{soles(c.precioVenta)}</span>
              </button>
            ))}
          </div>
          {tiendaId !== undefined && stockDe(eligiendo.id) <= 0 && (
            <Boton
              variante="secundario"
              className="mt-4"
              icono={<PackageSearch className="size-4" />}
              onClick={() => {
                onEncargo(eligiendo)
                setEligiendo(null)
              }}
            >
              Hacer encargo
            </Boton>
          )}
        </Modal>
      )}
    </>
  )
}
