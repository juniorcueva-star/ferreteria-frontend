import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { productosApi } from '@/api/catalogo'
import { cotizacionesApi } from '@/api/cotizaciones'
import type { ClienteResponse, CotizacionResponse, ProductoResponse } from '@/api/tipos'
import { clientesApi } from '@/api/ventas'
import { useUsuario } from '@/auth/contexto'
import { SelectorCliente } from '@/componentes/formularios/SelectorCliente'
import { SelectorProducto } from '@/componentes/formularios/SelectorProducto'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea, CampoSelector, CampoTexto, Entrada, Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import {
  aDetallesRequest,
  calcularLineaCotizacion,
  cambiarCantidad,
  lineaDesdeDetalle,
  nuevaLinea,
  completoDe,
  elegirOpcion,
  opcionDe,
  precioAutomaticoDe,
  precioListaDe,
  presentacionDe,
  totalesCotizacion,
  type LineaCotizacion,
} from '@/logica/cotizaciones'
import { soles, solesDeCentimos } from '@/logica/formato'
import { presentacionesActivas, presentacionPrincipal, textoDecimales } from '@/logica/presentaciones'
import { nulo } from '@/logica/validaciones'

interface DatosIniciales {
  cotizacion: CotizacionResponse | null
  cliente: ClienteResponse | null
  lineas: LineaCotizacion[]
}

/** Dias de validez de una cotizacion guardada (fecha de validez menos fecha de emision). */
function diasDeValidez(c: CotizacionResponse): string {
  const dias = Math.round((Date.parse(c.fechaValidez) - Date.parse(c.fecha.slice(0, 10))) / 86_400_000)
  return String(dias > 0 ? dias : 7)
}

/** Nueva cotizacion, o edicion de una en borrador (ruta /cotizaciones/:id/editar). */
export default function FormularioCotizacion() {
  const { id } = useParams()
  const cotizacionId = id ? Number(id) : null
  // Al editar se cargan la cotizacion, sus productos (con todas sus presentaciones) y su cliente
  const iniciales = useQuery({
    queryKey: ['cotizaciones', 'edicion', cotizacionId],
    enabled: cotizacionId !== null,
    gcTime: 0,
    queryFn: async (): Promise<DatosIniciales> => {
      const cotizacion = await cotizacionesApi.obtener(cotizacionId ?? 0)
      const ids = [...new Set(cotizacion.detalles.map((d) => d.productoId))]
      const productos = new Map((await Promise.all(ids.map((pid) => productosApi.obtener(pid)))).map((p) => [p.id, p]))
      const cliente = cotizacion.clienteId === null ? null : await clientesApi.obtener(cotizacion.clienteId)
      const lineas = cotizacion.detalles.flatMap((d) => {
        const producto = productos.get(d.productoId)
        return producto ? [lineaDesdeDetalle(d, producto)] : []
      })
      return { cotizacion, cliente, lineas }
    },
  })

  if (cotizacionId === null) return <Editor inicial={{ cotizacion: null, cliente: null, lineas: [] }} />
  if (iniciales.isPending) return <Cargando texto="Cargando cotización…" />
  if (iniciales.isError) return <MensajeError error={iniciales.error} />
  if (iniciales.data.cotizacion?.estado !== 'BORRADOR') {
    return <MensajeError error={new Error('Solo se edita una cotización en borrador')} />
  }
  return <Editor inicial={iniciales.data} />
}

