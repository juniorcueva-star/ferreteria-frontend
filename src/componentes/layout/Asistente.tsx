import { zodResolver } from '@hookform/resolvers/zod'
import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, SendHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { asistenteApi } from '@/api/asistente'
import type { EstadoAsistente, MensajeChat, RespuestaAsistente } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { Boton } from '@/componentes/ui/Boton'
import { cn } from '@/componentes/ui/cn'
import { Cargando, MensajeError } from '@/componentes/ui/Estados'
import { historialParaEnviar, MAXIMO_PREGUNTA, segmentosDe, textoConsultas } from '@/logica/asistente'
import {
  guardarConversacion,
  guardarPosicion,
  leerConversacion,
  leerPosicion,
  limitar,
  type MensajeGuardado,
  posicionInicial,
  posicionPanel,
  type Punto,
  seMovio,
} from '@/logica/asistenteFlotante'

type MensajeVisible = MensajeGuardado

const esquema = z.object({
  pregunta: z.string().trim().min(1, 'Escriba su pregunta').max(MAXIMO_PREGUNTA, `Máximo ${MAXIMO_PREGUNTA} caracteres`),
})
type Datos = z.infer<typeof esquema>

const CLAVE_ESTADO = ['asistente', 'estado']
/** Mascota del asistente (el perno de la ferreteria): cara para el boton y los mensajes, imagen completa al saludar */
const CARA = '/asistente-cara.webp'
const BIENVENIDA = '/asistente-bienvenida.webp'

function Cara({ className }: { className?: string }) {
  return <img src={CARA} alt="" aria-hidden className={cn('shrink-0 rounded-full object-cover ring-2 ring-marca', className)} />
}

/** Tamano de la mascota flotante (la figura completa del perno) */
const MASCOTA = { ancho: 74, alto: 80 }
const MASCOTA_IMG = '/asistente-mascota.webp'

const ventana = () => ({ ancho: window.innerWidth, alto: window.innerHeight })
const tamanoPanel = () => ({ ancho: Math.min(416, window.innerWidth - 16), alto: Math.min(576, window.innerHeight - 16) })

/**
 * Asistente de IA de apoyo (version basica): la mascota del perno flota sobre la pantalla; se puede arrastrar para
 * que no tape nada (recuerda donde quedo) y al tocarla abre el chat a su lado. Solo consulta datos con los permisos
 * del usuario. La conversacion sigue al cerrar el chat o cambiar de pantalla; "Nueva conversacion" la borra.
 */
