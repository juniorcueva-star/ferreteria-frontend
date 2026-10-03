import { Package } from 'lucide-react'
import { useState } from 'react'
import { urlImagen } from '@/api/cliente'
import { cn } from './cn'

/** Miniatura de la foto del producto; si no tiene foto (o no carga) muestra un icono. */
export function FotoProducto({ url, nombre, className }: { url: string | null; nombre: string; className?: string }) {
  const [fallo, setFallo] = useState(false)
  const fuente = urlImagen(url)
  return (
    <div className={cn('flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-beige', className)}>
      {fuente && !fallo ? (
        <img src={fuente} alt={nombre} className="size-full object-cover" onError={() => setFallo(true)} loading="lazy" />
      ) : (
        <Package className="size-1/2 text-tinta-tenue" aria-hidden />
      )}
    </div>
  )
}
