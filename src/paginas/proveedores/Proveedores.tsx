import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { proveedoresApi } from '@/api/compras'
import type { ProveedorResponse } from '@/api/tipos'
import { ModalProveedor } from '@/componentes/formularios/FormularioProveedor'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useRetraso } from '@/hooks/useRetraso'

/** Mantenimiento de proveedores (ADMIN y ALMACENERO). */
export default function Proveedores() {
  const [parametros] = useSearchParams()
  const [texto, setTexto] = useState(parametros.get('texto') ?? '')
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<ProveedorResponse | 'nuevo' | null>(null)
  const busqueda = useRetraso(texto.trim())
  const filtro = { texto: busqueda, activo: estado === '' ? undefined : estado === 'activos', page: pagina, size: 20, sort: 'razonSocial,asc' }
  const proveedores = useQuery({
    queryKey: ['proveedores', 'listado', filtro],
    queryFn: () => proveedoresApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <EncabezadoPagina
        titulo="Proveedores"
        subtitulo={`${proveedores.data?.totalElementos ?? '…'} proveedores registrados`}
        acciones={
          <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => setEditando('nuevo')}>
            Nuevo proveedor
          </Boton>
        }
      />
      <Tarjeta className="mb-5 grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_12rem]">
        <Buscador valor={texto} onCambiar={(v) => { setTexto(v); setPagina(0) }} placeholder="Buscar por RUC o razón social…" aria-label="Buscar proveedor" />
        <Selector value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0) }} aria-label="Filtrar por estado" className="h-11 rounded-xl">
          <option value="">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </Selector>
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Razón social</Th>
              <Th>RUC</Th>
              <Th>Contacto</Th>
              <Th>Teléfono</Th>
              <Th>Correo</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {proveedores.isPending && (
              <FilaCompleta columnas={7}>
                <Cargando />
              </FilaCompleta>
            )}
            {proveedores.isError && (
              <FilaCompleta columnas={7}>
                <MensajeError error={proveedores.error} />
              </FilaCompleta>
            )}
            {proveedores.data?.contenido.length === 0 && (
              <FilaCompleta columnas={7}>
                <EstadoVacio titulo="Sin proveedores" descripcion="No hay proveedores con estos filtros." />
              </FilaCompleta>
            )}
            {proveedores.data?.contenido.map((p) => (
              <Tr key={p.id}>
                <Td className="font-semibold text-tinta">{p.razonSocial}</Td>
                <Td className="font-mono text-sm text-tinta-suave">{p.ruc ?? '—'}</Td>
                <Td className="text-tinta-suave">{p.contacto ?? '—'}</Td>
                <Td className="font-mono text-sm text-tinta-suave">{p.telefono ?? '—'}</Td>
                <Td className="text-tinta-suave">{p.email ?? '—'}</Td>
                <Td>
                  <Insignia tono={p.activo ? 'exito' : 'neutro'}>{p.activo ? 'Activo' : 'Inactivo'}</Insignia>
                </Td>
                <Td alinear="derecha">
                  <Boton variante="fantasma" tamano="sm" onClick={() => setEditando(p)} aria-label={`Editar ${p.razonSocial}`} icono={<Pencil className="size-4" />} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={proveedores.data} onCambiar={setPagina} />
      </Tarjeta>
      {editando && <ModalProveedor proveedor={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </div>
  )
}
