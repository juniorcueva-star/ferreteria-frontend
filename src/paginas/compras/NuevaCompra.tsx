import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { comprasApi } from '@/api/compras'
import type { TipoComprobanteCompra } from '@/api/tipos'
import { useUsuario } from '@/auth/contexto'
import { ModalProveedor } from '@/componentes/formularios/FormularioProveedor'
import { SelectorProducto } from '@/componentes/formularios/SelectorProducto'
import { Boton } from '@/componentes/ui/Boton'
import { CampoArea, CampoSelector, CampoTexto, Entrada, Selector } from '@/componentes/ui/Campo'
import { EncabezadoPagina } from '@/componentes/ui/EncabezadoPagina'
import { MensajeError } from '@/componentes/ui/Estados'
import { useAvisos } from '@/componentes/ui/notificaciones'
import { Tarjeta, TituloTarjeta } from '@/componentes/ui/Tarjeta'
import { useUbicacion } from '@/contexto/ubicacion'
import { useProveedoresActivos } from '@/hooks/useCatalogos'
import { esDecimalValido, textoANumero } from '@/logica/decimales'
import { subtotalCompraCentimos, totalesCompra } from '@/logica/compras'
import { empresasDeUbicaciones } from '@/logica/empresas'
import { cantidadConUnidad, hoyLima, NOMBRE_COMPROBANTE, nombreUnidad, soles, solesDeCentimos } from '@/logica/formato'
import { aLineasRequest, baseDeLinea, lineaVacia, validarLineas, type LineaEditable } from '@/logica/lineas'
import { presentacionesActivas } from '@/logica/presentaciones'
import { nulo } from '@/logica/validaciones'

interface LineaCompra extends LineaEditable {
  /** Precio por presentacion (con IGV), tal como figura en el comprobante */
  precio: string
}

function lineaCompraVacia(): LineaCompra {
  return { ...lineaVacia(), precio: '' }
}

