import { zodResolver } from '@hookform/resolvers/zod'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, History, ImageUp, Plus, Save, Trash2, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch, type UseFormRegister } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { productosApi } from '@/api/catalogo'
import { urlImagen } from '@/api/cliente'
import type {
  CategoriaResponse,
  PrecioSugeridoResponse,
  PresentacionRequest,
  PresentacionResponse,
  ProductoResponse,
  UnidadBase,
} from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { Casilla, CampoArea, CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, MensajeError } from '@/componentes/ui/Estados'
import { FotoProducto } from '@/componentes/ui/FotoProducto'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useCategorias, useUnidadesMedida } from '@/hooks/useCatalogos'
import { esDecimalValido, textoANumero } from '@/logica/decimales'
import { cantidadAgrupada, nombreUnidad, soles, sufijoUnidad } from '@/logica/formato'
import { precioSugerido } from '@/logica/precios'
import { factorValido, textoDecimales, valoresDeUnidad } from '@/logica/presentaciones'
import { HistorialPrecios } from './HistorialPrecios'
import { monto, nulo, textoObligatorio, textoOpcional } from '@/logica/validaciones'

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const MAXIMO_IMAGEN = 2 * 1024 * 1024

const esquemaPresentacion = z.object({
  id: z.number().optional(),
  nombre: textoObligatorio(50, 'Escriba el nombre (Ej: Caja x100)'),
  factor: z.string().trim().refine((v) => esDecimalValido(v, 3) && textoANumero(v) > 0, 'Factor inválido'),
  precioVenta: monto,
  codigoBarras: textoOpcional(50),
  activo: z.boolean(),
  decimales: z.enum(['0', '1', '2', '3']),
  porcentajeGanancia: z
    .string()
    .trim()
    .refine((v) => v === '' || (esDecimalValido(v, 4) && textoANumero(v) <= 1000), 'Entre 0 y 1000 (hasta 4 decimales)'),
  montoAdicional: z.string().trim().refine((v) => v === '' || esDecimalValido(v, 2), 'Monto inválido (hasta 2 decimales)'),
})

const esquema = z
  .object({
    codigo: textoObligatorio(30),
    nombre: textoObligatorio(150),
    descripcion: textoOpcional(300),
    marca: textoOpcional(80),
    tipo: textoOpcional(60),
    acabado: textoOpcional(60),
    medida: textoOpcional(60),
    categoriaId: z.string().min(1, 'Elija una categoría'),
    unidadBase: z.enum(['UNIDAD', 'KILO', 'METRO']),
    activo: z.boolean(),
    principal: z.number(),
    presentaciones: z.array(esquemaPresentacion).min(1, 'Agregue al menos una presentación').max(20),
  })
  .superRefine((datos, ctx) => {
    const nombres = new Set<string>()
    datos.presentaciones.forEach((p, i) => {
      if (esDecimalValido(p.factor, 3) && !factorValido(textoANumero(p.factor), datos.unidadBase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['presentaciones', i, 'factor'],
          message: 'Un producto por unidad solo acepta factores enteros',
        })
      }
      const clave = p.nombre.trim().toLowerCase()
      if (clave && nombres.has(clave)) {
        ctx.addIssue({ code: 'custom', path: ['presentaciones', i, 'nombre'], message: 'Nombre repetido' })
      }
      nombres.add(clave)
    })
    const principal = datos.presentaciones[datos.principal]
    if (!principal) {
      ctx.addIssue({ code: 'custom', path: ['principal'], message: 'Marque una presentación como principal' })
    } else if (!principal.activo) {
      ctx.addIssue({ code: 'custom', path: ['principal'], message: 'La presentación principal debe estar activa' })
    }
  })

type DatosProducto = z.infer<typeof esquema>
type DatosPresentacion = DatosProducto['presentaciones'][number]

const MARCA_POR_DEFECTO = 'VARIADO'

function presentacionNueva(unidad: UnidadBase): DatosPresentacion {
  return {
    nombre: '',
    factor: '1',
    precioVenta: '',
    codigoBarras: '',
    activo: true,
    decimales: unidad === 'UNIDAD' ? '0' : '3',
    porcentajeGanancia: '',
    montoAdicional: '',
  }
}

function aDecimales(valor: number): DatosPresentacion['decimales'] {
  return valor === 1 ? '1' : valor === 2 ? '2' : valor === 3 ? '3' : '0'
}

type Precios = Map<number, PrecioSugeridoResponse>

