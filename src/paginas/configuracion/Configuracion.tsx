import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useSearchParams } from 'react-router'
import { z } from 'zod'
import { categoriasApi } from '@/api/catalogo'
import { empresasApi, ubicacionesApi } from '@/api/organizacion'
import type { CategoriaResponse, EmpresaResponse, TipoUbicacion, UbicacionResponse } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { Casilla, CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { Pestanas } from '@/componentes/ui/Pestanas'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useEmpresasActivas } from '@/hooks/useCatalogos'
import { nulo, ruc, textoObligatorio, textoOpcional } from '@/logica/validaciones'
import { FormularioCambiarPassword } from './CambiarPassword'

type Seccion = 'empresas' | 'ubicaciones' | 'categorias' | 'contrasena'

/** Configuracion (solo ADMIN): empresas, ubicaciones, categorias y cambio de contrasena. */
export default function Configuracion() {
  const [parametros, setParametros] = useSearchParams()
  const tab = parametros.get('tab')
  const seccion: Seccion = tab === 'ubicaciones' || tab === 'categorias' || tab === 'contrasena' ? tab : 'empresas'
  return (
    <div>
      <EncabezadoPagina titulo="Configuración" subtitulo="Empresas, tiendas y almacenes, categorías de productos y tu contraseña" />
      <Pestanas<Seccion>
        pestanas={[
          { id: 'empresas', etiqueta: 'Empresas' },
          { id: 'ubicaciones', etiqueta: 'Ubicaciones' },
          { id: 'categorias', etiqueta: 'Categorías' },
          { id: 'contrasena', etiqueta: 'Mi contraseña' },
        ]}
        activa={seccion}
        onCambiar={(id) => setParametros(id === 'empresas' ? {} : { tab: id })}
      />
      {seccion === 'empresas' && <Empresas />}
      {seccion === 'ubicaciones' && <Ubicaciones />}
      {seccion === 'categorias' && <Categorias />}
      {seccion === 'contrasena' && (
        <Tarjeta className="max-w-lg">
          <TituloTarjeta titulo="Cambiar mi contraseña" />
          <div className="p-5">
            <FormularioCambiarPassword />
          </div>
        </Tarjeta>
      )}
    </div>
  )
}

function Activo({ activo }: { activo: boolean }) {
  return <Insignia tono={activo ? 'exito' : 'neutro'}>{activo ? 'Activo' : 'Inactivo'}</Insignia>
}

function BotonNuevo({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <div className="mb-4 flex justify-end">
      <Boton icono={<Plus className="size-4" />} onClick={onClick}>
        {texto}
      </Boton>
    </div>
  )
}

// ---------- Empresas ----------

