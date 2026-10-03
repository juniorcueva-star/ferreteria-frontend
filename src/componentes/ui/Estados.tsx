import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { aApiError } from '@/api/errores'
import { cn } from './cn'

export function Cargando({ texto = 'Cargando…', className }: { texto?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-6 text-sm text-tinta-suave', className)} role="status">
      <LoaderCircle className="size-5 animate-spin text-marca" aria-hidden />
      {texto}
    </div>
  )
}

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  icono,
}: {
  titulo: string
  descripcion?: ReactNode
  accion?: ReactNode
  icono?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-beige text-tinta-tenue">
        {icono ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <p className="font-semibold text-tinta">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-tinta-suave">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}

/** Muestra un error de la API con su mensaje, el detalle (una linea por campo) y el codigo. */
export function MensajeError({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null
  const apiError = aApiError(error)
  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-xl border border-peligro/20 bg-peligro-claro px-4 py-3 text-sm', className)}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-peligro" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-peligro">{apiError.message}</p>
        {apiError.detalle.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-tinta">
            {apiError.detalle.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        )}
        <p className="mt-1 font-mono text-[11px] text-tinta-suave">Código: {apiError.codigo}</p>
      </div>
    </div>
  )
}
