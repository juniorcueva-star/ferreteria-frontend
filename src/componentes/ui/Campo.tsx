import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from './cn'

export const claseControl =
  'w-full rounded-lg border border-borde bg-white px-3 text-sm text-tinta placeholder:text-tinta-tenue transition-colors focus:border-marca focus:ring-2 focus:ring-marca/20 focus:outline-none disabled:bg-beige disabled:text-tinta-suave aria-[invalid=true]:border-peligro'

interface CampoProps {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
  className?: string
  obligatorio?: boolean
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Etiqueta + control + mensaje de error, con los atributos de accesibilidad conectados. */
export function Campo({ etiqueta, error, ayuda, className, children, obligatorio }: CampoProps) {
  const id = useId()
  const idDescripcion = error || ayuda ? `${id}-desc` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-tinta-suave">
        {etiqueta}
        {obligatorio && <span className="text-peligro"> *</span>}
      </label>
      {children(id, idDescripcion)}
      {error ? (
        <p id={idDescripcion} className="text-xs text-peligro" role="alert">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={idDescripcion} className="text-xs text-tinta-tenue">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}

export function Entrada({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(claseControl, 'h-10', className)} {...props} />
}

export function Selector({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(claseControl, 'h-10 cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function AreaTexto({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(claseControl, 'min-h-20 py-2', className)} {...props} />
}

interface PropsEtiquetadas {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
  obligatorio?: boolean
}

/** Campo de texto con etiqueta. */
export function CampoTexto({ etiqueta, error, ayuda, obligatorio, className, ...props }: ComponentProps<'input'> & PropsEtiquetadas) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} className={className} obligatorio={obligatorio}>
      {(id, descripcion) => (
        <Entrada id={id} aria-invalid={error ? true : undefined} aria-describedby={descripcion} {...props} />
      )}
    </Campo>
  )
}

/** Lista desplegable con etiqueta. */
export function CampoSelector({
  etiqueta,
  error,
  ayuda,
  obligatorio,
  className,
  children,
  ...props
}: ComponentProps<'select'> & PropsEtiquetadas) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} className={className} obligatorio={obligatorio}>
      {(id, descripcion) => (
        <Selector id={id} aria-invalid={error ? true : undefined} aria-describedby={descripcion} {...props}>
          {children}
        </Selector>
      )}
    </Campo>
  )
}

export function CampoArea({ etiqueta, error, ayuda, obligatorio, className, ...props }: ComponentProps<'textarea'> & PropsEtiquetadas) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} className={className} obligatorio={obligatorio}>
      {(id, descripcion) => (
        <AreaTexto id={id} aria-invalid={error ? true : undefined} aria-describedby={descripcion} {...props} />
      )}
    </Campo>
  )
}

/** Casilla con texto a la derecha. */
export function Casilla({ etiqueta, className, ...props }: ComponentProps<'input'> & { etiqueta: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-tinta', className)}>
      <input type="checkbox" className="size-4 cursor-pointer rounded accent-marca" {...props} />
      {etiqueta}
    </label>
  )
}
