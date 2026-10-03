# Decisiones tomadas

Registro de las decisiones del frontend (qué se decidió y por qué). Las decisiones del backend están en
`ferreteria-backend/docs/DECISIONES.md`.

## Tecnologías

- **F01. Versiones.** React 19, Vite 8, React Router 8, TanStack Query 5, Axios 1, Tailwind CSS 4, React Hook Form 7,
  Zod 4, lucide-react, Vitest 5, Testing Library y Playwright 1.63 (últimas estables al 3 de octubre de 2026).
- **F02. TypeScript 6.0 y no 7.0.** TypeScript 7 es la última versión, pero `typescript-eslint` (el lint) todavía solo
  soporta TypeScript `< 6.1`. Se usa la última 6.0.x para que el lint funcione; el código no usa nada exclusivo de la 7.
- **F03. ESLint** con `typescript-eslint`, reglas de hooks de React y `no-explicit-any` como error (sin `any`).
- **F04. Fuentes instaladas con npm** (`@fontsource-variable/inter` y `jetbrains-mono`) en lugar de Google Fonts: el
  sistema es interno y debe verse igual aunque la laptop no tenga internet.

## Backend

- **F05. Cambio mínimo en el backend: filtro `productoIds` en `GET /api/inventario/stock`.** La tabla de Productos
  muestra una columna de stock por ubicación. Sin el filtro había que pedir el stock producto por producto
  (20 peticiones por página). Se agregó un parámetro opcional (máximo 100 ids) con su prueba de integración en la rama
  `claude/loving-goodall-nr3163` del backend (decisión D78 del backend). No cambia el esquema ni la seguridad.

## Sesión y seguridad

- **F06. Token en `sessionStorage`.** Dura mientras la pestaña está abierta y se borra al cerrarla (pedido del
  enunciado). No se usa `localStorage`. Si la API responde 401, el interceptor de Axios borra la sesión y vuelve
  al login con el aviso “Tu sesión expiró”.
- **F07. Permisos copiados de `SecurityConfig.permisosPorRol`** en `src/auth/permisos.ts`. El menú, las rutas y los
  botones se ocultan según el rol para no mostrar lo que el backend rechazaría con 403. El backend sigue siendo la
  autoridad: la tabla del frontend solo oculta opciones.
- **F08. Ubicación de trabajo.** El ADMIN elige la ubicación en la barra superior (o “Todas”); el vendedor y el
  almacenero ven fija la suya (el backend no les deja consultar otra). Esa ubicación es el filtro por defecto de
  inventario, ventas, caja, compras y reportes.
- **F09. Cambio de contraseña para todos.** El enunciado pone “cambio de contraseña” dentro de Configuración (solo
  ADMIN), pero el backend permite a cualquier usuario cambiar la suya (`PUT /api/auth/password`). Se puso en el menú
  del usuario (abajo en la barra lateral) para todos los roles, y además como pestaña en Configuración.
- **F10. Indicador “Sincronizado”.** Refleja el estado real: cada respuesta (o falta de respuesta) de la API lo
  actualiza y además se consulta `/api/auth/me` cada 30 segundos. Esa consulta también refresca el rol y la tienda
  del usuario si el ADMIN los cambia.

## Datos y cálculos

- **F11. Dinero en céntimos enteros.** En JavaScript `0.1 + 0.2 ≠ 0.3`, así que el carrito, el pago mixto y el vuelto
  se calculan con enteros (`BigInt`) y redondeo HALF_UP, igual que `BigDecimal` en el backend. El total que se ve
  antes de cobrar es exactamente el que calcula el servidor.
- **F12. Los formularios guardan los números como texto** y Zod los valida con las mismas reglas del backend
  (decimales máximos, mayor que 0, máximo 1 000 000). Se convierten a número solo al enviar.
- **F13. Cantidades con decimales solo para KILO y METRO.** Para productos por UNIDAD el carrito exige enteros.
- **F14. Empresas para compras desde las ubicaciones.** `GET /api/empresas` es solo para ADMIN, pero el almacenero
  necesita elegir la empresa (RUC) que compra. Las tiendas traen su empresa en `GET /api/ubicaciones` (permitido a
  todos), así que la lista de empresas se arma desde ahí.
