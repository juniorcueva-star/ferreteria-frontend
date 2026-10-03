import { useEffect, useState } from 'react'

/** Devuelve el valor despues de que deja de cambiar por `ms` milisegundos (para buscar mientras se escribe). */
export function useRetraso<T>(valor: T, ms = 350): T {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const id = window.setTimeout(() => setRetrasado(valor), ms)
    return () => window.clearTimeout(id)
  }, [valor, ms])
  return retrasado
}
