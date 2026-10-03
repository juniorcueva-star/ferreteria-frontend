import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, LockOpen, RefreshCw, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import type { CajaResponse } from '@/api/tipos'
import { cajasApi } from '@/api/ventas'
import { useUsuario } from '@/auth/contexto'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector, CampoTexto } from '@/componentes/ui/Campo'
import { cn } from '@/componentes/ui/cn'
import { Dato } from '@/componentes/ui/Dato'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Modal } from '@/componentes/ui/Modal'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { TONO_CAJA } from '@/componentes/ui/tonos'
import { useUbicacion } from '@/contexto/ubicacion'
import { useCajaActual } from '@/hooks/useCajaActual'
import { aCentimos, esDecimalValido } from '@/logica/decimales'
import { fechaHora, nombreMetodoPago, soles, solesDeCentimos } from '@/logica/formato'
import { monto } from '@/logica/validaciones'

/** Apertura, resumen en vivo y cierre con cuadre; ademas el historial de cajas. */
export default function Caja() {
  const actual = useCajaActual()
  const [detalleId, setDetalleId] = useState<number | null>(null)
  // El resultado del cierre vive aqui: al cerrar, la caja deja de estar abierta y CajaAbierta desaparece
  const [cerrada, setCerrada] = useState<CajaResponse | null>(null)

  return (
    <div>
      <EncabezadoPagina
        titulo="Caja"
        subtitulo={actual.data ? `Caja abierta en ${actual.data.ubicacionNombre}` : 'Abre tu caja al empezar el turno y ciérrala con el cuadre de efectivo'}
        acciones={
          actual.data && (
            <Boton variante="secundario" icono={<RefreshCw className={cn('size-4', actual.isFetching && 'animate-spin')} />} onClick={() => void actual.refetch()}>
              Actualizar
            </Boton>
          )
        }
      />
      {actual.isPending && <Cargando />}
      {actual.isError && <MensajeError error={actual.error} />}
      {actual.data === null && <AbrirCaja />}
      {actual.data && <CajaAbierta caja={actual.data} onCerrada={setCerrada} />}
      <HistorialCajas onVer={setDetalleId} />
      {detalleId !== null && <DetalleCaja id={detalleId} onCerrar={() => setDetalleId(null)} />}
      {cerrada && (
        <Modal abierto titulo="Caja cerrada" onCerrar={() => setCerrada(null)} ancho="sm" pie={<Boton onClick={() => setCerrada(null)}>Entendido</Boton>}>
          <ResultadoCuadre caja={cerrada} />
        </Modal>
      )}
    </div>
  )
}

function AbrirCaja() {
  const usuario = useUsuario()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas, seleccionada } = useUbicacion()
  const esAdmin = usuario.rol === 'ADMIN'
  const tiendas = todas.filter((u) => u.tipo === 'TIENDA')
  const esquema = z.object({
    montoApertura: monto,
    ubicacionId: esAdmin ? z.string().min(1, 'Elija la tienda') : z.string(),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: { montoApertura: '', ubicacionId: seleccionada?.tipo === 'TIENDA' ? String(seleccionada.id) : '' },
  })
  const abrir = useMutation({
    mutationFn: (d: z.infer<typeof esquema>) =>
      cajasApi.abrir({ ubicacionId: esAdmin ? Number(d.ubicacionId) : null, montoApertura: aCentimos(d.montoApertura) / 100 }),
    onSuccess: (caja) => {
      avisar(`Caja abierta en ${caja.ubicacionNombre} con ${soles(caja.montoApertura)}`)
      queryClient.setQueryData(['cajas', 'actual'], caja)
      void queryClient.invalidateQueries({ queryKey: ['cajas'] })
    },
  })

  return (
    <Tarjeta className="mb-6 max-w-xl">
      <TituloTarjeta titulo="Abrir caja" icono={<LockOpen className="size-4 text-marca" />} />
      <form onSubmit={handleSubmit((d) => abrir.mutate(d))} className="flex flex-col gap-4 p-5" noValidate>
        <p className="text-sm text-tinta-suave">No tienes una caja abierta. Ingresa el sencillo con el que empiezas el turno.</p>
        {abrir.error && <MensajeError error={abrir.error} />}
        {esAdmin ? (
          <CampoSelector etiqueta="Tienda" obligatorio error={errors.ubicacionId?.message} {...register('ubicacionId')}>
            <option value="">Elija la tienda</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </CampoSelector>
        ) : (
          <CampoTexto etiqueta="Tienda" value={usuario.ubicacionNombre ?? ''} disabled />
        )}
        <CampoTexto
          etiqueta="Monto de apertura (S/)"
          obligatorio
          inputMode="decimal"
          placeholder="0.00"
          mono
          error={errors.montoApertura?.message}
          {...register('montoApertura')}
        />
        <div className="flex justify-end">
          <Boton type="submit" cargando={abrir.isPending} icono={<LockOpen className="size-4" />}>
            Abrir caja
          </Boton>
        </div>
      </form>
    </Tarjeta>
  )
}

