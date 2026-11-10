import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { proveedoresApi } from '@/api/compras'
import type { ProveedorResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { Casilla, CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { MENSAJE_RUC, RUC_VALIDO, conLetras, nombrePersona, nulo, telefono, textoOpcional } from '@/logica/validaciones'

const esquema = z.object({
  ruc: z.string().trim().refine((v) => v === '' || RUC_VALIDO.test(v), MENSAJE_RUC),
  razonSocial: conLetras(150),
  contacto: nombrePersona(100, false),
  telefono,
  email: z.string().trim().max(100).refine((v) => v === '' || z.email().safeParse(v).success, 'Correo inválido'),
  direccion: textoOpcional(200),
  activo: z.boolean(),
})
type Datos = z.infer<typeof esquema>

export function ModalProveedor({
  proveedor,
  onCerrar,
  onGuardado,
}: {
  proveedor: ProveedorResponse | null
  onCerrar: () => void
  onGuardado?: (p: ProveedorResponse) => void
}) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      ruc: proveedor?.ruc ?? '',
      razonSocial: proveedor?.razonSocial ?? '',
      contacto: proveedor?.contacto ?? '',
      telefono: proveedor?.telefono ?? '',
      email: proveedor?.email ?? '',
      direccion: proveedor?.direccion ?? '',
      activo: proveedor?.activo ?? true,
    },
  })
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const datos = {
        ruc: nulo(d.ruc),
        razonSocial: d.razonSocial.trim(),
        contacto: nulo(d.contacto),
        telefono: nulo(d.telefono),
        email: nulo(d.email),
        direccion: nulo(d.direccion),
        activo: d.activo,
      }
      return proveedor ? proveedoresApi.actualizar(proveedor.id, datos) : proveedoresApi.crear(datos)
    },
    onSuccess: (p) => {
      avisar(proveedor ? `Proveedor ${p.razonSocial} actualizado` : `Proveedor ${p.razonSocial} registrado`)
      void queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      onGuardado?.(p)
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={guardar.isPending}>
            Guardar
          </Boton>
        </>
      }
    >
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2" noValidate>
        {guardar.error && <MensajeError error={guardar.error} className="sm:col-span-2" />}
        <CampoTexto etiqueta="Razón social" obligatorio className="sm:col-span-2" error={errors.razonSocial?.message} {...register('razonSocial')} />
        <CampoTexto etiqueta="RUC" inputMode="numeric" maxLength={11} mono error={errors.ruc?.message} {...register('ruc')} />
        <CampoTexto etiqueta="Contacto" error={errors.contacto?.message} {...register('contacto')} />
        <CampoTexto etiqueta="Celular" inputMode="tel" placeholder="987654321" maxLength={11} error={errors.telefono?.message} {...register('telefono')} />
        <CampoTexto etiqueta="Correo" type="email" error={errors.email?.message} {...register('email')} />
        <CampoTexto etiqueta="Dirección" className="sm:col-span-2" error={errors.direccion?.message} {...register('direccion')} />
        {proveedor && <Casilla etiqueta="Proveedor activo" {...register('activo')} />}
      </form>
    </Modal>
  )
}
