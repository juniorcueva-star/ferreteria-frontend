import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { auditoriaApi } from '@/api/auditoria'
import type { EntidadAuditada } from '@/api/tipos'
import { Buscador } from '@/componentes/ui/Buscador'
import { CampoTexto, Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { Cargando, EstadoVacio, MensajeError } from '@/componentes/ui/Estados'
import { Insignia, type TonoInsignia } from '@/componentes/ui/Insignia'
import { Paginacion } from '@/componentes/ui/Paginacion'
import { FilaCompleta, Tabla, Tbody, Td, Th, Thead, Tr } from '@/componentes/ui/Tabla'
import { Tarjeta } from '@/componentes/ui/Tarjeta'
import { useRetraso } from '@/hooks/useRetraso'
import { fechaHora } from '@/logica/formato'

const ENTIDADES: Record<EntidadAuditada, { nombre: string; tono: TonoInsignia }> = {
  PRECIO: { nombre: 'Precio', tono: 'marca' },
  PRODUCTO: { nombre: 'Producto', tono: 'info' },
  STOCK: { nombre: 'Stock', tono: 'exito' },
  VENTA: { nombre: 'Venta anulada', tono: 'peligro' },
  COMPRA: { nombre: 'Compra anulada', tono: 'peligro' },
  USUARIO: { nombre: 'Usuario', tono: 'neutro' },
  EMPRESA: { nombre: 'Empresa', tono: 'neutro' },
}

/** Quien cambio precios, stock, productos, usuarios o empresas, y cuando (solo ADMIN). Lo mas reciente primero. */
export default function Auditoria() {
  const [entidad, setEntidad] = useState<EntidadAuditada | ''>('')
  const [texto, setTexto] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(0)
  const busqueda = useRetraso(texto.trim(), 300)
  const rangoInvalido = desde !== '' && hasta !== '' && desde > hasta
  const filtro = {
    entidad: entidad || undefined,
    texto: busqueda || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    page: pagina,
    size: 25,
    sort: 'id,desc',
  }
  const cambios = useQuery({
    queryKey: ['auditoria', filtro],
    queryFn: () => auditoriaApi.listar(filtro),
    placeholderData: keepPreviousData,
    enabled: !rangoInvalido,
  })
  const filtrar = <T,>(cambiar: (v: T) => void) => (v: T) => {
    cambiar(v)
    setPagina(0)
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Auditoría"
        subtitulo="Quién cambió precios, stock, productos, usuarios o empresas, y cuándo. También las ventas y compras anuladas."
      />
      <Tarjeta className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <Buscador valor={texto} onCambiar={filtrar(setTexto)} placeholder="Buscar: código, producto, usuario…" className="self-end" aria-label="Buscar en la auditoría" />
        <div className="self-end">
          <Selector
            value={entidad}
            onChange={(e) => filtrar(setEntidad)(e.target.value as EntidadAuditada | '')}
            aria-label="Filtrar por tipo de cambio"
            className="h-11 rounded-xl"
          >
            <option value="">Todos los cambios</option>
            {(Object.keys(ENTIDADES) as EntidadAuditada[]).map((e) => (
              <option key={e} value={e}>
                {ENTIDADES[e].nombre}
              </option>
            ))}
          </Selector>
        </div>
        <CampoTexto etiqueta="Desde" type="date" value={desde} onChange={(e) => filtrar(setDesde)(e.target.value)} />
        <CampoTexto
          etiqueta="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => filtrar(setHasta)(e.target.value)}
          error={rangoInvalido ? '“Desde” no puede ser posterior a “Hasta”' : undefined}
        />
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <Tabla>
          <Thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Usuario</Th>
              <Th>Tipo</Th>
              <Th>Qué cambió</Th>
            </tr>
          </Thead>
          <Tbody>
            {cambios.isPending && !rangoInvalido && (
              <FilaCompleta columnas={4}>
                <Cargando texto="Cargando auditoría…" />
              </FilaCompleta>
            )}
            {cambios.isError && (
              <FilaCompleta columnas={4}>
                <MensajeError error={cambios.error} />
              </FilaCompleta>
            )}
            {cambios.data?.contenido.length === 0 && (
              <FilaCompleta columnas={4}>
                <EstadoVacio titulo="Sin cambios registrados" descripcion="Pruebe con otros filtros." />
              </FilaCompleta>
            )}
            {cambios.data?.contenido.map((c) => (
              <Tr key={c.id} data-testid="fila-auditoria">
                <Td className="font-mono text-xs whitespace-nowrap">{fechaHora(c.fecha)}</Td>
                <Td>
                  <p className="font-semibold">{c.usuarioNombre ?? 'Sistema'}</p>
                  {c.usuario && <p className="font-mono text-xs text-tinta-tenue">{c.usuario}</p>}
                </Td>
                <Td>
                  <Insignia tono={ENTIDADES[c.entidad].tono}>{ENTIDADES[c.entidad].nombre}</Insignia>
                </Td>
                <Td className="min-w-80 text-sm">{c.descripcion}</Td>
              </Tr>
            ))}
          </Tbody>
        </Tabla>
        <Paginacion pagina={cambios.data} onCambiar={setPagina} />
      </Tarjeta>
    </div>
  )
}
