import { Plus, Trash2 } from 'lucide-react'
import type { MetodoPagoResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { Entrada, Selector } from '@/componentes/ui/Campo'
import { nombreMetodoPago } from '@/logica/formato'
import type { PagoFormulario } from '@/logica/pagos'

/**
 * Pagos de una venta o abono (pago mixto). Cada pago tiene metodo, monto y, para Yape, Plin, deposito
 * y demas metodos que lo exigen, el numero de operacion.
 */
export function EditorPagos({
  pagos,
  metodos,
  onCambiar,
  restanteCentimos,
}: {
  pagos: PagoFormulario[]
  metodos: MetodoPagoResponse[]
  onCambiar: (pagos: PagoFormulario[]) => void
  /** Lo que falta pagar: se usa para completar el monto con el boton "Exacto" */
  restanteCentimos: number
}) {
  const actualizar = (i: number, cambios: Partial<PagoFormulario>) =>
    onCambiar(pagos.map((p, j) => (j === i ? { ...p, ...cambios } : p)))

  return (
    <div className="flex flex-col gap-2">
      {pagos.map((pago, i) => {
        const metodo = metodos.find((m) => m.codigo === pago.metodoPago)
        return (
          <div key={i} className="grid grid-cols-12 gap-2" data-testid={`pago-${i + 1}`}>
            <Selector
              aria-label={`Método del pago ${i + 1}`}
              className="col-span-5"
              value={pago.metodoPago}
              onChange={(e) => actualizar(i, { metodoPago: e.target.value, numeroOperacion: '' })}
            >
              {metodos.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {nombreMetodoPago(m.codigo, m.nombre)}
                </option>
              ))}
            </Selector>
            <div className="relative col-span-4">
              <Entrada
                aria-label={`Monto del pago ${i + 1}`}
                inputMode="decimal"
                placeholder="0.00"
                className="pr-14 font-mono"
                value={pago.monto}
                onChange={(e) => actualizar(i, { monto: e.target.value })}
              />
              {restanteCentimos > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const actual = Number(pago.monto.replace(',', '.')) || 0
                    actualizar(i, { monto: (actual + restanteCentimos / 100).toFixed(2) })
                  }}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md bg-beige px-1.5 py-1 text-[11px] font-semibold text-tinta-suave hover:bg-marca-claro hover:text-marca"
                  title="Completar el monto que falta"
                >
                  Exacto
                </button>
              )}
            </div>
            <div className="col-span-3 flex gap-1">
              {pagos.length > 1 && (
                <Boton variante="fantasma" tamano="sm" className="h-10" onClick={() => onCambiar(pagos.filter((_, j) => j !== i))} aria-label={`Quitar pago ${i + 1}`} icono={<Trash2 className="size-4" />} />
              )}
            </div>
            {metodo?.requiereReferencia && (
              <Entrada
                aria-label={`Número de operación del pago ${i + 1}`}
                placeholder={`N.° de operación de ${nombreMetodoPago(metodo.codigo, metodo.nombre)}`}
                className="col-span-9 font-mono"
                maxLength={50}
                value={pago.numeroOperacion}
                onChange={(e) => actualizar(i, { numeroOperacion: e.target.value })}
              />
            )}
          </div>
        )
      })}
      <div>
        <Boton
          variante="fantasma"
          tamano="sm"
          icono={<Plus className="size-4" />}
          onClick={() => onCambiar([...pagos, { metodoPago: metodos.find((m) => !m.efectivo)?.codigo ?? 'EFECTIVO', monto: '', numeroOperacion: '' }])}
          disabled={pagos.length >= 10}
        >
          Agregar otro método (pago mixto)
        </Boton>
      </div>
    </div>
  )
}