- **F15. Nombres de métodos de pago con tildes.** El catálogo de la base de datos está sin tildes (“Deposito bancario”);
  como los códigos son fijos (migración V2), el frontend muestra el nombre correcto (“Depósito bancario”). Los demás
  datos (nombres de tiendas, productos) se muestran tal como están guardados.
- **F15b. Tildes en los mensajes de error del backend.** El backend escribe sus mensajes sin tildes (“Usuario o
  contrasena incorrectos”). Sin tocar el backend, `corregirTildes` (en `src/api/errores.ts`) corrige las palabras más
  frecuentes de esos mensajes (contraseña, ubicación, número, operación, crédito...). Solo se aplica a mensajes de
  error, nunca a datos, y el código del error se muestra tal cual.

## Pantallas

- **F16. Caja en el menú** entre Movimientos y Ventas (no está en la imagen, pero el enunciado la pide). El punto de
  venta avisa si no hay caja abierta y enlaza a la apertura.
- **F17. Deudas pendientes del Inicio** se calculan con el reporte “ventas por tienda” desde el 1 de enero de 2000
  hasta hoy (`saldoPendiente` sumado por tienda): es un solo número exacto calculado en la base de datos, sin
  recorrer todas las deudas.
- **F18. Inicio por rol.** ADMIN y VENDEDOR ven ventas de hoy, caja y deudas; el ALMACENERO ve compras de hoy. Todos
  ven stock bajo y traslados (el vendedor, los que llegan a su tienda).
- **F19. Búsqueda global** de productos (todos), clientes (ADMIN y VENDEDOR) y proveedores (ADMIN y ALMACENERO).
  El backend no tiene búsqueda de ventas por número, así que no se incluyen “órdenes”.
- **F20. Columnas de stock con el nombre corto de cada ubicación** (“Centro”, “Norte”, “Almacén”), en el mismo orden
  que la imagen (tiendas y luego almacén). El vendedor y el almacenero solo ven la columna de su ubicación, porque el
  backend no les muestra el stock de las demás (decisión D39 del backend).
- **F21. Edición de presentaciones.** El backend las actualiza una por una. Al guardar se envía primero la nueva
  principal (el backend desmarca la anterior) y luego el resto, solo las que cambiaron. Una presentación ya guardada
  no se borra: se desactiva (igual que en el backend).
- **F22. Ventanas modales que se montan al abrirse.** Así cada formulario empieza limpio sin efectos que reinicien el
  estado (lo exige la regla `react-hooks/set-state-in-effect`).
- **F23. Formularios que dependen de listas** (categoría del producto, empresa de la tienda) esperan a que la lista
  cargue antes de mostrarse; si no, el navegador mostraba la primera opción en lugar del valor guardado.
- **F24. Carga diferida de pantallas** (`React.lazy`): cada módulo se descarga al visitarlo; la primera carga es más
  liviana.

## Pruebas

- **F25. Contraseñas de las pruebas E2E en `.env.e2e`** (ignorado por Git, con plantilla `.env.e2e.example`):
  no hay credenciales en el código.
- **F26. Las pruebas E2E se pueden repetir** sobre la misma base: cada ejecución crea un producto y un comprobante con
  un código único, y si el vendedor quedó con la caja abierta por una ejecución interrumpida, la prueba la cierra
  primero. Dejan datos de prueba en la base de demostración (se puede reiniciar con `docker compose down -v`).
- **F27. Las capturas son un proyecto aparte de Playwright** (`npm run e2e:capturas`) para no reescribir
  `docs/capturas` cada vez que se corren las pruebas. Suben ilustraciones a los productos de demostración que no
  tienen foto, para que la tabla se vea como la imagen de referencia.
- **F28. Chromium en este entorno.** Playwright 1.63 busca su propia versión de Chromium; en el entorno de desarrollo
  se usó uno ya instalado con la variable `CHROMIUM_PATH`. En la laptop basta `npx playwright install chromium`.
