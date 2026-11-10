import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { inventarioApi } from '@/api/inventario'
import type { ConteoResponse, StockResponse } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { CampoSelector, CampoTexto, Entrada } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { useRetraso } from '@/hooks/useRetraso'
import { textoANumero } from '@/logica/decimales'
import { cantidad, sufijoUnidad } from '@/logica/formato'
import { decimalesDeUnidad, errorCantidad } from '@/logica/reposicion'
import { nulo } from '@/logica/validaciones'

interface Contado {
  stock: StockResponse
  texto: string
}

/**
 * Inventario fisico: el almacenero cuenta los productos y escribe lo que hay. El sistema muestra la diferencia con el
 * stock y, al aplicar, crea los ajustes de entrada o salida. Solo se envian los productos que se contaron.
 */
export default function Conteo() {
  const usuario = useUsuario()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas, seleccionadaId } = useUbicacion()
  const esAdmin = usuario.rol === 'ADMIN'
  const [ubicacionId, setUbicacionId] = useState(String(esAdmin ? (seleccionadaId ?? todas.find((u) => u.tipo === 'ALMACEN')?.id ?? '') : (usuario.ubicacionId ?? '')))
  const [texto, setTexto] = useState('')
  const busqueda = useRetraso(texto.trim(), 300)
  const [contados, setContados] = useState<Record<number, Contado>>({})
  const [observacion, setObservacion] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<ConteoResponse | null>(null)

  const filtro = { ubicacionId: ubicacionId ? Number(ubicacionId) : undefined, texto: busqueda || undefined, page: 0, size: 100, sort: 'producto.nombre' }
  const stock = useQuery({
    queryKey: ['inventario', 'conteo', filtro],
    queryFn: () => inventarioApi.stock(filtro),
    enabled: ubicacionId !== '',
    placeholderData: keepPreviousData,
  })
  const lista = Object.values(contados)
  const invalidos = lista.filter((c) => c.texto.trim() !== '' && errorCantidad({ ...c.stock, cantidad: c.texto }, true))
  const validos = lista.filter((c) => c.texto.trim() !== '' && !errorCantidad({ ...c.stock, cantidad: c.texto }, true))
  const conDiferencia = validos.filter((c) => textoANumero(c.texto) !== c.stock.cantidad)

  const aplicar = useMutation({
    mutationFn: () =>
      inventarioApi.conteo({
        ubicacionId: esAdmin ? Number(ubicacionId) : null,
        observacion: nulo(observacion),
        detalles: validos.map((c) => ({ productoId: c.stock.productoId, cantidadContada: textoANumero(c.texto) })),
      }),
    onSuccess: (r) => {
      setConfirmando(false)
      setResultado(r)
      setContados({})
      avisar(`Conteo aplicado: ${r.conDiferencia} producto(s) ajustado(s) de ${r.productosContados} contados`)
      for (const clave of ['inventario', 'movimientos', 'reportes', 'auditoria']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
    },
  })
  const escribir = (s: StockResponse, valor: string) =>
    setContados((c) => {
      const nuevo = { ...c }
      if (valor === '') delete nuevo[s.productoId]
      else nuevo[s.productoId] = { stock: s, texto: valor }
      return nuevo
    })

  return (
    <div>
      <Link to="/inventario" className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca-texto">
        <ArrowLeft className="size-4" /> Volver a inventario
      </Link>
      <EncabezadoPagina
        titulo="Inventario físico"
        subtitulo="Cuente los productos y escriba lo que hay. El sistema ajusta las diferencias (sobrantes y faltantes)."
        acciones={
          <Boton
            tamano="lg"
            icono={<ClipboardCheck className="size-5" />}
            disabled={validos.length === 0 || invalidos.length > 0}
            onClick={() => setConfirmando(true)}
          >
            Aplicar conteo ({validos.length})
          </Boton>
        }
      />
      <Tarjeta className="mb-5 grid gap-4 p-5 md:grid-cols-3">
        {esAdmin ? (
          <CampoSelector
            etiqueta="Ubicación"
            value={ubicacionId}
            onChange={(e) => {
              setUbicacionId(e.target.value)
              setContados({})
            }}
          >
            {todas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </CampoSelector>
        ) : (
          <CampoTexto etiqueta="Ubicación" value={usuario.ubicacionNombre ?? ''} disabled />
        )}
        <div className="self-end">
          <Buscador valor={texto} onCambiar={setTexto} placeholder="Buscar producto por nombre o código…" aria-label="Buscar producto a contar" />
        </div>
        <p className="self-end pb-2 text-sm text-tinta-suave">
          Contados: <strong>{validos.length}</strong> · Con diferencia: <strong className={conDiferencia.length > 0 ? 'text-alerta' : ''}>{conDiferencia.length}</strong>
          {invalidos.length > 0 && <span className="block text-peligro">{invalidos.length} cantidad(es) mal escrita(s)</span>}
        </p>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Producto</Th>
              <Th>Ubicación física</Th>
              <Th alinear="derecha">En el sistema</Th>
              <Th alinear="derecha">Contado</Th>
              <Th alinear="derecha">Diferencia</Th>
            </tr>
          </Thead>
          <Tbody>
            {stock.isPending && ubicacionId !== '' && (
              <FilaCompleta columnas={5}>
                <Cargando />
              </FilaCompleta>
            )}
            {stock.isError && (
              <FilaCompleta columnas={5}>
                <MensajeError error={stock.error} />
              </FilaCompleta>
            )}
            {stock.data?.contenido.length === 0 && (
              <FilaCompleta columnas={5}>
                <EstadoVacio titulo="Sin productos" descripcion="No hay productos con stock que coincidan con la búsqueda." />
              </FilaCompleta>
            )}
            {stock.data?.contenido.map((s) => {
              const actual = contados[s.productoId]?.texto ?? ''
              const valido = actual.trim() !== '' && !errorCantidad({ ...s, cantidad: actual }, true)
              const diferencia = valido ? textoANumero(actual) - s.cantidad : null
              return (
                <Tr key={s.productoId} data-testid={`conteo-${s.productoCodigo}`}>
                  <Td>
                    <p className="font-semibold">{s.productoNombre}</p>
                    <p className="font-mono text-xs text-tinta-tenue">{s.productoCodigo}</p>
                  </Td>
                  <Td className="text-sm text-tinta-suave">{s.ubicacionFisica ?? '—'}</Td>
                  <Td alinear="derecha" className="font-mono">
                    {cantidad(s.cantidad)} {sufijoUnidad(s.unidadBase)}
                  </Td>
                  <Td alinear="derecha">
                    <Entrada
                      aria-label={`Contado de ${s.productoNombre}`}
                      inputMode={decimalesDeUnidad(s.unidadBase) === 0 ? 'numeric' : 'decimal'}
                      placeholder="—"
                      value={actual}
                      onChange={(e) => escribir(s, e.target.value)}
                      className="ml-auto w-24! text-right font-mono"
                    />
                  </Td>
                  <Td
                    alinear="derecha"
                    className={cn('font-mono font-semibold', diferencia === null ? 'text-tinta-tenue' : diferencia > 0 ? 'text-info' : diferencia < 0 ? 'text-peligro' : 'text-exito')}
                  >
                    {diferencia === null ? '' : diferencia === 0 ? 'Cuadra' : `${diferencia > 0 ? '+' : ''}${cantidad(diferencia)}`}
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Tabla>
      </Tarjeta>

      {confirmando && (
        <Modal
          abierto
          onCerrar={() => setConfirmando(false)}
          titulo="Aplicar inventario físico"
          descripcion={`${validos.length} producto(s) contados; ${conDiferencia.length} con diferencia se ajustarán en el stock y quedarán en el kardex.`}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setConfirmando(false)}>
                Cancelar
              </Boton>
              <Boton cargando={aplicar.isPending} onClick={() => aplicar.mutate()}>
                Aplicar ajustes
              </Boton>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {conDiferencia.map((c) => {
              const d = textoANumero(c.texto) - c.stock.cantidad
              return (
                <p key={c.stock.productoId} className="flex justify-between text-sm">
                  <span>{c.stock.productoNombre}</span>
                  <span className={cn('font-mono font-semibold', d > 0 ? 'text-info' : 'text-peligro')}>
                    {d > 0 ? 'Sobran ' : 'Faltan '}
                    {cantidad(Math.abs(d))} {sufijoUnidad(c.stock.unidadBase)}
                  </span>
                </p>
              )
            })}
            <CampoTexto etiqueta="Observación (opcional)" placeholder="Conteo de fin de mes" maxLength={200} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            {aplicar.error && <MensajeError error={aplicar.error} />}
          </div>
        </Modal>
      )}
      {resultado && (
        <Modal abierto onCerrar={() => setResultado(null)} titulo="Conteo aplicado" descripcion={resultado.ubicacionNombre} pie={<Boton onClick={() => setResultado(null)}>Listo</Boton>}>
          <p className="text-sm" data-testid="resultado-conteo">
            Se contaron <strong>{resultado.productosContados}</strong> producto(s); <strong>{resultado.conDiferencia}</strong> tenían
            diferencia y se ajustaron. Los cambios están en Movimientos (kardex) y en la Auditoría.
          </p>
        </Modal>
      )}
    </div>
  )
}
