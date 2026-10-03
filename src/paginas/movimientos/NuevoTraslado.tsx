import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { trasladosApi } from '@/api/inventario'
import { useUsuario } from '@/auth/contexto'
import { EditorLineas } from '@/componentes/formularios/EditorLineas'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea, CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { MensajeError } from '@/componentes/ui/Estados'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { aLineasRequest, lineaVacia, validarLineas, type LineaEditable } from '@/logica/lineas'
import { nulo } from '@/logica/validaciones'

/** Envio de mercaderia (normalmente del almacen a una tienda). La tienda la recibe despues. */
export default function NuevoTraslado() {
  const usuario = useUsuario()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas, seleccionadaId } = useUbicacion()
  const esAdmin = usuario.rol === 'ADMIN'
  const almacenPorDefecto = todas.find((u) => u.tipo === 'ALMACEN')?.id
  const [origenElegido, setOrigenId] = useState<string>(String(esAdmin ? (seleccionadaId ?? '') : (usuario.ubicacionId ?? '')))
  const origenId = origenElegido || String(almacenPorDefecto ?? '')
  const [destinoId, setDestinoId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [lineas, setLineas] = useState<LineaEditable[]>([lineaVacia()])
  const [intentado, setIntentado] = useState(false)

  const validacion = validarLineas(lineas)
  const errorOrigen = !origenId ? 'Elija el origen' : undefined
  const errorDestino = !destinoId ? 'Elija el destino' : destinoId === origenId ? 'El destino debe ser distinto del origen' : undefined

  const enviar = useMutation({
    mutationFn: () =>
      trasladosApi.enviar({
        origenId: esAdmin ? Number(origenId) : null,
        destinoId: Number(destinoId),
        observacion: nulo(observacion),
        detalles: aLineasRequest(lineas),
      }),
    onSuccess: (t) => {
      avisar(`Traslado ${t.codigo} enviado a ${t.destinoNombre}. Queda en camino hasta que la tienda lo reciba.`)
      void queryClient.invalidateQueries({ queryKey: ['traslados'] })
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
      navegar('/movimientos?tab=traslados')
    },
  })

  const guardar = () => {
    setIntentado(true)
    if (errorOrigen || errorDestino || validacion.general || validacion.porLinea.size > 0) return
    enviar.mutate()
  }

  return (
    <div>
      <Link to="/movimientos?tab=traslados" className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Volver a traslados
      </Link>
      <EncabezadoPagina
        titulo="Nuevo traslado"
        subtitulo="La mercadería sale del origen al enviar y entra al destino cuando la tienda la recibe."
        acciones={
          <Boton tamano="lg" icono={<Send className="size-5" />} cargando={enviar.isPending} onClick={guardar}>
            Enviar traslado
          </Boton>
        }
      />
      {enviar.error && <MensajeError error={enviar.error} className="mb-5" />}
      <Tarjeta className="mb-5">
        <TituloTarjeta titulo="Datos del envío" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {esAdmin ? (
            <CampoSelector etiqueta="Origen" obligatorio value={origenId} onChange={(e) => setOrigenId(e.target.value)} error={intentado ? errorOrigen : undefined}>
              <option value="">Elija el origen</option>
              {todas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </CampoSelector>
          ) : (
            <CampoTexto etiqueta="Origen" value={usuario.ubicacionNombre ?? ''} disabled />
          )}
          <CampoSelector etiqueta="Destino" obligatorio value={destinoId} onChange={(e) => setDestinoId(e.target.value)} error={intentado ? errorDestino : undefined}>
            <option value="">Elija el destino</option>
            {todas
              .filter((u) => String(u.id) !== origenId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
          </CampoSelector>
          <CampoArea etiqueta="Observación" className="md:col-span-2" placeholder="Ej: reposición semanal" value={observacion} onChange={(e) => setObservacion(e.target.value)} maxLength={300} />
        </div>
      </Tarjeta>
      <Tarjeta>
        <TituloTarjeta titulo="Productos a enviar" />
        <div className="p-5">
          {intentado && validacion.general && <p className="mb-3 text-sm text-peligro">{validacion.general}</p>}
          <EditorLineas
            lineas={lineas}
            onCambiar={setLineas}
            errores={intentado ? validacion.porLinea : new Map()}
            ubicacionStockId={origenId ? Number(origenId) : null}
          />
        </div>
      </Tarjeta>
    </div>
  )
}