function Empresas() {
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<EmpresaResponse | 'nueva' | null>(null)
  const filtro = { page: pagina, size: 20, sort: 'id,asc' }
  const empresas = useQuery({ queryKey: ['empresas', 'listado', filtro], queryFn: () => empresasApi.listar(filtro), placeholderData: keepPreviousData })
  return (
    <>
      <BotonNuevo texto="Nueva empresa" onClick={() => setEditando('nueva')} />
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>RUC</Th>
              <Th>Razón social</Th>
              <Th>Nombre comercial</Th>
              <Th>Dirección</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {empresas.isPending && (
              <FilaCompleta columnas={6}>
                <Cargando />
              </FilaCompleta>
            )}
            {empresas.isError && (
              <FilaCompleta columnas={6}>
                <MensajeError error={empresas.error} />
              </FilaCompleta>
            )}
            {empresas.data?.contenido.length === 0 && (
              <FilaCompleta columnas={6}>
                <EstadoVacio titulo="Sin empresas" />
              </FilaCompleta>
            )}
            {empresas.data?.contenido.map((e) => (
              <Tr key={e.id}>
                <Td className="font-mono">{e.ruc}</Td>
                <Td className="font-semibold">{e.razonSocial}</Td>
                <Td className="text-tinta-suave">{e.nombreComercial ?? '—'}</Td>
                <Td className="text-tinta-suave">{e.direccion ?? '—'}</Td>
                <Td>
                  <Activo activo={e.activo} />
                </Td>
                <Td alinear="derecha">
                  <Boton variante="fantasma" tamano="sm" icono={<Pencil className="size-4" />} onClick={() => setEditando(e)} aria-label={`Editar ${e.razonSocial}`} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={empresas.data} onCambiar={setPagina} />
      </Tarjeta>
      {editando && <ModalEmpresa empresa={editando === 'nueva' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

const esquemaEmpresa = z.object({
  ruc,
  razonSocial: textoObligatorio(150),
  nombreComercial: textoOpcional(150),
  direccion: textoOpcional(200),
  activo: z.boolean(),
})

function ModalEmpresa({ empresa, onCerrar }: { empresa: EmpresaResponse | null; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  type Datos = z.infer<typeof esquemaEmpresa>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: {
      ruc: empresa?.ruc ?? '',
      razonSocial: empresa?.razonSocial ?? '',
      nombreComercial: empresa?.nombreComercial ?? '',
      direccion: empresa?.direccion ?? '',
      activo: empresa?.activo ?? true,
    },
  })
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const datos = { ruc: d.ruc, razonSocial: d.razonSocial.trim(), nombreComercial: nulo(d.nombreComercial), direccion: nulo(d.direccion), activo: d.activo }
      return empresa ? empresasApi.actualizar(empresa.id, datos) : empresasApi.crear(datos)
    },
    onSuccess: (e) => {
      avisar(`Empresa ${e.razonSocial} guardada`)
      void queryClient.invalidateQueries({ queryKey: ['empresas'] })
      void queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))
  return (
    <Modal abierto onCerrar={onCerrar} titulo={empresa ? 'Editar empresa' : 'Nueva empresa'} pie={<PieGuardar onCerrar={onCerrar} onGuardar={enviar} cargando={guardar.isPending} />}>
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2" noValidate>
        {guardar.error && <MensajeError error={guardar.error} className="sm:col-span-2" />}
        <CampoTexto etiqueta="RUC" obligatorio inputMode="numeric" mono error={errors.ruc?.message} {...register('ruc')} />
        <CampoTexto etiqueta="Razón social" obligatorio error={errors.razonSocial?.message} {...register('razonSocial')} />
        <CampoTexto etiqueta="Nombre comercial" error={errors.nombreComercial?.message} {...register('nombreComercial')} />
        <CampoTexto etiqueta="Dirección" error={errors.direccion?.message} {...register('direccion')} />
        {empresa && <Casilla etiqueta="Empresa activa" {...register('activo')} />}
      </form>
    </Modal>
  )
}

function PieGuardar({ onCerrar, onGuardar, cargando }: { onCerrar: () => void; onGuardar: () => void; cargando: boolean }) {
  return (
    <>
      <Boton variante="secundario" onClick={onCerrar}>
        Cancelar
      </Boton>
      <Boton onClick={onGuardar} cargando={cargando}>
        Guardar
      </Boton>
    </>
  )
}

// ---------- Ubicaciones ----------

function Ubicaciones() {
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<UbicacionResponse | 'nueva' | null>(null)
  const filtro = { page: pagina, size: 20, sort: 'id,asc' }
  const ubicaciones = useQuery({ queryKey: ['ubicaciones', 'listado', filtro], queryFn: () => ubicacionesApi.listar(filtro), placeholderData: keepPreviousData })
  return (
    <>
      <BotonNuevo texto="Nueva ubicación" onClick={() => setEditando('nueva')} />
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Empresa (RUC)</Th>
              <Th>Dirección</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {ubicaciones.isPending && (
              <FilaCompleta columnas={6}>
                <Cargando />
              </FilaCompleta>
            )}
            {ubicaciones.isError && (
              <FilaCompleta columnas={6}>
                <MensajeError error={ubicaciones.error} />
              </FilaCompleta>
            )}
            {ubicaciones.data?.contenido.map((u) => (
              <Tr key={u.id}>
                <Td className="font-semibold">{u.nombre}</Td>
                <Td>
                  <Insignia tono={u.tipo === 'TIENDA' ? 'info' : 'marca'}>{u.tipo === 'TIENDA' ? 'Tienda' : 'Almacén'}</Insignia>
                </Td>
                <Td className="text-tinta-suave">{u.empresaRazonSocial ? `${u.empresaRazonSocial} (${u.empresaRuc})` : 'Compartido'}</Td>
                <Td className="text-tinta-suave">{u.direccion ?? '—'}</Td>
                <Td>
                  <Activo activo={u.activo} />
                </Td>
                <Td alinear="derecha">
                  <Boton variante="fantasma" tamano="sm" icono={<Pencil className="size-4" />} onClick={() => setEditando(u)} aria-label={`Editar ${u.nombre}`} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={ubicaciones.data} onCambiar={setPagina} />
      </Tarjeta>
      {editando && <ModalUbicacion ubicacion={editando === 'nueva' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

const esquemaUbicacion = z
  .object({
    nombre: textoObligatorio(100),
    tipo: z.enum(['ALMACEN', 'TIENDA']),
    empresaId: z.string(),
    direccion: textoOpcional(200),
    activo: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === 'TIENDA' && !d.empresaId) {
      ctx.addIssue({ code: 'custom', path: ['empresaId'], message: 'Una tienda necesita su empresa (RUC)' })
    }
  })

function ModalUbicacion({ ubicacion, onCerrar }: { ubicacion: UbicacionResponse | null; onCerrar: () => void }) {
  // Las empresas deben estar cargadas antes de armar el formulario para que la lista muestre la elegida
  const empresas = useEmpresasActivas()
  if (empresas.isPending) {
    return (
      <Modal abierto onCerrar={onCerrar} titulo="Ubicación">
        <Cargando />
      </Modal>
    )
  }
  return <FormularioUbicacion ubicacion={ubicacion} empresas={empresas.data ?? []} onCerrar={onCerrar} />
}

function FormularioUbicacion({
  ubicacion,
  empresas,
  onCerrar,
}: {
  ubicacion: UbicacionResponse | null
  empresas: EmpresaResponse[]
  onCerrar: () => void
}) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  type Datos = z.infer<typeof esquemaUbicacion>
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquemaUbicacion),
    defaultValues: {
      nombre: ubicacion?.nombre ?? '',
      tipo: ubicacion?.tipo ?? 'TIENDA',
      empresaId: ubicacion?.empresaId ? String(ubicacion.empresaId) : '',
      direccion: ubicacion?.direccion ?? '',
      activo: ubicacion?.activo ?? true,
    },
  })
  const tipo = useWatch({ control, name: 'tipo' }) as TipoUbicacion
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const datos = {
        nombre: d.nombre.trim(),
        tipo: d.tipo,
        empresaId: d.tipo === 'TIENDA' ? Number(d.empresaId) : null,
        direccion: nulo(d.direccion),
        activo: d.activo,
      }
      return ubicacion ? ubicacionesApi.actualizar(ubicacion.id, datos) : ubicacionesApi.crear(datos)
    },
    onSuccess: (u) => {
      avisar(`Ubicación ${u.nombre} guardada`)
      void queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))
  return (
    <Modal abierto onCerrar={onCerrar} titulo={ubicacion ? 'Editar ubicación' : 'Nueva ubicación'} pie={<PieGuardar onCerrar={onCerrar} onGuardar={enviar} cargando={guardar.isPending} />}>
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2" noValidate>
        {guardar.error && <MensajeError error={guardar.error} className="sm:col-span-2" />}
        <CampoTexto etiqueta="Nombre" obligatorio error={errors.nombre?.message} {...register('nombre')} />
        <CampoSelector etiqueta="Tipo" disabled={ubicacion !== null} ayuda={ubicacion ? 'El tipo no se puede cambiar.' : undefined} {...register('tipo')}>
          <option value="TIENDA">Tienda</option>
          <option value="ALMACEN">Almacén</option>
        </CampoSelector>
        {tipo === 'TIENDA' && (
          <CampoSelector etiqueta="Empresa (RUC)" obligatorio error={errors.empresaId?.message} {...register('empresaId')}>
            <option value="">Elija la empresa</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.razonSocial} ({e.ruc})
              </option>
            ))}
          </CampoSelector>
        )}
        <CampoTexto etiqueta="Dirección" error={errors.direccion?.message} {...register('direccion')} />
        {ubicacion && <Casilla etiqueta="Ubicación activa" {...register('activo')} />}
      </form>
    </Modal>
  )
}

