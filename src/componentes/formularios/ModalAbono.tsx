import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import type { VentaResponse } from '@/api/tipos'
import { fiadoApi } from '@/api/ventas'
import { Boton } from '@/componentes/ui/Boton'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { useCajaActual } from '@/hooks/useCajaActual'
import { useMetodosPago } from '@/hooks/useMetodosPago'
import { aCentimos } from '@/logica/decimales'
import { soles, solesDeCentimos } from '@/logica/formato'
import { aPagosRequest, validarAbono, type PagoFormulario } from '@/logica/pagos'
import { EditorPagos } from './EditorPagos'

/** Abono (pago parcial) a una venta al credito. Se cobra en la caja abierta y en la tienda de la venta. */
export function ModalAbono({ venta, onCerrar }: { venta: VentaResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const metodos = useMetodosPago()
  const caja = useCajaActual()
  const [pagos, setPagos] = useState<PagoFormulario[]>([{ metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }])
  const [intentado, setIntentado] = useState(false)
  const saldo = aCentimos(venta.saldoPendiente)
  const validacion = validarAbono(saldo, pagos, metodos.data ?? [])
  const otraTienda = caja.data && caja.data.ubicacionId !== venta.ubicacionId

  const abonar = useMutation({
    mutationFn: () => fiadoApi.abonar(venta.id, { pagos: aPagosRequest(pagos, metodos.data ?? []) }),
    onSuccess: (v) => {
      avisar(v.saldoPendiente > 0 ? `Abono registrado. Saldo pendiente: ${soles(v.saldoPendiente)}` : `Deuda de ${v.numeroDocumento} cancelada`)
      queryClient.setQueryData(['ventas', 'detalle', v.id], v)
      for (const clave of ['ventas', 'fiado', 'cajas', 'reportes', 'inicio']) {
        void queryClient.invalidateQueries({ queryKey: [clave] })
      }
      onCerrar()
    },
  })

  const enviar = () => {
    setIntentado(true)
    if (validacion.errores.length === 0) abonar.mutate()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Registrar abono · ${venta.numeroDocumento}`}
      descripcion={`${venta.clienteNombre ?? ''} · ${venta.ubicacionNombre}`}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={abonar.isPending} disabled={!caja.data}>
            Registrar abono
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {caja.data === null && (
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="alert">
            Debes <Link to="/caja" className="font-semibold text-marca underline">abrir tu caja</Link> para cobrar el abono.
          </p>
        )}
        {otraTienda && (
          <p className="rounded-xl bg-alerta-claro px-4 py-3 text-sm" role="alert">
            Tu caja está en {caja.data?.ubicacionNombre}: el abono debe cobrarse en {venta.ubicacionNombre}, la tienda de la venta.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-crema p-4 text-sm">
          <div>
            <p className="text-tinta-suave">Total de la venta</p>
            <p className="font-mono font-semibold">{soles(venta.total)}</p>
          </div>
          <div>
            <p className="text-tinta-suave">Saldo pendiente</p>
            <p className="font-mono text-lg font-bold text-alerta">{soles(venta.saldoPendiente)}</p>
          </div>
        </div>
        {abonar.error && <MensajeError error={abonar.error} />}
        {metodos.data && (
          <EditorPagos pagos={pagos} metodos={metodos.data} onCambiar={setPagos} restanteCentimos={Math.max(0, saldo - validacion.pagadoCentimos)} />
        )}
        <div className="flex justify-between text-sm">
          <span className="text-tinta-suave">Quedará debiendo</span>
          <span className="font-mono font-semibold">{solesDeCentimos(Math.max(0, saldo - validacion.pagadoCentimos))}</span>
        </div>
        {intentado && validacion.errores.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-peligro" role="alert">
            {validacion.errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