/** Registro de una compra con sus lineas: la mercaderia entra al stock de la ubicacion elegida. */
export default function NuevaCompra() {
  const usuario = useUsuario()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const { avisar } = useAvisos()
  const { todas, seleccionadaId } = useUbicacion()
  const proveedores = useProveedoresActivos()
  const esAdmin = usuario.rol === 'ADMIN'
  const empresas = empresasDeUbicaciones(todas)
  const almacen = todas.find((u) => u.tipo === 'ALMACEN')

  const [ubicacionElegida, setUbicacionId] = useState(String(esAdmin ? (seleccionadaId ?? '') : (usuario.ubicacionId ?? '')))
  const [empresaId, setEmpresaId] = useState('')
  // Si las ubicaciones aun no habian cargado al abrir la pagina, se usa el almacen y la primera empresa
  const ubicacionId = ubicacionElegida || String(almacen?.id ?? '')
  const [proveedorId, setProveedorId] = useState('')
  const [comprobante, setComprobante] = useState<TipoComprobanteCompra>('FACTURA')
  const [serieNumero, setSerieNumero] = useState('')
  const [fechaEmision, setFechaEmision] = useState(hoyLima())
  const [observacion, setObservacion] = useState('')
  const [lineas, setLineas] = useState<LineaCompra[]>(() => [lineaCompraVacia()])
  const [intentado, setIntentado] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState(false)

  const ubicacion = todas.find((u) => u.id === Number(ubicacionId))
  // Una tienda solo recibe compras con su propio RUC; el almacen recibe de ambas empresas
  const empresaFija = ubicacion?.tipo === 'TIENDA' ? ubicacion.empresaId : null
  const empresaElegida =
    empresaFija !== null && empresaFija !== undefined ? String(empresaFija) : empresaId || String(empresas[0]?.id ?? '')

  const validacion = validarLineas(lineas)
  const erroresPrecio = new Map<number, string>()
  for (const l of lineas) {
    if (!esDecimalValido(l.precio, 4)) erroresPrecio.set(l.clave, 'Precio inválido (hasta 4 decimales)')
  }
  const errores = {
    ubicacion: !ubicacionId ? 'Elija dónde entra la mercadería' : undefined,
    empresa: !empresaElegida ? 'Elija la empresa' : undefined,
    proveedor: !proveedorId ? 'Elija el proveedor' : undefined,
    fecha: !fechaEmision ? 'Ingrese la fecha' : fechaEmision > hoyLima() ? 'No puede ser una fecha futura' : undefined,
  }
  const totales = totalesCompra(
    lineas.map((l) => ({ cantidad: l.cantidad, precioUnitario: l.precio })),
    comprobante,
  )

  const registrar = useMutation({
    mutationFn: () =>
      comprasApi.registrar({
        empresaId: Number(empresaElegida),
        proveedorId: Number(proveedorId),
        ubicacionId: esAdmin ? Number(ubicacionId) : null,
        tipoComprobante: comprobante,
        serieNumero: nulo(serieNumero),
        fechaEmision,
        observacion: nulo(observacion),
        detalles: aLineasRequest(lineas).map((d, i) => ({ ...d, precioUnitario: textoANumero(lineas[i]?.precio ?? '0') })),
      }),
    onSuccess: (c) => {
      avisar(`Compra N.° ${c.id} registrada por ${soles(c.total)}. La mercadería entró a ${c.ubicacionNombre}.`)
      void queryClient.invalidateQueries({ queryKey: ['compras'] })
      void queryClient.invalidateQueries({ queryKey: ['inventario'] })
      navegar('/compras')
    },
  })

  const guardar = () => {
    setIntentado(true)
    const hayErrores = Object.values(errores).some(Boolean) || validacion.general || validacion.porLinea.size > 0 || erroresPrecio.size > 0
    if (!hayErrores) registrar.mutate()
  }

  const actualizar = (clave: number, cambios: Partial<LineaCompra>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)))

  return (
    <div>
      <Link to="/compras" className="mb-3 inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-marca">
        <ArrowLeft className="size-4" /> Volver a compras
      </Link>
      <EncabezadoPagina
        titulo="Registrar compra"
        subtitulo="Ingresa las cantidades y precios tal como figuran en el comprobante del proveedor."
        acciones={
          <Boton tamano="lg" icono={<Save className="size-5" />} cargando={registrar.isPending} onClick={guardar}>
            Registrar compra
          </Boton>
        }
      />
      {registrar.error && <MensajeError error={registrar.error} className="mb-5" />}

      <Tarjeta className="mb-5">
        <TituloTarjeta titulo="Comprobante" />
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {esAdmin ? (
            <CampoSelector etiqueta="Ingresa a" obligatorio value={ubicacionId} onChange={(e) => setUbicacionId(e.target.value)} error={intentado ? errores.ubicacion : undefined}>
              <option value="">Elija la ubicación</option>
              {todas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </CampoSelector>
          ) : (
            <CampoTexto etiqueta="Ingresa a" value={usuario.ubicacionNombre ?? ''} disabled />
          )}
          <CampoSelector
            etiqueta="Empresa que compra (RUC)"
            obligatorio
            value={empresaElegida}
            disabled={empresaFija !== null && empresaFija !== undefined}
            onChange={(e) => setEmpresaId(e.target.value)}
            ayuda={empresaFija ? 'Una tienda solo recibe compras con su propio RUC.' : undefined}
            error={intentado ? errores.empresa : undefined}
          >
            <option value="">Elija la empresa</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.razonSocial} ({e.ruc})
              </option>
            ))}
          </CampoSelector>
          <div className="flex items-end gap-2">
            <CampoSelector
              etiqueta="Proveedor"
              obligatorio
              className="flex-1"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              error={intentado ? errores.proveedor : undefined}
            >
              <option value="">Elija el proveedor</option>
              {proveedores.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.razonSocial}
                </option>
              ))}
            </CampoSelector>
            <Boton variante="secundario" onClick={() => setNuevoProveedor(true)} className={intentado && errores.proveedor ? 'mb-6' : ''}>
              Nuevo
            </Boton>
          </div>
          <CampoSelector etiqueta="Tipo de comprobante" value={comprobante} onChange={(e) => setComprobante(e.target.value as TipoComprobanteCompra)}>
            {(Object.keys(NOMBRE_COMPROBANTE) as TipoComprobanteCompra[]).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_COMPROBANTE[t]}
              </option>
            ))}
          </CampoSelector>
          <CampoTexto etiqueta="Serie y número" placeholder="Ej: F001-4589" mono maxLength={30} value={serieNumero} onChange={(e) => setSerieNumero(e.target.value)} />
          <CampoTexto
            etiqueta="Fecha de emisión"
            type="date"
            obligatorio
            max={hoyLima()}
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.target.value)}
            error={intentado ? errores.fecha : undefined}
          />
          <CampoArea etiqueta="Observación" className="md:col-span-2 xl:col-span-3" maxLength={300} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </div>
      </Tarjeta>

      <Tarjeta>
        <TituloTarjeta
          titulo="Productos comprados"
          accion={
            <Boton variante="secundario" tamano="sm" icono={<Plus className="size-4" />} onClick={() => setLineas((ls) => [...ls, lineaCompraVacia()])} disabled={lineas.length >= 200}>
              Agregar producto
            </Boton>
          }
        />
        <div className="flex flex-col gap-3 p-5">
          {intentado && validacion.general && <p className="text-sm text-peligro">{validacion.general}</p>}
          {lineas.map((linea, i) => {
            const producto = linea.producto
            const error = intentado ? (validacion.porLinea.get(linea.clave) ?? erroresPrecio.get(linea.clave)) : undefined
            const base = baseDeLinea(linea)
            const subtotal = subtotalCompraCentimos({ cantidad: linea.cantidad, precioUnitario: linea.precio })
            return (
              <div key={linea.clave} className="grid gap-3 rounded-xl border border-borde p-3 md:grid-cols-12" data-testid={`linea-compra-${i + 1}`}>
                <SelectorProducto className="md:col-span-4" etiqueta={`Producto ${i + 1}`} valor={producto} onElegir={(p) => actualizar(linea.clave, { producto: p, presentacionId: '' })} />
                <div className="flex flex-col gap-1.5 md:col-span-3">
                  <span className="text-xs font-semibold text-tinta-suave">Presentación</span>
                  <Selector aria-label={`Presentación ${i + 1}`} value={linea.presentacionId} disabled={!producto} onChange={(e) => actualizar(linea.clave, { presentacionId: e.target.value })}>
                    <option value="">{producto ? `${nombreUnidad(producto.unidadBase)} (unidad base)` : '—'}</option>
                    {producto &&
                      presentacionesActivas(producto)
                        .filter((p) => p.factor !== 1)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.factor})
                          </option>
                        ))}
                  </Selector>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-xs font-semibold text-tinta-suave">Cantidad</span>
                  <Entrada aria-label={`Cantidad ${i + 1}`} inputMode="decimal" className="font-mono" value={linea.cantidad} onChange={(e) => actualizar(linea.clave, { cantidad: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <span className="text-xs font-semibold text-tinta-suave">Precio unit. (S/)</span>
                  <Entrada aria-label={`Precio ${i + 1}`} inputMode="decimal" placeholder="0.00" className="font-mono" value={linea.precio} onChange={(e) => actualizar(linea.clave, { precio: e.target.value })} />
                </div>
                <div className="flex items-end justify-end md:col-span-1">
                  {lineas.length > 1 && (
                    <Boton variante="fantasma" tamano="sm" aria-label={`Quitar producto ${i + 1}`} icono={<Trash2 className="size-4" />} onClick={() => setLineas((ls) => ls.filter((l) => l.clave !== linea.clave))} />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 text-xs md:col-span-12">
                  {producto && base > 0 && <span className="font-mono text-tinta-suave">Entran {cantidadConUnidad(base, producto.unidadBase)}</span>}
                  {subtotal > 0 && <span className="font-mono font-semibold text-tinta">Subtotal {solesDeCentimos(subtotal)}</span>}
                  {error && <span className="text-peligro" role="alert">{error}</span>}
                </div>
              </div>
            )
          })}
          <dl className="ml-auto mt-2 w-72 space-y-1 text-sm">
            <div className="flex justify-between text-tinta-suave">
              <dt>Base imponible</dt>
              <dd className="font-mono">{solesDeCentimos(totales.baseCentimos)}</dd>
            </div>
            <div className="flex justify-between text-tinta-suave">
              <dt>IGV {comprobante === 'FACTURA' ? '(18 %)' : '(no deducible)'}</dt>
              <dd className="font-mono">{solesDeCentimos(totales.igvCentimos)}</dd>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <dt>Total</dt>
              <dd className="font-mono" data-testid="total-compra">{solesDeCentimos(totales.totalCentimos)}</dd>
            </div>
          </dl>
        </div>
      </Tarjeta>
      {nuevoProveedor && <ModalProveedor proveedor={null} onCerrar={() => setNuevoProveedor(false)} onGuardado={(p) => setProveedorId(String(p.id))} />}
    </div>
  )
}
