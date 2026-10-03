import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { registrarAlPerderSesion } from '@/api/cliente'
import type { UsuarioResponse } from '@/api/tipos'
import { ContextoAuth, type ValorAuth } from './contexto'
import { actualizarUsuarioSesion, borrarSesion, guardarSesion, leerSesion } from './sesion'

/**
 * Guarda el usuario conectado. Si la API responde 401 (token vencido o usuario desactivado)
 * se borra la sesion y la aplicacion vuelve al login.
 */
export function ProveedorAuth({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(() => leerSesion()?.usuario ?? null)
  const [sesionExpirada, setSesionExpirada] = useState(false)

  const cerrarSesion = useCallback(() => {
    borrarSesion()
    queryClient.clear()
    setUsuario(null)
  }, [queryClient])

  useEffect(() => {
    registrarAlPerderSesion(() => {
      setSesionExpirada(true)
      cerrarSesion()
    })
    return () => registrarAlPerderSesion(null)
  }, [cerrarSesion])

  const iniciarSesion = useCallback(async (username: string, password: string) => {
    const respuesta = await authApi.login({ username, password })
    const sesion = guardarSesion(respuesta)
    setSesionExpirada(false)
    setUsuario(sesion.usuario)
    return sesion.usuario
  }, [])

  const refrescarUsuario = useCallback((actualizado: UsuarioResponse) => {
    actualizarUsuarioSesion(actualizado)
    setUsuario((anterior) =>
      anterior && JSON.stringify(anterior) === JSON.stringify(actualizado) ? anterior : actualizado,
    )
  }, [])

  const valor = useMemo<ValorAuth>(
    () => ({ usuario, sesionExpirada, iniciarSesion, cerrarSesion, refrescarUsuario }),
    [usuario, sesionExpirada, iniciarSesion, cerrarSesion, refrescarUsuario],
  )

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
}
