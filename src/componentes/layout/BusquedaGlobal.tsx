import { useQuery } from '@tanstack/react-query'
import { Hexagon, Search, User, Users } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { productosApi } from '@/api/catalogo'
import { proveedoresApi } from '@/api/compras'
import { clientesApi } from '@/api/ventas'
import { usePermiso } from '@/auth/contexto'
import { useRetraso } from '@/hooks/useRetraso'
import { soles } from '@/logica/formato'
import { presentacionPrincipal } from '@/logica/presentaciones'

/** Buscador de la barra superior: productos, clientes y proveedores (segun el rol). */
export function BusquedaGlobal() {
  const navegar = useNavigate()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const busqueda = useRetraso(texto.trim(), 300)
  const verClientes = usePermiso('clientes.ver')
  const verProveedores = usePermiso('proveedores.ver')
  const activa = busqueda.length >= 2

  const productos = useQuery({
    queryKey: ['busqueda', 'productos', busqueda],
    queryFn: () => productosApi.listar({ texto: busqueda, size: 5 }),
    enabled: activa,
  })
  const clientes = useQuery({
    queryKey: ['busqueda', 'clientes', busqueda],
    queryFn: () => clientesApi.listar({ texto: busqueda, size: 4 }),
    enabled: activa && verClientes,
  })
  const proveedores = useQuery({
    queryKey: ['busqueda', 'proveedores', busqueda],
    queryFn: () => proveedoresApi.listar({ texto: busqueda, size: 4 }),
    enabled: activa && verProveedores,
  })

  useEffect(() => {
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alHacerClic)
    return () => document.removeEventListener('mousedown', alHacerClic)
  }, [])

  const ir = (ruta: string) => {
    setAbierto(false)
    setTexto('')
    navegar(ruta)
  }

  const sinResultados =
    activa &&
    !productos.isFetching &&
    (productos.data?.totalElementos ?? 0) === 0 &&
    (clientes.data?.totalElementos ?? 0) === 0 &&
    (proveedores.data?.totalElementos ?? 0) === 0

  return (
    <div className="relative w-full max-w-md" ref={contenedor}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tinta-tenue" aria-hidden />
      <input
        type="search"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && texto.trim()) ir(`/productos?texto=${encodeURIComponent(texto.trim())}`)
          if (e.key === 'Escape') setAbierto(false)
        }}
        placeholder={verClientes ? 'Buscar productos, clientes…' : 'Buscar productos, proveedores…'}
        aria-label="Búsqueda global"
        className="h-10 w-full rounded-xl border border-borde bg-crema/60 pr-3 pl-9 text-sm text-tinta placeholder:text-tinta-tenue focus:border-marca focus:bg-white focus:ring-2 focus:ring-marca/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {abierto && activa && (
        <div className="absolute right-0 left-0 z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-borde bg-white py-2 shadow-xl">
          {productos.data && productos.data.contenido.length > 0 && (
            <Grupo titulo="Productos">
              {productos.data.contenido.map((p) => (
                <Resultado
                  key={p.id}
                  icono={<Hexagon className="size-4" />}
                  titulo={p.nombre}
                  detalle={`${p.codigo} · ${soles(presentacionPrincipal(p)?.precioVenta)}`}
                  onClick={() => ir(`/productos?texto=${encodeURIComponent(p.codigo)}`)}
                />
              ))}
            </Grupo>
          )}
          {clientes.data && clientes.data.contenido.length > 0 && (
            <Grupo titulo="Clientes">
              {clientes.data.contenido.map((c) => (
                <Resultado
                  key={c.id}
                  icono={<User className="size-4" />}
                  titulo={c.nombre}
                  detalle={c.numeroDocumento ?? 'Sin documento'}
                  onClick={() => ir(`/clientes?texto=${encodeURIComponent(c.nombre)}`)}
                />
              ))}
            </Grupo>
          )}
          {proveedores.data && proveedores.data.contenido.length > 0 && (
            <Grupo titulo="Proveedores">
              {proveedores.data.contenido.map((p) => (
                <Resultado
                  key={p.id}
                  icono={<Users className="size-4" />}
                  titulo={p.razonSocial}
                  detalle={p.ruc ?? 'Sin RUC'}
                  onClick={() => ir(`/proveedores?texto=${encodeURIComponent(p.razonSocial)}`)}
                />
              ))}
            </Grupo>
          )}
          {productos.isFetching && <p className="px-4 py-2 text-sm text-tinta-suave">Buscando…</p>}
          {sinResultados && <p className="px-4 py-2 text-sm text-tinta-suave">Sin resultados para “{busqueda}”.</p>}
        </div>
      )}
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 py-1 text-[11px] font-semibold tracking-wider text-tinta-tenue uppercase">{titulo}</p>
      {children}
    </div>
  )
}

function Resultado({ icono, titulo, detalle, onClick }: { icono: ReactNode; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-crema">
      <span className="text-tinta-tenue">{icono}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-tinta">{titulo}</span>
        <span className="block truncate font-mono text-xs text-tinta-suave">{detalle}</span>
      </span>
    </button>
  )
}
