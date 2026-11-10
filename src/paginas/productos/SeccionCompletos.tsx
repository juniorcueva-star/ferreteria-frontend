import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { productosApi } from '@/api/catalogo'
import type { CompletoResponse, ProductoResponse } from '@/api/tipos'
import { SelectorProducto } from '@/componentes/formularios/SelectorProducto'
import { Boton } from '@/componentes/ui/Boton'
import { Casilla, CampoTexto, Entrada, Selector } from '@/componentes/ui/Campo'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { erroresCompleto, errorPieza, sumaPiezasCentimos, type PiezaEditable } from '@/logica/completos'
import { textoANumero } from '@/logica/decimales'
import { soles, solesDeCentimos } from '@/logica/formato'
import { presentacionesActivas, presentacionPrincipal, textoDecimales } from '@/logica/presentaciones'

let siguienteClave = 1

function piezaDe(producto: ProductoResponse, presentacionId?: number, cantidad = '1'): PiezaEditable | null {
  const presentacion = presentacionId
    ? producto.presentaciones.find((p) => p.id === presentacionId)
    : presentacionPrincipal(producto)
  if (!presentacion) return null
  return {
    clave: siguienteClave++,
    productoId: producto.id,
    productoNombre: producto.nombre,
    presentaciones: presentacionesActivas(producto),
    presentacionId: presentacion.id,
    cantidad,
  }
}

/**
 * Completos del producto (pedido del dueño): el producto junto con otras piezas a precio propio, Ej: perno + tuerca
 * + arandela. Se guardan al momento, aparte del formulario del producto.
 */
