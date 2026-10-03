import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { CondicionVenta, EstadoVenta } from '@/api/tipos'
import { ventasApi } from '@/api/ventas'
import { Boton } from '@/componentes/ui/Boton'
import { CampoSelector, CampoTexto, Casilla } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { TONO_VENTA } from '@/componentes/ui/tonos'
import { useUbicacion } from '@/contexto/ubicacion'
import { fechaHora, NOMBRE_CONDICION, soles } from '@/logica/formato'

/** Listado de ventas con filtros y paginacion del servidor. */
export default function HistorialVentas() {
  const navegar = useNavigate()
  const { seleccionadaId, seleccionada } = useUbicacion()
  const [estado, setEstado] = useState('')
  const [condicion, setCondicion] = useState('')
  const [conSaldo, setConSaldo] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(0)

  const filtro = {
    ubicacionId: seleccionadaId ?? undefined,
    estado: (estado || undefined) as EstadoVenta | undefined,
    condicion: (condicion || undefined) as CondicionVenta | undefined,
    conSaldo: conSaldo || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    page: pagina,
    size: 20,
    sort: 'id,desc',
  }
  const ventas = useQuery({
    queryKey: ['ventas', 'listado', filtro],
    queryFn: () => ventasApi.listar(filtro),
    placeholderData: keepPreviousData,
  })
  const cambiar = (fn: (v: string) => void) => (v: string) => {
    fn(v)
    setPagina(0)
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Ventas"
        subtitulo={`${ventas.data?.totalElementos ?? '…'} ventas · ${seleccionada?.nombre ?? 'Todas las tiendas'}`}
        acciones={
          <Boton tamano="lg" icono={<Plus className="size-5" />} onClick={() => navegar('/ventas')}>
            Nueva venta
          </Boton>
        }
      />
      <Tarjeta className="mb-5 grid items-end gap-4 p-5 md:grid-cols-3 xl:grid-cols-6">
        <CampoSelector etiqueta="Estado" value={estado} onChange={(e) => cambiar(setEstado)(e.target.value)}>
          <option value="">Todos</option>
          <option value="EMITIDA">Emitidas</option>
          <option value="ANULADA">Anuladas</option>
        </CampoSelector>
        <CampoSelector etiqueta="Condición" value={condicion} onChange={(e) => cambiar(setCondicion)(e.target.value)}>
          <option value="">Todas</option>
          <option value="CONTADO">Contado</option>
          <option value="CREDITO">Crédito</option>
        </CampoSelector>
        <CampoTexto etiqueta="Desde" type="date" value={desde} onChange={(e) => cambiar(setDesde)(e.target.value)} />
        <CampoTexto etiqueta="Hasta" type="date" value={hasta} onChange={(e) => cambiar(setHasta)(e.target.value)} />
        <Casilla
          className="pb-2.5 xl:col-span-2"
          etiqueta="Solo con deuda pendiente"
          checked={conSaldo}
          onChange={(e) => {
            setConSaldo(e.target.checked)
            setPagina(0)
          }}
        />
      </Tarjeta>
      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Fecha</Th>
              <Th>Tienda</Th>
              <Th>Cliente</Th>
              <Th>Vendedor</Th>
              <Th>Condición</Th>
              <Th alinear="derecha">Total</Th>
              <Th alinear="derecha">Saldo</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <Tbody>
            {ventas.isPending && (
              <FilaCompleta columnas={9}>
                <Cargando />
              </FilaCompleta>
            )}
            {ventas.isError && (
              <FilaCompleta columnas={9}>
                <MensajeError error={ventas.error} />
              </FilaCompleta>
            )}
            {ventas.data?.contenido.length === 0 && (
              <FilaCompleta columnas={9}>
                <EstadoVacio titulo="Sin ventas" descripcion="No hay ventas con estos filtros." />
              </FilaCompleta>
            )}
            {ventas.data?.contenido.map((v) => (
              <Tr key={v.id} onClick={() => navegar(`/ventas/${v.id}`)} data-testid={`venta-${v.numeroDocumento}`}>
                <Td className="font-mono font-semibold text-tinta">{v.numeroDocumento}</Td>
                <Td className="text-xs whitespace-nowrap text-tinta-suave">{fechaHora(v.fecha)}</Td>
                <Td className="text-tinta-suave">{v.ubicacionNombre}</Td>
                <Td className="text-tinta">{v.clienteNombre ?? <span className="text-tinta-tenue">Público general</span>}</Td>
                <Td className="text-tinta-suave">{v.vendedor}</Td>
                <Td>
                  <Insignia tono={v.condicion === 'CONTADO' ? 'neutro' : 'marca'}>{NOMBRE_CONDICION[v.condicion]}</Insignia>
                </Td>
                <Td alinear="derecha" className="font-mono font-semibold">
                  {soles(v.total)}
                </Td>
                <Td alinear="derecha" className={v.saldoPendiente > 0 ? 'font-mono text-alerta' : 'font-mono text-tinta-tenue'}>
                  {v.saldoPendiente > 0 ? soles(v.saldoPendiente) : '—'}
                </Td>
                <Td>
                  <Insignia tono={TONO_VENTA[v.estado]}>{v.estado === 'EMITIDA' ? 'Emitida' : 'Anulada'}</Insignia>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={ventas.data} onCambiar={setPagina} />
      </Tarjeta>
    </div>
  )
}