function Editor({ inicial }: { inicial: DatosIniciales }) {
  const usuario = useUsuario()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas, seleccionadaId } = useUbicacion()
  const esAdmin = usuario.rol === 'ADMIN'
  const editando = inicial.cotizacion
  const tiendas = todas.filter((u) => u.tipo === 'TIENDA')
  const tiendaPorDefecto = editando?.ubicacionId ?? (tiendas.some((t) => t.id === seleccionadaId) ? seleccionadaId : null)

  const [tiendaElegida, setTiendaId] = useState(tiendaPorDefecto === null ? '' : String(tiendaPorDefecto))
  const [cliente, setCliente] = useState<ClienteResponse | null>(inicial.cliente)
  const [dias, setDias] = useState(editando ? diasDeValidez(editando) : '7')
  const [observacion, setObservacion] = useState(editando?.observacion ?? '')
  const [lineas, setLineas] = useState<LineaCotizacion[]>(inicial.lineas)
  const [intentado, setIntentado] = useState(false)

  const totales = totalesCotizacion(lineas)
  const diasNumero = Number(dias)
  const errores = {
    tienda: esAdmin && !tiendaElegida ? 'Elija la tienda que cotiza' : undefined,
    dias: !/^\d+$/.test(dias) || diasNumero < 1 || diasNumero > 90 ? 'Entre 1 y 90 días' : undefined,
  }

  const guardar = useMutation({
    mutationFn: () => {
      const datos = {
        ubicacionId: esAdmin ? Number(tiendaElegida) : null,
        clienteId: cliente?.id ?? null,
        diasValidez: diasNumero,
        observacion: nulo(observacion),
        detalles: aDetallesRequest(lineas),
      }
      return editando ? cotizacionesApi.actualizar(editando.id, datos) : cotizacionesApi.crear(datos)
    },
    onSuccess: (c) => {
      avisar(`Cotización ${c.codigo} guardada por ${soles(c.total)}`)
      queryClient.setQueryData(['cotizaciones', 'detalle', c.id], c)
      void queryClient.invalidateQueries({ queryKey: ['cotizaciones', 'listado'] })
      navegar(`/cotizaciones/${c.id}`)
    },
  })

  const enviar = () => {
    setIntentado(true)
    if (!errores.tienda && !errores.dias && totales.valido) guardar.mutate()
  }

  const agregar = (producto: ProductoResponse | null) => {
    if (!producto) return
    const presentacion = presentacionPrincipal(producto)
    if (!presentacion) {
      avisar(`${producto.nombre} no tiene presentaciones activas`, 'error')
      return
    }
    if (lineas.some((l) => l.presentacionId === presentacion.id)) {
      avisar(`${producto.nombre} (${presentacion.nombre}) ya está en la cotización: cambie la cantidad`, 'info')
      return
    }
    setLineas((ls) => [...ls, nuevaLinea(producto, presentacion)])
  }

  const actualizar = (clave: number, cambios: Partial<LineaCotizacion>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)))

  const volver = editando ? `/cotizaciones/${editando.id}` : '/cotizaciones'

  return (
    <div>
      <Link to={volver} className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca-texto">
        <ArrowLeft className="size-4" /> {editando ? `Volver a ${editando.codigo}` : 'Volver a cotizaciones'}
      </Link>
      <EncabezadoPagina
        titulo={editando ? `Editar ${editando.codigo}` : 'Nueva cotización'}
        subtitulo="Los precios empiezan con el de lista y se pueden cambiar. La cotización no toca el stock."
        acciones={
          <Boton tamano="lg" icono={<Save className="size-5" />} cargando={guardar.isPending} onClick={enviar}>
            Guardar cotización
          </Boton>
        }
      />
      {guardar.error && <MensajeError error={guardar.error} className="mb-5" />}

      <Tarjeta className="mb-5">
        <TituloTarjeta titulo="Datos" />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          {esAdmin && !editando ? (
            <CampoSelector
              etiqueta="Tienda"
              obligatorio
              value={tiendaElegida}
              onChange={(e) => setTiendaId(e.target.value)}
              error={intentado ? errores.tienda : undefined}
            >
              <option value="">Elija la tienda</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </CampoSelector>
          ) : (
            <CampoTexto etiqueta="Tienda" value={editando?.ubicacionNombre ?? usuario.ubicacionNombre ?? ''} disabled />
          )}
          <div className="xl:col-span-2">
            <p className="mb-1.5 text-sm font-semibold text-tinta">Cliente (opcional)</p>
            <SelectorCliente valor={cliente} onElegir={setCliente} />
          </div>
          <CampoTexto
            etiqueta="Días de validez"
            inputMode="numeric"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            error={intentado ? errores.dias : undefined}
          />
          <CampoArea
            etiqueta="Observación"
            className="md:col-span-2 xl:col-span-4"
            rows={2}
            maxLength={300}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </div>
      </Tarjeta>

      <Tarjeta className="mb-5">
        <TituloTarjeta titulo="Productos" />
        <div className="p-5">
          <SelectorProducto
            valor={null}
            onElegir={agregar}
            etiqueta="Agregar producto"
            placeholder="Buscar por palabras, código o abreviatura (Ej: per hex zin)…"
          />
        </div>
        {lineas.length === 0 ? (
          <EstadoVacio titulo="Sin productos" descripcion="Busca un producto y elígelo para agregarlo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-crema text-left text-xs font-semibold tracking-wide text-tinta-suave uppercase">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Presentación</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio (S/)</th>
                  <th className="px-4 py-3">Descuento (S/)</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3" aria-label="Quitar" />
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {lineas.map((l, i) => {
                  const presentacion = presentacionDe(l)
                  const completo = completoDe(l)
                  const precioLista = precioListaDe(l)
                  const calculo = calcularLineaCotizacion(l)
                  const completosActivos = l.producto.completos.filter((c) => c.activo || c.id === l.completoId)
                  return (
                    <tr key={l.clave} data-testid={`linea-cotizacion-${i}`} className="align-top">
                      <td className="min-w-48 px-4 py-3">
                        <p className="font-semibold">{l.producto.nombre}</p>
                        <p className="font-mono text-xs text-tinta-tenue">{l.producto.codigo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Selector
                          aria-label={`Presentación de ${l.producto.nombre}`}
                          value={opcionDe(l)}
                          onChange={(e) => setLineas((ls) => ls.map((x) => (x.clave === l.clave ? elegirOpcion(x, e.target.value) : x)))}
                          className="min-w-36"
                        >
                          {presentacionesActivas(l.producto).map((p) => (
                            <option key={p.id} value={`p${p.id}`}>
                              {p.nombre} · {soles(p.precioVenta)}
                            </option>
                          ))}
                          {completosActivos.length > 0 && (
                            <optgroup label="Completos">
                              {completosActivos.map((c) => (
                                <option key={c.id} value={`c${c.id}`}>
                                  {c.nombre} · {soles(c.precioVenta)}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </Selector>
                        {completo && <p className="mt-1 max-w-56 text-xs text-tinta-tenue">Incluye: {completo.composicion}</p>}
                        {!completo && presentacion && <p className="mt-1 text-xs text-tinta-tenue">{textoDecimales(presentacion.decimales)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Entrada
                          aria-label={`Cantidad de ${l.producto.nombre}`}
                          inputMode="decimal"
                          value={l.cantidad}
                          onChange={(e) => setLineas((ls) => ls.map((x) => (x.clave === l.clave ? cambiarCantidad(x, e.target.value) : x)))}
                          className="w-24 font-mono"
                          aria-invalid={calculo.error !== null ? true : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Entrada
                          aria-label={`Precio de ${l.producto.nombre}`}
                          inputMode="decimal"
                          value={l.precio}
                          onChange={(e) => actualizar(l.clave, { precio: e.target.value })}
                          className="w-28 font-mono"
                        />
                        {precioLista !== undefined && l.precio !== precioLista.toFixed(2) && (
                          <p className="mt-1 text-xs text-tinta-tenue">Lista: {soles(precioLista)}</p>
                        )}
                        {precioLista !== undefined && (precioAutomaticoDe(l) ?? precioLista) < precioLista && l.precio === precioAutomaticoDe(l)?.toFixed(2) && (
                          <p className="mt-1 text-xs font-semibold text-marca-texto">Precio por mayor</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Entrada
                          aria-label={`Descuento de ${l.producto.nombre}`}
                          inputMode="decimal"
                          placeholder="0.00"
                          value={l.descuento}
                          onChange={(e) => actualizar(l.clave, { descuento: e.target.value })}
                          className="w-24 font-mono"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {solesDeCentimos(calculo.subtotalCentimos)}
                        {calculo.error && (
                          <p className="mt-1 max-w-48 text-left font-sans text-xs font-normal text-peligro" role="alert">
                            {calculo.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Boton
                          variante="fantasma"
                          tamano="sm"
                          aria-label={`Quitar ${l.producto.nombre}`}
                          onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                        >
                          <Trash2 className="size-4" />
                        </Boton>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col items-end gap-1 border-t border-borde p-5 text-sm" data-testid="totales-cotizacion">
          <p>
            Op. gravada: <span className="font-mono">{solesDeCentimos(totales.baseCentimos)}</span>
          </p>
          <p>
            IGV (18 %): <span className="font-mono">{solesDeCentimos(totales.igvCentimos)}</span>
          </p>
          <p className="text-lg font-bold">
            Total: <span className="font-mono">{solesDeCentimos(totales.totalCentimos)}</span>
          </p>
          {intentado && totales.errores.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-peligro" role="alert">
              {totales.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      </Tarjeta>
    </div>
  )
}
