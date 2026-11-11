# Prototipo en Figma: guía completa paso a paso

Al final de esta guía tendrás un **enlace** que le mandas al profesor: al abrirlo verá las pantallas del sistema y
podrá hacer clic en los botones como si usara el sistema. Todo es **gratis**. Tiempo aproximado: 1 a 2 horas.

Necesitas:
- El archivo **`prototipo-figma-capturas.zip`** (38 capturas del sistema real; te lo pasó Claude).
- Una computadora con **Chrome o Edge** e internet.

> Las respuestas del asistente de IA en las capturas 13, 34 y 49 son **ejemplos**: muestran cómo responde, pero no
> son una consulta real a la IA.

---

## Paso 1. Crear tu cuenta de Figma (5 minutos)

1. Abre **https://www.figma.com/signup**
2. Presiona **Continue with Google** y elige tu correo (o escribe un correo y una contraseña).
3. Figma hace unas preguntas de bienvenida (para qué lo usarás, tu rol…). Responde cualquier opción, por ejemplo
   **Student** / **Personal use**, y sigue con **Continue** o **Skip** hasta llegar a la página de inicio.
4. Si te ofrece un plan de pago, elige el **gratis** (*Starter* / *Free*). No hace falta tarjeta.

> Opcional: con el correo de la universidad puedes pedir el plan **Education** (gratis, con más funciones) en
> **https://www.figma.com/education/**. Para este prototipo **no hace falta**.

## Paso 2. Crear el archivo del prototipo (2 minutos)

1. En la página de inicio de Figma presiona **+ Create** (arriba a la izquierda o al centro) → **Design**
   (también puede decir **New design file**).
2. Se abre una hoja en blanco. Arriba al centro haz clic en el nombre **Untitled** y escribe:
   **Prototipo – Bonifaz & Cia**

## Paso 3. Subir las 38 pantallas (10 minutos)

1. En tu computadora, haz clic derecho en `prototipo-figma-capturas.zip` → **Extraer todo** → **Extraer**.
2. Abre la carpeta extraída, selecciona **todas** las imágenes (**Ctrl + A**) y **arrástralas** a la hoja en blanco
   de Figma. Aparecen grandes (2880 × 1800): es normal, así se ven nítidas.
3. Convierte **cada imagen** en una pantalla (*frame*): haz clic en una imagen y presiona **Ctrl + Alt + G**
   (o clic derecho → **Frame selection**). Repite con las 38.
4. A la izquierda, en el panel **Layers**, haz doble clic en el nombre de cada frame y ponle el nombre del archivo
   sin `.png`. Ejemplo: `22-vendedor-punto-de-venta-lista`.
5. Acomódalas en 3 filas para no perderte (arrástralas):
   - Fila 1: **Dueño** (01 a 13)
   - Fila 2: **Vendedor** (20 a 34)
   - Fila 3: **Almacenero** (40 a 49)

> Para moverte por la hoja: **barra espaciadora + arrastrar** el mouse; para acercar o alejar: **Ctrl + rueda**.

## Paso 4. Hacer los botones clicables (40 a 60 minutos)

Repite esto para cada fila del **Mapa de navegación** (al final de esta guía):

1. Presiona **R** (rectángulo) y dibuja un rectángulo **encima del botón** de la captura.
2. En el panel derecho, pestaña **Design**, en **Fill** cambia **100 %** por **0 %**: el rectángulo queda invisible
   pero se puede hacer clic.
3. Arriba a la derecha cambia a la pestaña **Prototype**.
4. Con el rectángulo seleccionado aparece un **círculo con +** en su borde: **arrástralo** hasta la pantalla de
   destino y suelta.
5. En la ventanita que aparece deja **On click** → **Navigate to**, y en animación elige **Instant** o **Dissolve**.

**Atajo para el menú lateral:** cuando tengas los rectángulos del menú de una pantalla ya enlazados (Inicio,
Productos, Ventas…), selecciónalos todos (Shift + clic), cópialos (**Ctrl + C**) y pégalos en las otras pantallas
del **mismo rol** con **Ctrl + Shift + V** (pega en el mismo lugar). **Los enlaces se copian con ellos.**

## Paso 5. Crear los tres recorridos (5 minutos)

1. En la pestaña **Prototype**, haz clic en la pantalla **01-inicio-de-sesion**.
2. En el panel derecho, en **Flow starting point**, presiona **+** y ponle de nombre **Dueño**.
3. Repite con **20-vendedor-inicio** → nombre **Vendedor**, y con **40-almacenero-inicio** → nombre **Almacenero**.

## Paso 6. Probar el prototipo (10 minutos)

1. Presiona el botón **▶ (Present)** arriba a la derecha. Se abre una pestaña nueva con el prototipo.
2. A la izquierda aparecen los 3 recorridos. Elige uno y haz clic en los botones: cada uno debe llevar a la
   pantalla correcta. Si alguno no funciona, vuelve al paso 4.

## Paso 7. Sacar el enlace para el profesor (2 minutos)

1. En la pestaña del prototipo (la del paso 6), arriba a la derecha presiona **Share prototype** (o **Share**).
2. En **Who can view** / **Anyone with the link** elige **Anyone with the link** (cualquiera con el enlace).
3. Presiona **Copy link**. Ya está copiado.
4. **Pruébalo:** abre una ventana de incógnito (**Ctrl + Shift + N** en Chrome), pega el enlace (**Ctrl + V**) y
   presiona Enter. Si ves el prototipo **sin que te pida iniciar sesión**, está listo. ✅

## Paso 8. Enviarlo

Pega el enlace en el correo o en el aula virtual, por ejemplo:

> Profesor, le envío el prototipo del sistema de la ferretería **Bonifaz & Cia**: [pega aquí el enlace]
> A la izquierda puede elegir el recorrido del **dueño**, del **vendedor** o del **almacenero** y hacer clic en los
> botones para navegar. Las pantallas son capturas del sistema funcionando.

> Atajo: en la pestaña **Prototype** (sin nada seleccionado), en **Flows**, al pasar el mouse sobre cada recorrido
> aparece un ícono de **enlace** que copia el link directo de ese recorrido (por si quieres mandar uno por rol).
> Los nombres de los botones pueden variar un poco según la versión de Figma; siempre están arriba a la derecha.

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
