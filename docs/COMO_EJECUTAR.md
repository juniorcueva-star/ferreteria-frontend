# Cómo ejecutar el frontend en tu laptop (Windows + PowerShell)

Guía paso a paso para levantar el backend y el frontend, entrar con los usuarios de demostración y correr las pruebas.
Todos los comandos se escriben en **PowerShell**.

---

## 1. Requisitos (una sola vez)

| Programa | Para qué | Cómo comprobarlo |
|----------|----------|------------------|
| **Node.js 22.12 o superior** (recomendado: la versión LTS) | Ejecutar el frontend | `node -v` |
| **Git** | Traer el código | `git --version` |
| **Java 21**, **Docker Desktop** | Ejecutar el backend (ver su `docs/COMO_EJECUTAR.md`) | `java -version`, `docker --version` |

### Verificar Node.js

```powershell
node -v
npm -v
```

`node -v` debe mostrar `v22.12.0` o mayor (por ejemplo `v22.22.0` o `v24.x`). Si no lo tienes o es más antiguo:

```powershell
winget install OpenJS.NodeJS.LTS
```

Cierra y vuelve a abrir PowerShell después de instalarlo.

> Si PowerShell dice que **no se puede ejecutar `npm` porque la ejecución de scripts está deshabilitada**, ejecuta una
> sola vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y responde `S`.

---

## 2. Traer el código (backend y frontend)

Los dos repositorios usan la rama **`claude/loving-goodall-nr3163`**. El backend de esa rama trae un pequeño cambio que
necesita el frontend (filtro `productoIds` del stock), así que **usa esa rama en los dos**.

Lo más cómodo es tenerlos lado a lado en una misma carpeta, por ejemplo `C:\proyectos`:

```powershell
mkdir C:\proyectos -Force
cd C:\proyectos
git clone https://github.com/juniorcueva-star/ferreteria-backend.git
git clone https://github.com/juniorcueva-star/ferreteria-frontend.git

cd C:\proyectos\ferreteria-backend
git checkout claude/loving-goodall-nr3163

cd C:\proyectos\ferreteria-frontend
git checkout claude/loving-goodall-nr3163
```

**Si ya los tenías clonados**, actualiza cada uno:

```powershell
cd C:\proyectos\ferreteria-backend
git fetch origin
git checkout claude/loving-goodall-nr3163
git pull origin claude/loving-goodall-nr3163

cd C:\proyectos\ferreteria-frontend
git fetch origin
git checkout claude/loving-goodall-nr3163
git pull origin claude/loving-goodall-nr3163
```

---

## 3. Levantar el backend

El detalle está en `ferreteria-backend\docs\COMO_EJECUTAR.md`. En resumen (primera vez):

```powershell
cd C:\proyectos\ferreteria-backend\backend
Copy-Item .env.example .env
notepad .env
```

Revisa que `.env` tenga `JWT_SECRET`, `ADMIN_PASSWORD` y `DEMO_PASSWORD`. Luego:

```powershell
docker compose up -d
.\mvnw.cmd spring-boot:run
```

Espera a ver `Started FerreteriaBackendApplication`. La API queda en **http://localhost:8080**.
Deja esta ventana abierta y abre **otra** ventana de PowerShell para el frontend.

> El backend ya permite llamadas desde `http://localhost:5173` (variable `CORS_ORIGENES`, valor por defecto).

---

## 4. Instalar y levantar el frontend

```powershell
cd C:\proyectos\ferreteria-frontend
npm install
npm run dev
```

Abre **http://localhost:5173** en el navegador.

### Cambiar la URL del backend (opcional)

Por defecto el frontend llama a `http://localhost:8080`. Si tu backend está en otra dirección:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

y cambia `VITE_API_URL`. Vuelve a ejecutar `npm run dev` para que tome el cambio.

---

## 5. Usuarios de demostración

| Usuario | Contraseña | Rol | Ubicación | Qué ve |
|---------|-----------|-----|-----------|--------|
| `admin` | tu `ADMIN_PASSWORD` (Ej: `Admin123!`) | Administrador | Todas | Todo el sistema |
| `vendedor1` | tu `DEMO_PASSWORD` (Ej: `Demo123!`) | Vendedor | Tienda Centro | Caja, ventas, clientes y fiado de su tienda |
| `vendedor2` | tu `DEMO_PASSWORD` | Vendedor | Tienda Norte | Lo mismo, en la Tienda Norte |
| `almacen1` | tu `DEMO_PASSWORD` | Almacenero | Almacén Central | Compras, proveedores, traslados y ajustes |

