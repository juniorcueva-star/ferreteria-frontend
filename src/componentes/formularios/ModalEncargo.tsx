import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { encargosApi } from '@/api/encargos'
import type { ClienteResponse, ProductoResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea, CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { esDecimalValido, textoANumero } from '@/logica/decimales'
import { precioConRecargo, recargoPorcentaje, totalEncargoCentimos } from '@/logica/encargos'
import { soles, solesDeCentimos } from '@/logica/formato'
import { presentacionesActivas, textoDecimales } from '@/logica/presentaciones'
import { monto, nulo, textoOpcional } from '@/logica/validaciones'
import { SelectorCliente } from './SelectorCliente'

const esquema = z.object({
  presentacionId: z.string().min(1, 'Elija la presentación'),
  cantidad: z.string().trim().refine((v) => esDecimalValido(v, 3) && textoANumero(v) > 0, 'Cantidad mayor que 0'),
  precioUnitario: monto,
  observacion: textoOpcional(250),
})

type DatosEncargo = z.infer<typeof esquema>

/**
 * Encargo de un producto que no hay en stock: se consigue en otra tienda o con un proveedor y se vende con un precio
 * propio (por defecto, precio de lista + 10 %). No toca el stock hasta que se entrega.
 */
export function ModalEncargo({
  producto,
  presentacionId,
  ubicacionId,
  onCerrar,
}: {
  producto: ProductoResponse
  presentacionId: number
  /** Tienda de la caja (la necesita el ADMIN); el vendedor usa la suya */
  ubicacionId: number | null
  onCerrar: () => void
}) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [cliente, setCliente] = useState<ClienteResponse | null>(null)
  const presentaciones = presentacionesActivas(producto)
  const inicial = presentaciones.find((p) => p.id === presentacionId) ?? presentaciones[0]
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DatosEncargo>({
    resolver: zodResolver(esquema),
    defaultValues: {
      presentacionId: String(inicial?.id ?? ''),
      cantidad: '1',
      precioUnitario: inicial ? precioConRecargo(inicial.precioVenta).toFixed(2) : '',
      observacion: '',
    },
  })
  const valores = useWatch({ control })
  const presentacion = presentaciones.find((p) => p.id === Number(valores.presentacionId))
  const precioValido = esDecimalValido(valores.precioUnitario ?? '', 2)
  const cantidadValida = esDecimalValido(valores.cantidad ?? '', 3)
  const total = precioValido && cantidadValida ? totalEncargoCentimos(valores.cantidad ?? '0', valores.precioUnitario ?? '0') : 0
  const recargo = presentacion && precioValido ? recargoPorcentaje(textoANumero(valores.precioUnitario ?? '0'), presentacion.precioVenta) : null

  const crear = useMutation({
    mutationFn: (datos: DatosEncargo) =>
      encargosApi.crear({
        ubicacionId,
        clienteId: cliente?.id ?? null,
        presentacionId: Number(datos.presentacionId),
        cantidad: textoANumero(datos.cantidad),
        precioUnitario: textoANumero(datos.precioUnitario),
        costoReferencia: null,
        observacion: nulo(datos.observacion),
      }),
    onSuccess: (e) => {
      avisar(`Encargo ${e.codigo} registrado`)
      void queryClient.invalidateQueries({ queryKey: ['encargos'] })
      onCerrar()
    },
  })

  const guardar = (datos: DatosEncargo) => {
    if (presentacion && !esDecimalValido(datos.cantidad, presentacion.decimales)) {
      setError('cantidad', { message: `${presentacion.nombre}: ${textoDecimales(presentacion.decimales).toLowerCase()}` })
      return
    }
    crear.mutate(datos)
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Hacer encargo"
      descripcion={`${producto.nombre} · no toca el stock hasta que se entregue`}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={handleSubmit(guardar)} cargando={crear.isPending}>
            Registrar encargo
          </Boton>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(guardar)} noValidate>
        {crear.error && <MensajeError error={crear.error} className="sm:col-span-2" />}
        <CampoSelector
          etiqueta="Presentación"
          obligatorio
          error={errors.presentacionId?.message}
          {...register('presentacionId', {
            onChange: (e: { target: { value: string } }) => {
              const elegida = presentaciones.find((p) => p.id === Number(e.target.value))
              if (elegida) setValue('precioUnitario', precioConRecargo(elegida.precioVenta).toFixed(2))
            },
          })}
        >
          {presentaciones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · lista {soles(p.precioVenta)}
            </option>
          ))}
        </CampoSelector>
        <CampoTexto
          etiqueta="Cantidad"
          obligatorio
          inputMode="decimal"
          ayuda={presentacion ? textoDecimales(presentacion.decimales) : undefined}
          error={errors.cantidad?.message}
          {...register('cantidad')}
        />
        <CampoTexto
          etiqueta="Precio del encargo (S/)"
          obligatorio
          inputMode="decimal"
          ayuda={recargo === null ? 'Con IGV, por presentación' : `Recargo sobre el precio de lista: ${recargo.toFixed(2)} %`}
          error={errors.precioUnitario?.message}
          {...register('precioUnitario')}
        />
        <div className="flex flex-col justify-end rounded-xl bg-crema p-3">
          <p className="text-xs text-tinta-suave">Total del encargo</p>
          <p className="font-mono text-lg font-bold text-tinta" data-testid="total-encargo">
            {solesDeCentimos(total)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1 text-sm font-semibold text-tinta">Cliente (opcional)</p>
          <SelectorCliente valor={cliente} onElegir={setCliente} />
        </div>
        <CampoArea className="sm:col-span-2" etiqueta="Observación" placeholder="Ej: lo trae el proveedor el viernes" error={errors.observacion?.message} {...register('observacion')} />
      </form>
    </Modal>
  )
}
