import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, PackagePlus, Send, Sparkles, Truck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { trasladosApi } from '@/api/inventario'
import { reposicionApi } from '@/api/reposicion'
import type { EstadoSolicitud, SolicitudReposicionResponse } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { tienePermiso } from '@/auth/permisos'
import { ConfirmarAnulacion } from '@/componentes/formularios/ConfirmarAnulacion'
import { ModalPedidoReposicion } from '@/componentes/formularios/ModalPedidoReposicion'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector, Entrada, Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia, type TonoInsignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { textoANumero } from '@/logica/decimales'
import { cantidad, fechaHora, sufijoUnidad } from '@/logica/formato'
import { errorCantidad, type LineaReposicion } from '@/logica/reposicion'

const ESTADOS: Record<EstadoSolicitud, { nombre: string; tono: TonoInsignia }> = {
  PENDIENTE: { nombre: 'Pendiente', tono: 'alerta' },
  ATENDIDA: { nombre: 'Atendido', tono: 'exito' },
  RECHAZADA: { nombre: 'Rechazado', tono: 'peligro' },
  ANULADA: { nombre: 'Anulado', tono: 'neutro' },
}

/**
 * Pedidos de reposicion. La tienda pide lo que se le acaba; el almacen atiende el pedido con un traslado (puede
 * enviar menos), lo rechaza, o arma un traslado sugerido con lo que esta en el minimo de una tienda.
 */