function textoOpcionalDe(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor)
}

function numeroONulo(texto: string): number | null {
  return texto.trim() === '' ? null : textoANumero(texto)
}

function aFormulario(p: ProductoResponse, precios: Precios): DatosProducto {
  const presentaciones = [...p.presentaciones].sort((a, b) => a.factor - b.factor)
  return {
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion ?? '',
    marca: p.marca ?? '',
    tipo: p.tipo ?? '',
    acabado: p.acabado ?? '',
    medida: p.medida ?? '',
    categoriaId: String(p.categoriaId),
    unidadBase: p.unidadBase,
    activo: p.activo,
    principal: Math.max(0, presentaciones.findIndex((x) => x.principal)),
    presentaciones: presentaciones.map((x) => ({
      id: x.id,
      nombre: x.nombre,
      factor: String(x.factor),
      precioVenta: x.precioVenta.toFixed(2),
      codigoBarras: x.codigoBarras ?? '',
      activo: x.activo,
      decimales: aDecimales(x.decimales),
      porcentajeGanancia: textoOpcionalDe(precios.get(x.id)?.porcentajeGanancia),
      montoAdicional: textoOpcionalDe(precios.get(x.id)?.montoAdicional),
    })),
  }
}

function aPresentacionRequest(p: DatosPresentacion, principal: boolean | null): PresentacionRequest {
  return {
    nombre: p.nombre.trim(),
    factor: textoANumero(p.factor),
    precioVenta: textoANumero(p.precioVenta),
    codigoBarras: nulo(p.codigoBarras),
    principal,
    activo: p.activo,
    decimales: Number(p.decimales),
    porcentajeGanancia: numeroONulo(p.porcentajeGanancia),
    montoAdicional: numeroONulo(p.montoAdicional),
  }
}

function cambio(original: PresentacionResponse, nueva: DatosPresentacion, precio: PrecioSugeridoResponse | undefined): boolean {
  return (
    (precio?.porcentajeGanancia ?? null) !== numeroONulo(nueva.porcentajeGanancia) ||
    (precio?.montoAdicional ?? null) !== numeroONulo(nueva.montoAdicional) ||
    original.nombre !== nueva.nombre.trim() ||
    original.factor !== textoANumero(nueva.factor) ||
    original.precioVenta !== textoANumero(nueva.precioVenta) ||
    (original.codigoBarras ?? '') !== nueva.codigoBarras.trim() ||
    original.activo !== nueva.activo ||
    original.decimales !== Number(nueva.decimales)
  )
}

/** Crear o editar un producto con sus presentaciones (factor y precio) y su foto. */
export default function FormularioProducto() {
  const { id } = useParams()
  const productoId = id ? Number(id) : null
  const producto = useQuery({
    queryKey: ['productos', 'detalle', productoId],
    queryFn: () => productosApi.obtener(productoId ?? 0),
    enabled: productoId !== null,
  })
  // Las categorias deben estar cargadas antes de armar el formulario para que la lista muestre la elegida
  const categorias = useCategorias(true)
  // Costo, ganancia y adicional de cada presentacion (solo ADMIN, que es quien edita productos)
  const precios = useQueries({
    queries: (producto.data?.presentaciones ?? []).map((p) => ({
      queryKey: ['productos', 'precio-sugerido', p.id],
      queryFn: () => productosApi.precioSugerido(productoId ?? 0, p.id),
    })),
    combine: (resultados) => ({
      pendiente: resultados.some((r) => r.isPending),
      error: resultados.find((r) => r.isError)?.error ?? null,
      mapa: new Map(resultados.flatMap((r) => (r.data ? [[r.data.presentacionId, r.data] as const] : []))),
    }),
  })

  if (categorias.isPending || (productoId !== null && (producto.isPending || precios.pendiente))) return <Cargando />
  if (categorias.isError) return <MensajeError error={categorias.error} />
  if (productoId !== null && producto.isError) return <MensajeError error={producto.error} />
  if (precios.error) return <MensajeError error={precios.error} />
  return (
    <Formulario
      key={productoId ?? 'nuevo'}
      producto={producto.data ?? null}
      categorias={categorias.data ?? []}
      precios={precios.mapa}
    />
  )
}

