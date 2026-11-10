# Prototipo en Figma: guía paso a paso

El prototipo se arma con **capturas reales del sistema** (38 pantallas, 1440 × 900 en alta resolución) enlazadas con
clics, para que el profesor recorra el sistema como si lo usara. Las capturas están en
`prototipo-figma-capturas.zip` (el número del archivo indica el orden).

> Las respuestas del asistente de IA en las capturas 13, 34 y 49 son **ejemplos**: muestran cómo responde, pero no
> son una consulta real a la IA.

---

## Paso 1. Crear el archivo

1. Entra a **https://www.figma.com** y crea una cuenta gratis (con el correo de la universidad puedes pedir el plan
   **Education**, también gratis).
2. Presiona **+ New** (o **New design file**) y ponle de nombre **Prototipo – Bonifaz & Cia**.

## Paso 2. Poner las pantallas

1. Descomprime `prototipo-figma-capturas.zip` en tu computadora.
2. Arrastra **todas** las imágenes a la hoja en blanco de Figma. Aparecen grandes (2880 × 1800): es normal, así se
   ven nítidas.
3. Convierte **cada** imagen en un *frame* (una "pantalla" del prototipo): haz clic en la imagen y presiona
   **Ctrl + Alt + G** (o clic derecho → **Frame selection**).
4. Cambia el nombre de cada frame (doble clic en el nombre, en el panel de la izquierda) por el del archivo, sin el
   `.png`. Ejemplo: `22-vendedor-punto-de-venta-lista`.
5. Ordénalas en 3 filas para no perderte:
   - Fila 1: **Dueño** (01 a 13)
   - Fila 2: **Vendedor** (20 a 34)
   - Fila 3: **Almacenero** (40 a 49)

## Paso 3. Hacer los botones clicables

Para cada botón del mapa de abajo:

1. Con la herramienta **Rectángulo** (tecla **R**) dibuja un rectángulo encima del botón en la captura.
2. En el panel derecho (**Design**) baja la opacidad del relleno (*Fill*) a **0 %**: queda invisible, pero se puede
   hacer clic.
3. Ve a la pestaña **Prototype** (panel derecho, arriba), pasa el mouse por el rectángulo y arrastra el **círculo
   azul (+)** hasta la pantalla de destino.
4. Deja **On click → Navigate to** y en animación elige **Instant** (o **Dissolve**, que se ve suave).

**Atajo para el menú lateral:** cuando tengas los rectángulos del menú de una pantalla ya enlazados (Inicio,
Productos, Ventas…), selecciónalos todos, cópialos (**Ctrl + C**) y pégalos en las otras pantallas del **mismo rol**
con **Ctrl + Shift + V** (pega en el mismo lugar). **Los enlaces se copian con ellos.**

## Paso 4. Los tres recorridos (flujos)

En la pestaña **Prototype**, selecciona la pantalla de inicio de cada recorrido y presiona **+** en
**Flow starting point**. Ponle nombre:

| Flujo | Empieza en |
|---|---|
| **Dueño** | `01-inicio-de-sesion` |
| **Vendedor** | `20-vendedor-inicio` |
| **Almacenero** | `40-almacenero-inicio` |

## Paso 5. Probar y compartir con el profesor

1. Presiona **▶ (Present)** arriba a la derecha y recorre el prototipo con clics. Si un botón no lleva a ningún
   lado, vuelve al paso 3.
2. Para compartir: en la vista de presentación presiona **Share prototype** → en **Who can view** elige
   **Anyone with the link** → **Copy link**. Ese enlace es el que le mandas al profesor (no necesita cuenta de Figma).

---

## Mapa de navegación

"Menú →" es el menú lateral de la izquierda. Los nombres de los botones están tal como se ven en la captura.

### Flujo del dueño (administrador)

| Pantalla | Botón o zona | Lleva a |
|---|---|---|
| 01-inicio-de-sesion | Botón amarillo **Ingresar** | 02-dueno-inicio |
| 02-dueno-inicio | Menú → **Productos** | 03-dueno-productos |
| 02-dueno-inicio | Menú → **Disponibilidad** | 07-dueno-disponibilidad |
| 02-dueno-inicio | Menú → **Reportes** | 08-dueno-reportes |
| 02-dueno-inicio | Menú → **Auditoría** (baja en el menú) | 09-dueno-auditoria |
| 02-dueno-inicio | Menú → **Usuarios** | 10-dueno-usuarios |
| 02-dueno-inicio | Menú → **Configuración** | 11-dueno-configuracion |
| 02-dueno-inicio | El **perno** (abajo a la derecha) | 12-dueno-asistente-abierto |
| 03-dueno-productos | Lápiz **Editar** de "Perno hexagonal 3/8 x 2"" | 04-dueno-producto-editar |
| 04-dueno-producto-editar | **Precio por mayor** | 05-dueno-precio-por-mayor |
| 04-dueno-producto-editar | **Oferta** | 06-dueno-oferta |
| 05-dueno-precio-por-mayor | **Cancelar** o **Guardar precio por mayor** | 04-dueno-producto-editar |
| 06-dueno-oferta | **Cancelar** o **Guardar oferta** | 04-dueno-producto-editar |
| 12-dueno-asistente-abierto | Pregunta **¿Cómo me fue hoy?** | 13-dueno-asistente-respuesta |
| 12 y 13 | La **X** del chat | 02-dueno-inicio |
| 03 a 13 | Menú → **Inicio** | 02-dueno-inicio |
| Cualquiera | Nombre del usuario abajo a la izquierda (**cerrar sesión**) | 01-inicio-de-sesion |