export default function Reposicion() {
  const usuario = useUsuario()
  const puedePedir = tienePermiso(usuario.rol, 'reposicion.pedir')
  const puedeAtender = tienePermiso(usuario.rol, 'reposicion.atender')
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [estado, setEstado] = useState<EstadoSolicitud | ''>(puedeAtender ? 'PENDIENTE' : '')
  const [pagina, setPagina] = useState(0)
  const [pidiendo, setPidiendo] = useState(false)
  const [atendiendo, setAtendiendo] = useState<SolicitudReposicionResponse | null>(null)
  const [cancelando, setCancelando] = useState<{ solicitud: SolicitudReposicionResponse; accion: 'rechazar' | 'anular' } | null>(null)
  const filtro = { estado: estado || undefined, page: pagina, size: 20, sort: 'id,desc' }
  const solicitudes = useQuery({
    queryKey: ['reposicion', 'listado', filtro],
    queryFn: () => reposicionApi.listar(filtro),
    placeholderData: keepPreviousData,
  })
  const cancelar = useMutation({
    mutationFn: ({ id, accion, motivo }: { id: number; accion: 'rechazar' | 'anular'; motivo: string }) =>
      accion === 'rechazar' ? reposicionApi.rechazar(id, { motivo }) : reposicionApi.anular(id, { motivo }),
    onSuccess: (s) => {
      avisar(`Pedido ${s.codigo} ${s.estado === 'RECHAZADA' ? 'rechazado' : 'anulado'}`)
      setCancelando(null)
      void queryClient.invalidateQueries({ queryKey: ['reposicion'] })
    },
  })

  return (
    <div>
      <EncabezadoPagina
        titulo="Reposición"
        subtitulo={
          puedeAtender
            ? 'Pedidos de las tiendas: atiéndalos con un traslado o arme un traslado sugerido.'
            : 'Pida al almacén los productos que se le acaban. Llegan como un traslado que usted recibe.'
        }
        acciones={
          puedePedir && (
            <Boton tamano="lg" icono={<PackagePlus className="size-5" />} onClick={() => setPidiendo(true)}>
              Nuevo pedido
            </Boton>
          )
        }
      />

      {puedeAtender && <TrasladoSugerido />}

      <Tarjeta className="mb-5 flex flex-wrap items-center gap-3 p-5">
        <Selector
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoSolicitud | '')
            setPagina(0)
          }}
          aria-label="Filtrar por estado"
          className="h-11 w-56 rounded-xl"
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="ATENDIDA">Atendidos</option>
          <option value="RECHAZADA">Rechazados</option>
          <option value="ANULADA">Anulados</option>
          <option value="">Todos</option>
        </Selector>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Pedido</Th>
              <Th>Tienda</Th>
              <Th>Productos</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {solicitudes.isPending && (
              <FilaCompleta columnas={5}>
                <Cargando texto="Cargando pedidos…" />
              </FilaCompleta>
            )}
            {solicitudes.isError && (
              <FilaCompleta columnas={5}>
                <MensajeError error={solicitudes.error} />
              </FilaCompleta>
            )}
            {solicitudes.data?.contenido.length === 0 && (
              <FilaCompleta columnas={5}>
                <EstadoVacio titulo="No hay pedidos" descripcion={puedePedir ? 'Use «Nuevo pedido» cuando algo se acabe.' : 'Las tiendas aún no han pedido nada.'} />
              </FilaCompleta>
            )}
            {solicitudes.data?.contenido.map((s) => (
              <Tr key={s.id} data-testid={`pedido-${s.codigo}`}>
                <Td>
                  <p className="font-mono font-semibold">{s.codigo}</p>
                  <p className="text-xs text-tinta-tenue">
                    {fechaHora(s.fecha)} · {s.usuario}
                  </p>
                </Td>
                <Td>{s.ubicacionNombre}</Td>
                <Td className="min-w-64 text-sm">
                  {s.detalles.map((d) => (
                    <p key={d.productoId}>
                      <span className="font-mono font-semibold">
                        {cantidad(d.cantidad)} {sufijoUnidad(d.unidadBase)}
                      </span>{' '}
                      {d.productoNombre}
                    </p>
                  ))}
                  {s.observacion && <p className="text-xs text-tinta-tenue">{s.observacion}</p>}
                </Td>
                <Td>
                  <Insignia tono={ESTADOS[s.estado].tono}>{ESTADOS[s.estado].nombre}</Insignia>
                  {s.trasladoCodigo && <p className="mt-1 font-mono text-xs text-tinta-suave">Traslado {s.trasladoCodigo}</p>}
                  {s.motivo && <p className="mt-1 max-w-48 text-xs text-tinta-tenue">{s.motivo}</p>}
                </Td>
                <Td alinear="derecha">
                  {s.estado === 'PENDIENTE' && (
                    <div className="flex justify-end gap-1">
                      {puedeAtender && (
                        <>
                          <Boton tamano="sm" icono={<Truck className="size-4" />} onClick={() => setAtendiendo(s)}>
                            Atender
                          </Boton>
                          <Boton tamano="sm" variante="fantasma" icono={<XCircle className="size-4" />} onClick={() => setCancelando({ solicitud: s, accion: 'rechazar' })}>
                            Rechazar
                          </Boton>
                        </>
                      )}
                      {puedePedir && (usuario.rol === 'ADMIN' || usuario.ubicacionId === s.ubicacionId) && (
                        <Boton tamano="sm" variante="fantasma" icono={<Ban className="size-4" />} onClick={() => setCancelando({ solicitud: s, accion: 'anular' })}>
                          Anular
                        </Boton>
                      )}
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={solicitudes.data} onCambiar={setPagina} />
      </Tarjeta>

      {pidiendo && <ModalPedidoReposicion onCerrar={() => setPidiendo(false)} />}
      {atendiendo && <ModalAtender solicitud={atendiendo} onCerrar={() => setAtendiendo(null)} />}
      <ConfirmarAnulacion
        abierto={cancelando !== null}
        onCerrar={() => {
          cancelar.reset()
          setCancelando(null)
        }}
        titulo={`${cancelando?.accion === 'rechazar' ? 'Rechazar' : 'Anular'} pedido ${cancelando?.solicitud.codigo ?? ''}`}
        descripcion={cancelando?.accion === 'rechazar' ? 'La tienda verá el motivo del rechazo.' : 'El almacén ya no verá este pedido como pendiente.'}
        cargando={cancelar.isPending}
        error={cancelar.error}
        onConfirmar={(motivo) => cancelando && cancelar.mutate({ id: cancelando.solicitud.id, accion: cancelando.accion, motivo })}
      />
    </div>
  )
}

/** Origen del traslado: el ALMACENERO envia desde su almacen; el ADMIN elige el almacen. */
function useOrigen() {
  const usuario = useUsuario()
  const { todas } = useUbicacion()
  const almacenes = todas.filter((u) => u.tipo === 'ALMACEN')
  const [origenId, setOrigenId] = useState(String(almacenes[0]?.id ?? ''))
  const selector =
    usuario.rol === 'ADMIN' ? (
      <CampoSelector etiqueta="Sale de" value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
        {almacenes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </CampoSelector>
    ) : null
  return { origenId: usuario.rol === 'ADMIN' && origenId ? Number(origenId) : null, selector }
}

function ModalAtender({ solicitud, onCerrar }: { solicitud: SolicitudReposicionResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const origen = useOrigen()
  const [lineas, setLineas] = useState<LineaReposicion[]>(
    solicitud.detalles.map((d) => ({ ...d, cantidad: String(d.cantidad) })),
  )
  const [intentado, setIntentado] = useState(false)
  const errores = [
    ...(lineas.some((l) => errorCantidad(l, true)) ? ['Revise las cantidades'] : []),
    ...(lineas.every((l) => textoANumero(l.cantidad) <= 0) ? ['Envíe al menos un producto o rechace el pedido'] : []),
  ]
  const atender = useMutation({
    mutationFn: () =>
      reposicionApi.atender(solicitud.id, {
        origenId: origen.origenId,
        observacion: null,
        detalles: lineas.map((l) => ({ productoId: l.productoId, cantidad: textoANumero(l.cantidad) })),
      }),
    onSuccess: (s) => {
      avisar(`Pedido ${s.codigo} atendido con el traslado ${s.trasladoCodigo ?? ''}`)
      for (const clave of ['reposicion', 'traslados', 'inventario', 'movimientos']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
      onCerrar()
    },
  })
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Atender pedido ${solicitud.codigo}`}
      descripcion={`Se enviará un traslado a ${solicitud.ubicacionNombre}. Puede enviar menos de lo pedido (0 = no se envía).`}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            icono={<Send className="size-4" />}
            cargando={atender.isPending}
            onClick={() => {
              setIntentado(true)
              if (errores.length === 0) atender.mutate()
            }}
          >
            Enviar traslado
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {origen.selector}
        {lineas.map((l, i) => (
          <div key={l.productoId} className="grid grid-cols-[1fr_8rem] items-center gap-2 rounded-xl border border-borde p-2">
            <span className="text-sm">
              <span className="font-semibold">{l.productoNombre}</span>{' '}
              <span className="text-xs text-tinta-tenue">
                (pidió {cantidad(solicitud.detalles[i]?.cantidad ?? 0)} {sufijoUnidad(l.unidadBase)})
              </span>
            </span>
            <div className="flex items-center gap-1">
              <Entrada
                aria-label={`Cantidad a enviar de ${l.productoNombre}`}
                inputMode="decimal"
                value={l.cantidad}
                onChange={(e) => setLineas((ls) => ls.map((x) => (x.productoId === l.productoId ? { ...x, cantidad: e.target.value } : x)))}
                className="font-mono"
              />
              <span className="text-xs text-tinta-suave">{sufijoUnidad(l.unidadBase)}</span>
            </div>
          </div>
        ))}
        {atender.error && <MensajeError error={atender.error} />}
        {intentado && errores.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-peligro" role="alert">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/**
 * Traslado sugerido (almacen): elige una tienda, ve lo que llego a su stock minimo con la cantidad sugerida (hasta
 * el doble del minimo, sin pasar de lo que hay en el almacen) y lo envia en un traslado con un clic.
 */
function TrasladoSugerido() {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas } = useUbicacion()
  const tiendas = todas.filter((u) => u.tipo === 'TIENDA')
  const origen = useOrigen()
  const [tiendaId, setTiendaId] = useState('')
  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const sugerencias = useQuery({
    queryKey: ['reposicion', 'sugerencias', tiendaId],
    queryFn: () => reposicionApi.sugerencias(Number(tiendaId)),
    enabled: tiendaId !== '',
  })
  const lineas: LineaReposicion[] = (sugerencias.data ?? []).map((s) => ({
    productoId: s.productoId,
    productoCodigo: s.productoCodigo,
    productoNombre: s.productoNombre,
    unidadBase: s.unidadBase,
    cantidad: cantidades[s.productoId] ?? String(s.cantidadSugerida),
  }))
  const aEnviar = lineas.filter((l) => !errorCantidad(l, true) && textoANumero(l.cantidad) > 0)
  const enviar = useMutation({
    mutationFn: () =>
      trasladosApi.enviar({
        origenId: origen.origenId,
        destinoId: Number(tiendaId),
        observacion: 'Reposición sugerida (productos en su stock mínimo)',
        detalles: aEnviar.map((l) => ({ productoId: l.productoId, presentacionId: null, cantidad: textoANumero(l.cantidad) })),
      }),
    onSuccess: (t) => {
      avisar(`Traslado ${t.codigo} enviado a ${t.destinoNombre}`)
      setCantidades({})
      for (const clave of ['reposicion', 'traslados', 'inventario', 'movimientos']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
    },
  })

  return (
    <Tarjeta className="mb-5">
      <TituloTarjeta titulo="Traslado sugerido" icono={<Sparkles className="size-4 text-marca-texto" />} />
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <CampoSelector etiqueta="Tienda a reponer" value={tiendaId} onChange={(e) => setTiendaId(e.target.value)}>
          <option value="">Elija la tienda</option>
          {tiendas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </CampoSelector>
        {origen.selector}
      </div>
      {tiendaId !== '' && (
        <>
          {sugerencias.isPending && <Cargando />}
          {sugerencias.isError && <MensajeError error={sugerencias.error} className="m-5" />}
          {sugerencias.data?.length === 0 && <EstadoVacio titulo="Nada que reponer" descripcion="Ningún producto de esta tienda llegó a su stock mínimo." />}
          {lineas.length > 0 && (
            <>
              <Tabla>
                <Thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th alinear="derecha">En la tienda</Th>
                    <Th alinear="derecha">Mínimo</Th>
                    <Th alinear="derecha">En almacén</Th>
                    <Th alinear="derecha">Enviar</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {lineas.map((l) => {
                    const s = sugerencias.data?.find((x) => x.productoId === l.productoId)
                    return (
                      <Tr key={l.productoId} data-testid={`sugerido-${l.productoCodigo}`}>
                        <Td>
                          <p className="font-semibold">{l.productoNombre}</p>
                          <p className="font-mono text-xs text-tinta-tenue">{l.productoCodigo}</p>
                        </Td>
                        <Td alinear="derecha" className="font-mono text-peligro">
                          {cantidad(s?.stockTienda ?? 0)}
                        </Td>
                        <Td alinear="derecha" className="font-mono">
                          {cantidad(s?.stockMinimo ?? 0)}
                        </Td>
                        <Td alinear="derecha" className="font-mono">
                          {cantidad(s?.stockAlmacen ?? 0)}
                        </Td>
                        <Td alinear="derecha">
                          <div className="flex items-center justify-end gap-1">
                            <Entrada
                              aria-label={`Enviar de ${l.productoNombre}`}
                              inputMode="decimal"
                              value={l.cantidad}
                              onChange={(e) => setCantidades((c) => ({ ...c, [l.productoId]: e.target.value }))}
                              className="w-24 font-mono"
                            />
                            <span className="text-xs text-tinta-suave">{sufijoUnidad(l.unidadBase)}</span>
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Tabla>
              <div className="flex items-center justify-end gap-3 p-5">
                {enviar.error && <MensajeError error={enviar.error} />}
                <Boton icono={<Send className="size-4" />} disabled={aEnviar.length === 0} cargando={enviar.isPending} onClick={() => enviar.mutate()}>
                  Enviar traslado ({aEnviar.length} producto{aEnviar.length === 1 ? '' : 's'})
                </Boton>
              </div>
            </>
          )}
        </>
      )}
    </Tarjeta>
  )
}
