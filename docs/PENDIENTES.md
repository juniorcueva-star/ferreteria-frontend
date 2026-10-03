# Pendientes

## Bloqueos durante el desarrollo

Ninguno impidió terminar. Observaciones:

- **TypeScript 7** es la última versión, pero el lint (`typescript-eslint`) aún no la soporta: se usa la 6.0.x
  (decisión F02). Cuando `typescript-eslint` la soporte, basta con actualizar la dependencia.
- **Chromium de Playwright:** en el entorno de desarrollo no se pudo descargar el navegador de Playwright 1.63; se
  usó uno ya instalado con `CHROMIUM_PATH`. En la laptop se instala con `npx playwright install chromium`.
- **Cambio en el backend:** el filtro `productoIds` del stock está en la rama `claude/loving-goodall-nr3163` del
  backend. Si se usa otra rama del backend, la tabla de Productos mostrará el stock de todos los productos visibles
  hasta 100 filas (la columna puede quedar en 0 para algunos). Hay que integrar esa rama del backend.

## Lo que debes hacer tú

| Qué | Para qué |
|-----|----------|
| Integrar (merge) la rama `claude/loving-goodall-nr3163` en **los dos** repositorios | El frontend necesita el filtro `productoIds` del backend |
| Crear `.env.e2e` con tus contraseñas (ver `.env.e2e.example`) | Correr las pruebas de punta a punta |
| Para producción: definir `VITE_API_URL` con la URL pública del backend y `CORS_ORIGENES` en el backend con el dominio del frontend | Publicar el sistema |

## Mejoras sugeridas

- **Impresión del comprobante** (ticket de 80 mm) al registrar una venta.
- **Boleta y factura electrónica** cuando el backend implemente la Fase 2 (SUNAT).
- **Búsqueda de ventas por número** (NV01-000123): el backend no tiene ese filtro todavía.
- **Exportar reportes** a Excel o PDF.
- **Gráficos** en Inicio y Reportes (ventas por día, productos más vendidos).
- **Funcionamiento sin conexión** del punto de venta (guardar ventas y enviarlas al volver la conexión).
- **Despliegue**: construir con `npm run build` y servir `dist/` (por ejemplo, en Railway, Netlify o Nginx), con
  un workflow de GitHub Actions que corra lint, pruebas y build en cada push.
- Las pruebas de punta a punta dejan datos de prueba en la base de demostración; se podría usar una base aparte solo
  para pruebas.
