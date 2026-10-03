# Explicación del frontend

Explicación sencilla de cómo está hecho el frontend web de TodoPernos y por qué. Sirve para defender el proyecto:
cada sección termina con las preguntas que te pueden hacer y cómo responderlas.

---

## 1. Qué es y cómo se conecta con el backend

El frontend es una **aplicación de una sola página** (SPA) hecha con **React**. El navegador descarga la aplicación
una vez y luego solo intercambia datos (JSON) con el backend de Spring Boot.

```
Navegador (React)  ──HTTP + JSON + token JWT──►  Backend Spring Boot (puerto 8080)  ──►  PostgreSQL
   puerto 5173
```

- El frontend **no tiene reglas de negocio propias que el backend no tenga**: valida antes de enviar para dar mensajes
  rápidos, pero el backend vuelve a validar todo y es la autoridad.
- La dirección del backend está en la variable `VITE_API_URL` (por defecto `http://localhost:8080`).

**Preguntas típicas**
- *¿Por qué separar frontend y backend?* El backend sirve a cualquier cliente (web, móvil, Postman). Cada parte se
  prueba y se despliega por separado.
- *¿Qué pasa si alguien se salta el frontend y llama a la API directo?* Nada malo: el backend valida rol, tienda,
  stock y montos. El frontend solo oculta opciones para que el usuario no choque con errores.

---

## 2. Tecnologías y para qué sirve cada una

| Tecnología | Para qué |
|------------|----------|
| **React 19 + TypeScript** | Interfaz por componentes; TypeScript detecta errores de tipos al compilar (modo estricto, sin `any`) |
| **Vite** | Servidor de desarrollo instantáneo y compilación de producción (`npm run build`) |
| **React Router** | Navegación entre pantallas sin recargar la página (`/productos`, `/ventas/15`...) |
| **TanStack Query** | Pide los datos al backend, los guarda en caché, muestra “cargando”, reintenta y refresca |
| **Axios** | Cliente HTTP: agrega el token y convierte los errores al formato del backend |
| **Tailwind CSS** | Estilos con clases utilitarias y un tema con los colores de la imagen de referencia |
| **React Hook Form + Zod** | Formularios rápidos y validación con reglas declarativas (las mismas del backend) |
| **lucide-react** | Iconos |
| **Vitest + Testing Library** | Pruebas unitarias de la lógica y de componentes |
| **Playwright** | Pruebas de punta a punta: un navegador real usa la aplicación contra el backend real |

---

## 3. Estructura de carpetas (`src/`)

```
src/
├── api/            Cliente HTTP, tipos de la API y una función por endpoint
│   ├── cliente.ts      Axios: token, manejo de 401 y errores
│   ├── tipos.ts        Un tipo TypeScript por cada DTO del backend
│   ├── errores.ts      ApiError con codigo, mensaje y detalle
│   └── catalogo.ts, inventario.ts, ventas.ts, compras.ts, reportes.ts, organizacion.ts, auth.ts
├── auth/           Sesión (sessionStorage), contexto del usuario, permisos por rol, ruta protegida
├── contexto/       Ubicación de trabajo elegida en la barra superior
├── componentes/
│   ├── ui/             Componentes base: Boton, Campo, Tabla, Modal, Paginacion, Chip, Insignia...
│   ├── layout/         Barra lateral, barra superior, buscador, indicador de conexión, campana
│   ├── formularios/    Piezas reutilizables: selector de producto o cliente, editor de pagos, anulación
│   └── tablas/         Tablas compartidas entre pantallas (deudores)
├── hooks/          Consultas reutilizables (caja actual, métodos de pago, catálogos) y retraso de búsqueda
├── logica/         Funciones puras sin React: dinero, carrito, pagos, presentaciones, compras, formatos
└── paginas/        Una carpeta por módulo: inicio, productos, inventario, movimientos, caja, ventas,
                    clientes, compras, proveedores, reportes, usuarios, configuracion
```

La regla es parecida a la del backend: **las páginas solo muestran y coordinan**; los cálculos están en `logica/`
(sin React, fáciles de probar) y las llamadas HTTP en `api/`.

**Pregunta típica:** *¿Por qué la lógica del carrito no está dentro del componente?* Porque así se prueba con
pruebas unitarias simples (sin navegador) y se reutiliza: el mismo cálculo de IGV sirve para ventas y compras.

---

## 4. Seguridad en el frontend

