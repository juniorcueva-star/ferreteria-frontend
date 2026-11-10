import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { ClienteResponse, TipoDocumentoIdentidad } from '@/api/tipos'
import { clientesApi } from '@/api/ventas'
import { Boton } from '@/componentes/ui/Boton'
import { Casilla, CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { NOMBRE_DOCUMENTO } from '@/logica/formato'
import {
  MENSAJE_NOMBRE_PERSONA,
  MENSAJE_RUC,
  NOMBRE_PERSONA,
  RUC_VALIDO,
  TIENE_LETRA,
  nulo,
  telefono,
  textoObligatorio,
  textoOpcional,
} from '@/logica/validaciones'

/** Mismas reglas que el CHECK ck_cliente_doc del backend. */
const esquema = z
  .object({
    nombre: textoObligatorio(150),
    tipoDocumento: z.enum(['NINGUNO', 'DNI', 'RUC', 'CE']),
    numeroDocumento: textoOpcional(15),
    telefono,
    direccion: textoOpcional(200),
    activo: z.boolean(),
  })
  .superRefine((d, ctx) => {
    // Con RUC es una empresa (su razon social puede llevar numeros); si no, es una persona: solo letras
    const nombre = d.nombre.trim()
    if (d.tipoDocumento === 'RUC' ? !TIENE_LETRA.test(nombre) : nombre !== '' && !NOMBRE_PERSONA.test(nombre)) {
      ctx.addIssue({
        code: 'custom',
        path: ['nombre'],
        message: d.tipoDocumento === 'RUC' ? 'Debe tener letras, no solo números o símbolos' : MENSAJE_NOMBRE_PERSONA,
      })
    }
    const numero = d.numeroDocumento.trim()
    const reglas: Record<TipoDocumentoIdentidad, [boolean, string]> = {
      NINGUNO: [numero === '', 'Sin documento no se registra número'],
      DNI: [/^\d{8}$/.test(numero), 'El DNI debe tener 8 dígitos'],
      RUC: [RUC_VALIDO.test(numero), MENSAJE_RUC],
      CE: [/^[A-Za-z0-9]{9,12}$/.test(numero), 'El carné de extranjería tiene de 9 a 12 letras o números'],
    }
    const [valido, mensaje] = reglas[d.tipoDocumento]
    if (!valido) ctx.addIssue({ code: 'custom', path: ['numeroDocumento'], message: mensaje })
  })
type Datos = z.infer<typeof esquema>

/** Crear o editar un cliente. Al guardar devuelve el cliente (para elegirlo en una venta). */
export function ModalCliente({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: ClienteResponse | null
  onCerrar: () => void
  onGuardado?: (cliente: ClienteResponse) => void
}) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: cliente?.nombre ?? '',
      tipoDocumento: cliente?.tipoDocumento ?? 'DNI',
      numeroDocumento: cliente?.numeroDocumento ?? '',
      telefono: cliente?.telefono ?? '',
      direccion: cliente?.direccion ?? '',
      activo: cliente?.activo ?? true,
    },
  })
  const tipo = useWatch({ control, name: 'tipoDocumento' })
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const datos = {
        nombre: d.nombre.trim(),
        tipoDocumento: d.tipoDocumento,
        numeroDocumento: nulo(d.numeroDocumento),
        telefono: nulo(d.telefono),
        direccion: nulo(d.direccion),
        activo: d.activo,
      }
      return cliente ? clientesApi.actualizar(cliente.id, datos) : clientesApi.crear(datos)
    },
    onSuccess: (c) => {
      avisar(cliente ? `Cliente ${c.nombre} actualizado` : `Cliente ${c.nombre} registrado`)
      void queryClient.invalidateQueries({ queryKey: ['clientes'] })
      onGuardado?.(c)
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'}
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
        <CampoTexto etiqueta="Nombre o razón social" obligatorio className="sm:col-span-2" error={errors.nombre?.message} {...register('nombre')} />
        <CampoSelector etiqueta="Tipo de documento" {...register('tipoDocumento')}>
          {(Object.keys(NOMBRE_DOCUMENTO) as TipoDocumentoIdentidad[]).map((t) => (
            <option key={t} value={t}>
              {NOMBRE_DOCUMENTO[t]}
            </option>
          ))}
        </CampoSelector>
        <CampoTexto
          etiqueta="Número de documento"
          inputMode={tipo === 'DNI' || tipo === 'RUC' ? 'numeric' : 'text'}
          maxLength={tipo === 'DNI' ? 8 : tipo === 'RUC' ? 11 : 12}
          disabled={tipo === 'NINGUNO'}
          mono
          error={errors.numeroDocumento?.message}
          {...register('numeroDocumento')}
        />
        <CampoTexto etiqueta="Celular" inputMode="tel" placeholder="987654321" maxLength={11} error={errors.telefono?.message} {...register('telefono')} />
        <CampoTexto etiqueta="Dirección" error={errors.direccion?.message} {...register('direccion')} />
        {cliente && <Casilla etiqueta="Cliente activo" {...register('activo')} />}
      </form>
    </Modal>
  )
}
