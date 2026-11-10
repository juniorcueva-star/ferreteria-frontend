import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Pencil, Plus, Power, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { productosApi } from '@/api/catalogo'
import { inventarioApi } from '@/api/inventario'
import type { AccionLote, ProductoResponse, StockResponse } from '@/api/tipos'
import { usePermiso } from '@/auth/contexto'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { Selector } from '@/componentes/ui/Campo'
import { Chip } from '@/componentes/ui/Chip'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { FotoProducto } from '@/componentes/ui/FotoProducto'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { nombreCorto, useUbicacion } from '@/contexto/ubicacion'
import { useCategorias } from '@/hooks/useCatalogos'
import { useRetraso } from '@/hooks/useRetraso'
import { cantidad, hoyLima, nombreUnidad, soles } from '@/logica/formato'
import { presentacionPrincipal, presentacionesActivas, textoChip } from '@/logica/presentaciones'
import { alternar, alternarPagina, textoAccionLote, todosSeleccionados } from '@/logica/seleccion'
import { ofertaVigente } from '@/logica/precioMayor'

type FiltroEstado = '' | 'activos' | 'inactivos'

interface AccionPendiente {
  accion: AccionLote
  categoriaId: number | null
  categoriaNombre?: string
}

/** Tipo, acabado y medida en una linea (Ej: "Hexagonal · Zincado · 1/4 X 1/2"). */
function atributos(p: ProductoResponse): string {
  return [p.tipo, p.acabado, p.medida].filter((x) => x && x.trim() !== '').join(' · ')
}

