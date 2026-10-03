import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardPlus, SlidersHorizontal, Target } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router'
import { z } from 'zod'
import { inventarioApi } from '@/api/inventario'
import type { StockResponse, TipoAjuste } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { tienePermiso } from '@/auth/permisos'
import { EditorLineas } from '@/componentes/formularios/EditorLineas'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { CampoArea, CampoSelector, CampoTexto, Casilla } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { useRetraso } from '@/hooks/useRetraso'
import { textoANumero } from '@/logica/decimales'
import { cantidad, nombreUnidad, sufijoUnidad } from '@/logica/formato'
import { aLineasRequest, lineaVacia, validarLineas, type LineaEditable } from '@/logica/lineas'
import { permiteDecimales } from '@/logica/presentaciones'
import { cantidad as reglaCantidad, motivo } from '@/logica/validaciones'

/** Stock por ubicacion, stock minimo, ajustes con motivo e inventario inicial. */
export default function Inventario() {
  const usuario = useUsuario()
  const { seleccionadaId, seleccionada } = useUbicacion()
  const [parametros] = useSearchParams()
  const [texto, setTexto] = useState('')
  const [soloBajo, setSoloBajo] = useState(parametros.get('soloBajo') === '1')
  const [pagina, setPagina] = useState(0)
  const [ajuste, setAjuste] = useState(false)
  const [inicial, setInicial] = useState(false)
  const [minimo, setMinimo] = useState<StockResponse | null>(null)
  const busqueda = useRetraso(texto.trim())

  const filtro = {
    ubicacionId: seleccionadaId ?? undefined,
    texto: busqueda,
    soloBajo: soloBajo || undefined,
    page: pagina,
    size: 20,
    sort: ['producto.nombre,asc', 'ubicacion.nombre,asc'],
  }
  const stock = useQuery({
    queryKey: ['inventario', 'stock', 'listado', filtro],
    queryFn: () => inventarioApi.stock(filtro),
    placeholderData: keepPreviousData,
  })

  const puedeAjustar = tienePermiso(usuario.rol, 'inventario.ajustar')
  const puedeInicial = tienePermiso(usuario.rol, 'inventario.inicial')
  const puedeMinimo = tienePermiso(usuario.rol, 'inventario.minimo')
  const columnas = 6 + (puedeMinimo ? 1 : 0)

  return (
    <div>
      <EncabezadoPagina
        titulo="Inventario"
        subtitulo={`Stock en unidad base · ${seleccionada?.nombre ?? 'Todas las ubicaciones'}`}
        acciones={
          <>
            {puedeInicial && (
              <Boton variante="secundario" icono={<ClipboardPlus className="size-4" />} onClick={() => setInicial(true)}>
                Inventario inicial
              </Boton>
            )}
            {puedeAjustar && (
              <Boton icono={<SlidersHorizontal className="size-4" />} onClick={() => setAjuste(true)}>
                Ajuste de inventario
              </Boton>
            )}
          </>
        }
      />

      <Tarjeta className="mb-5 flex flex-wrap items-center gap-4 p-5">
        <Buscador
          valor={texto}
          onCambiar={(v) => {
            setTexto(v)
            setPagina(0)
          }}
          placeholder="Buscar por código o nombre…"
          aria-label="Buscar en el inventario"
          className="min-w-64 flex-1"
        />
        <Casilla
          etiqueta="Solo stock bajo"
          checked={soloBajo}
          onChange={(e) => {
            setSoloBajo(e.target.checked)
            setPagina(0)
          }}
        />
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Producto</Th>
              <Th>Ubicación</Th>
              <Th>Unidad</Th>
              <Th alinear="derecha">Stock</Th>
              <Th alinear="derecha">Mínimo</Th>
              <Th>Estado</Th>
              {puedeMinimo && <Th alinear="derecha">Acciones</Th>}
            </tr>
          </Thead>
          <Tbody>
            {stock.isPending && (
              <FilaCompleta columnas={columnas}>
                <Cargando />
              </FilaCompleta>
            )}
            {stock.isError && (
              <FilaCompleta columnas={columnas}>
                <MensajeError error={stock.error} />
              </FilaCompleta>
            )}
            {stock.data?.contenido.length === 0 && (
              <FilaCompleta columnas={columnas}>
                <EstadoVacio
                  titulo={soloBajo ? 'Ningún producto con stock bajo' : 'Sin stock registrado'}
                  descripcion={soloBajo ? 'Todos los productos están sobre su mínimo.' : 'Registra compras, traslados o el inventario inicial.'}
                />
              </FilaCompleta>
            )}
            {stock.data?.contenido.map((s) => (
              <Tr key={`${s.productoId}-${s.ubicacionId}`}>
                <Td>
                  <p className="font-semibold text-tinta">{s.productoNombre}</p>
                  <p className="font-mono text-xs text-tinta-tenue">{s.productoCodigo}</p>
                </Td>
                <Td className="text-tinta-suave">{s.ubicacionNombre}</Td>
                <Td className="text-tinta-suave">{nombreUnidad(s.unidadBase)}</Td>
                <Td alinear="derecha" className={cn('font-mono font-semibold', s.bajo ? 'text-peligro' : 'text-tinta')}>
                  {cantidad(s.cantidad)}
                </Td>
                <Td alinear="derecha" className="font-mono text-tinta-suave">
                  {s.stockMinimo > 0 ? cantidad(s.stockMinimo) : '—'}
                </Td>
                <Td>
                  {s.bajo ? <Insignia tono="peligro">Stock bajo</Insignia> : <Insignia tono="exito">Normal</Insignia>}
                </Td>
                {puedeMinimo && (
                  <Td alinear="derecha">
                    <Boton variante="fantasma" tamano="sm" icono={<Target className="size-4" />} onClick={() => setMinimo(s)}>
                      Mínimo
                    </Boton>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={stock.data} onCambiar={setPagina} />
      </Tarjeta>

      {puedeAjustar && ajuste && <ModalAjuste onCerrar={() => setAjuste(false)} />}
      {puedeInicial && inicial && <ModalInventarioInicial onCerrar={() => setInicial(false)} />}
      {minimo && <ModalStockMinimo stock={minimo} onCerrar={() => setMinimo(null)} />}
    </div>
  )
}

/** Ubicacion donde se opera: el ADMIN la elige; el almacenero usa la suya. */
function useUbicacionOperacion() {
  const usuario = useUsuario()
  const { todas, seleccionadaId } = useUbicacion()
  const esAdmin = usuario.rol === 'ADMIN'
  const [ubicacionId, setUbicacionId] = useState<string>(() =>
    String(esAdmin ? (seleccionadaId ?? '') : (usuario.ubicacionId ?? '')),
  )
  return { esAdmin, todas, ubicacionId, setUbicacionId }
}

function ModalAjuste({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { esAdmin, todas, ubicacionId, setUbicacionId } = useUbicacionOperacion()
  const [tipo, setTipo] = useState<TipoAjuste>('SALIDA')
  const [textoMotivo, setTextoMotivo] = useState('')
  const [lineas, setLineas] = useState<LineaEditable[]>(() => [lineaVacia()])
  const [intentado, setIntentado] = useState(false)

  const validacion = validarLineas(lineas)
  const errorMotivo = motivo(300).safeParse(textoMotivo).error?.issues[0]?.message
  const errorUbicacion = esAdmin && !ubicacionId ? 'Elija la ubicación' : undefined

  const guardar = useMutation({
    mutationFn: () =>
      inventarioApi.ajustar({
        ubicacionId: esAdmin ? Number(ubicacionId) : null,
        tipo,
        motivo: textoMotivo.trim(),
        detalles: aLineasRequest(lineas),
      }),
    onSuccess: (movimientos) => {
      avisar(`Ajuste registrado (${movimientos.length} producto(s))`)
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
      void queryClient.invalidateQueries({ queryKey: ['reportes'] })
      onCerrar()
    },
  })

  const enviar = () => {
    setIntentado(true)
    if (validacion.general || validacion.porLinea.size > 0 || errorMotivo || errorUbicacion) return
    guardar.mutate()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Ajuste de inventario"
      descripcion="Corrige el stock por merma, rotura o conteo físico. Queda registrado en el kardex con el motivo."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={guardar.isPending}>
            Registrar ajuste
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {guardar.error && <MensajeError error={guardar.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {esAdmin ? (
            <CampoSelector etiqueta="Ubicación" obligatorio value={ubicacionId} onChange={(e) => setUbicacionId(e.target.value)} error={intentado ? errorUbicacion : undefined}>
              <option value="">Elija la ubicación</option>
              {todas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </CampoSelector>
          ) : (
            <CampoTexto etiqueta="Ubicación" value={todas.find((u) => u.id === Number(ubicacionId))?.nombre ?? ''} disabled />
          )}
          <CampoSelector etiqueta="Tipo de ajuste" value={tipo} onChange={(e) => setTipo(e.target.value as TipoAjuste)}>
            <option value="SALIDA">Salida (merma, rotura, faltante)</option>
            <option value="ENTRADA">Entrada (sobrante, devolución)</option>
          </CampoSelector>
        </div>
        <CampoArea
          etiqueta="Motivo"
          obligatorio
          placeholder="Ej: rotura durante el despacho"
          value={textoMotivo}
          onChange={(e) => setTextoMotivo(e.target.value)}
          error={intentado ? errorMotivo : undefined}
        />
        {intentado && validacion.general && <p className="text-sm text-peligro">{validacion.general}</p>}
        <EditorLineas
          lineas={lineas}
          onCambiar={setLineas}
          errores={intentado ? validacion.porLinea : new Map()}
          ubicacionStockId={ubicacionId ? Number(ubicacionId) : null}
        />
      </div>
    </Modal>
  )
}

function ModalInventarioInicial({ onCerrar }: { onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas, ubicacionId, setUbicacionId } = useUbicacionOperacion()
  const [lineas, setLineas] = useState<LineaEditable[]>(() => [lineaVacia()])
  const [intentado, setIntentado] = useState(false)

  const validacion = validarLineas(lineas)
  const guardar = useMutation({
    mutationFn: () => inventarioApi.inventarioInicial({ ubicacionId: Number(ubicacionId), detalles: aLineasRequest(lineas) }),
    onSuccess: (movimientos) => {
      avisar(`Inventario inicial cargado (${movimientos.length} producto(s))`)
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
      onCerrar()
    },
  })
  const enviar = () => {
    setIntentado(true)
    if (!ubicacionId || validacion.general || validacion.porLinea.size > 0) return
    guardar.mutate()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Inventario inicial"
      descripcion="Carga el stock con el que se empieza. Solo para productos que aún no tienen movimientos en esa ubicación."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={guardar.isPending}>
            Cargar inventario
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {guardar.error && <MensajeError error={guardar.error} />}
        <CampoSelector
          etiqueta="Ubicación"
          obligatorio
          value={ubicacionId}
          onChange={(e) => setUbicacionId(e.target.value)}
          error={intentado && !ubicacionId ? 'Elija la ubicación' : undefined}
        >
          <option value="">Elija la ubicación</option>
          {todas.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </CampoSelector>
        {intentado && validacion.general && <p className="text-sm text-peligro">{validacion.general}</p>}
        <EditorLineas lineas={lineas} onCambiar={setLineas} errores={intentado ? validacion.porLinea : new Map()} />
      </div>
    </Modal>
  )
}

function ModalStockMinimo({ stock, onCerrar }: { stock: StockResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const decimales = permiteDecimales(stock.unidadBase) ? 3 : 0
  const esquema = z.object({
    stockMinimo: z.string().trim().refine((v) => v === '0' || reglaCantidad(decimales).safeParse(v).success, 'Cantidad inválida'),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ stockMinimo: string }>({
    resolver: zodResolver(esquema),
    defaultValues: { stockMinimo: cantidad(stock.stockMinimo) },
  })

  const guardar = useMutation({
    mutationFn: (valor: string) =>
      inventarioApi.definirMinimo({
        productoId: stock.productoId,
        ubicacionId: stock.ubicacionId,
        stockMinimo: textoANumero(valor),
      }),
    onSuccess: (s) => {
      avisar(`Stock mínimo de ${s.productoNombre} actualizado`)
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
      void queryClient.invalidateQueries({ queryKey: ['reportes'] })
      onCerrar()
    },
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Stock mínimo"
      descripcion={`${stock.productoNombre} · ${stock.ubicacionNombre}`}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={guardar.isPending} onClick={handleSubmit((d) => guardar.mutate(d.stockMinimo))}>
            Guardar
          </Boton>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => guardar.mutate(d.stockMinimo))} className="flex flex-col gap-4" noValidate>
        {guardar.error && <MensajeError error={guardar.error} />}
        <CampoTexto
          etiqueta={`Stock mínimo (${sufijoUnidad(stock.unidadBase)})`}
          inputMode="decimal"
          ayuda="Cuando el stock llegue a este valor aparecerá en la campana de alertas. Use 0 para no avisar."
          error={errors.stockMinimo?.message}
          mono
          {...register('stockMinimo')}
        />
      </form>
    </Modal>
  )
}
