import type { ReactNode } from 'react'
import { cn } from './cn'

/** Chip beige con texto monoespaciado (presentaciones: "Caja x100 · 100 u"). */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-beige px-2 py-0.5 font-mono text-[11px] whitespace-nowrap text-tinta-suave',
        className,
      )}
    >
      {children}
    </span>
  )
}