### Sesión
1. El usuario ingresa usuario y contraseña; el backend devuelve un **token JWT** que dura 8 horas.
2. El token se guarda en **`sessionStorage`**: se borra al cerrar la pestaña (no queda guardado en la laptop).
3. Axios agrega `Authorization: Bearer <token>` en cada petición.
4. Si el backend responde **401** (token vencido, usuario desactivado), el interceptor borra la sesión y vuelve al
   login con el aviso “Tu sesión expiró”.

### Permisos por rol
`src/auth/permisos.ts` es una **copia de la tabla de permisos del backend** (`SecurityConfig.permisosPorRol`).
Con ella se decide qué menús, rutas y botones se muestran:

| Rol | Ve |
|-----|----|
| ADMIN | Todo, y puede elegir cualquier ubicación en la barra superior |
| VENDEDOR | Inicio, Productos (solo consulta), Inventario y Movimientos de su tienda, Caja, Ventas, Clientes, Reportes de ventas |
| ALMACENERO | Inicio, Productos (consulta), Inventario y Movimientos de su almacén, Compras, Proveedores, Reportes de compras y traslados |

El vendedor y el almacenero tienen la ubicación **fija** (la suya). Si escriben a mano una URL de otro rol, ven
“No tienes permiso para ver esta sección” sin llamar a la API.

**Preguntas típicas**
- *¿Ocultar un botón es seguridad?* No: es comodidad. La seguridad real está en el backend (403). El frontend evita
  que el usuario vea opciones que van a fallar.
- *¿Por qué `sessionStorage` y no `localStorage`?* Porque se borra al cerrar la pestaña: si alguien usa la laptop
  después, no encuentra la sesión abierta.

---

## 5. Cómo se piden los datos (TanStack Query)

Cada listado usa `useQuery` con una **clave** que incluye los filtros:

```ts
useQuery({ queryKey: ['ventas', 'listado', filtro], queryFn: () => ventasApi.listar(filtro) })
```

- Si cambia un filtro, cambia la clave y se pide la nueva página. Con `keepPreviousData` la tabla no parpadea.
- Cada respuesta llega como `PaginaResponse` (paginación del servidor: nunca se descarga todo).
- Al registrar algo (`useMutation`), se **invalidan** las claves afectadas: por ejemplo, una venta invalida
  inventario, caja, ventas y reportes, y esas pantallas se actualizan solas.
- La caja abierta se refresca cada 15 segundos (“resumen en vivo”) y el indicador “Sincronizado” consulta
  `/api/auth/me` cada 30 segundos.

**Pregunta típica:** *¿Qué pasa si el backend se apaga?* Las peticiones fallan sin respuesta, el indicador pasa a
“Sin conexión” en rojo y cada pantalla muestra el error. Al volver el backend, el indicador vuelve a “Sincronizado”.

---

## 6. Formularios y validación

- **React Hook Form** maneja los campos y **Zod** describe las reglas (las mismas del backend: RUC de 11 dígitos,
  contraseña de 8 a 72 caracteres, motivo de al menos 5 letras, montos con 2 decimales, cantidades con 3).
- Si el backend igual rechaza algo, el error se muestra con su **mensaje, el detalle por campo y el código**
  (componente `MensajeError`), por ejemplo `STOCK_INSUFICIENTE` con lo disponible.

---

## 7. Dinero sin errores de redondeo

En JavaScript `0.1 + 0.2` da `0.30000000000000004`. Por eso **los montos nunca se suman como números decimales**:

- se convierten a **céntimos enteros** (`aCentimos('12.35') = 1235`) y las cantidades a milésimas;
- las multiplicaciones usan `BigInt` y se redondea con **HALF_UP**, igual que `BigDecimal` en Java y `ROUND` en
  PostgreSQL (`src/logica/decimales.ts`).

Así el total que ve el vendedor **es exactamente** el que calcula el backend:

```
importe de línea = ROUND(cantidad × precio, 2)
subtotal         = importe − descuento de la línea
total            = suma de subtotales          (los precios ya incluyen IGV)
base imponible   = ROUND(total / 1.18, 2);   IGV = total − base
```

### Pago mixto y vuelto (`src/logica/pagos.ts`)
- **Contado:** los pagos deben cubrir el total. Lo pagado de más es el **vuelto** y solo puede salir del efectivo
  (no se da vuelto de un Yape).
- **Crédito (fiado):** requiere cliente; el adelanto es opcional y no puede superar el total; el resto queda como deuda.
- Yape, Plin, depósito, transferencia y tarjeta exigen **número de operación**.

