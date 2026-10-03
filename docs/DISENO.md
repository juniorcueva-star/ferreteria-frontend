# Guía de diseño

Sistema visual de TodoPernos, tomado de la imagen de referencia de la pantalla de Productos.
Los colores están definidos una sola vez en `src/index.css` (bloque `@theme` de Tailwind 4) y se usan como clases:
`bg-marca`, `text-tinta-suave`, `bg-crema`, `border-borde`, etc.

## Colores

| Token (clase Tailwind) | Valor | Uso |
|------------------------|-------|-----|
| `marca` | `#F5761A` | Naranja principal: botones principales, logo, ítem activo del menú, foco de los campos |
| `marca-oscuro` | `#DC6410` | Hover de los botones naranjas |
| `marca-claro` | `#FDEBDC` | Fondos suaves resaltados (presentación principal) |
| `lateral` | `#141414` | Fondo de la barra lateral |
| `lateral-activo` | `#2A1E15` | Fondo del ítem activo del menú (texto e icono en `marca`) |
| `lateral-hover` | `#1F1F1F` | Hover de los ítems del menú |
| `lateral-texto` | `#B5B0A8` | Texto de los ítems no activos |
| `crema` | `#FAF7F2` | Fondo de la página |
| `beige` | `#F0EDE8` | Chips de presentaciones, miniaturas sin foto |
| `borde` | `#E8E3DB` | Bordes suaves de tarjetas, tablas y campos |
| `tinta` | `#1C1917` | Texto principal |
| `tinta-suave` | `#6B645C` | Texto secundario, encabezados de tabla |
| `tinta-tenue` | `#9A938A` | Placeholders, textos de ayuda |
| `exito` / `exito-claro` | `#16A34A` / `#E8F6EC` | “Sincronizado”, estado Activo, entradas de stock |
| `alerta` / `alerta-claro` | `#D97706` / `#FDF3E2` | En camino, pendiente, conectando |
| `peligro` / `peligro-claro` | `#DC2626` / `#FDECEC` | Errores, anulado, stock bajo, salidas de stock |
| `info` / `info-claro` | `#2563EB` / `#E8EFFD` | Avisos informativos |

## Tipografía

- **Inter** (variable) para toda la interfaz. Títulos de página 28 px en negrita; texto base 14 px.
- **JetBrains Mono** (variable) para números: stock, precios, cantidades, códigos y chips de presentaciones.
  Las cifras usan `tabular-nums` para que las columnas queden alineadas.
- Las fuentes se instalan con npm (`@fontsource-variable/...`): funcionan sin internet.

## Formatos

- Precios: `S/ 0.35`, `S/ 1,234.50` (`soles()` en `src/logica/formato.ts`).
- Stock en la tabla de productos sin separador de miles (`5000`), en la unidad base del producto.
- Chips de presentaciones: `Caja x100 · 100 u`, `Millar · 1,000 u`, `Medio kilo · 0.5 kg`.
- Fechas y horas en zona de Lima: `3 oct. 2026, 9:59 a. m.`.

## Estructura de pantalla

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ Logo naranja │ ☰  [🏪 Tienda ▾]  [🔍 Buscar…]          ● ☁ Sincronizado  🔔 │
│ TodoPernos   ├──────────────────────────────────────────────────────────────┤
│ Sistema ERP  │ Título de la página                       [+ Acción naranja] │
│              │ Contador / subtítulo                                         │
│ ▣ Inicio     │ ┌──────────────────────────────────────────────────────────┐ │
│ ⬡ Productos  │ │ Filtros (buscador, listas)                               │ │
│ …            │ └──────────────────────────────────────────────────────────┘ │
│              │ ┌──────────────────────────────────────────────────────────┐ │
│ (AP) Usuario │ │ Tabla en tarjeta blanca + paginación                     │ │
│     Rol      │ └──────────────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

- Barra lateral de 256 px fija en laptop (≥ 1024 px). En tablet se abre como panel con el botón ☰.
- Tarjetas blancas con borde `borde`, esquinas `rounded-2xl` y sombra mínima.
- Botón flotante de ayuda (?) abajo a la derecha, como en la imagen.

## Componentes base (`src/componentes/ui`)

| Componente | Descripción |
|------------|-------------|
| `Boton` | Variantes `primario` (naranja), `secundario`, `peligro`, `exito`, `fantasma`; tamaños `sm`, `md`, `lg`; estado `cargando` |
| `CampoTexto`, `CampoSelector`, `CampoArea`, `Casilla` | Campos con etiqueta, error y ayuda conectados para accesibilidad |
| `Buscador` | Campo de búsqueda con lupa y botón para limpiar |
| `Tarjeta`, `TituloTarjeta` | Contenedor blanco con borde suave |
| `Tabla`, `Th`, `Td`, `Tr`, `FilaCompleta` | Tabla con encabezados en mayúsculas y desplazamiento horizontal en tablet |
| `Paginacion` | “Mostrando 1–20 de 45” y botones de página (paginación del servidor) |
| `Chip` | Chip beige monoespaciado para presentaciones |
| `Insignia` | Pastilla de estado: `exito`, `alerta`, `peligro`, `info`, `neutro`, `marca` |
| `Modal` | Ventana modal accesible (Escape, foco, fondo) |
| `Cargando`, `EstadoVacio`, `MensajeError` | Estados de carga, lista vacía y error del backend (mensaje, detalle y código) |
| `EncabezadoPagina`, `Pestanas` | Título con acciones y pestañas de sección |
| `FotoProducto` | Miniatura de la foto o icono si no tiene |
| Avisos (`useAvisos`) | Notificaciones breves de éxito o error |
