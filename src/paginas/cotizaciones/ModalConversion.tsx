import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { cotizacionesApi } from '@/api/cotizaciones'
import type { ClienteResponse, CondicionVenta, CotizacionResponse } from '@/api/tipos'
import { EditorPagos } from '@/componentes/formularios/EditorPagos'
import { SelectorCliente } from '@/componentes/formularios/SelectorCliente'
import { Boton } from '@/componentes/ui/Boton'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { useCajaActual } from '@/hooks/useCajaActual'
import { useMetodosPago } from '@/hooks/useMetodosPago'
import { aCentimos } from '@/logica/decimales'
import { soles, solesDeCentimos } from '@/logica/formato'
import { aPagosRequest, calcularCobro, type PagoFormulario } from '@/logica/pagos'

/**
 * Confirma la conversion de la cotizacion en nota de venta: mismos productos, precios y total. Se cobra en la caja
 * abierta (que debe ser de la tienda de la cotizacion) y se descuenta el stock.
 */
export function ModalConversion({ cotizacion, onCerrar }: { cotizacion: CotizacionResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const caja = useCajaActual()
  const metodos = useMetodosPago()
  const [condicion, setCondicion] = useState<CondicionVenta>('CONTADO')
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const [pagos, setPagos] = useState<PagoFormulario[]>([{ metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }])
  const [intentado, setIntentado] = useState(false)
  const total = aCentimos(cotizacion.total)
  const pagosEnviados = condicion === 'CONTADO' ? pagos : []
  const cobro = calcularCobro(total, condicion, pagosEnviados, metodos.data ?? [])
  const tieneCliente = cotizacion.clienteId !== null || cliente !== null
  const errores = [...cobro.errores, ...(condicion === 'CREDITO' && !tieneCliente ? ['Una venta a crédito necesita un cliente'] : [])]
  const otraTienda = caja.data && caja.data.ubicacionId !== cotizacion.ubicacionId

  const convertir = useMutation({
    mutationFn: () =>
      cotizacionesApi.convertirEnVenta(cotizacion.id, {
        condicion,
        clienteId: cliente?.id ?? null,
        fechaVencimiento: null,
        pagos: aPagosRequest(pagosEnviados, metodos.data ?? []),
      }),
    onSuccess: (c) => {
      avisar(`Cotización ${c.codigo} convertida en la nota de venta ${c.ventaNumero ?? ''}`)
      queryClient.setQueryData(['cotizaciones', 'detalle', c.id], c)
      for (const clave of ['cotizaciones', 'ventas', 'inventario', 'cajas', 'fiado', 'inicio']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
      onCerrar()
    },
  })

  const confirmar = () => {
    setIntentado(true)
    if (errores.length === 0) convertir.mutate()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Convertir ${cotizacion.codigo} en nota de venta`}
      descripcion="Se registrará la venta con los mismos precios y se descontará el stock de la tienda. Solo se puede hacer una vez."
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={confirmar} cargando={convertir.isPending} disabled={!caja.data || Boolean(otraTienda)}>
            Confirmar venta
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {caja.data === null && (
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="alert">
            Debes <Link to="/caja" className="font-semibold text-marca underline">abrir tu caja</Link> para registrar la venta.
          </p>
        )}
        {otraTienda && (
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="alert">
            Tu caja está en {caja.data?.ubicacionNombre}: la cotización es de {cotizacion.ubicacionNombre}.
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-crema p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-tinta-suave">Tienda</dt>
            <dd className="font-semibold">{cotizacion.ubicacionNombre}</dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Productos</dt>
            <dd className="font-semibold">{cotizacion.detalles.length}</dd>
          </div>
          <div>
            <dt className="text-tinta-suave">Total</dt>
            <dd className="font-mono text-lg font-bold">{soles(cotizacion.total)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-tinta-suave">Cliente</dt>
            <dd>{cliente?.nombre ?? cotizacion.clienteNombre ?? 'Cliente varios'}</dd>
          </div>
        </dl>
        <div className="flex gap-4" role="radiogroup" aria-label="Condición de la venta">
          {(['CONTADO', 'CREDITO'] as const).map((c) => (
            <label key={c} className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" className="size-4 accent-marca" checked={condicion === c} onChange={() => setCondicion(c)} name="condicion-conversion" />
              {c === 'CONTADO' ? 'Contado' : 'Crédito (fiado)'}
            </label>
          ))}
        </div>
        {condicion === 'CREDITO' && cotizacion.clienteId === null && (
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
        {convertir.error && <MensajeError error={convertir.error} />}
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
