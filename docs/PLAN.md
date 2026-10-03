# Plan de trabajo del frontend

Hoja de ruta por fases. Cada fase se marca al terminar (con su commit y push) para poder retomar si la sesion
se corta. Rama de trabajo: `claude/loving-goodall-nr3163`.

- [x] **Fase 0. Analisis del backend.** Lectura de CLAUDE.md, EXPLICACION, COMO_EJECUTAR, colecciones de
      `docs/api` y controllers. Backend levantado con perfil `dev` y datos de demostracion. Cambio minimo en el
      backend: filtro `productoIds` en el stock (ver D03 y D78 del backend).
- [x] **Fase 1. Proyecto base.** Vite + React + TypeScript estricto, Tailwind, ESLint, Vitest, Playwright,
      estructura de carpetas, variables de entorno, `docs/DISENO.md`.
- [x] **Fase 2. Nucleo.** Cliente Axios con token y manejo de 401, tipos de la API, sesion del navegador, login,
      permisos por rol, layout (barra lateral, barra superior, selector de ubicacion, indicador de conexion,
      campana de stock bajo) y componentes base.
- [x] **Fase 3. Productos.** Listado igual a la imagen, crear y editar con presentaciones, foto, activar/desactivar.
- [x] **Fase 4. Inventario y Movimientos.** Stock por ubicacion, stock minimo, ajustes, inventario inicial,
      kardex con filtros y traslados (enviar, recibir, anular).
- [x] **Fase 5. Caja y Ventas.** Abrir, resumen en vivo, cerrar con cuadre. Punto de venta (carrito, descuento,
      contado/credito, pago mixto, vuelto), listado, detalle y anulacion.
- [x] **Fase 6. Clientes y fiado.** Clientes, deudas, abonos y deudores.
- [x] **Fase 7. Compras y Proveedores.** Registrar compra con lineas, anular, proveedores.
- [x] **Fase 8. Reportes, Usuarios, Configuracion e Inicio.** Reportes con filtros, usuarios, empresas,
      ubicaciones, categorias, cambio de contrasena y resumen del dia por rol.
- [x] **Fase 9. Pruebas unitarias.** Carrito, pago mixto y vuelto, presentaciones, permisos, componentes.
- [ ] **Fase 10. Pruebas de punta a punta y capturas.** Playwright contra el backend real; capturas en
      `docs/capturas` comparadas con la imagen de referencia.
- [ ] **Fase 11. Documentacion final.** README, COMO_EJECUTAR (Windows), EXPLICACION, PENDIENTES.