export function Asistente() {
  const usuario = useUsuario()
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeVisible[]>(() => leerConversacion(usuario.id))
  const [posicion, setPosicion] = useState<Punto>(() => limitar(leerPosicion(usuario.id) ?? posicionInicial(MASCOTA, ventana()), MASCOTA, ventana()))
  const [arrastrando, setArrastrando] = useState(false)
  const toque = useRef<{ inicio: Punto; origen: Punto; movio: boolean; ultima: Punto } | null>(null)
  const recienArrastrado = useRef(false)

  useEffect(() => guardarConversacion(usuario.id, mensajes), [usuario.id, mensajes])

  // Si la ventana se achica (o se gira la tablet) la mascota no queda fuera de la pantalla
  useEffect(() => {
    const ajustar = () => setPosicion((p) => limitar(p, MASCOTA, ventana()))
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])

  const preguntar = useMutation({
    mutationFn: ({ pregunta, historial }: { pregunta: string; historial: MensajeChat[] }) => asistenteApi.preguntar(pregunta, historial),
    onSuccess: (r) => {
      setMensajes((m) => [...m, { rol: 'ASISTENTE', texto: r.respuesta, consultas: r.consultas }])
      queryClient.setQueryData<EstadoAsistente>(CLAVE_ESTADO, (e) => (e ? { ...e, preguntasRestantes: r.preguntasRestantes } : e))
    },
  })

  const enviar = (pregunta: string) => {
    const texto = pregunta.trim()
    if (texto === '' || preguntar.isPending) return
    const historial = historialParaEnviar(mensajes.map(({ rol, texto: t }) => ({ rol, texto: t })))
    setMensajes((m) => [...m, { rol: 'USUARIO', texto }])
    preguntar.mutate({ pregunta: texto, historial })
  }

  const panel = tamanoPanel()
  const lugarPanel = posicionPanel({ ...posicion, ...MASCOTA }, panel, ventana())

  return (
    <>
      <button
        type="button"
        aria-label="Asistente"
        aria-expanded={abierto}
        title="Tócame para preguntar o arrástrame para moverme"
        data-testid="asistente-mascota"
        style={{ left: posicion.x, top: posicion.y, width: MASCOTA.ancho, height: MASCOTA.alto }}
        className={cn(
          'group fixed z-30 touch-none select-none',
          arrastrando ? 'cursor-grabbing' : 'cursor-grab transition-transform hover:-translate-y-1 hover:scale-105',
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          toque.current = { inicio: { x: e.clientX, y: e.clientY }, origen: posicion, movio: false, ultima: posicion }
        }}
        onPointerMove={(e) => {
          const t = toque.current
          if (!t) return
          const actual = { x: e.clientX, y: e.clientY }
          if (!t.movio && !seMovio(t.inicio, actual)) return
          t.movio = true
          setArrastrando(true)
          t.ultima = limitar({ x: t.origen.x + actual.x - t.inicio.x, y: t.origen.y + actual.y - t.inicio.y }, MASCOTA, ventana())
          setPosicion(t.ultima)
        }}
        onPointerUp={() => {
          const t = toque.current
          toque.current = null
          setArrastrando(false)
          if (t?.movio) {
            recienArrastrado.current = true
            guardarPosicion(usuario.id, t.ultima)
          }
        }}
        onPointerCancel={() => {
          toque.current = null
          setArrastrando(false)
        }}
        onClick={() => {
          // Soltar despues de arrastrar no abre el chat; un toque (o Enter con el teclado) si
          if (recienArrastrado.current) {
            recienArrastrado.current = false
            return
          }
          setAbierto((v) => !v)
        }}
      >
        <img
          src={MASCOTA_IMG}
          alt=""
          aria-hidden
          draggable={false}
          className={cn('pointer-events-none size-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]', arrastrando && 'scale-110')}
        />
        {!abierto && mensajes.length > 0 && (
          <span className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-white bg-exito" aria-hidden title="Hay una conversación abierta" />
        )}
      </button>
      {abierto && (
        <PanelAsistente
          lugar={lugarPanel}
          tamano={panel}
          mensajes={mensajes}
          preguntar={preguntar}
          enviar={enviar}
          nuevaConversacion={() => {
            setMensajes([])
            preguntar.reset()
          }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  )
}

interface PropsPanel {
  lugar: Punto
  tamano: { ancho: number; alto: number }
  mensajes: MensajeVisible[]
  preguntar: UseMutationResult<RespuestaAsistente, Error, { pregunta: string; historial: MensajeChat[] }>
  enviar: (pregunta: string) => void
  nuevaConversacion: () => void
  onCerrar: () => void
}

function PanelAsistente({ lugar, tamano, mensajes, preguntar, enviar, nuevaConversacion, onCerrar }: PropsPanel) {
  const estado = useQuery({ queryKey: CLAVE_ESTADO, queryFn: asistenteApi.estado })
  const fin = useRef<HTMLDivElement>(null)
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { pregunta: '' } })

  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' })
  }, [mensajes, preguntar.isPending])

  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [onCerrar])

  const datos = estado.data
  const nombre = datos?.nombre ?? 'Asistente'

  return (
    <section
      role="dialog"
      aria-label={nombre}
      style={{ left: lugar.x, top: lugar.y, width: tamano.ancho, height: tamano.alto }}
      className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-borde bg-white shadow-2xl"
    >
      <header className="flex items-center gap-3 bg-lateral px-4 py-3 text-white">
        <Cara className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{nombre}</p>
          {datos?.configurado && (
            <p className="text-xs text-lateral-texto" data-testid="asistente-restantes">
              Te quedan {datos.preguntasRestantes} de {datos.preguntasPorDia} preguntas hoy
            </p>
          )}
        </div>
        {mensajes.length > 0 && (
          <button
            type="button"
            onClick={nuevaConversacion}
            className="rounded-lg p-1.5 text-lateral-texto hover:bg-white/10 hover:text-white"
            aria-label="Nueva conversación"
            title="Nueva conversación"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        )}
        <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 text-lateral-texto hover:bg-white/10 hover:text-white" aria-label="Cerrar asistente">
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-crema px-4 py-4" aria-live="polite">
        {estado.isPending && <Cargando />}
        {estado.isError && <MensajeError error={estado.error} />}
        {datos && !datos.configurado && (
          <div className="rounded-xl border border-alerta/30 bg-alerta-claro p-4 text-sm text-tinta" data-testid="asistente-sin-configurar">
            <p className="font-semibold">El asistente todavía no está activado.</p>
            <p className="mt-1 text-tinta-suave">
              Falta poner la clave de la IA en el servidor. El administrador puede seguir la guía <strong>docs/GUIA_CLAVE_IA.md</strong>.
            </p>
          </div>
        )}
        {datos?.configurado && (
          <div className="rounded-xl bg-white p-3 text-sm text-tinta shadow-xs">
            {mensajes.length === 0 && <img src={BIENVENIDA} alt="Mascota del asistente saludando" className="mx-auto mb-3 w-48 rounded-xl" />}
            <p>{datos.saludo}</p>
            {mensajes.length === 0 && (
              <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Preguntas sugeridas">
                {datos.sugerencias.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="rounded-lg border border-marca bg-marca-claro px-3 py-2 text-left text-sm font-medium hover:bg-marca"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={cn('flex items-end gap-2', m.rol === 'USUARIO' ? 'justify-end' : 'justify-start')}>
            {m.rol === 'ASISTENTE' && <Cara className="size-7 ring-1" />}
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                m.rol === 'USUARIO' ? 'rounded-br-sm bg-lateral text-white' : 'rounded-bl-sm bg-white text-tinta shadow-xs',
              )}
              data-testid={m.rol === 'USUARIO' ? 'mensaje-usuario' : 'mensaje-asistente'}
            >
              {m.texto.split('\n').map((linea, j) => (
                <p key={j} className={cn(linea.trim() === '' && 'h-2')}>
                  {segmentosDe(linea).map((s, k) => (s.negrita ? <strong key={k}>{s.texto}</strong> : <span key={k}>{s.texto}</span>))}
                </p>
              ))}
              {m.consultas && textoConsultas(m.consultas) && <p className="mt-1.5 text-[11px] text-tinta-tenue">{textoConsultas(m.consultas)}</p>}
            </div>
          </div>
        ))}
        {preguntar.isPending && (
          <p className="flex items-center gap-2 text-sm text-tinta-suave" data-testid="asistente-pensando">
            <Cara className="size-7 animate-pulse ring-1" />
            Revisando el sistema…
          </p>
        )}
        {preguntar.isError && <MensajeError error={preguntar.error} />}
        <div ref={fin} />
      </div>

      {datos?.configurado && (
        <form
          className="border-t border-borde bg-white p-3"
          onSubmit={(e) => {
            void handleSubmit((d) => {
              enviar(d.pregunta)
              reset({ pregunta: '' })
              setFocus('pregunta')
            })(e)
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              maxLength={MAXIMO_PREGUNTA}
              placeholder="Escribe tu pregunta…"
              aria-label="Pregunta para el asistente"
              className="min-h-11 flex-1 resize-none rounded-xl border border-borde px-3 py-2 text-sm focus:border-marca focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              {...register('pregunta')}
            />
            <Boton type="submit" aria-label="Enviar pregunta" icono={<SendHorizontal className="size-4" />} cargando={preguntar.isPending} disabled={datos.preguntasRestantes <= 0} />
          </div>
          {errors.pregunta && <p className="mt-1 text-xs text-peligro">{errors.pregunta.message}</p>}
          <p className="mt-1.5 text-[11px] text-tinta-tenue">Solo consulta datos y puede equivocarse: confirma en el sistema antes de cobrar.</p>
        </form>
      )}
    </section>
  )
}
