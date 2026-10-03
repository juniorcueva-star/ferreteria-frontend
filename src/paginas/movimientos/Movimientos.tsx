import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, PackageCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { inventarioApi, trasladosApi } from '@/api/inventario'
import type { EstadoTraslado, ProductoResponse, TipoMovimiento, TrasladoResponse } from '@/api/tipos'
import { usePermiso, useUsuario } from '@/auth/contexto'
import { puedeAnularTraslado, puedeRecibirTraslado } from '@/auth/permisos'
import { ConfirmarAnulacion } from '@/componentes/formularios/ConfirmarAnulacion'
import { SelectorProducto } from '@/componentes/formularios/SelectorProducto'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Dato } from '@/componentes/ui/Dato'
import { Insignia } from '@/componentes/ui/Insignia'
import { TONO_TRASLADO } from '@/componentes/ui/tonos'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { Pestanas } from '@/componentes/ui/Pestanas'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { cantidad, cantidadConUnidad, fechaHora, NOMBRE_ESTADO_TRASLADO, NOMBRE_MOVIMIENTO } from '@/logica/formato'

type Seccion = 'kardex' | 'traslados'

/** Kardex (historial de movimientos de stock) y traslados entre ubicaciones. */
export default function Movimientos() {
  const [parametros, setParametros] = useSearchParams()
  const seccion: Seccion = parametros.get('tab') === 'traslados' ? 'traslados' : 'kardex'
  const navegar = useNavigate()
  const puedeEnviar = usePermiso('traslados.enviar')

  return (
    <div>
      <EncabezadoPagina
        titulo="Movimientos"
        subtitulo="Kardex de inventario y traslados entre el almacén y las tiendas"
        acciones={
          puedeEnviar && (
            <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => navegar('/movimientos/traslados/nuevo')}>
              Nuevo traslado
            </Boton>
          )
        }
      />
      <Pestanas<Seccion>
        pestanas={[
          { id: 'kardex', etiqueta: 'Kardex' },
          { id: 'traslados', etiqueta: 'Traslados' },
        ]}
        activa={seccion}
        onCambiar={(id) => setParametros(id === 'kardex' ? {} : { tab: id })}
      />
      {seccion === 'kardex' ? <Kardex /> : <Traslados />}
    </div>
  )
}

const TIPOS: TipoMovimiento[] = [
  'INVENTARIO_INICIAL',
  'COMPRA',
  'ANULACION_COMPRA',
  'VENTA',
  'ANULACION_VENTA',
  'TRASLADO_SALIDA',
  'TRASLADO_ENTRADA',
  'ANULACION_TRASLADO',
  'AJUSTE_ENTRADA',
  'AJUSTE_SALIDA',
]

