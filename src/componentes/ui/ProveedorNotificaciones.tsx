import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cn } from './cn'
import { ContextoNotificaciones, type TipoAviso } from './notificaciones'

interface Aviso {
  id: number
  mensaje: string
  tipo: TipoAviso
}

let siguienteId = 1

/** Avisos breves en la esquina inferior (Ej: "Producto guardado"). */
export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const cerrar = useCallback((id: number) => setAvisos((lista) => lista.filter((a) => a.id !== id)), [])

  const avisar = useCallback(
    (mensaje: string, tipo: TipoAviso = 'exito') => {
      const id = siguienteId++
      setAvisos((lista) => [...lista.slice(-3), { id, mensaje, tipo }])
      window.setTimeout(() => cerrar(id), 5000)
    },
    [cerrar],
  )

  const valor = useMemo(() => ({ avisar }), [avisar])

  return (
    <ContextoNotificaciones.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg',
              aviso.tipo === 'exito' && 'border-exito/30',
              aviso.tipo === 'error' && 'border-peligro/30',
              aviso.tipo === 'info' && 'border-info/30',
            )}
          >
            {aviso.tipo === 'exito' && <CheckCircle2 className="size-5 shrink-0 text-exito" aria-hidden />}
            {aviso.tipo === 'error' && <XCircle className="size-5 shrink-0 text-peligro" aria-hidden />}
            {aviso.tipo === 'info' && <Info className="size-5 shrink-0 text-info" aria-hidden />}
            <p className="flex-1 text-tinta">{aviso.mensaje}</p>
            <button type="button" onClick={() => cerrar(aviso.id)} aria-label="Cerrar aviso" className="text-tinta-tenue hover:text-tinta">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ContextoNotificaciones.Provider>
  )
}