/** Listado de productos como la imagen de referencia: foto, presentaciones y stock por ubicacion. */
export default function Productos() {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const puedeEditar = usePermiso('productos.editar')
  const { visibles, todas } = useUbicacion()
  const [parametros] = useSearchParams()
  const [texto, setTexto] = useState(parametros.get('texto') ?? '')
  const [categoriaId, setCategoriaId] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('')
  const [pagina, setPagina] = useState(0)
  const busqueda = useRetraso(texto.trim())
  const categorias = useCategorias(false)
  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set())
  const [categoriaLote, setCategoriaLote] = useState('')
  const [pendiente, setPendiente] = useState<AccionPendiente | null>(null)

  const filtro = {
    texto: busqueda,
    categoriaId: categoriaId ? Number(categoriaId) : undefined,
    activo: estado === '' ? undefined : estado === 'activos',
    page: pagina,
    size: 20,
    sort: 'nombre,asc',
  }
  const productos = useQuery({
    queryKey: ['productos', 'listado', filtro],
    queryFn: () => productosApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  // Stock de los productos de esta pagina en todas las ubicaciones visibles, en una sola consulta
  const ids = useMemo(() => productos.data?.contenido.map((p) => p.id) ?? [], [productos.data])
  const stock = useQuery({
    queryKey: ['inventario', 'stock', 'productos', ids],
    queryFn: () => inventarioApi.stock({ productoIds: ids, size: 100 }),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })
  const stockPorProducto = useMemo(() => {
    const mapa = new Map<string, StockResponse>()
    stock.data?.contenido.forEach((s) => mapa.set(`${s.productoId}-${s.ubicacionId}`, s))
    return mapa
  }, [stock.data])

  const cambiarEstado = useMutation({
    mutationFn: (p: ProductoResponse) =>
      productosApi.actualizar(p.id, {
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        marca: p.marca,
        categoriaId: p.categoriaId,
        activo: !p.activo,
        tipo: p.tipo,
        acabado: p.acabado,
        medida: p.medida,
      }),
    onSuccess: (p) => {
      avisar(p.activo ? `${p.nombre} activado` : `${p.nombre} desactivado`)
      void queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
    onError: (e) => avisar(e.message, 'error'),
  })

  const accionLote = useMutation({
    mutationFn: (a: AccionPendiente) =>
      productosApi.accionLote({ productoIds: [...seleccion], accion: a.accion, categoriaId: a.categoriaId }),
    onSuccess: (r) => {
      avisar(r.productosActualizados === 1 ? '1 producto actualizado' : `${r.productosActualizados} productos actualizados`)
      setSeleccion(new Set())
      setPendiente(null)
      void queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })

  const pedirAccion = (accion: AccionLote) => {
    accionLote.reset()
    if (accion !== 'ASIGNAR_CATEGORIA') {
      setPendiente({ accion, categoriaId: null })
      return
    }
    const categoria = categorias.data?.find((c) => c.id === Number(categoriaLote))
    if (categoria) setPendiente({ accion, categoriaId: categoria.id, categoriaNombre: categoria.nombre })
  }

  const ubicacionesStock = [...visibles].sort((a, b) => Number(a.tipo === 'ALMACEN') - Number(b.tipo === 'ALMACEN'))
  const columnas = 5 + ubicacionesStock.length + (puedeEditar ? 2 : 0)
  const idsPagina = ids
  const total = productos.data?.totalElementos

  return (
    <div>
      <EncabezadoPagina
        titulo="Productos"
        subtitulo={total === undefined ? 'Cargando…' : `${total} ${total === 1 ? 'producto registrado' : 'productos registrados'}`}
        acciones={
          puedeEditar && (
            <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => navegar('/productos/nuevo')}>
              Nuevo Producto
            </Boton>
          )
        }
      />

      <Tarjeta className="mb-5 grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <Buscador
          valor={texto}
          onCambiar={(v) => {
            setTexto(v)
            setPagina(0)
          }}
          placeholder="Buscar por palabras: per hex zin…"
          aria-label="Buscar producto"
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
        <Selector
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as FiltroEstado)
            setPagina(0)
          }}
          aria-label="Filtrar por estado"
          className="h-11 rounded-xl"
        >
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </Selector>
      </Tarjeta>

      {puedeEditar && seleccion.size > 0 && (
        <Tarjeta className="mb-3 flex flex-wrap items-center gap-3 border-marca/40 bg-marca-claro/30 px-5 py-3" data-testid="barra-lote">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-tinta">
            <CheckSquare className="size-4 text-marca-texto" aria-hidden />
            {seleccion.size === 1 ? '1 producto seleccionado' : `${seleccion.size} productos seleccionados`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Selector
              value={categoriaLote}
              onChange={(e) => setCategoriaLote(e.target.value)}
              aria-label="Categoría a asignar"
              className="h-9 w-48 rounded-lg"
            >
              <option value="">Elegir categoría…</option>
              {categorias.data
                ?.filter((c) => c.activo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </Selector>
            <Boton tamano="sm" variante="secundario" icono={<Tags className="size-4" />} disabled={!categoriaLote} onClick={() => pedirAccion('ASIGNAR_CATEGORIA')}>
              Asignar categoría
            </Boton>
            <Boton tamano="sm" variante="secundario" onClick={() => pedirAccion('ACTIVAR')}>
              Activar
            </Boton>
            <Boton tamano="sm" variante="secundario" onClick={() => pedirAccion('DESACTIVAR')}>
              Desactivar
            </Boton>
            <Boton tamano="sm" variante="fantasma" icono={<X className="size-4" />} onClick={() => setSeleccion(new Set())}>
              Quitar selección
            </Boton>
          </div>
        </Tarjeta>
      )}

      <Modal
        abierto={pendiente !== null}
        onCerrar={() => setPendiente(null)}
        titulo="Confirmar acción en lote"
        pie={
          <>
            <Boton variante="secundario" onClick={() => setPendiente(null)}>
              Cancelar
            </Boton>
            <Boton
              variante={pendiente?.accion === 'DESACTIVAR' ? 'peligro' : 'primario'}
              cargando={accionLote.isPending}
              onClick={() => pendiente && accionLote.mutate(pendiente)}
            >
              Confirmar
            </Boton>
          </>
        }
      >
        {pendiente && <p className="text-sm text-tinta">{textoAccionLote(pendiente.accion, seleccion.size, pendiente.categoriaNombre)}</p>}
        {accionLote.isError && <MensajeError error={accionLote.error} className="mt-3" />}
      </Modal>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              {puedeEditar && (
                <Th className="w-10">
                  <input
                    type="checkbox"
                    className="size-4 accent-marca"
                    aria-label="Seleccionar todos los productos de la página"
                    checked={todosSeleccionados(seleccion, idsPagina)}
                    onChange={() => setSeleccion((s) => alternarPagina(s, idsPagina))}
                  />
                </Th>
              )}
              <Th>Producto</Th>
              <Th>Categoría</Th>
              <Th>Presentaciones</Th>
              {ubicacionesStock.map((u) => (
                <Th key={u.id} title={u.nombre}>
                  {nombreCorto(u, todas)}
                </Th>
              ))}
              <Th>Precio</Th>
              <Th>Estado</Th>
              {puedeEditar && <Th alinear="derecha">Acciones</Th>}
            </tr>
          </Thead>
          <Tbody>
            {productos.isPending && (
              <FilaCompleta columnas={columnas}>
                <Cargando texto="Cargando productos…" />
              </FilaCompleta>
            )}
            {productos.isError && (
              <FilaCompleta columnas={columnas}>
                <MensajeError error={productos.error} />
              </FilaCompleta>
            )}
            {productos.data?.contenido.length === 0 && (
              <FilaCompleta columnas={columnas}>
                <EstadoVacio
                  titulo="No hay productos"
                  descripcion={busqueda || categoriaId || estado ? 'Ningún producto coincide con los filtros.' : 'Aún no se registraron productos.'}
                />
              </FilaCompleta>
            )}
            {productos.data?.contenido.map((p) => {
              const principal = presentacionPrincipal(p)
              return (
                <Tr key={p.id} className={cn(!p.activo && 'opacity-60')} data-testid={`producto-${p.codigo}`}>
                  {puedeEditar && (
                    <Td>
                      <input
                        type="checkbox"
                        className="size-4 accent-marca"
                        aria-label={`Seleccionar ${p.nombre}`}
                        checked={seleccion.has(p.id)}
                        onChange={() => setSeleccion((s) => alternar(s, p.id))}
                      />
                    </Td>
                  )}
                  <Td className="min-w-56">
                    <div className="flex items-center gap-3">
                      <FotoProducto url={p.imagenUrl} nombre={p.nombre} />
                      <div className="min-w-0">
                        <p className="font-semibold text-tinta">{p.nombre}</p>
                        {atributos(p) && <p className="text-xs text-tinta-suave">{atributos(p)}</p>}
                        <p className="text-xs text-tinta-tenue">
                          {nombreUnidad(p.unidadBase)} · <span className="font-mono">{p.codigo}</span>
                          {p.marca && p.marca !== 'VARIADO' && <> · {p.marca}</>}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-tinta-suave">{p.categoriaNombre}</Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      {presentacionesActivas(p).map((pr) => (
                        <Chip key={pr.id}>{textoChip(pr, p.unidadBase)}</Chip>
                      ))}
                    </div>
                  </Td>
                  {ubicacionesStock.map((u) => {
                    const s = stockPorProducto.get(`${p.id}-${u.id}`)
                    return (
                      <Td key={u.id} className={cn('font-mono font-semibold', s?.bajo ? 'text-peligro' : 'text-tinta')}>
                        <span title={s?.bajo ? `Stock bajo (mínimo ${cantidad(s.stockMinimo)})` : undefined}>
                          {stock.isPending ? '…' : cantidad(s?.cantidad ?? 0)}
                        </span>
                      </Td>
                    )
                  })}
                  <Td className="font-mono whitespace-nowrap text-tinta">
                    {soles(principal?.precioVenta)}
                    {p.presentaciones.some((x) => x.activo && ofertaVigente(x, hoyLima()) !== null) && (
                      <span className="ml-1.5 rounded bg-marca px-1 py-px font-sans text-[10px] font-bold text-sobre-marca">OFERTA</span>
                    )}
                  </Td>
                  <Td>
                    <Insignia tono={p.activo ? 'exito' : 'neutro'}>{p.activo ? 'Activo' : 'Inactivo'}</Insignia>
                  </Td>
                  {puedeEditar && (
                    <Td alinear="derecha">
                      <div className="flex justify-end gap-1">
                        <Boton
                          variante="fantasma"
                          tamano="sm"
                          onClick={() => navegar(`/productos/${p.id}`)}
                          aria-label={`Editar ${p.nombre}`}
                          icono={<Pencil className="size-4" />}
                        />
                        <Boton
                          variante="fantasma"
                          tamano="sm"
                          onClick={() => cambiarEstado.mutate(p)}
                          disabled={cambiarEstado.isPending}
                          aria-label={p.activo ? `Desactivar ${p.nombre}` : `Activar ${p.nombre}`}
                          title={p.activo ? 'Desactivar' : 'Activar'}
                          icono={<Power className={cn('size-4', p.activo ? 'text-exito' : 'text-tinta-tenue')} />}
                        />
                      </div>
                    </Td>
                  )}
                </Tr>
              )
            })}
          </Tbody>
        </Tabla>
        <Paginacion pagina={productos.data} onCambiar={setPagina} />
      </Tarjeta>
    </div>
  )
}