### Flujo del vendedor

| Pantalla | Botón o zona | Lleva a |
|---|---|---|
| 20-vendedor-inicio | Menú → **Caja** | 21-vendedor-caja |
| 20-vendedor-inicio | Menú → **Ventas** | 22-vendedor-punto-de-venta-lista |
| 21-vendedor-caja | **Ir al punto de venta** | 22-vendedor-punto-de-venta-lista |
| 22-vendedor-punto-de-venta-lista | Botón **Fotos** | 23-vendedor-punto-de-venta-fotos |
| 23-vendedor-punto-de-venta-fotos | Botón amarillo **Ofertas** | 24-vendedor-punto-de-venta-ofertas |
| 23 y 24 | Botón **Lista** | 22-vendedor-punto-de-venta-lista |
| 22-vendedor-punto-de-venta-lista | Presentación **Unidad** del "Perno hexagonal 3/8 x 2"" | 25-vendedor-carrito-y-cobro |
| 25-vendedor-carrito-y-cobro | Botón amarillo **Cobrar** (abajo en Cobro) | 26-vendedor-venta-registrada |
| 26-vendedor-venta-registrada | **Nueva venta** | 22-vendedor-punto-de-venta-lista |
| 22-vendedor-punto-de-venta-lista | **Historial de ventas** | 27-vendedor-historial-ventas |
| 27-vendedor-historial-ventas | La primera venta de la lista | 28-vendedor-detalle-venta |
| 28-vendedor-detalle-venta | **← Volver a ventas** | 27-vendedor-historial-ventas |
| 20-vendedor-inicio | Menú → **Cotizaciones** | 29-vendedor-cotizaciones |
| 29-vendedor-cotizaciones | **Nueva cotización** | 30-vendedor-cotizacion-nueva |
| 20-vendedor-inicio | Menú → **Clientes** | 31-vendedor-clientes |
| 20-vendedor-inicio | Menú → **Encargos** | 32-vendedor-encargos |
| 20-vendedor-inicio | Menú → **Reposición** | 33-vendedor-pedidos-reposicion |
| 22-vendedor-punto-de-venta-lista | El **perno** (abajo a la derecha) | 34-vendedor-asistente |
| 34-vendedor-asistente | La **X** del chat | 22-vendedor-punto-de-venta-lista |
| 21 a 34 | Menú → **Inicio** | 20-vendedor-inicio |

### Flujo del almacenero

| Pantalla | Botón o zona | Lleva a |
|---|---|---|
| 40-almacenero-inicio | Menú → **Inventario** | 41-almacenero-inventario |
| 41-almacenero-inventario | **Inventario físico** | 42-almacenero-inventario-fisico |
| 42-almacenero-inventario-fisico | **← Volver a inventario** | 41-almacenero-inventario |
| 40-almacenero-inicio | Menú → **Reposición** | 43-almacenero-reposicion |
| 40-almacenero-inicio | Menú → **Movimientos** | 44-almacenero-movimientos |
| 44-almacenero-movimientos | **Nuevo traslado** | 45-almacenero-traslado-nuevo |
| 40-almacenero-inicio | Menú → **Compras** | 46-almacenero-compras |
| 46-almacenero-compras | **Registrar compra** | 47-almacenero-compra-nueva |
| 40-almacenero-inicio | Menú → **Reportes** | 48-almacenero-reportes |
| 40-almacenero-inicio | El **perno** (abajo a la derecha) | 49-almacenero-asistente |
| 49-almacenero-asistente | La **X** del chat | 40-almacenero-inicio |
| 41 a 49 | Menú → **Inicio** | 40-almacenero-inicio |

---

## Para la presentación

- Empieza por el flujo del **vendedor**: es el que más se nota (caja con fotos, ofertas, precio por mayor y cobro).
- Luego el **almacenero** (reposición e inventario físico) y al final el **dueño** (reportes, auditoría y el
  asistente de IA).
- Si el profesor pregunta si funciona de verdad: sí, el prototipo está hecho con capturas del sistema real, que se
  puede mostrar corriendo en la laptop.
