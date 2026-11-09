import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { productosApi } from '@/api/catalogo'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Modal } from '@/componentes/ui/Modal'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { fechaHora, soles } from '@/logica/formato'

/** Cambios del precio final de una presentacion, el mas reciente primero. */
export function HistorialPrecios({
  productoId,
  presentacionId,
  nombre,
  onCerrar,
}: {
  productoId: number
  presentacionId: number
  nombre: string
  onCerrar: () => void
}) {
  const [pagina, setPagina] = useState(0)
  const historial = useQuery({
    queryKey: ['productos', 'historial-precios', presentacionId, pagina],
    queryFn: () => productosApi.historialPrecios(productoId, presentacionId, { page: pagina, size: 10, sort: 'fecha,desc' }),
    placeholderData: keepPreviousData,
  })

  return (
    <Modal abierto onCerrar={onCerrar} titulo={`Historial de precios · ${nombre}`} ancho="lg">
      {historial.isPending && <Cargando />}
      {historial.isError && <MensajeError error={historial.error} />}
      {historial.data?.contenido.length === 0 && (
        <EstadoVacio titulo="Sin cambios de precio" descripcion="El precio de esta presentación no se ha modificado." />
      )}
      {historial.data && historial.data.contenido.length > 0 && (
        <>
          <Tabla>
            <Thead>
              <tr>
                <Th>Fecha</Th>
                <Th alinear="derecha">Precio anterior</Th>
                <Th alinear="derecha">Precio nuevo</Th>
                <Th>Usuario</Th>
              </tr>
            </Thead>
            <Tbody>
              {historial.data.contenido.map((h) => (
                <Tr key={h.id}>
                  <Td>{fechaHora(h.fecha)}</Td>
                  <Td alinear="derecha" className="font-mono">
                    {soles(h.precioAnterior)}
                  </Td>
                  <Td alinear="derecha" className="font-mono font-semibold">
                    {soles(h.precioNuevo)}
                  </Td>
                  <Td>{h.usuario ?? '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Tabla>
          <Paginacion pagina={historial.data} onCambiar={setPagina} />
        </>
      )}
    </Modal>
  )
}
