import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from './cn'

/** Tabla con desplazamiento horizontal en pantallas angostas (tablet). */
export function Tabla({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-borde bg-white">{children}</thead>
}

export function Th({ className, alinear, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { alinear?: 'derecha' | 'centro' }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3.5 text-[11px] font-semibold tracking-wider whitespace-nowrap text-tinta-suave uppercase first:pl-5 last:pr-5',
        alinear === 'derecha' && 'text-right',
        alinear === 'centro' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-borde">{children}</tbody>
}

export function Tr({ className, onClick, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-crema/60', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      {...props}
    />
  )
}

export function Td({ className, alinear, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { alinear?: 'derecha' | 'centro' }) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-middle first:pl-5 last:pr-5',
        alinear === 'derecha' && 'text-right',
        alinear === 'centro' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

/** Fila que ocupa todas las columnas (cargando, vacio, error). */
export function FilaCompleta({ columnas, children }: { columnas: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-5 py-10">
        {children}
      </td>
    </tr>
  )
}
