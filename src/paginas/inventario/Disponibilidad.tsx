import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { inventarioApi } from '@/api/inventario'
import { Buscador } from '@/componentes/ui/Buscador'
import { Selector } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useCategorias } from '@/hooks/useCatalogos'
import { useRetraso } from '@/hooks/useRetraso'
import { estadoStock } from '@/logica/disponibilidad'
import { cantidad, nombreUnidad } from '@/logica/formato'

/**
 * Cuanto hay de cada producto en cada tienda y en el almacen (solo lectura). Sirve para atender pedidos grandes:
 * el vendedor ve la otra tienda y el almacen, pero solo vende de su tienda.
 */
export default function Disponibilidad() {
  const [texto, setTexto] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [pagina, setPagina] = useState(0)
  const busqueda = useRetraso(texto.trim())
  const categorias = useCategorias(false)
  const filtro = {
    texto: busqueda,
    categoriaId: categoriaId ? Number(categoriaId) : undefined,
    page: pagina,
    size: 20,
    sort: 'nombre,asc',
  }
  const resumen = useQuery({
    queryKey: ['inventario', 'resumen', filtro],
    queryFn: () => inventarioApi.resumen(filtro),
    placeholderData: keepPreviousData,
  })
  const ubicaciones = resumen.data?.contenido[0]?.ubicaciones ?? []
  const columnas = 3 + Math.max(ubicaciones.length, 1)

  return (
    <div>
      <EncabezadoPagina
        titulo="Disponibilidad"
        subtitulo="Stock de cada producto en las tiendas y el almacén. Solo consulta: se vende desde la tienda de tu caja."
      />
      <Tarjeta className="mb-5 grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_13rem]">
        <Buscador
          valor={texto}
          onCambiar={(v) => {
            setTexto(v)
            setPagina(0)
          }}
          placeholder="Buscar por palabras: per hex zin…"
          aria-label="Buscar en disponibilidad"
        />
        <Selector
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value)
            setPagina(0)
          }}
          aria-label="Filtrar por categoría"
          className="h-11 rounded-xl"
        >
          <option value="">Todas las categorías</option>
          {categorias.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Producto</Th>
              {ubicaciones.map((u) => (
                <Th key={u.ubicacionId} alinear="derecha">
                  {u.ubicacionNombre}
                </Th>
              ))}
              <Th alinear="derecha">Total</Th>
              <Th>Unidad</Th>
            </tr>
          </Thead>
          <Tbody>
            {resumen.isPending && (
              <FilaCompleta columnas={columnas}>
                <Cargando texto="Cargando disponibilidad…" />
              </FilaCompleta>
            )}
            {resumen.isError && (
              <FilaCompleta columnas={columnas}>
                <MensajeError error={resumen.error} />
              </FilaCompleta>
            )}
            {resumen.data?.contenido.length === 0 && (
              <FilaCompleta columnas={columnas}>
                <EstadoVacio titulo="Sin resultados" descripcion="Ningún producto coincide con la búsqueda." />
              </FilaCompleta>
            )}
            {resumen.data?.contenido.map((r) => (
              <Tr key={r.productoId} data-testid={`disponibilidad-${r.productoCodigo}`}>
                <Td className="min-w-56">
                  <p className="font-semibold text-tinta">{r.productoNombre}</p>
                  <p className="text-xs text-tinta-tenue">
                    <span className="font-mono">{r.productoCodigo}</span> · {r.categoriaNombre}
                  </p>
                </Td>
                {r.ubicaciones.map((u) => {
                  const estado = estadoStock(u)
                  return (
                    <Td
                      key={u.ubicacionId}
                      alinear="derecha"
                      className={cn('font-mono font-semibold', estado === 'normal' ? 'text-tinta' : 'bg-peligro/5 text-peligro')}
                      title={estado === 'bajo' ? `Stock mínimo: ${cantidad(u.stockMinimo)}` : estado === 'cero' ? 'Sin stock' : undefined}
                      data-estado={estado}
                    >
                      {cantidad(u.cantidad)}
                    </Td>
                  )
                })}
                <Td alinear="derecha" className="font-mono font-bold text-tinta">
                  {cantidad(r.total)}
                </Td>
                <Td className="text-tinta-suave">{nombreUnidad(r.unidadBase)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={resumen.data} onCambiar={setPagina} />
      </Tarjeta>
      <p className="mt-3 text-xs text-tinta-tenue">En rojo: sin stock o en el stock mínimo. Cantidades en unidad base.</p>
    </div>
  )
}
