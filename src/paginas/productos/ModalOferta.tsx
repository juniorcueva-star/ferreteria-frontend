import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { productosApi } from '@/api/catalogo'
import type { PresentacionResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { aCentimos, esDecimalValido, textoANumero } from '@/logica/decimales'
import { hoyLima, soles, solesDeCentimos } from '@/logica/formato'

function crearEsquema(precioLista: number, hoy: string) {
  return z
    .object({
      precio: z
        .string()
        .trim()
        .refine((v) => esDecimalValido(v, 2) && textoANumero(v) > 0, 'Precio mayor que 0 (hasta 2 decimales)')
        .refine((v) => !esDecimalValido(v, 2) || textoANumero(v) < precioLista, `Debe ser menor que el de lista (${soles(precioLista)})`),
      desde: z.string().min(1, 'Indique el primer día'),
      hasta: z.string().min(1, 'Indique el último día'),
    })
    .refine((d) => !d.desde || !d.hasta || d.hasta >= d.desde, { path: ['hasta'], message: 'No puede ser antes del primer día' })
    .refine((d) => !d.hasta || d.hasta >= hoy, { path: ['hasta'], message: 'La oferta ya habría terminado' })
}

type Datos = z.infer<ReturnType<typeof crearEsquema>>

/** Oferta de una presentacion entre dos fechas (solo ADMIN). Se guarda al instante, aparte del formulario. */
export function ModalOferta({ productoId, presentacion, onCerrar }: { productoId: number; presentacion: PresentacionResponse; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const hoy = hoyLima()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(crearEsquema(presentacion.precioVenta, hoy)),
    defaultValues: {
      precio: presentacion.precioOferta?.toFixed(2) ?? '',
      desde: presentacion.ofertaDesde ?? hoy,
      hasta: presentacion.ofertaHasta ?? '',
    },
  })
  const terminar = () => {
    void queryClient.invalidateQueries({ queryKey: ['productos'] })
    onCerrar()
  }
  const guardar = useMutation({
    mutationFn: (d: Datos) => productosApi.actualizarOferta(productoId, presentacion.id, { precio: textoANumero(d.precio), desde: d.desde, hasta: d.hasta }),
    onSuccess: () => {
      avisar(`Oferta de ${presentacion.nombre} guardada`)
      terminar()
    },
  })
  const quitar = useMutation({
    mutationFn: () => productosApi.quitarOferta(productoId, presentacion.id),
    onSuccess: () => {
      avisar(`Se quitó la oferta de ${presentacion.nombre}`)
      terminar()
    },
  })
  const precio = useWatch({ control, name: 'precio' })
  // En centimos para no arrastrar errores de punto flotante (12.00 - 9.90 = 2.10, 17.5 % -> 18 %)
  const listaCentimos = aCentimos(presentacion.precioVenta)
  const ahorroCentimos = esDecimalValido(precio, 2) && textoANumero(precio) > 0 ? listaCentimos - aCentimos(precio) : 0

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Oferta · ${presentacion.nombre}`}
      descripcion={`Precio de lista: ${soles(presentacion.precioVenta)}. Entre las fechas indicadas, la caja y la cotización cobran el precio de oferta y lo muestran con la etiqueta OFERTA.`}
      pie={
        <>
          {presentacion.precioOferta !== null && (
            <Boton variante="peligro" className="mr-auto" cargando={quitar.isPending} onClick={() => quitar.mutate()}>
              Quitar oferta
            </Boton>
          )}
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={guardar.isPending} onClick={() => void handleSubmit((d) => guardar.mutate(d))()}>
            Guardar oferta
          </Boton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto
          etiqueta="Precio de oferta (S/)"
          inputMode="decimal"
          placeholder="Ej: 0.45"
          error={errors.precio?.message}
          ayuda={
            ahorroCentimos > 0 ? `El cliente ahorra ${solesDeCentimos(ahorroCentimos)} (${Math.round((ahorroCentimos * 100) / listaCentimos)} %)` : undefined
          }
          {...register('precio')}
        />
        <CampoTexto etiqueta="Desde" type="date" error={errors.desde?.message} {...register('desde')} />
        <CampoTexto etiqueta="Hasta (inclusive)" type="date" min={hoy} error={errors.hasta?.message} {...register('hasta')} />
      </div>
      {(guardar.error ?? quitar.error) && <MensajeError error={guardar.error ?? quitar.error} className="mt-3" />}
    </Modal>
  )
}
