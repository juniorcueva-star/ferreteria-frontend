import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { productosApi } from '@/api/catalogo'
import type { PresentacionResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { esDecimalValido, textoANumero } from '@/logica/decimales'
import { soles } from '@/logica/formato'

const MAXIMO_ESCALAS = 5

function crearEsquema(precioLista: number, decimales: number) {
  const fila = z.object({
    cantidadMinima: z
      .string()
      .trim()
      .refine((v) => esDecimalValido(v, decimales), decimales === 0 ? 'Escriba un número entero' : `Hasta ${decimales} decimales`)
      .refine((v) => !esDecimalValido(v, decimales) || textoANumero(v) > 1, 'Debe ser mayor que 1'),
    precio: z
      .string()
      .trim()
      .refine((v) => esDecimalValido(v, 2) && textoANumero(v) > 0, 'Precio mayor que 0 (hasta 2 decimales)')
      .refine((v) => !esDecimalValido(v, 2) || textoANumero(v) < precioLista, `Debe ser menor que el de lista (${soles(precioLista)})`),
  })
  return z.object({
    escalas: z
      .array(fila)
      .max(MAXIMO_ESCALAS)
      .superRefine((filas, ctx) => {
        const ordenadas = filas
          .map((f, i) => ({ i, cantidad: textoANumero(f.cantidadMinima), precio: textoANumero(f.precio) }))
          .sort((a, b) => a.cantidad - b.cantidad)
        for (let k = 1; k < ordenadas.length; k++) {
          const antes = ordenadas[k - 1]
          const ahora = ordenadas[k]
          if (!antes || !ahora) continue
          if (antes.cantidad === ahora.cantidad) {
            ctx.addIssue({ code: 'custom', path: [ahora.i, 'cantidadMinima'], message: 'Cantidad repetida' })
          } else if (ahora.precio >= antes.precio) {
            ctx.addIssue({ code: 'custom', path: [ahora.i, 'precio'], message: 'A más cantidad, menor precio' })
          }
        }
      }),
  })
}

type Datos = z.infer<ReturnType<typeof crearEsquema>>

/**
 * Precio por mayor de una presentacion (solo ADMIN): desde cierta cantidad cada una cuesta menos.
 * Ej: Unidad a S/ 0.50; desde 100 a S/ 0.40; desde 500 a S/ 0.35. Se guarda al instante, aparte del formulario.
 */
export function ModalPrecioMayor({
  productoId,
  presentacion,
  onCerrar,
}: {
  productoId: number
  presentacion: PresentacionResponse
  onCerrar: () => void
}) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(crearEsquema(presentacion.precioVenta, presentacion.decimales)),
    defaultValues: {
      escalas: presentacion.escalas.map((e) => ({ cantidadMinima: String(e.cantidadMinima), precio: e.precio.toFixed(2) })),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'escalas' })
  const guardar = useMutation({
    mutationFn: (datos: Datos) =>
      productosApi.actualizarEscalas(
        productoId,
        presentacion.id,
        datos.escalas.map((e) => ({ cantidadMinima: textoANumero(e.cantidadMinima), precio: textoANumero(e.precio) })),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productos'] })
      avisar(`Precio por mayor de ${presentacion.nombre} guardado`)
      onCerrar()
    },
  })
  const filas = useWatch({ control, name: 'escalas' })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Precio por mayor · ${presentacion.nombre}`}
      descripcion={`Precio de lista: ${soles(presentacion.precioVenta)}. Desde la cantidad indicada, cada ${presentacion.nombre.toLowerCase()} cuesta menos; el sistema lo aplica solo en la caja y en la cotización.`}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={guardar.isPending} onClick={() => void handleSubmit((d) => guardar.mutate(d))()}>
            Guardar precio por mayor
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {fields.length === 0 && <p className="text-sm text-tinta-suave">Sin precio por mayor: siempre se cobra el de lista.</p>}
        {fields.map((campo, i) => {
          const fila = filas[i]
          const ejemplo =
            fila && esDecimalValido(fila.cantidadMinima, presentacion.decimales) && esDecimalValido(fila.precio, 2)
              ? `${fila.cantidadMinima} × ${soles(textoANumero(fila.precio))} = ${soles(textoANumero(fila.cantidadMinima) * textoANumero(fila.precio))}`
              : null
          return (
            <div key={campo.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2" data-testid={`escala-${i}`}>
              <CampoTexto
                etiqueta="Desde (cantidad)"
                inputMode={presentacion.decimales === 0 ? 'numeric' : 'decimal'}
                placeholder="Ej: 100"
                error={errors.escalas?.[i]?.cantidadMinima?.message}
                {...register(`escalas.${i}.cantidadMinima`)}
              />
              <CampoTexto
                etiqueta="Precio c/u (S/)"
                inputMode="decimal"
                placeholder="Ej: 0.40"
                error={errors.escalas?.[i]?.precio?.message}
                ayuda={ejemplo ?? undefined}
                {...register(`escalas.${i}.precio`)}
              />
              <Boton variante="fantasma" className="mt-6" aria-label={`Quitar escala ${i + 1}`} icono={<Trash2 className="size-4" />} onClick={() => remove(i)} />
            </div>
          )
        })}
        {fields.length < MAXIMO_ESCALAS && (
          <Boton variante="secundario" tamano="sm" className="self-start" icono={<Plus className="size-4" />} onClick={() => append({ cantidadMinima: '', precio: '' })}>
            Agregar escala
          </Boton>
        )}
        {guardar.error && <MensajeError error={guardar.error} />}
      </div>
    </Modal>
  )
}