export function SeccionCompletos({ producto }: { producto: ProductoResponse }) {
  const [editando, setEditando] = useState<CompletoResponse | 'nuevo' | null>(null)
  return (
    <Tarjeta className="mt-5">
      <TituloTarjeta
        titulo="Completos"
        icono={<Boxes className="size-4 text-marca-texto" />}
        accion={
          <Boton tamano="sm" icono={<Plus className="size-4" />} onClick={() => setEditando('nuevo')}>
            Agregar completo
          </Boton>
        }
      />
      <p className="px-5 pt-3 text-sm text-tinta-suave">
        Vende este producto junto con otras piezas a un precio propio. Ej: perno + tuerca + arandela, o bisagra + 6
        tornillos. Al venderlo se descuenta el stock de cada pieza.
      </p>
      {producto.completos.length === 0 ? (
        <EstadoVacio titulo="Sin completos" descripcion="Use «Agregar completo» para crear el primero." />
      ) : (
        <Tabla>
          <Thead>
            <tr>
              <Th>Completo</Th>
              <Th>Incluye</Th>
              <Th alinear="derecha">Precio</Th>
              <Th alinear="derecha">Suma de piezas</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {producto.completos.map((c) => (
              <Tr key={c.id} data-testid={`completo-${c.nombre}`}>
                <Td className="font-semibold">{c.nombre}</Td>
                <Td className="min-w-64 text-sm text-tinta-suave">{c.composicion}</Td>
                <Td alinear="derecha" className="font-mono font-semibold">
                  {soles(c.precioVenta)}
                </Td>
                <Td alinear="derecha" className="font-mono text-tinta-suave">
                  {soles(c.precioSugerido)}
                </Td>
                <Td>
                  <Insignia tono={c.activo ? 'exito' : 'neutro'}>{c.activo ? 'Activo' : 'Inactivo'}</Insignia>
                </Td>
                <Td alinear="derecha">
                  <Boton variante="fantasma" tamano="sm" icono={<Pencil className="size-4" />} onClick={() => setEditando(c)}>
                    Editar
                  </Boton>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
      )}
      {editando && (
        <ModalCompleto producto={producto} completo={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />
      )}
    </Tarjeta>
  )
}

function ModalCompleto({
  producto,
  completo,
  onCerrar,
}: {
  producto: ProductoResponse
  completo: CompletoResponse | null
  onCerrar: () => void
}) {
  // Al editar se cargan los productos de las piezas para poder cambiar su presentacion
  const piezasGuardadas = useQuery({
    queryKey: ['productos', 'piezas', completo?.id],
    enabled: completo !== null,
    gcTime: 0,
    queryFn: async () => {
      const ids = [...new Set(completo?.componentes.map((c) => c.productoId) ?? [])]
      const productos = new Map((await Promise.all(ids.map((id) => productosApi.obtener(id)))).map((p) => [p.id, p]))
      return (completo?.componentes ?? []).flatMap((c) => {
        const p = productos.get(c.productoId)
        const pieza = p ? piezaDe(p, c.presentacionId, String(c.cantidad)) : null
        return pieza ? [pieza] : []
      })
    },
  })
  if (completo && piezasGuardadas.isPending) {
    return (
      <Modal abierto onCerrar={onCerrar} titulo={`Editar completo ${completo.nombre}`}>
        <Cargando />
      </Modal>
    )
  }
  if (completo && piezasGuardadas.isError) {
    return (
      <Modal abierto onCerrar={onCerrar} titulo={`Editar completo ${completo.nombre}`}>
        <MensajeError error={piezasGuardadas.error} />
      </Modal>
    )
  }
  const iniciales = completo ? (piezasGuardadas.data ?? []) : [piezaDe(producto)].flatMap((p) => (p ? [p] : []))
  return <EditorCompleto producto={producto} completo={completo} iniciales={iniciales} onCerrar={onCerrar} />
}

function EditorCompleto({
  producto,
  completo,
  iniciales,
  onCerrar,
}: {
  producto: ProductoResponse
  completo: CompletoResponse | null
  iniciales: PiezaEditable[]
  onCerrar: () => void
}) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [nombre, setNombre] = useState(completo?.nombre ?? 'Completo')
  const [piezas, setPiezas] = useState<PiezaEditable[]>(iniciales)
  const [precio, setPrecio] = useState(completo ? completo.precioVenta.toFixed(2) : '')
  const [activo, setActivo] = useState(completo?.activo ?? true)
  const [intentado, setIntentado] = useState(false)
  const suma = sumaPiezasCentimos(piezas)
  const errores = erroresCompleto(nombre, piezas, precio)

  const guardar = useMutation({
    mutationFn: () => {
      const datos = {
        nombre: nombre.trim(),
        precioVenta: precio.trim() === '' ? null : textoANumero(precio),
        activo,
        componentes: piezas.map((p) => ({ presentacionId: p.presentacionId, cantidad: textoANumero(p.cantidad) })),
      }
      return completo ? productosApi.actualizarCompleto(producto.id, completo.id, datos) : productosApi.crearCompleto(producto.id, datos)
    },
    onSuccess: (c) => {
      avisar(`Completo ${c.nombre} guardado a ${soles(c.precioVenta)}`)
      void queryClient.invalidateQueries({ queryKey: ['productos'] })
      onCerrar()
    },
  })
  const enviar = () => {
    setIntentado(true)
    if (errores.length === 0) guardar.mutate()
  }
  const actualizar = (clave: number, cambios: Partial<PiezaEditable>) =>
    setPiezas((ps) => ps.map((p) => (p.clave === clave ? { ...p, ...cambios } : p)))
  const agregarPieza = (elegido: ProductoResponse | null) => {
    const pieza = elegido ? piezaDe(elegido) : null
    if (!elegido) return
    if (!pieza) {
      avisar(`${elegido.nombre} no tiene presentaciones activas`, 'error')
      return
    }
    setPiezas((ps) => [...ps, pieza])
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={completo ? `Editar completo ${completo.nombre}` : `Nuevo completo de ${producto.nombre}`}
      descripcion="Elija las piezas y cuántas lleva cada completo. Sin precio, se usa la suma de las piezas."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={guardar.isPending}>
            Guardar completo
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CampoTexto etiqueta="Nombre del completo" obligatorio placeholder="Completo, Con tuerca, Con tornillos…" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={50} />
        <div>
          <p className="mb-2 text-sm font-semibold text-tinta">Piezas (por cada completo)</p>
          <ul className="flex flex-col gap-2">
            {piezas.map((p) => {
              const error = errorPieza(p)
              const presentacion = p.presentaciones.find((x) => x.id === p.presentacionId)
              return (
                <li
                  key={p.clave}
                  className="grid grid-cols-[1fr_5.5rem] items-center gap-2 rounded-xl border border-borde p-2 sm:grid-cols-[1fr_5.5rem_11rem_auto]"
                  data-testid="pieza-completo"
                >
                  <span className="text-sm font-semibold">{p.productoNombre}</span>
                  <Entrada
                    aria-label={`Cantidad de ${p.productoNombre}`}
                    inputMode="decimal"
                    value={p.cantidad}
                    onChange={(e) => actualizar(p.clave, { cantidad: e.target.value })}
                    className="font-mono"
                    aria-invalid={intentado && error ? true : undefined}
                  />
                  <Selector
                    aria-label={`Presentación de ${p.productoNombre}`}
                    value={p.presentacionId}
                    onChange={(e) => actualizar(p.clave, { presentacionId: Number(e.target.value) })}
                  >
                    {p.presentaciones.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre} · {soles(x.precioVenta)}
                      </option>
                    ))}
                  </Selector>
                  <Boton variante="fantasma" tamano="sm" aria-label={`Quitar ${p.productoNombre}`} onClick={() => setPiezas((ps) => ps.filter((x) => x.clave !== p.clave))}>
                    <Trash2 className="size-4" />
                  </Boton>
                  {intentado && error && (
                    <p className="col-span-full text-xs text-peligro">
                      {error} ({presentacion ? textoDecimales(presentacion.decimales).toLowerCase() : ''})
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-3">
            <SelectorProducto valor={null} onElegir={agregarPieza} etiqueta="Agregar pieza" placeholder="Buscar tuerca, arandela, tornillo…" />
          </div>
        </div>
        <div className="grid gap-3 rounded-xl bg-crema p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-tinta-suave">Suma de las piezas (precio de lista)</p>
            <p className="font-mono text-lg font-bold" data-testid="suma-piezas">
              {solesDeCentimos(suma)}
            </p>
            <Boton variante="secundario" tamano="sm" className="mt-1" onClick={() => setPrecio((suma / 100).toFixed(2))}>
              Usar la suma
            </Boton>
          </div>
          <CampoTexto
            etiqueta="Precio del completo (S/)"
            inputMode="decimal"
            placeholder={(suma / 100).toFixed(2)}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            mono
            ayuda="Puede ser menor que la suma para dar un descuento por llevarlo completo."
          />
        </div>
        {completo && <Casilla etiqueta="Completo activo (se puede vender)" checked={activo} onChange={(e) => setActivo(e.target.checked)} />}
        {guardar.error && <MensajeError error={guardar.error} />}
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
