import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export function Tarjeta({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-borde bg-white shadow-xs', className)} {...props} />
}

export function TituloTarjeta({ titulo, accion, icono }: { titulo: string; accion?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-borde px-5 py-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-tinta">
        {icono}
        {titulo}
      </h2>
      {accion}
    </div>
  )
}
