import { http } from './cliente'
import type { CambiarPasswordRequest, LoginRequest, LoginResponse, UsuarioResponse } from './tipos'

export const authApi = {
  login: (datos: LoginRequest) => http.post<LoginResponse>('/auth/login', datos).then((r) => r.data),
  yo: () => http.get<UsuarioResponse>('/auth/me').then((r) => r.data),
  cambiarPassword: (datos: CambiarPasswordRequest) => http.put<void>('/auth/password', datos).then(() => undefined),
}
