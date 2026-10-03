import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { HandCoins, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { ClienteResponse, VentaResponse } from '@/api/tipos'
import { clientesApi, fiadoApi } from '@/api/ventas'
import { ModalCliente } from '@/componentes/formularios/FormularioCliente'
import { ModalAbono } from '@/componentes/formularios/ModalAbono'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { Casilla, Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { Pestanas } from '@/componentes/ui/Pestanas'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { TablaDeudores } from '@/componentes/tablas/TablaDeudores'
import { useUbicacion } from '@/contexto/ubicacion'
import { useRetraso } from '@/hooks/useRetraso'
import { fecha, fechaHora, hoyLima, NOMBRE_DOCUMENTO, soles } from '@/logica/formato'

type Seccion = 'clientes' | 'deudas' | 'deudores'

/** Clientes y fiado: mantenimiento de clientes, deudas pendientes con abonos y reporte de deudores. */
export default function Clientes() {
  const [parametros, setParametros] = useSearchParams()
  const tab = parametros.get('tab')
  const seccion: Seccion = tab === 'deudas' || tab === 'deudores' ? tab : 'clientes'
  const [nuevo, setNuevo] = useState(false)

  return (
    <div>
      <EncabezadoPagina
        titulo="Clientes y fiado"
        subtitulo="Clientes, ventas al crédito pendientes y abonos"
        acciones={
          <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => setNuevo(true)}>
            Nuevo cliente
          </Boton>
        }
      />
      <Pestanas<Seccion>
        pestanas={[
          { id: 'clientes', etiqueta: 'Clientes' },
          { id: 'deudas', etiqueta: 'Deudas pendientes' },
          { id: 'deudores', etiqueta: 'Deudores' },
        ]}
        activa={seccion}
        onCambiar={(id) => setParametros(id === 'clientes' ? {} : { tab: id })}
      />
      {seccion === 'clientes' && <ListaClientes textoInicial={parametros.get('texto') ?? ''} />}
      {seccion === 'deudas' && <Deudas />}
      {seccion === 'deudores' && <Deudores />}
      {nuevo && <ModalCliente cliente={null} onCerrar={() => setNuevo(false)} />}
    </div>
  )
}

function ListaClientes({ textoInicial }: { textoInicial: string }) {
  const [texto, setTexto] = useState(textoInicial)
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<ClienteResponse | null>(null)
  const busqueda = useRetraso(texto.trim())
  const filtro = { texto: busqueda, activo: estado === '' ? undefined : estado === 'activos', page: pagina, size: 20, sort: 'nombre,asc' }
  const clientes = useQuery({
    queryKey: ['clientes', 'listado', filtro],
    queryFn: () => clientesApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <Tarjeta className="mb-5 grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_12rem]">
        <Buscador
          valor={texto}
          onCambiar={(v) => {
            setTexto(v)
            setPagina(0)
          }}
          placeholder="Buscar por nombre o documento…"
          aria-label="Buscar cliente"
        />
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
              <Th>Cliente</Th>
              <Th>Documento</Th>
              <Th>Teléfono</Th>
              <Th>Dirección</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {clientes.isPending && (
              <FilaCompleta columnas={6}>
                <Cargando />
              </FilaCompleta>
            )}
            {clientes.isError && (
              <FilaCompleta columnas={6}>
                <MensajeError error={clientes.error} />
              </FilaCompleta>
            )}
            {clientes.data?.contenido.length === 0 && (
              <FilaCompleta columnas={6}>
                <EstadoVacio titulo="Sin clientes" descripcion="No hay clientes con estos filtros." />
              </FilaCompleta>
            )}
            {clientes.data?.contenido.map((c) => (
              <Tr key={c.id}>
                <Td className="font-semibold text-tinta">{c.nombre}</Td>
                <Td className="font-mono text-sm text-tinta-suave">
                  {c.numeroDocumento ? `${NOMBRE_DOCUMENTO[c.tipoDocumento]} ${c.numeroDocumento}` : '—'}
                </Td>
                <Td className="font-mono text-sm text-tinta-suave">{c.telefono ?? '—'}</Td>
                <Td className="text-tinta-suave">{c.direccion ?? '—'}</Td>
                <Td>
                  <Insignia tono={c.activo ? 'exito' : 'neutro'}>{c.activo ? 'Activo' : 'Inactivo'}</Insignia>
                </Td>
                <Td alinear="derecha">
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/clientes?tab=deudas&clienteId=${c.id}&cliente=${encodeURIComponent(c.nombre)}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-tinta-suave hover:bg-beige hover:text-tinta"
                    >
                      <HandCoins className="size-4" /> Deudas
                    </Link>
                    <Boton variante="fantasma" tamano="sm" onClick={() => setEditando(c)} aria-label={`Editar ${c.nombre}`} icono={<Pencil className="size-4" />} />
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={clientes.data} onCambiar={setPagina} />
      </Tarjeta>
      {editando && <ModalCliente cliente={editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function Deudas() {
  const { seleccionadaId } = useUbicacion()
  const [parametros, setParametros] = useSearchParams()
  const clienteId = parametros.get('clienteId')
  const clienteNombre = parametros.get('cliente')
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [pagina, setPagina] = useState(0)
  const [abonando, setAbonando] = useState<VentaResponse | null>(null)
  const filtro = {
    ubicacionId: seleccionadaId ?? undefined,
    clienteId: clienteId ? Number(clienteId) : undefined,
    soloVencidas: soloVencidas || undefined,
    page: pagina,
    size: 20,
    sort: 'fecha,asc',
  }
  const deudas = useQuery({
    queryKey: ['fiado', 'deudas', filtro],
    queryFn: () => fiadoApi.deudas(filtro),
    placeholderData: keepPreviousData,
  })
  const hoy = hoyLima()

  return (
    <>
      <Tarjeta className="mb-5 flex flex-wrap items-center gap-4 p-5">
        {clienteId && (
          <span className="inline-flex items-center gap-2 rounded-full bg-marca-claro px-3 py-1 text-sm text-marca-oscuro">
            Cliente: <strong>{clienteNombre}</strong>
            <button type="button" className="font-bold" aria-label="Quitar filtro de cliente" onClick={() => setParametros({ tab: 'deudas' })}>
              ×
            </button>
          </span>
        )}
        <Casilla
          etiqueta="Solo vencidas"
          checked={soloVencidas}
          onChange={(e) => {
            setSoloVencidas(e.target.checked)
            setPagina(0)
          }}
        />
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Venta</Th>
              <Th>Fecha</Th>
              <Th>Cliente</Th>
              <Th>Tienda</Th>
              <Th>Vence</Th>
              <Th alinear="derecha">Total</Th>
              <Th alinear="derecha">Saldo</Th>
              <Th alinear="derecha">Acción</Th>
            </tr>
          </Thead>
          <Tbody>
            {deudas.isPending && (
              <FilaCompleta columnas={8}>
                <Cargando />
              </FilaCompleta>
            )}
            {deudas.isError && (
              <FilaCompleta columnas={8}>
                <MensajeError error={deudas.error} />
              </FilaCompleta>
            )}
            {deudas.data?.contenido.length === 0 && (
              <FilaCompleta columnas={8}>
                <EstadoVacio titulo="Sin deudas pendientes" descripcion="No hay ventas al crédito con saldo." />
              </FilaCompleta>
            )}
            {deudas.data?.contenido.map((v) => {
              const vencida = v.fechaVencimiento !== null && v.fechaVencimiento < hoy
              return (
                <Tr key={v.id} data-testid={`deuda-${v.numeroDocumento}`}>
                  <Td>
                    <Link to={`/ventas/${v.id}`} className="font-mono font-semibold text-tinta hover:text-marca">
                      {v.numeroDocumento}
                    </Link>
                  </Td>
                  <Td className="text-xs text-tinta-suave">{fechaHora(v.fecha)}</Td>
                  <Td className="font-medium">{v.clienteNombre}</Td>
                  <Td className="text-tinta-suave">{v.ubicacionNombre}</Td>
                  <Td>{v.fechaVencimiento ? <span className={vencida ? 'font-semibold text-peligro' : 'text-tinta-suave'}>{fecha(v.fechaVencimiento)}{vencida && ' (vencida)'}</span> : '—'}</Td>
                  <Td alinear="derecha" className="font-mono">{soles(v.total)}</Td>
                  <Td alinear="derecha" className="font-mono font-bold text-alerta">{soles(v.saldoPendiente)}</Td>
                  <Td alinear="derecha">
                    <Boton tamano="sm" icono={<HandCoins className="size-4" />} onClick={() => setAbonando(v)}>
                      Abonar
                    </Boton>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Tabla>
        <Paginacion pagina={deudas.data} onCambiar={setPagina} />
      </Tarjeta>
      {abonando && <ModalAbono venta={abonando} onCerrar={() => setAbonando(null)} />}
    </>
  )
}

function Deudores() {
  const { seleccionadaId } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  const filtro = { ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 20 }
  const deudores = useQuery({
    queryKey: ['fiado', 'deudores', filtro],
    queryFn: () => fiadoApi.deudores(filtro),
    placeholderData: keepPreviousData,
  })
  return <TablaDeudores consulta={deudores} onPagina={setPagina} />
}