// ---------- Categorias ----------

function Categorias() {
  const [pagina, setPagina] = useState(0)
  const [editando, setEditando] = useState<CategoriaResponse | 'nueva' | null>(null)
  const filtro = { page: pagina, size: 20, sort: 'nombre,asc' }
  const categorias = useQuery({ queryKey: ['categorias', 'listado', filtro], queryFn: () => categoriasApi.listar(filtro), placeholderData: keepPreviousData })
  return (
    <>
      <BotonNuevo texto="Nueva categoría" onClick={() => setEditando('nueva')} />
      <Tarjeta className="max-w-2xl overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Estado</Th>
              <Th alinear="derecha">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {categorias.isPending && (
              <FilaCompleta columnas={3}>
                <Cargando />
              </FilaCompleta>
            )}
            {categorias.isError && (
              <FilaCompleta columnas={3}>
                <MensajeError error={categorias.error} />
              </FilaCompleta>
            )}
            {categorias.data?.contenido.map((c) => (
              <Tr key={c.id}>
                <Td className="font-semibold">{c.nombre}</Td>
                <Td>
                  <Activo activo={c.activo} />
                </Td>
                <Td alinear="derecha">
                  <Boton variante="fantasma" tamano="sm" icono={<Pencil className="size-4" />} onClick={() => setEditando(c)} aria-label={`Editar ${c.nombre}`} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={categorias.data} onCambiar={setPagina} />
      </Tarjeta>
      {editando && <ModalCategoria categoria={editando === 'nueva' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function ModalCategoria({ categoria, onCerrar }: { categoria: CategoriaResponse | null; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const esquema = z.object({ nombre: textoObligatorio(80), activo: z.boolean() })
  type Datos = z.infer<typeof esquema>
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { nombre: categoria?.nombre ?? '', activo: categoria?.activo ?? true } })
  const guardar = useMutation({
    mutationFn: (d: Datos) => {
      const datos = { nombre: d.nombre.trim(), activo: d.activo }
      return categoria ? categoriasApi.actualizar(categoria.id, datos) : categoriasApi.crear(datos)
    },
    onSuccess: (c) => {
      avisar(`Categoría ${c.nombre} guardada`)
      void queryClient.invalidateQueries({ queryKey: ['categorias'] })
      onCerrar()
    },
  })
  const enviar = handleSubmit((d) => guardar.mutate(d))
  return (
    <Modal abierto onCerrar={onCerrar} titulo={categoria ? 'Editar categoría' : 'Nueva categoría'} ancho="sm" pie={<PieGuardar onCerrar={onCerrar} onGuardar={enviar} cargando={guardar.isPending} />}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {guardar.error && <MensajeError error={guardar.error} />}
        <CampoTexto etiqueta="Nombre" obligatorio error={errors.nombre?.message} {...register('nombre')} />
        {categoria && <Casilla etiqueta="Categoría activa" {...register('activo')} />}
      </form>
    </Modal>
  )
}
