import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { reposicionApi } from '@/api/reposicion'
import type { ProductoResponse } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { SelectorProducto } from '@/componentes/formularios/SelectorProducto'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea, CampoSelector, Entrada } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { useUbicacion } from '@/contexto/ubicacion'
import { textoANumero } from '@/logica/decimales'
import { cantidad, sufijoUnidad } from '@/logica/formato'
import { errorCantidad, ponerLinea, type LineaReposicion } from '@/logica/reposicion'
import { nulo } from '@/logica/validaciones'

function lineaDe(p: ProductoResponse, cantidadInicial = ''): LineaReposicion {
  return { productoId: p.id, productoCodigo: p.codigo, productoNombre: p.nombre, unidadBase: p.unidadBase, cantidad: cantidadInicial }
}

/**
 * Pedido de reposicion de la tienda al almacen. "Agregar lo que esta en el minimo" trae los productos de la tienda
 * que llegaron a su stock minimo con la cantidad sugerida. Cantidades en unidad base (unidades, kilos, metros).
 */
export function ModalPedidoReposicion({
  productoInicial,
  tiendaInicial,
  onCerrar,
}: {
  productoInicial?: ProductoResponse
  /** Tienda del pedido (el ADMIN puede cambiarla; el VENDEDOR siempre pide para la suya) */
  tiendaInicial?: number | null
  onCerrar: () => void
}) {
  const usuario = useUsuario()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas } = useUbicacion()
  const esAdmin = usuario.rol === 'ADMIN'
  const tiendas = todas.filter((u) => u.tipo === 'TIENDA')
  const [tiendaId, setTiendaId] = useState(String(tiendaInicial ?? (esAdmin ? (tiendas[0]?.id ?? '') : (usuario.ubicacionId ?? ''))))
  const [lineas, setLineas] = useState<LineaReposicion[]>(productoInicial ? [lineaDe(productoInicial)] : [])
  const [observacion, setObservacion] = useState('')
  const [intentado, setIntentado] = useState(false)
  const errores = [
    ...(lineas.length === 0 ? ['Agregue al menos un producto'] : []),
    ...(lineas.some((l) => errorCantidad(l)) ? ['Revise las cantidades'] : []),
    ...(esAdmin && !tiendaId ? ['Elija la tienda'] : []),
  ]

  const sugerir = useMutation({
    mutationFn: () => reposicionApi.sugerencias(esAdmin ? Number(tiendaId) : undefined),
    onSuccess: (sugerencias) => {
      if (sugerencias.length === 0) {
        avisar('No hay productos en su stock mínimo en esta tienda', 'info')
        return
      }
      setLineas((actuales) =>
        sugerencias.reduce(
          (ls, s) =>
            ponerLinea(ls, {
              productoId: s.productoId,
              productoCodigo: s.productoCodigo,
              productoNombre: s.productoNombre,
              unidadBase: s.unidadBase,
              cantidad: String(s.cantidadSugerida),
            }),
          actuales,
        ),
      )
    },
  })
  const pedir = useMutation({
    mutationFn: () =>
      reposicionApi.crear({
        ubicacionId: esAdmin ? Number(tiendaId) : null,
        observacion: nulo(observacion),
        detalles: lineas.map((l) => ({ productoId: l.productoId, cantidad: textoANumero(l.cantidad) })),
      }),
    onSuccess: (s) => {
      avisar(`Pedido ${s.codigo} enviado al almacén`)
      void queryClient.invalidateQueries({ queryKey: ['reposicion'] })
      onCerrar()
    },
  })
  const enviar = () => {
    setIntentado(true)
    if (errores.length === 0) pedir.mutate()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Pedir reposición al almacén"
      descripcion="El almacén verá el pedido y lo enviará con un traslado. Cantidades en unidades, kilos o metros."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={pedir.isPending}>
            Enviar pedido
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {esAdmin && (
          <CampoSelector etiqueta="Tienda que pide" value={tiendaId} onChange={(e) => setTiendaId(e.target.value)}>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </CampoSelector>
        )}
        <Boton variante="secundario" icono={<Sparkles className="size-4" />} cargando={sugerir.isPending} onClick={() => sugerir.mutate()} className="self-start">
          Agregar lo que está en su stock mínimo
        </Boton>
        {sugerir.error && <MensajeError error={sugerir.error} />}
        <ul className="flex flex-col gap-2">
          {lineas.map((l) => {
            const error = errorCantidad(l)
            return (
              <li key={l.productoId} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2 rounded-xl border border-borde p-2" data-testid="linea-pedido">
                <span className="text-sm">
                  <span className="font-semibold">{l.productoNombre}</span>{' '}
                  <span className="font-mono text-xs text-tinta-tenue">{l.productoCodigo}</span>
                </span>
                <div className="flex items-center gap-1">
                  <Entrada
                    aria-label={`Cantidad pedida de ${l.productoNombre}`}
                    inputMode="decimal"
                    value={l.cantidad}
                    placeholder="0"
                    onChange={(e) => setLineas((ls) => ls.map((x) => (x.productoId === l.productoId ? { ...x, cantidad: e.target.value } : x)))}
                    className="font-mono"
                    aria-invalid={intentado && error ? true : undefined}
                  />
                  <span className="text-xs text-tinta-suave">{sufijoUnidad(l.unidadBase)}</span>
                </div>
                <Boton variante="fantasma" tamano="sm" aria-label={`Quitar ${l.productoNombre}`} onClick={() => setLineas((ls) => ls.filter((x) => x.productoId !== l.productoId))}>
                  <Trash2 className="size-4" />
                </Boton>
                {intentado && error && <p className="col-span-full text-xs text-peligro">{error}</p>}
              </li>
            )
          })}
        </ul>
        <SelectorProducto
          valor={null}
          onElegir={(p) => p && setLineas((ls) => ponerLinea(ls, lineaDe(p, ls.find((x) => x.productoId === p.id)?.cantidad ?? '')))}
          etiqueta="Agregar producto"
          excluir={lineas.map((l) => l.productoId)}
        />
        <CampoArea etiqueta="Observación (opcional)" rows={2} maxLength={300} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        {pedir.error && <MensajeError error={pedir.error} />}
        {intentado && errores.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-peligro" role="alert">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {lineas.length > 0 && (
          <p className="text-xs text-tinta-tenue">
            {lineas.length} producto{lineas.length === 1 ? '' : 's'} ·{' '}
            {lineas
              .filter((l) => !errorCantidad(l))
              .map((l) => `${cantidad(textoANumero(l.cantidad))} ${sufijoUnidad(l.unidadBase)}`)
              .join(' · ')}
          </p>
        )}
      </div>
    </Modal>
  )
}