function Kardex() {
  const { seleccionadaId } = useUbicacion()
  const [producto, setProducto] = useState<ProductoResponse | null>(null)
  const [tipo, setTipo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(0)

  const filtro = {
    productoId: producto?.id,
    ubicacionId: seleccionadaId ?? undefined,
    tipo: (tipo || undefined) as TipoMovimiento | undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    page: pagina,
    size: 20,
    sort: 'id,desc',
  }
  const kardex = useQuery({
    queryKey: ['inventario', 'kardex', filtro],
    queryFn: () => inventarioApi.kardex(filtro),
    placeholderData: keepPreviousData,
  })
  const reiniciar = <T,>(cambiar: (v: T) => void) => (v: T) => {
    cambiar(v)
    setPagina(0)
  }

  return (
    <>
      <Tarjeta className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <SelectorProducto valor={producto} onElegir={reiniciar(setProducto)} etiqueta="Producto" placeholder="Todos los productos" />
        <CampoSelector etiqueta="Tipo de movimiento" value={tipo} onChange={(e) => reiniciar(setTipo)(e.target.value)}>
          <option value="">Todos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_MOVIMIENTO[t]}
            </option>
          ))}
        </CampoSelector>
        <CampoTexto etiqueta="Desde" type="date" value={desde} onChange={(e) => reiniciar(setDesde)(e.target.value)} />
        <CampoTexto etiqueta="Hasta" type="date" value={hasta} onChange={(e) => reiniciar(setHasta)(e.target.value)} />
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Producto</Th>
              <Th>Ubicación</Th>
              <Th>Movimiento</Th>
              <Th alinear="derecha">Cantidad</Th>
              <Th alinear="derecha">Saldo</Th>
              <Th>Documento</Th>
              <Th>Usuario</Th>
            </tr>
          </Thead>
          <Tbody>
            {kardex.isPending && (
              <FilaCompleta columnas={8}>
                <Cargando />
              </FilaCompleta>
            )}
            {kardex.isError && (
              <FilaCompleta columnas={8}>
                <MensajeError error={kardex.error} />
              </FilaCompleta>
            )}
            {kardex.data?.contenido.length === 0 && (
              <FilaCompleta columnas={8}>
                <EstadoVacio titulo="Sin movimientos" descripcion="No hay movimientos con estos filtros." />
              </FilaCompleta>
            )}
            {kardex.data?.contenido.map((m) => (
              <Tr key={m.id}>
                <Td className="text-xs whitespace-nowrap text-tinta-suave">{fechaHora(m.fecha)}</Td>
                <Td className="font-medium text-tinta">{m.productoNombre}</Td>
                <Td className="text-tinta-suave">{m.ubicacionNombre}</Td>
                <Td>
                  <span className="text-sm text-tinta">{NOMBRE_MOVIMIENTO[m.tipo]}</span>
                  {m.motivo && <p className="max-w-56 truncate text-xs text-tinta-tenue" title={m.motivo}>{m.motivo}</p>}
                </Td>
                <Td alinear="derecha" className={cn('font-mono font-semibold', m.cantidad >= 0 ? 'text-exito' : 'text-peligro')}>
                  {m.cantidad > 0 ? '+' : ''}
                  {cantidad(m.cantidad)}
                </Td>
                <Td alinear="derecha" className="font-mono text-tinta">
                  {cantidad(m.saldoResultante)}
                </Td>
                <Td className="font-mono text-xs text-tinta-suave">{m.documento ?? '—'}</Td>
                <Td className="text-tinta-suave">{m.usuario}</Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={kardex.data} onCambiar={setPagina} />
      </Tarjeta>
    </>
  )
}

function Traslados() {
  const { seleccionadaId } = useUbicacion()
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(0)
  const [detalleId, setDetalleId] = useState<number | null>(null)

  const filtro = {
    ubicacionId: seleccionadaId ?? undefined,
    estado: (estado || undefined) as EstadoTraslado | undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    page: pagina,
    size: 20,
    sort: 'id,desc',
  }
  const traslados = useQuery({
    queryKey: ['traslados', 'listado', filtro],
    queryFn: () => trasladosApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <Tarjeta className="mb-5 grid gap-4 p-5 md:grid-cols-3">
        <CampoSelector
          etiqueta="Estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value)
            setPagina(0)
          }}
        >
          <option value="">Todos</option>
          <option value="ENVIADO">En camino</option>
          <option value="RECIBIDO">Recibidos</option>
          <option value="ANULADO">Anulados</option>
        </CampoSelector>
        <CampoTexto etiqueta="Enviados desde" type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(0) }} />
        <CampoTexto etiqueta="Hasta" type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPagina(0) }} />
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Código</Th>
              <Th>Origen</Th>
              <Th>Destino</Th>
              <Th>Enviado</Th>
              <Th>Recibido</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <Tbody>
            {traslados.isPending && (
              <FilaCompleta columnas={6}>
                <Cargando />
              </FilaCompleta>
            )}
            {traslados.isError && (
              <FilaCompleta columnas={6}>
                <MensajeError error={traslados.error} />
              </FilaCompleta>
            )}
            {traslados.data?.contenido.length === 0 && (
              <FilaCompleta columnas={6}>
                <EstadoVacio titulo="Sin traslados" descripcion="No hay traslados con estos filtros." />
              </FilaCompleta>
            )}
            {traslados.data?.contenido.map((t) => (
              <Tr key={t.id} onClick={() => setDetalleId(t.id)} data-testid={`traslado-${t.codigo}`}>
                <Td className="font-mono font-semibold text-tinta">{t.codigo}</Td>
                <Td className="text-tinta-suave">{t.origenNombre}</Td>
                <Td className="text-tinta-suave">{t.destinoNombre}</Td>
                <Td className="text-xs text-tinta-suave">
                  {fechaHora(t.fechaEnvio)}
                  <br />
                  por {t.usuarioEnvia}
                </Td>
                <Td className="text-xs text-tinta-suave">
                  {t.fechaRecepcion ? (
                    <>
                      {fechaHora(t.fechaRecepcion)}
                      <br />
                      por {t.usuarioRecibe}
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <Insignia tono={TONO_TRASLADO[t.estado]}>{NOMBRE_ESTADO_TRASLADO[t.estado]}</Insignia>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={traslados.data} onCambiar={setPagina} />
      </Tarjeta>
      <DetalleTraslado id={detalleId} onCerrar={() => setDetalleId(null)} />
    </>
  )
}

function DetalleTraslado({ id, onCerrar }: { id: number | null; onCerrar: () => void }) {
  const usuario = useUsuario()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [anulando, setAnulando] = useState(false)
  const traslado = useQuery({
    queryKey: ['traslados', 'detalle', id],
    queryFn: () => trasladosApi.obtener(id ?? 0),
    enabled: id !== null,
  })
  const despues = (t: TrasladoResponse, mensaje: string) => {
    avisar(mensaje)
    queryClient.setQueryData(['traslados', 'detalle', t.id], t)
    void queryClient.invalidateQueries({ queryKey: ['traslados'] })
    void queryClient.invalidateQueries({ queryKey: ['inventario'] })
  }
  const recibir = useMutation({
    mutationFn: (t: TrasladoResponse) => trasladosApi.recibir(t.id),
    onSuccess: (t) => despues(t, `Traslado ${t.codigo} recibido: el stock entró a ${t.destinoNombre}`),
  })
  const anular = useMutation({
    mutationFn: ({ t, motivo }: { t: TrasladoResponse; motivo: string }) => trasladosApi.anular(t.id, { motivo }),
    onSuccess: (t) => {
      setAnulando(false)
      despues(t, `Traslado ${t.codigo} anulado: el stock volvió a ${t.origenNombre}`)
    },
  })
  const t = traslado.data

  return (
    <>
      <Modal
        abierto={id !== null && !anulando}
        onCerrar={() => {
          recibir.reset()
          onCerrar()
        }}
        titulo={t ? `Traslado ${t.codigo}` : 'Traslado'}
        descripcion={t ? `${t.origenNombre} → ${t.destinoNombre}` : undefined}
        ancho="lg"
        pie={
          t && (
            <>
              {puedeAnularTraslado(usuario, t) && (
                <Boton variante="secundario" icono={<Ban className="size-4" />} onClick={() => setAnulando(true)}>
                  Anular
                </Boton>
              )}
              {puedeRecibirTraslado(usuario, t) && (
                <Boton variante="exito" icono={<PackageCheck className="size-4" />} cargando={recibir.isPending} onClick={() => recibir.mutate(t)}>
                  Recibir mercadería
                </Boton>
              )}
            </>
          )
        }
      >
        {traslado.isPending && <Cargando />}
        {traslado.isError && <MensajeError error={traslado.error} />}
        {recibir.error && <MensajeError error={recibir.error} className="mb-4" />}
        {t && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <Dato titulo="Estado">
                <Insignia tono={TONO_TRASLADO[t.estado]}>{NOMBRE_ESTADO_TRASLADO[t.estado]}</Insignia>
              </Dato>
              <Dato titulo="Enviado">
                {fechaHora(t.fechaEnvio)} · {t.usuarioEnvia}
              </Dato>
              <Dato titulo="Recibido">{t.fechaRecepcion ? `${fechaHora(t.fechaRecepcion)} · ${t.usuarioRecibe}` : '—'}</Dato>
            </div>
            {t.observacion && <p className="rounded-lg bg-crema px-3 py-2 text-sm text-tinta-suave">{t.observacion}</p>}
            <div className="overflow-hidden rounded-xl border border-borde">
              <Tabla>
                <Thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th>Presentación</Th>
                    <Th alinear="derecha">Cantidad</Th>
                    <Th alinear="derecha">En unidad base</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {t.detalles.map((d, i) => (
                    <Tr key={i}>
                      <Td className="font-medium">{d.productoNombre}</Td>
                      <Td className="text-tinta-suave">{d.presentacionNombre ?? 'Unidad base'}</Td>
                      <Td alinear="derecha" className="font-mono">{cantidad(d.cantidad)}</Td>
                      <Td alinear="derecha" className="font-mono font-semibold">{cantidadConUnidad(d.cantidadBase, d.unidadBase)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Tabla>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmarAnulacion
        abierto={anulando}
        onCerrar={() => {
          anular.reset()
          setAnulando(false)
        }}
        titulo={`Anular traslado ${t?.codigo ?? ''}`}
        descripcion="La mercadería vuelve al stock de origen."
        cargando={anular.isPending}
        error={anular.error}
        onConfirmar={(motivo) => t && anular.mutate({ t, motivo })}
      />
    </>
  )
}
