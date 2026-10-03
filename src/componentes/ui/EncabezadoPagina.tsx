import type { ReactNode } from 'react'

/** Titulo grande de la pagina, subtitulo (contador) y acciones a la derecha. */
export function EncabezadoPagina({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string
  subtitulo?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-tinta">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-tinta-suave">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}
