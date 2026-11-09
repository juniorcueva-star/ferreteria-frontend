import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { encargosApi } from '@/api/encargos'
import type { ClienteResponse, CondicionVenta, EncargoResponse } from '@/api/tipos'
import { EditorPagos } from '@/componentes/formularios/EditorPagos'
import { SelectorCliente } from '@/componentes/formularios/SelectorCliente'
import { Boton } from '@/componentes/ui/Boton'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { useCajaActual } from '@/hooks/useCajaActual'
import { useMetodosPago } from '@/hooks/useMetodosPago'
import { aCentimos } from '@/logica/decimales'
import { cantidad, soles, solesDeCentimos } from '@/logica/formato'
import { aPagosRequest, calcularCobro, type PagoFormulario } from '@/logica/pagos'

/**
 * Confirma la entrega de un encargo: muestra la venta que se va a crear (tienda, producto, precio acordado y total) y
 * pide la forma de pago. Al confirmar se crea la venta y se descuenta el stock.
 */
export function ModalEntregaEncargo({ encargo, onCerrar }: { encargo: EncargoResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const caja = useCajaActual()
  const metodos = useMetodosPago()
  const [condicion, setCondicion] = useState<CondicionVenta>('CONTADO')
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [pagos, setPagos] = useState<PagoFormulario[]>([{ metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }])
  const [intentado, setIntentado] = useState(false)
  const total = aCentimos(encargo.total)
  const pagosEnviados = condicion === 'CONTADO' ? pagos : []
  const cobro = calcularCobro(total, condicion, pagosEnviados, metodos.data ?? [])
  const tieneCliente = encargo.clienteId !== null || cliente !== null
  const errores = [...cobro.errores, ...(condicion === 'CREDITO' && !tieneCliente ? ['Una venta a crédito necesita un cliente'] : [])]
  const otraTienda = caja.data && caja.data.ubicacionId !== encargo.ubicacionId

  const entregar = useMutation({
    mutationFn: () =>
      encargosApi.entregar(encargo.id, {
        condicion,
        clienteId: cliente?.id ?? null,
        fechaVencimiento: null,
        pagos: aPagosRequest(pagosEnviados, metodos.data ?? []),
      }),
    onSuccess: (e) => {
      avisar(`Encargo ${e.codigo} entregado · venta ${e.ventaNumero ?? ''}`)
      for (const clave of ['encargos', 'ventas', 'inventario', 'cajas', 'fiado', 'inicio']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
      onCerrar()
    },
  })

  const confirmar = () => {
    setIntentado(true)
    if (errores.length === 0) entregar.mutate()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Entregar encargo ${encargo.codigo}`}
      descripcion="Se creará esta venta y se descontará el stock de la tienda."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={confirmar} cargando={entregar.isPending} disabled={!caja.data || Boolean(otraTienda)}>
            Confirmar entrega
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {caja.data === null && (
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="alert">
            Debes <Link to="/caja" className="font-semibold text-marca underline">abrir tu caja</Link> para entregar el encargo.
          </p>
        )}
        {otraTienda && (
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="alert">
            Tu caja está en {caja.data?.ubicacionNombre}: el encargo se entrega en {encargo.ubicacionNombre}.
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-crema p-4 text-sm sm:grid-cols-4" data-testid="venta-del-encargo">
          <div>
            <dt className="text-tinta-suave">Tienda</dt>
            <dd className="font-semibold">{encargo.ubicacionNombre}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-tinta-suave">Producto</dt>
            <dd className="font-semibold">
              {cantidad(encargo.cantidad)} × {encargo.presentacionNombre} · {encargo.productoNombre}
            </dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Precio acordado</dt>
            <dd className="font-mono font-semibold">{soles(encargo.precioUnitario)}</dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Total</dt>
            <dd className="font-mono text-lg font-bold">{soles(encargo.total)}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-tinta-suave">Cliente</dt>
            <dd>{cliente?.nombre ?? encargo.clienteNombre ?? 'Cliente varios'}</dd>
          </div>
        </dl>
        <div className="flex gap-4" role="radiogroup" aria-label="Condición de la venta">
          {(['CONTADO', 'CREDITO'] as const).map((c) => (
            <label key={c} className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" className="size-4 accent-marca" checked={condicion === c} onChange={() => setCondicion(c)} name="condicion-entrega" />
              {c === 'CONTADO' ? 'Contado' : 'Crédito (fiado)'}
            </label>
          ))}
        </div>
        {condicion === 'CREDITO' && encargo.clienteId === null && (
          <div>
            <p className="mb-1 text-sm font-semibold text-tinta">Cliente</p>
            <SelectorCliente valor={cliente} onElegir={setCliente} />
          </div>
        )}
        {condicion === 'CONTADO' && metodos.data && (
          <>
            <EditorPagos pagos={pagos} metodos={metodos.data} onCambiar={setPagos} restanteCentimos={cobro.faltaCentimos} />
            {cobro.vueltoCentimos > 0 && (
              <p className="text-sm">
                Vuelto: <span className="font-mono font-semibold">{solesDeCentimos(cobro.vueltoCentimos)}</span>
              </p>
            )}
          </>
        )}
        {entregar.error && <MensajeError error={entregar.error} />}
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