function CajaAbierta({ caja, onCerrada }: { caja: CajaResponse; onCerrada: (c: CajaResponse) => void }) {
  const navegar = useNavigate()
  const [cerrando, setCerrando] = useState(false)
  const r = caja.resumen

  return (
    <div className="mb-6 grid gap-5 xl:grid-cols-3">
      <Tarjeta className="xl:col-span-2">
        <TituloTarjeta
          titulo="Resumen en vivo"
          icono={<span className="size-2 animate-pulse rounded-full bg-exito" aria-hidden />}
          accion={<span className="text-xs text-tinta-suave">Se actualiza cada 15 s</span>}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra titulo="Apertura" valor={soles(caja.montoApertura)} detalle={fechaHora(caja.fechaApertura)} />
          <Cifra titulo="Ventas" valor={String(r?.cantidadVentas ?? 0)} detalle={`${soles(r?.totalVendido)} vendidos`} />
          <Cifra titulo="Al crédito" valor={soles(r?.totalCredito)} detalle="quedó como deuda" />
          <Cifra titulo="Abonos cobrados" valor={soles(r?.totalAbonos)} detalle="de fiados anteriores" />
        </div>
        <div className="border-t border-borde px-5 py-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-tinta-tenue uppercase">Cobrado por método</p>
          {r && r.cobrosPorMetodo.length > 0 ? (
            <ul className="divide-y divide-borde rounded-xl border border-borde">
              {r.cobrosPorMetodo.map((c) => (
                <li key={c.codigo} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    {nombreMetodoPago(c.codigo, c.nombre)}
                    {c.efectivo && <Insignia tono="exito">Cuenta para el cuadre</Insignia>}
                  </span>
                  <span className="font-mono font-semibold">{soles(c.monto)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-crema px-4 py-2.5 text-sm font-semibold">
                Total cobrado <span className="font-mono">{soles(r.totalCobrado)}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-tinta-suave">Aún no hay cobros en esta caja.</p>
          )}
        </div>
      </Tarjeta>

      <Tarjeta className="flex flex-col">
        <TituloTarjeta titulo="Efectivo en el cajón" />
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <p className="text-sm text-tinta-suave">Efectivo esperado</p>
            <p className="font-mono text-3xl font-bold text-tinta" data-testid="efectivo-esperado">
              {soles(r?.efectivoEsperado)}
            </p>
            <p className="mt-1 text-xs text-tinta-tenue">Apertura + cobros en efectivo. Yape, Plin, tarjeta y depósitos no van al cajón.</p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Boton variante="secundario" icono={<ShoppingBag className="size-4" />} onClick={() => navegar('/ventas')}>
              Ir al punto de venta
            </Boton>
            <Boton variante="peligro" icono={<Lock className="size-4" />} onClick={() => setCerrando(true)}>
              Cerrar caja
            </Boton>
          </div>
        </div>
      </Tarjeta>

      {cerrando && (
        <CerrarCaja
          caja={caja}
          onCerrar={() => setCerrando(false)}
          onCerrada={(c) => {
            setCerrando(false)
            onCerrada(c)
          }}
        />
      )}
    </div>
  )
}

function CerrarCaja({ caja, onCerrar, onCerrada }: { caja: CajaResponse; onCerrar: () => void; onCerrada: (c: CajaResponse) => void }) {
  const queryClient = useQueryClient()
  const esquema = z.object({ efectivoContado: monto })
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<{ efectivoContado: string }>({ resolver: zodResolver(esquema), defaultValues: { efectivoContado: '' } })
  const contado = useWatch({ control, name: 'efectivoContado' })
  const esperado = aCentimos(caja.resumen?.efectivoEsperado ?? 0)
  const diferencia = esDecimalValido(contado ?? '', 2) ? aCentimos(contado) - esperado : null

  const cerrar = useMutation({
    mutationFn: (d: { efectivoContado: string }) => cajasApi.cerrar(caja.id, { efectivoContado: aCentimos(d.efectivoContado) / 100 }),
    onSuccess: (c) => {
      queryClient.setQueryData(['cajas', 'actual'], null)
      void queryClient.invalidateQueries({ queryKey: ['cajas'] })
      onCerrada(c)
    },
  })
  const enviar = handleSubmit((d) => cerrar.mutate(d))

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Cerrar caja"
      descripcion="Cuenta el efectivo del cajón e ingrésalo. El sistema calcula la diferencia."
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="peligro" cargando={cerrar.isPending} onClick={enviar}>
            Confirmar cierre
          </Boton>
        </>
      }
    >
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        {cerrar.error && <MensajeError error={cerrar.error} />}
        <div className="flex justify-between rounded-xl bg-crema px-4 py-3 text-sm">
          <span>Efectivo esperado</span>
          <span className="font-mono font-semibold">{solesDeCentimos(esperado)}</span>
        </div>
        <CampoTexto
          etiqueta="Efectivo contado (S/)"
          obligatorio
          inputMode="decimal"
          placeholder="0.00"
          mono
          error={errors.efectivoContado?.message}
          {...register('efectivoContado')}
        />
        {diferencia !== null && (
          <div
            className={cn(
              'flex justify-between rounded-xl px-4 py-3 text-sm font-semibold',
              diferencia === 0 && 'bg-exito-claro text-exito',
              diferencia > 0 && 'bg-info-claro text-info',
              diferencia < 0 && 'bg-peligro-claro text-peligro',
            )}
            data-testid="diferencia-cierre"
          >
            <span>{diferencia === 0 ? 'Cuadra exacto' : diferencia > 0 ? 'Sobra' : 'Falta'}</span>
            <span className="font-mono">{solesDeCentimos(diferencia)}</span>
          </div>
        )}
      </form>
    </Modal>
  )
}

function ResultadoCuadre({ caja }: { caja: CajaResponse }) {
  const diferencia = caja.diferencia ?? 0
  return (
    <div className="flex flex-col gap-3 text-sm" data-testid="resultado-cuadre">
      <Fila titulo="Efectivo esperado" valor={soles(caja.efectivoEsperado)} />
      <Fila titulo="Efectivo contado" valor={soles(caja.efectivoContado)} />
      <div
        className={cn(
          'flex justify-between rounded-xl px-4 py-3 font-semibold',
          diferencia === 0 ? 'bg-exito-claro text-exito' : diferencia > 0 ? 'bg-info-claro text-info' : 'bg-peligro-claro text-peligro',
        )}
      >
        <span>{diferencia === 0 ? 'Cuadre exacto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
        <span className="font-mono">{soles(diferencia)}</span>
      </div>
    </div>
  )
}

function Fila({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-borde pb-2">
      <span className="text-tinta-suave">{titulo}</span>
      <span className="font-mono font-semibold">{valor}</span>
    </div>
  )
}

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-xl bg-crema p-4">
      <p className="text-xs font-semibold text-tinta-suave">{titulo}</p>
      <p className="mt-1 font-mono text-xl font-bold text-tinta">{valor}</p>
      <p className="mt-0.5 text-xs text-tinta-tenue">{detalle}</p>
    </div>
  )
}

function HistorialCajas({ onVer }: { onVer: (id: number) => void }) {
  const { seleccionadaId } = useUbicacion()
  const [pagina, setPagina] = useState(0)
  const filtro = { ubicacionId: seleccionadaId ?? undefined, page: pagina, size: 10, sort: 'id,desc' }
  const cajas = useQuery({
    queryKey: ['cajas', 'historial', filtro],
    queryFn: () => cajasApi.listar(filtro),
    placeholderData: keepPreviousData,
  })
  return (
    <Tarjeta className="overflow-hidden">
      <TituloTarjeta titulo="Historial de cajas" />
      <Tabla>
        <Thead>
          <tr>
            <Th>N.°</Th>
            <Th>Tienda</Th>
            <Th>Usuario</Th>
            <Th>Apertura</Th>
            <Th>Cierre</Th>
            <Th alinear="derecha">Diferencia</Th>
            <Th>Estado</Th>
          </tr>
        </Thead>
        <Tbody>
          {cajas.isPending && (
            <FilaCompleta columnas={7}>
              <Cargando />
            </FilaCompleta>
          )}
          {cajas.isError && (
            <FilaCompleta columnas={7}>
              <MensajeError error={cajas.error} />
            </FilaCompleta>
          )}
          {cajas.data?.contenido.length === 0 && (
            <FilaCompleta columnas={7}>
              <EstadoVacio titulo="Sin cajas registradas" />
            </FilaCompleta>
          )}
          {cajas.data?.contenido.map((c) => (
            <Tr key={c.id} onClick={() => onVer(c.id)}>
              <Td className="font-mono">{c.id}</Td>
              <Td className="text-tinta-suave">{c.ubicacionNombre}</Td>
              <Td className="text-tinta-suave">{c.usuario}</Td>
              <Td className="text-xs text-tinta-suave">{fechaHora(c.fechaApertura)}</Td>
              <Td className="text-xs text-tinta-suave">{fechaHora(c.fechaCierre)}</Td>
              <Td
                alinear="derecha"
                className={cn('font-mono', (c.diferencia ?? 0) < 0 ? 'text-peligro' : (c.diferencia ?? 0) > 0 ? 'text-info' : 'text-tinta')}
              >
                {c.diferencia === null ? '—' : soles(c.diferencia)}
              </Td>
              <Td>
                <Insignia tono={TONO_CAJA[c.estado]}>{c.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</Insignia>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Tabla>
      <Paginacion pagina={cajas.data} onCambiar={setPagina} />
    </Tarjeta>
  )
}

function DetalleCaja({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const caja = useQuery({ queryKey: ['cajas', 'detalle', id], queryFn: () => cajasApi.obtener(id) })
  const c = caja.data
  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Caja N.° ${id}`} descripcion={c ? `${c.ubicacionNombre} · ${c.usuario}` : undefined}>
      {caja.isPending && <Cargando />}
      {caja.isError && <MensajeError error={caja.error} />}
      {c && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Dato titulo="Apertura">{fechaHora(c.fechaApertura)}</Dato>
            <Dato titulo="Cierre">{fechaHora(c.fechaCierre)}</Dato>
            <Dato titulo="Monto de apertura">
              <span className="font-mono">{soles(c.montoApertura)}</span>
            </Dato>
            <Dato titulo="Ventas">
              <span className="font-mono">
                {c.resumen?.cantidadVentas ?? 0} · {soles(c.resumen?.totalVendido)}
              </span>
            </Dato>
          </div>
          {c.resumen && c.resumen.cobrosPorMetodo.length > 0 && (
            <ul className="divide-y divide-borde rounded-xl border border-borde text-sm">
              {c.resumen.cobrosPorMetodo.map((m) => (
                <li key={m.codigo} className="flex justify-between px-4 py-2">
                  <span>{nombreMetodoPago(m.codigo, m.nombre)}</span>
                  <span className="font-mono">{soles(m.monto)}</span>
                </li>
              ))}
            </ul>
          )}
          {c.estado === 'CERRADA' ? (
            <ResultadoCuadre caja={c} />
          ) : (
            <Fila titulo="Efectivo esperado" valor={soles(c.resumen?.efectivoEsperado)} />
          )}
        </div>
      )}
    </Modal>
  )
}
