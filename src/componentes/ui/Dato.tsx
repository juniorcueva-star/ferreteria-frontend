import type { ReactNode } from 'react'

/** Par etiqueta/valor para fichas de detalle (venta, traslado, caja). */
export function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-tinta-tenue uppercase">{titulo}</p>
      <div className="mt-1 text-sm text-tinta">{children}</div>
    </div>
  )
}
