import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ProveedorAuth } from '@/auth/AuthContext'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { Layout } from '@/componentes/layout/Layout'
import { Cargando } from '@/componentes/ui/Estados'
import { ProveedorNotificaciones } from '@/componentes/ui/ProveedorNotificaciones'
import { ProveedorUbicacion } from '@/contexto/ProveedorUbicacion'
import { crearClienteConsultas } from './consultas'
import { Login } from '@/paginas/Login'

// Cada modulo se descarga solo cuando se visita (la primera carga es mas liviana)
const Inicio = lazy(() => import('@/paginas/inicio/Inicio'))
const Productos = lazy(() => import('@/paginas/productos/Productos'))
const FormularioProducto = lazy(() => import('@/paginas/productos/FormularioProducto'))
const Inventario = lazy(() => import('@/paginas/inventario/Inventario'))
const Movimientos = lazy(() => import('@/paginas/movimientos/Movimientos'))
const NuevoTraslado = lazy(() => import('@/paginas/movimientos/NuevoTraslado'))
const Caja = lazy(() => import('@/paginas/caja/Caja'))
const PuntoVenta = lazy(() => import('@/paginas/ventas/PuntoVenta'))
const HistorialVentas = lazy(() => import('@/paginas/ventas/HistorialVentas'))
const DetalleVenta = lazy(() => import('@/paginas/ventas/DetalleVenta'))
const Clientes = lazy(() => import('@/paginas/clientes/Clientes'))
const Compras = lazy(() => import('@/paginas/compras/Compras'))
const NuevaCompra = lazy(() => import('@/paginas/compras/NuevaCompra'))
const Proveedores = lazy(() => import('@/paginas/proveedores/Proveedores'))
const Reportes = lazy(() => import('@/paginas/reportes/Reportes'))
const Usuarios = lazy(() => import('@/paginas/usuarios/Usuarios'))
const Configuracion = lazy(() => import('@/paginas/configuracion/Configuracion'))
const NoEncontrado = lazy(() => import('@/paginas/NoEncontrado'))

export function App() {
  const [clienteConsultas] = useState(crearClienteConsultas)
  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorNotificaciones>
        <ProveedorAuth>
          <BrowserRouter>
            <Rutas />
          </BrowserRouter>
        </ProveedorAuth>
      </ProveedorNotificaciones>
    </QueryClientProvider>
  )
}

function Rutas() {
  return (
    <Suspense fallback={<Cargando className="h-full" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RutaProtegida>
              <ProveedorUbicacion>
                <Layout />
              </ProveedorUbicacion>
            </RutaProtegida>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="productos" element={<RutaProtegida permiso="productos.ver"><Productos /></RutaProtegida>} />
          <Route path="productos/nuevo" element={<RutaProtegida permiso="productos.editar"><FormularioProducto /></RutaProtegida>} />
          <Route path="productos/:id" element={<RutaProtegida permiso="productos.editar"><FormularioProducto /></RutaProtegida>} />
          <Route path="inventario" element={<RutaProtegida permiso="inventario.ver"><Inventario /></RutaProtegida>} />
          <Route path="movimientos" element={<RutaProtegida permiso="kardex.ver"><Movimientos /></RutaProtegida>} />
          <Route path="movimientos/traslados/nuevo" element={<RutaProtegida permiso="traslados.enviar"><NuevoTraslado /></RutaProtegida>} />
          <Route path="caja" element={<RutaProtegida permiso="caja.usar"><Caja /></RutaProtegida>} />
          <Route path="ventas" element={<RutaProtegida permiso="ventas.registrar"><PuntoVenta /></RutaProtegida>} />
          <Route path="ventas/historial" element={<RutaProtegida permiso="ventas.ver"><HistorialVentas /></RutaProtegida>} />
          <Route path="ventas/:id" element={<RutaProtegida permiso="ventas.ver"><DetalleVenta /></RutaProtegida>} />
          <Route path="clientes" element={<RutaProtegida permiso="clientes.ver"><Clientes /></RutaProtegida>} />
          <Route path="compras" element={<RutaProtegida permiso="compras.ver"><Compras /></RutaProtegida>} />
          <Route path="compras/nueva" element={<RutaProtegida permiso="compras.registrar"><NuevaCompra /></RutaProtegida>} />
          <Route path="proveedores" element={<RutaProtegida permiso="proveedores.ver"><Proveedores /></RutaProtegida>} />
          <Route path="reportes" element={<RutaProtegida permiso="reportes.ver"><Reportes /></RutaProtegida>} />
          <Route path="usuarios" element={<RutaProtegida permiso="usuarios.ver"><Usuarios /></RutaProtegida>} />
          <Route path="configuracion" element={<RutaProtegida permiso="configuracion.ver"><Configuracion /></RutaProtegida>} />
          <Route path="inicio" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
