import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { usuariosApi } from '@/api/organizacion'
import type { Rol, UsuarioResponse } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { Casilla, CampoSelector, CampoTexto, Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { useRetraso } from '@/hooks/useRetraso'
import { iniciales, NOMBRE_ROL } from '@/logica/formato'
import { contrasena, textoObligatorio } from '@/logica/validaciones'

/** Administracion de usuarios y roles (solo ADMIN). */
export default function Usuarios() {
  const [texto, setTexto] = useState('')
  const [rol, setRol] = useState('')
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<UsuarioResponse | 'nuevo' | null>(null)
  const [restableciendo, setRestableciendo] = useState<UsuarioResponse | null>(null)
  const busqueda = useRetraso(texto.trim())
  const filtro = { texto: busqueda, rol: (rol || undefined) as Rol | undefined, page: pagina, size: 20, sort: 'id,asc' }
  const usuarios = useQuery({ queryKey: ['usuarios', filtro], queryFn: () => usuariosApi.listar(filtro), placeholderData: keepPreviousData })

  return (
    <div>
      <EncabezadoPagina
        titulo="Usuarios"
        subtitulo={`${usuarios.data?.totalElementos ?? '…'} usuarios`}
        acciones={
          <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => setEditando('nuevo')}>
            Nuevo usuario
          </Boton>
        }
      />
      <Tarjeta className="mb-5 grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_12rem]">
        <Buscador valor={texto} onCambiar={(v) => { setTexto(v); setPagina(0) }} placeholder="Buscar por nombre o usuario…" aria-label="Buscar usuario" />
        <Selector value={rol} onChange={(e) => { setRol(e.target.value); setPagina(0) }} aria-label="Filtrar por rol" className="h-11 rounded-xl">
          <option value="">Todos los roles</option>
          {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </Selector>
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Ubicación</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {usuarios.isPending && (
              <FilaCompleta columnas={5}>
                <Cargando />
              </FilaCompleta>
            )}
            {usuarios.isError && (
              <FilaCompleta columnas={5}>
                <MensajeError error={usuarios.error} />
              </FilaCompleta>
            )}
            {usuarios.data?.contenido.length === 0 && (
              <FilaCompleta columnas={5}>
                <EstadoVacio titulo="Sin usuarios" />
              </FilaCompleta>
            )}
            {usuarios.data?.contenido.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-marca-claro text-sm font-bold text-marca-oscuro">{iniciales(u.nombres)}</span>
                    <div>
                      <p className="font-semibold">{u.nombres}</p>
                      <p className="font-mono text-xs text-tinta-tenue">{u.username}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <Insignia tono={u.rol === 'ADMIN' ? 'marca' : u.rol === 'VENDEDOR' ? 'info' : 'neutro'}>{NOMBRE_ROL[u.rol]}</Insignia>
                </Td>
                <Td className="text-tinta-suave">{u.ubicacionNombre ?? 'Todas'}</Td>
                <Td>
                  <Insignia tono={u.activo ? 'exito' : 'neutro'}>{u.activo ? 'Activo' : 'Inactivo'}</Insignia>
                </Td>
                <Td alinear="derecha">
                  <div className="flex justify-end gap-1">
                    <Boton variante="fantasma" tamano="sm" icono={<KeyRound className="size-4" />} onClick={() => setRestableciendo(u)} aria-label={`Restablecer contraseña de ${u.username}`} title="Restablecer contraseña" />
                    <Boton variante="fantasma" tamano="sm" icono={<Pencil className="size-4" />} onClick={() => setEditando(u)} aria-label={`Editar ${u.username}`} />
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={usuarios.data} onCambiar={setPagina} />
      </Tarjeta>
      {editando && <ModalUsuario usuario={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
      {restableciendo && <ModalRestablecer usuario={restableciendo} onCerrar={() => setRestableciendo(null)} />}
    </div>
  )
}

function ModalUsuario({ usuario, onCerrar }: { usuario: UsuarioResponse | null; onCerrar: () => void }) {
  const yo = useUsuario()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas } = useUbicacion()
  const esquema = z
    .object({
      nombres: textoObligatorio(120),
      username: usuario
        ? z.string()
        : z
            .string()
            .trim()
            .min(3, 'Mínimo 3 caracteres')
            .max(50)
            .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
      password: usuario ? z.string() : contrasena,
      rol: z.enum(['ADMIN', 'VENDEDOR', 'ALMACENERO']),
      ubicacionId: z.string(),
      activo: z.boolean(),
    })
    .superRefine((d, ctx) => {
      if (d.rol !== 'ADMIN' && !d.ubicacionId) {
        ctx.addIssue({ code: 'custom', path: ['ubicacionId'], message: d.rol === 'VENDEDOR' ? 'Elija la tienda' : 'Elija el almacén' })
      }
    })
  type Datos = z.infer<typeof esquema>
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombres: usuario?.nombres ?? '',
      username: usuario?.username ?? '',
      password: '',
      rol: usuario?.rol ?? 'VENDEDOR',
      ubicacionId: usuario?.ubicacionId ? String(usuario.ubicacionId) : '',
      activo: usuario?.activo ?? true,
    },
  })
  const rol = useWatch({ control, name: 'rol' })
  // VENDEDOR solo en una TIENDA y ALMACENERO solo en un ALMACEN (regla del backend)
  const opciones = todas.filter((u) => (rol === 'VENDEDOR' ? u.tipo === 'TIENDA' : u.tipo === 'ALMACEN'))
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const ubicacionId = d.rol === 'ADMIN' || !d.ubicacionId ? null : Number(d.ubicacionId)
      return usuario
        ? usuariosApi.actualizar(usuario.id, { nombres: d.nombres.trim(), rol: d.rol, ubicacionId, activo: d.activo })
        : usuariosApi.crear({ nombres: d.nombres.trim(), username: d.username.trim(), password: d.password, rol: d.rol, ubicacionId })
    },
    onSuccess: (u) => {
      avisar(usuario ? `Usuario ${u.username} actualizado` : `Usuario ${u.username} creado`)
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={usuario ? `Editar usuario ${usuario.username}` : 'Nuevo usuario'}
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
        <CampoTexto etiqueta="Nombres" obligatorio className="sm:col-span-2" error={errors.nombres?.message} {...register('nombres')} />
        {!usuario && (
          <>
            <CampoTexto etiqueta="Usuario" obligatorio autoComplete="off" className="font-mono" error={errors.username?.message} {...register('username')} />
            <CampoTexto
              etiqueta="Contraseña inicial"
              obligatorio
              type="password"
              autoComplete="new-password"
              ayuda="Entre 8 y 72 caracteres."
              error={errors.password?.message}
              {...register('password')}
            />
          </>
        )}
        <CampoSelector etiqueta="Rol" obligatorio error={errors.rol?.message} {...register('rol')}>
          {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </CampoSelector>
        {rol !== 'ADMIN' ? (
          <CampoSelector etiqueta={rol === 'VENDEDOR' ? 'Tienda' : 'Almacén'} obligatorio error={errors.ubicacionId?.message} {...register('ubicacionId')}>
            <option value="">Elija…</option>
            {opciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </CampoSelector>
        ) : (
          <CampoTexto etiqueta="Ubicación" value="Todas (administrador)" disabled />
        )}
        {usuario && (
          <Casilla
            etiqueta="Usuario activo (puede iniciar sesión)"
            disabled={usuario.id === yo.id}
            className="sm:col-span-2"
            {...register('activo')}
          />
        )}
      </form>
    </Modal>
  )
}

function ModalRestablecer({ usuario, onCerrar }: { usuario: UsuarioResponse; onCerrar: () => void }) {
  const { avisar } = useAvisos()
  const esquema = z
    .object({ passwordNueva: contrasena, confirmacion: z.string() })
    .refine((d) => d.passwordNueva === d.confirmacion, { path: ['confirmacion'], message: 'Las contraseñas no coinciden' })
  type Datos = z.infer<typeof esquema>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { passwordNueva: '', confirmacion: '' } })
  const guardar = useMutation({
    mutationFn: (d: Datos) => usuariosApi.restablecerPassword(usuario.id, d.passwordNueva),
    onSuccess: () => {
      avisar(`Contraseña de ${usuario.username} restablecida`)
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))
  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Restablecer contraseña"
      descripcion={`${usuario.nombres} (${usuario.username})`}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton onClick={enviar} cargando={guardar.isPending}>
            Restablecer
          </Boton>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {guardar.error && <MensajeError error={guardar.error} />}
        <CampoTexto etiqueta="Nueva contraseña" type="password" autoComplete="new-password" error={errors.passwordNueva?.message} {...register('passwordNueva')} />
        <CampoTexto etiqueta="Repite la contraseña" type="password" autoComplete="new-password" error={errors.confirmacion?.message} {...register('confirmacion')} />
      </form>
    </Modal>
  )
}
