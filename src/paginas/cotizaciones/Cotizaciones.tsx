import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FilePlus2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { cotizacionesApi } from '@/api/cotizaciones'
import type { EstadoCotizacion } from '@/api/tipos'
import { Boton } from '@/componentes/ui/Boton'
import { Buscador } from '@/componentes/ui/Buscador'
import { Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia } from '@/componentes/ui/Insignia'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { useRetraso } from '@/hooks/useRetraso'
import { NOMBRE_COTIZACION, TONO_COTIZACION } from '@/logica/cotizaciones'
import { fecha, soles } from '@/logica/formato'

/** Cotizaciones de la tienda (el ADMIN ve la tienda elegida arriba, o todas). */
export default function Cotizaciones() {
  const navegar = useNavigate()
  const { seleccionadaId } = useUbicacion()
  const [estado, setEstado] = useState<EstadoCotizacion | ''>('')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(0)
  const busqueda = useRetraso(texto.trim(), 300)
  const filtro = {
    estado: estado || undefined,
    ubicacionId: seleccionadaId ?? undefined,
    texto: busqueda || undefined,
    page: pagina,
    size: 20,
    sort: 'id,desc',
  }
  const cotizaciones = useQuery({
    queryKey: ['cotizaciones', 'listado', filtro],
    queryFn: () => cotizacionesApi.listar(filtro),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <EncabezadoPagina
        titulo="Cotizaciones"
        subtitulo="Presupuestos para el cliente: descárgalos en PDF, envíalos por correo o WhatsApp y conviértelos en nota de venta."
        acciones={
          <Boton tamano="lg" icono={<FilePlus2 className="size-5" />} onClick={() => navegar('/cotizaciones/nueva')}>
            Nueva cotización
          </Boton>
        }
      />
      <Tarjeta className="mb-5 flex flex-wrap items-center gap-3 p-5">
        <Buscador
          valor={texto}
          onCambiar={(v) => {
            setTexto(v)
            setPagina(0)
          }}
          placeholder="Buscar por código o cliente…"
          className="min-w-64 flex-1"
        />
        <Selector
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoCotizacion | '')
            setPagina(0)
          }}
          aria-label="Filtrar por estado"
          className="h-11 w-48 rounded-xl"
        >
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borradores</option>
          <option value="EMITIDA">Emitidas</option>
          <option value="ANULADA">Anuladas</option>
        </Selector>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Cotización</Th>
              <Th>Cliente</Th>
              <Th>Válida hasta</Th>
              <Th alinear="derecha">Total</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <Tbody>
            {cotizaciones.isPending && (
              <FilaCompleta columnas={5}>
                <Cargando texto="Cargando cotizaciones…" />
              </FilaCompleta>
            )}
            {cotizaciones.isError && (
              <FilaCompleta columnas={5}>
                <MensajeError error={cotizaciones.error} />
              </FilaCompleta>
            )}
            {cotizaciones.data?.contenido.length === 0 && (
              <FilaCompleta columnas={5}>
                <EstadoVacio titulo="No hay cotizaciones" descripcion="Crea una con el botón «Nueva cotización»." />
              </FilaCompleta>
            )}
            {cotizaciones.data?.contenido.map((c) => (
              <Tr key={c.id} data-testid={`cotizacion-${c.codigo}`}>
                <Td>
                  <Link to={`/cotizaciones/${c.id}`} className="font-mono font-semibold text-marca-texto underline">
                    {c.codigo}
                  </Link>
                  <p className="text-xs text-tinta-tenue">
                    {fecha(c.fecha)} · {c.ubicacionNombre} · {c.usuario}
                  </p>
                </Td>
                <Td>{c.clienteNombre ?? 'Cliente varios'}</Td>
                <Td>{fecha(c.fechaValidez)}</Td>
                <Td alinear="derecha" className="font-mono font-semibold">
                  {soles(c.total)}
                </Td>
                <Td>
                  <Insignia tono={TONO_COTIZACION[c.estado]}>{NOMBRE_COTIZACION[c.estado]}</Insignia>
                  {c.ventaNumero && <p className="mt-1 font-mono text-xs text-tinta-tenue">Venta {c.ventaNumero}</p>}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={cotizaciones.data} onCambiar={setPagina} />
      </Tarjeta>
    </div>
  )
}
