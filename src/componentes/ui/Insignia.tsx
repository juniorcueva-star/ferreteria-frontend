import type { ReactNode } from 'react'
import { cn } from './cn'

export type TonoInsignia = 'exito' | 'alerta' | 'peligro' | 'info' | 'neutro' | 'marca'

const TONOS: Record<TonoInsignia, string> = {
  exito: 'bg-exito-claro text-exito ring-exito/20',
  alerta: 'bg-alerta-claro text-alerta ring-alerta/20',
  peligro: 'bg-peligro-claro text-peligro ring-peligro/20',
  info: 'bg-info-claro text-info ring-info/20',
  neutro: 'bg-beige text-tinta-suave ring-borde',
  marca: 'bg-marca-claro text-marca-oscuro ring-marca/20',
}

/** Pastilla de estado (Activo, Anulada, En camino...). */
export function Insignia({ tono, children, className }: { tono: TonoInsignia; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        TONOS[tono],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}
