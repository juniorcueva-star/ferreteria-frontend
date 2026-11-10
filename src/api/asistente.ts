import { http } from './cliente'
import type { EstadoAsistente, MensajeChat, RespuestaAsistente } from './tipos'

/** Asistente de IA: solo consulta datos con los permisos del usuario. */
export const asistenteApi = {
  estado: () => http.get<EstadoAsistente>('/asistente/estado').then((r) => r.data),
  preguntar: (pregunta: string, historial: MensajeChat[]) =>
    http.post<RespuestaAsistente>('/asistente/preguntar', { pregunta, historial }).then((r) => r.data),
}