### Presentaciones (`src/logica/presentaciones.ts`)
El stock está en la unidad base del producto. Vender 2 “Caja x100” descuenta 2 × 100 = 200 unidades. Solo los
productos por **kilo** o **metro** aceptan cantidades con decimales (2.5 kg); los productos por unidad, enteros.

**Pregunta típica:** *¿Por qué calcular en el frontend si el backend ya calcula?* Para mostrar el total, el IGV y el
vuelto **antes** de cobrar. El backend vuelve a calcular y es el que guarda; como usan la misma fórmula, coinciden.

---

## 8. Pantallas

| Pantalla | Qué hace |
|----------|----------|
| **Login** | Usuario y contraseña; avisa si la sesión expiró |
| **Inicio** | Resumen del día según el rol: ventas de hoy, caja, compras, stock bajo, traslados y deudas |
| **Productos** | Tabla como la imagen de referencia: foto, presentaciones en chips, stock por ubicación, precio y estado. Crear y editar con presentaciones (factor y precio) y foto |
| **Inventario** | Stock por ubicación, stock mínimo, ajustes con motivo e inventario inicial |
| **Movimientos** | Kardex con filtros; traslados: enviar, recibir y anular |
| **Caja** | Abrir, resumen en vivo por método de pago, cerrar con cuadre (esperado, contado, diferencia) e historial |
| **Ventas** | Punto de venta rápido (búsqueda, código de barras, carrito, descuento, contado o crédito, pago mixto, vuelto); historial, detalle y anulación |
| **Clientes** | Clientes, deudas pendientes con abonos y reporte de deudores |
| **Compras / Proveedores** | Registrar compra con sus líneas (precio por presentación como en el comprobante), anular, proveedores |
| **Reportes** | Ventas por tienda, más vendidos, traslados, compras por proveedor, stock bajo y deudores, con fechas y tienda |
| **Usuarios / Configuración** | Usuarios y roles, empresas, ubicaciones, categorías y cambio de contraseña |

Todas las pantallas tienen estado de **carga**, de **lista vacía** y de **error**, y los listados tienen
**paginación del servidor**.

---

## 9. Diseño

Se siguió la imagen de referencia (detalle en `docs/DISENO.md`): barra lateral oscura `#141414`, naranja `#F5761A`,
fondo crema `#FAF7F2`, tarjetas blancas, chips beige con texto monoespaciado y números en **JetBrains Mono**.
Los colores están definidos una sola vez como tema de Tailwind en `src/index.css`. El diseño se adapta a laptop
(barra lateral fija) y tablet (barra lateral desplegable y tablas con desplazamiento horizontal).

Las capturas de todas las pantallas están en `docs/capturas`.

---

## 10. Pruebas

| Tipo | Herramienta | Qué prueba |
|------|-------------|------------|
| Unitarias de lógica | Vitest | Céntimos y redondeo HALF_UP, carrito e IGV, pago mixto y vuelto, crédito y abonos, conversión de presentaciones, compras con y sin factura, formatos y fechas de Lima, permisos por rol y por tienda, errores de la API |
| De componentes | Vitest + Testing Library | Mensaje de error del backend, menú según el rol, paginación |
| De punta a punta | Playwright + backend real | Login de cada rol, permisos, 401, crear producto con foto, compra, traslado y recepción, abrir caja, venta al contado con vuelto, venta a crédito con Yape, abono y cierre de caja con cuadre exacto |

Además, antes de cada commit se ejecutan el **lint** (`npm run lint`) y la **compilación de producción**
(`npm run build`).

**Preguntas típicas**
- *¿Las pruebas E2E usan datos falsos?* No: usan el backend real con PostgreSQL y los datos de demostración. Por eso
  encontraron errores reales (por ejemplo, el resultado del cierre de caja no se mostraba) que se corrigieron.
- *¿Se pueden repetir?* Sí: cada ejecución crea un producto y un comprobante con un código único.

---

## 11. Decisiones importantes (resumen)

El detalle está en `docs/DECISIONES.md`. Las más importantes:

1. El token vive solo en `sessionStorage` y un 401 devuelve al login.
2. Los permisos del frontend copian la tabla del backend; el backend sigue siendo la autoridad.
3. El dinero se calcula en céntimos enteros con HALF_UP, igual que el backend.
4. Validación con Zod con las mismas reglas que Bean Validation.
5. Paginación del servidor en todos los listados.
6. Un cambio mínimo en el backend (filtro `productoIds`) para mostrar el stock de una página en una sola consulta.
7. Sin credenciales en el código: la URL de la API y las contraseñas de prueba van en variables de entorno.