function Formulario({
  producto,
  categorias,
  precios,
}: {
  producto: ProductoResponse | null
  categorias: CategoriaResponse[]
  precios: Precios
}) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const [error, setError] = useState<unknown>(null)
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [quitarFoto, setQuitarFoto] = useState(false)
  const [errorFoto, setErrorFoto] = useState<string | null>(null)
  const [historial, setHistorial] = useState<{ id: number; nombre: string } | null>(null)
  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => () => (vistaPrevia ? URL.revokeObjectURL(vistaPrevia) : undefined), [vistaPrevia])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DatosProducto>({
    resolver: zodResolver(esquema),
    defaultValues: producto
      ? aFormulario(producto, precios)
      : {
          codigo: '',
          nombre: '',
          descripcion: '',
          marca: MARCA_POR_DEFECTO,
          tipo: '',
          acabado: '',
          medida: '',
          categoriaId: '',
          unidadBase: 'UNIDAD',
          activo: true,
          principal: 0,
          presentaciones: [{ ...presentacionNueva('UNIDAD'), nombre: 'Unidad' }],
        },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'presentaciones' })
  const unidad = useWatch({ control, name: 'unidadBase' }) as UnidadBase
  const principal = useWatch({ control, name: 'principal' })
  const presentaciones = useWatch({ control, name: 'presentaciones' })
  const unidadesMedida = useUnidadesMedida()

  /** Copia a la presentacion los valores propuestos por la unidad elegida (siguen siendo editables). */
  const aplicarUnidad = (indice: number, codigo: string) => {
    const elegida = unidadesMedida.data?.find((u) => u.codigo === codigo)
    if (!elegida) return
    const valores = valoresDeUnidad(elegida)
    setValue(`presentaciones.${indice}.nombre`, valores.nombre, { shouldValidate: true })
    if (valores.factor !== null) setValue(`presentaciones.${indice}.factor`, valores.factor, { shouldValidate: true })
    setValue(`presentaciones.${indice}.decimales`, aDecimales(Number(valores.decimales)))
  }

  const elegirArchivo = (lista: FileList | null) => {
    const elegido = lista?.[0]
    setErrorFoto(null)
    if (!elegido) return
    if (!TIPOS_IMAGEN.includes(elegido.type)) {
      setErrorFoto('Solo se aceptan fotos JPG, PNG o WEBP')
      return
    }
    if (elegido.size > MAXIMO_IMAGEN) {
      setErrorFoto('La foto no puede pesar más de 2 MB')
      return
    }
    setQuitarFoto(false)
    setArchivo(elegido)
  }

  const guardar = async (datos: DatosProducto) => {
    setError(null)
    setGuardando(true)
    try {
      let resultado: ProductoResponse
      if (!producto) {
        resultado = await productosApi.crear({
          codigo: datos.codigo.trim(),
          nombre: datos.nombre.trim(),
          descripcion: nulo(datos.descripcion),
          marca: nulo(datos.marca) ?? MARCA_POR_DEFECTO,
          tipo: nulo(datos.tipo),
          acabado: nulo(datos.acabado),
          medida: nulo(datos.medida),
          categoriaId: Number(datos.categoriaId),
          unidadBase: datos.unidadBase,
          presentaciones: datos.presentaciones.map((p, i) => aPresentacionRequest(p, i === datos.principal)),
        })
      } else {
        resultado = await productosApi.actualizar(producto.id, {
          codigo: datos.codigo.trim(),
          nombre: datos.nombre.trim(),
          descripcion: nulo(datos.descripcion),
          marca: nulo(datos.marca) ?? MARCA_POR_DEFECTO,
          tipo: nulo(datos.tipo),
          acabado: nulo(datos.acabado),
          medida: nulo(datos.medida),
          categoriaId: Number(datos.categoriaId),
          activo: datos.activo,
        })
        // Primero la nueva principal (el backend desmarca la anterior), luego el resto
        const orden = datos.presentaciones
          .map((p, i) => ({ p, i }))
          .sort((a, b) => Number(b.i === datos.principal) - Number(a.i === datos.principal))
        for (const { p, i } of orden) {
          const esPrincipal = i === datos.principal
          const original = producto.presentaciones.find((x) => x.id === p.id)
          if (!original) {
            resultado = await productosApi.agregarPresentacion(producto.id, aPresentacionRequest(p, esPrincipal))
          } else if (cambio(original, p, precios.get(original.id)) || (esPrincipal && !original.principal)) {
            resultado = await productosApi.actualizarPresentacion(
              producto.id,
              original.id,
              aPresentacionRequest(p, esPrincipal ? true : null),
            )
          }
        }
      }
      if (archivo) {
        resultado = await productosApi.subirImagen(resultado.id, archivo)
      } else if (quitarFoto && producto?.imagenUrl) {
        resultado = await productosApi.eliminarImagen(resultado.id)
      }
      await queryClient.invalidateQueries({ queryKey: ['productos'] })
      avisar(producto ? `Producto "${resultado.nombre}" actualizado` : `Producto "${resultado.nombre}" creado`)
      navegar('/productos')
    } catch (e) {
      setError(e)
      // Si algo se guardo antes del error, se refresca para no perder la sincronizacion
      void queryClient.invalidateQueries({ queryKey: ['productos'] })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setGuardando(false)
    }
  }

  const fotoActual = quitarFoto ? null : (vistaPrevia ?? urlImagen(producto?.imagenUrl ?? null))

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate>
      <Link to="/productos" className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca-texto">
        <ArrowLeft className="size-4" /> Volver a productos
      </Link>
      <EncabezadoPagina
        titulo={producto ? 'Editar producto' : 'Nuevo producto'}
        subtitulo={producto ? `${producto.codigo} · ${producto.nombre}` : 'Registra el producto con sus formas de venta.'}
        acciones={
          <Boton type="submit" tamano="lg" cargando={guardando} icono={<Save className="size-5" />}>
            Guardar
          </Boton>
        }
      />
      {error !== null && <MensajeError error={error} className="mb-5" />}

      <div className="grid gap-5 xl:grid-cols-3">
        <Tarjeta className="xl:col-span-2">
          <TituloTarjeta titulo="Datos del producto" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <CampoTexto etiqueta="Código" obligatorio placeholder="Ej: PER-HEX-M8" error={errors.codigo?.message} {...register('codigo')} />
            <CampoTexto etiqueta="Nombre" obligatorio placeholder="Ej: Perno hexagonal M8" error={errors.nombre?.message} {...register('nombre')} />
            <CampoSelector etiqueta="Categoría" obligatorio error={errors.categoriaId?.message} {...register('categoriaId')}>
              <option value="">Elija una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </CampoSelector>
            <CampoTexto etiqueta="Marca" ayuda="Si se deja vacía queda como VARIADO." error={errors.marca?.message} {...register('marca')} />
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <CampoTexto etiqueta="Tipo" placeholder="Ej: Hexagonal" error={errors.tipo?.message} {...register('tipo')} />
              <CampoTexto etiqueta="Acabado" placeholder="Ej: Zincado" error={errors.acabado?.message} {...register('acabado')} />
              <CampoTexto etiqueta="Medida" placeholder="Ej: 1/4 X 1/2" error={errors.medida?.message} {...register('medida')} />
            </div>
            <CampoSelector
              etiqueta="Unidad base"
              obligatorio
              disabled={producto !== null}
              ayuda={producto ? 'No se puede cambiar: el stock ya está guardado en esta unidad.' : 'El stock se guardará en esta unidad.'}
              {...register('unidadBase')}
            >
              <option value="UNIDAD">Unidad</option>
              <option value="KILO">Kilo</option>
              <option value="METRO">Metro</option>
            </CampoSelector>
            {producto && (
              <div className="flex items-end pb-2">
                <Casilla etiqueta="Producto activo (se puede vender)" {...register('activo')} />
              </div>
            )}
            <CampoArea etiqueta="Descripción" className="sm:col-span-2" error={errors.descripcion?.message} {...register('descripcion')} />
          </div>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta titulo="Foto" />
          <div className="flex flex-col items-center gap-4 p-5">
            <div className="flex size-44 items-center justify-center overflow-hidden rounded-2xl bg-beige">
              {fotoActual ? (
                <img src={fotoActual} alt="Foto del producto" className="size-full object-cover" />
              ) : (
                <FotoProducto url={null} nombre="" className="size-44 rounded-2xl" />
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-borde bg-white px-4 text-sm font-semibold text-tinta hover:bg-crema">
                <ImageUp className="size-4" aria-hidden />
                {fotoActual ? 'Cambiar foto' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => elegirArchivo(e.target.files)}
                  data-testid="entrada-foto"
                />
              </label>
              {fotoActual && (
                <Boton
                  variante="fantasma"
                  icono={<Trash2 className="size-4" />}
                  onClick={() => {
                    setArchivo(null)
                    setQuitarFoto(true)
                  }}
                >
                  Quitar
                </Boton>
              )}
            </div>
            <p className="text-center text-xs text-tinta-tenue">JPG, PNG o WEBP de hasta 2 MB. Se guarda al presionar “Guardar”.</p>
            {errorFoto && (
              <p className="text-xs text-peligro" role="alert">
                {errorFoto}
              </p>
            )}
          </div>
        </Tarjeta>
      </div>

      <Tarjeta className="mt-5">
        <TituloTarjeta
          titulo="Presentaciones"
          accion={
            <Boton variante="secundario" tamano="sm" icono={<Plus className="size-4" />} onClick={() => append({ ...presentacionNueva(unidad), factor: '' })} disabled={fields.length >= 20}>
              Agregar presentación
            </Boton>
          }
        />
        <div className="p-5">
          <p className="mb-4 text-sm text-tinta-suave">
            Cada presentación es una forma de vender el producto. El <strong>factor</strong> indica cuántas unidades base contiene
            (Ej: Caja x100 = 100 {sufijoUnidad(unidad)}
            {unidad !== 'UNIDAD' && <>, Medio {nombreUnidad(unidad).toLowerCase()} = 0.5</>}). El precio incluye IGV.
          </p>
          {errors.presentaciones?.message && <p className="mb-3 text-sm text-peligro">{errors.presentaciones.message}</p>}
          {errors.principal?.message && <p className="mb-3 text-sm text-peligro">{errors.principal.message}</p>}
          <div className="flex flex-col gap-3">
            {fields.map((campo, i) => {
              const actual = presentaciones[i]
              const factor = actual && esDecimalValido(actual.factor, 3) ? textoANumero(actual.factor) : 0
              const precio = actual && esDecimalValido(actual.precioVenta, 2) ? textoANumero(actual.precioVenta) : 0
              const errorFila = errors.presentaciones?.[i]
              return (
                <div
                  key={campo.id}
                  className={cn('grid gap-3 rounded-xl border p-4 md:grid-cols-12', principal === i ? 'border-marca/50 bg-marca-claro/30' : 'border-borde')}
                  data-testid={`presentacion-${i}`}
                >
                  <CampoSelector
                    className="md:col-span-3"
                    etiqueta="Unidad de medida"
                    value=""
                    onChange={(e) => aplicarUnidad(i, e.target.value)}
                    ayuda="Propone nombre, factor y decimales"
                  >
                    <option value="">Elegir unidad…</option>
                    {unidadesMedida.data?.map((u) => (
                      <option key={u.id} value={u.codigo}>
                        {u.nombre}
                        {u.factorSugerido !== null ? ` (${cantidadAgrupada(u.factorSugerido)})` : ''}
                      </option>
                    ))}
                  </CampoSelector>
                  <CampoTexto className="md:col-span-3" etiqueta="Nombre" placeholder="Ej: Caja x100" error={errorFila?.nombre?.message} {...register(`presentaciones.${i}.nombre`)} />
                  <CampoTexto
                    className="md:col-span-2"
                    etiqueta={`Factor (${sufijoUnidad(unidad)})`}
                    inputMode="decimal"
                    error={errorFila?.factor?.message}
                    {...register(`presentaciones.${i}.factor`)}
                  />
                  <CampoTexto
                    className="md:col-span-2"
                    etiqueta="Precio (S/)"
                    inputMode="decimal"
                    placeholder="0.00"
                    error={errorFila?.precioVenta?.message}
                    {...register(`presentaciones.${i}.precioVenta`)}
                  />
                  <CampoSelector className="md:col-span-2" etiqueta="Decimales" ayuda={textoDecimales(Number(actual?.decimales ?? 0))} {...register(`presentaciones.${i}.decimales`)}>
                    <option value="0">0 (enteros)</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </CampoSelector>
                  <CampoTexto className="md:col-span-3" etiqueta="Código de barras" error={errorFila?.codigoBarras?.message} {...register(`presentaciones.${i}.codigoBarras`)} />
                  <div className="flex items-end justify-end gap-1 md:col-span-1">
                    {actual?.id === undefined ? (
                      <Boton
                        variante="fantasma"
                        tamano="sm"
                        onClick={() => {
                          remove(i)
                          if (principal >= i && principal > 0) setValue('principal', principal - 1)
                        }}
                        disabled={fields.length === 1}
                        aria-label="Quitar presentación"
                        icono={<Trash2 className="size-4" />}
                      />
                    ) : null}
                  </div>
                  <FilaPrecios
                    indice={i}
                    costo={actual?.id !== undefined ? (precios.get(actual.id)?.costoReferencia ?? null) : null}
                    porcentaje={actual?.porcentajeGanancia ?? ''}
                    adicional={actual?.montoAdicional ?? ''}
                    errores={{ porcentaje: errorFila?.porcentajeGanancia?.message, adicional: errorFila?.montoAdicional?.message }}
                    registrar={register}
                    usarSugerido={(valor) => setValue(`presentaciones.${i}.precioVenta`, valor.toFixed(2), { shouldValidate: true, shouldDirty: true })}
                    verHistorial={actual?.id !== undefined ? () => setHistorial({ id: actual.id ?? 0, nombre: actual.nombre }) : undefined}
                  />
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:col-span-12">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" className="size-4 accent-marca" checked={principal === i} onChange={() => setValue('principal', i, { shouldValidate: true })} name="principal" />
                      Principal (se muestra por defecto)
                    </label>
                    {actual?.id !== undefined && <Casilla etiqueta="Activa" {...register(`presentaciones.${i}.activo`)} />}
                    {factor > 0 && (
                      <span className="font-mono text-xs text-tinta-suave">
                        1 {actual?.nombre || 'presentación'} = {cantidadAgrupada(factor)} {sufijoUnidad(unidad)}
                        {precio > 0 && ` · ${soles(precio / factor)} por ${sufijoUnidad(unidad)}`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Tarjeta>
      {historial && producto && (
        <HistorialPrecios productoId={producto.id} presentacionId={historial.id} nombre={historial.nombre} onCerrar={() => setHistorial(null)} />
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Boton variante="secundario" onClick={() => navegar('/productos')}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando} icono={<Save className="size-4" />}>
          Guardar
        </Boton>
      </div>
    </form>
  )
}

/**
 * Costo de referencia (ultima compra), ganancia, adicional y precio sugerido de una presentacion.
 * "Usar sugerido" solo copia el valor al campo Precio: se guarda al presionar "Guardar".
 */
function FilaPrecios({
  indice,
  costo,
  porcentaje,
  adicional,
  errores,
  registrar,
  usarSugerido,
  verHistorial,
}: {
  indice: number
  costo: number | null
  porcentaje: string
  adicional: string
  errores: { porcentaje?: string; adicional?: string }
  registrar: UseFormRegister<DatosProducto>
  usarSugerido: (valor: number) => void
  verHistorial?: () => void
}) {
  const valido = (porcentaje.trim() === '' || esDecimalValido(porcentaje, 4)) && (adicional.trim() === '' || esDecimalValido(adicional, 2))
  const sugerido = valido ? precioSugerido(costo, porcentaje, adicional) : null
  return (
    <div className="grid gap-3 rounded-lg bg-crema/60 p-3 md:col-span-12 md:grid-cols-12" data-testid={`precios-${indice}`}>
      <div className="md:col-span-2">
        <p className="text-xs font-semibold text-tinta-suave">Costo de referencia</p>
        <p className="font-mono text-sm text-tinta" data-testid={`costo-${indice}`}>
          {costo === null ? 'Sin compras aún' : `S/ ${costo.toFixed(4)}`}
        </p>
      </div>
      <CampoTexto
        className="md:col-span-2"
        etiqueta="Ganancia (%)"
        inputMode="decimal"
        placeholder="Ej: 30"
        error={errores.porcentaje}
        {...registrar(`presentaciones.${indice}.porcentajeGanancia`)}
      />
      <CampoTexto
        className="md:col-span-2"
        etiqueta="Adicional (S/)"
        inputMode="decimal"
        placeholder="0.00"
        error={errores.adicional}
        {...registrar(`presentaciones.${indice}.montoAdicional`)}
      />
      <div className="md:col-span-2">
        <p className="text-xs font-semibold text-tinta-suave">Precio sugerido</p>
        <p className="font-mono text-sm font-bold text-tinta" data-testid={`sugerido-${indice}`}>
          {sugerido === null ? '—' : soles(sugerido)}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2 md:col-span-4">
        <Boton
          variante="secundario"
          tamano="sm"
          icono={<WandSparkles className="size-4" />}
          disabled={sugerido === null}
          onClick={() => sugerido !== null && usarSugerido(sugerido)}
        >
          Usar sugerido
        </Boton>
        {verHistorial && (
          <Boton variante="fantasma" tamano="sm" icono={<History className="size-4" />} onClick={verHistorial}>
            Historial
          </Boton>
        )}
      </div>
    </div>
  )
}