### Recorrido sugerido

1. **admin** → Productos → *Nuevo Producto* con dos presentaciones (Ej: Unidad y Caja x100) y una foto.
2. **almacen1** → Compras → *Registrar compra* de ese producto (entra al almacén).
3. **almacen1** → Movimientos → *Nuevo traslado* del almacén a la Tienda Centro.
4. **vendedor1** → Movimientos → Traslados → abre el traslado → *Recibir mercadería*.
5. **vendedor1** → Caja → *Abrir caja* con S/ 100.
6. **vendedor1** → Ventas → agrega productos, cobra al contado (verás el vuelto) y luego una venta a crédito con
   adelanto por Yape (pide el número de operación).
7. **vendedor1** → Clientes → *Deudas pendientes* → *Abonar*.
8. **vendedor1** → Caja → *Cerrar caja* con el efectivo contado: el sistema muestra la diferencia.
9. **admin** → Reportes.

---

## 6. Calidad y pruebas

### Lint, pruebas unitarias y compilación de producción

```powershell
cd C:\proyectos\ferreteria-frontend
npm run lint
npm test
npm run build
```

- `npm run lint` no debe mostrar errores.
- `npm test` corre las pruebas unitarias (Vitest): carrito, pago mixto y vuelto, presentaciones, compras, formatos,
  permisos por rol y componentes.
- `npm run build` genera la versión de producción en la carpeta `dist`. Para probarla: `npm run preview`.

### Pruebas de punta a punta (Playwright, contra el backend real)

Necesitan el **backend encendido** con el perfil `dev` (datos de demostración). La primera vez instala el navegador
y crea el archivo con las contraseñas de prueba:

```powershell
cd C:\proyectos\ferreteria-frontend
npx playwright install chromium
Copy-Item .env.e2e.example .env.e2e
notepad .env.e2e
```

En `.env.e2e` pon `E2E_ADMIN_PASSWORD` (tu `ADMIN_PASSWORD`) y `E2E_DEMO_PASSWORD` (tu `DEMO_PASSWORD`). Luego:

```powershell
npm run e2e
```

Playwright levanta el frontend solo (si no está corriendo) y recorre: login de cada rol, crear producto, compra,
traslado y recepción, abrir caja, venta al contado, venta a crédito, abono y cierre de caja. Debe terminar con
`16 passed`. Para ver el informe con capturas de los pasos:

```powershell
npx playwright show-report
```

Para regenerar las capturas de `docs\capturas`:

```powershell
npm run e2e:capturas
```

> Las pruebas crean datos (un producto `E2E-...`, una compra, ventas). Se pueden repetir sobre la misma base. Si quieres
> volver a los datos de demostración limpios, en la carpeta del backend: `docker compose down -v`, `docker compose up -d`
> y vuelve a levantar el backend.

---

## 7. Problemas frecuentes

| Problema | Solución |
|----------|----------|
| Arriba dice **“Sin conexión”** en rojo | El backend no está encendido o está en otra URL: revisa el paso 3 o `VITE_API_URL` |
| En la consola del navegador aparece un error de **CORS** | Abriste el frontend en otro puerto: usa `http://localhost:5173` o agrega tu URL a `CORS_ORIGENES` en el `.env` del backend |
| `Port 5173 is already in use` | Otra copia de `npm run dev` sigue abierta: ciérrala (Ctrl + C) |
| `npm` no se puede ejecutar por la política de scripts | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Al entrar dice “Usuario o contraseña incorrectos” | Usa las contraseñas de tu `.env` del backend (`ADMIN_PASSWORD`, `DEMO_PASSWORD`) |
| “Tu sesión expiró” | El token dura 8 horas o el backend se reinició con otro `JWT_SECRET`: vuelve a ingresar |
| El vendedor no puede vender | Primero debe abrir su caja (menú Caja) |
| `npm run e2e` dice “Falta la variable E2E_ADMIN_PASSWORD” | Crea `.env.e2e` como se explica en el paso 6 |
| `npm run e2e` no encuentra el navegador | `npx playwright install chromium` |
