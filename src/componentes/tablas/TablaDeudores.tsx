import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { DeudorResponse, PaginaResponse } from '@/api/tipos'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { fecha, hoyLima, NOMBRE_DOCUMENTO, soles } from '@/logica/formato'

/** Tabla de deudores (tambien se usa en Reportes). */
export function TablaDeudores({
  consulta,
  onPagina,
}: {
  consulta: UseQueryResult<PaginaResponse<DeudorResponse>>
  onPagina: (n: number) => void
}) {
  const hoy = hoyLima()
  return (
    <Tarjeta className="overflow-hidden">
      <Tabla>
        <Thead>
          <tr>
            <Th>Cliente</Th>
            <Th>Documento</Th>
            <Th>Teléfono</Th>
            <Th alinear="derecha">Ventas</Th>
            <Th>Deuda más antigua</Th>
            <Th>Próximo vencimiento</Th>
            <Th alinear="derecha">Deuda total</Th>
          </tr>
        </Thead>
        <Tbody>
          {consulta.isPending && (
            <FilaCompleta columnas={7}>
              <Cargando />
            </FilaCompleta>
          )}
          {consulta.isError && (
            <FilaCompleta columnas={7}>
              <MensajeError error={consulta.error} />
            </FilaCompleta>
          )}
          {consulta.data?.contenido.length === 0 && (
            <FilaCompleta columnas={7}>
              <EstadoVacio titulo="Nadie debe" descripcion="No hay clientes con deudas pendientes." />
            </FilaCompleta>
          )}
          {consulta.data?.contenido.map((d) => (
            <Tr key={d.clienteId}>
              <Td>
                <Link
                  to={`/clientes?tab=deudas&clienteId=${d.clienteId}&cliente=${encodeURIComponent(d.clienteNombre)}`}
                  className="font-semibold text-tinta hover:text-marca"
                >
                  {d.clienteNombre}
                </Link>
              </Td>
              <Td className="font-mono text-sm text-tinta-suave">{d.numeroDocumento ? `${NOMBRE_DOCUMENTO[d.tipoDocumento]} ${d.numeroDocumento}` : '—'}</Td>
              <Td className="font-mono text-sm text-tinta-suave">{d.telefono ?? '—'}</Td>
              <Td alinear="derecha" className="font-mono">{d.cantidadVentas}</Td>
              <Td className="text-tinta-suave">{fecha(d.deudaMasAntigua)}</Td>
              <Td className={d.proximoVencimiento && d.proximoVencimiento < hoy ? 'font-semibold text-peligro' : 'text-tinta-suave'}>
                {fecha(d.proximoVencimiento)}
              </Td>
              <Td alinear="derecha" className="font-mono font-bold text-alerta">{soles(d.deudaTotal)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Tabla>
      <Paginacion pagina={consulta.data} onCambiar={onPagina} />
    </Tarjeta>
  )
}
