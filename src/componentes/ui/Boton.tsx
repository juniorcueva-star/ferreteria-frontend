import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'exito'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca text-white shadow-sm hover:bg-marca-oscuro disabled:bg-marca/50',
  secundario: 'border border-borde bg-white text-tinta hover:bg-crema disabled:text-tinta-tenue',
  peligro: 'bg-peligro text-white hover:bg-red-700 disabled:bg-peligro/50',
  exito: 'bg-exito text-white hover:bg-green-700 disabled:bg-exito/50',
  fantasma: 'text-tinta-suave hover:bg-beige hover:text-tinta disabled:text-tinta-tenue',
}

const TAMANOS: Record<Tamano, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  icono?: ReactNode
}

export function Boton({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  icono,
  className,
  children,
  disabled,
  type = 'button',
  ...resto
}: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
        VARIANTES[variante],
        TAMANOS[tamano],
        className,
      )}
      {...resto}
    >
      {cargando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icono}
      {children}
    </button>
  )
}
