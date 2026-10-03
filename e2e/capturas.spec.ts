import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { iniciarSesion } from './ayudantes.ts'

/**
 * Capturas de pantalla de cada modulo para docs/capturas (npm run e2e:capturas).
 * Antes de capturar, sube ilustraciones a los productos de demostracion que no tienen foto, para que la
 * tabla de productos se vea como la imagen de referencia. Se ejecuta despues de las pruebas del flujo,
 * asi las pantallas muestran ventas, traslados y compras reales.
 */
test.describe.configure({ mode: 'serial' })

const API = (process.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const CARPETA = 'docs/capturas'

/** Ilustracion por prefijo del codigo del producto (datos de demostracion del backend). */
const ILUSTRACIONES: Record<string, string> = {
  ALA: 'cable',
  BIS: 'bisagra',
  CAB: 'cable',
  CAD: 'cadena',
  CAN: 'candado',
  CIN: 'cinta',
  CLA: 'clavo',
  FOC: 'foco',
  MAN: 'manguera',
  MAR: 'herramienta',
  PER: 'perno',
  E2E: 'perno',
  PIN: 'pintura',
  TOR: 'tornillo',
  TUB: 'tubo',
  TUE: 'tuerca',
  ARA: 'arandela',
}

async function capturar(page: Page, nombre: string) {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Cargando…')).toHaveCount(0)
  await page.screenshot({ path: `${CARPETA}/${nombre}.png` })
}

async function token(page: Page): Promise<string> {
  return page.evaluate(() => (JSON.parse(sessionStorage.getItem('todopernos.sesion') ?? '{}') as { token: string }).token)
}

test('pantallas del administrador', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('admin')
  await capturar(page, '01-login')

  await iniciarSesion(page, 'admin')
  // Fotos de demostracion para los productos sin foto
  const autorizacion = { Authorization: `Bearer ${await token(page)}` }
  const respuesta = await page.request.get(`${API}/api/productos?size=100`, { headers: autorizacion })
  const productos = ((await respuesta.json()) as { contenido: { id: number; codigo: string; imagenUrl: string | null }[] }).contenido
  for (const p of productos.filter((x) => !x.imagenUrl)) {
    const ilustracion = ILUSTRACIONES[p.codigo.slice(0, 3)]
    if (!ilustracion) continue
    await page.request.post(`${API}/api/productos/${p.id}/imagen`, {
      headers: autorizacion,
      multipart: { archivo: { name: `${ilustracion}.png`, mimeType: 'image/png', buffer: readFileSync(`e2e/fixtures/${ilustracion}.png`) } },
    })
  }

  await page.getByTestId('selector-ubicacion').selectOption({ label: 'Tienda Centro' })
  await page.goto('/')
  await capturar(page, '02-inicio-admin')

  await page.goto('/productos')
  await expect(page.getByRole('img').first()).toBeVisible()
  await capturar(page, '03-productos')

  await page.getByRole('button', { name: /^Editar Clavo de acero/ }).click()
  await expect(page.getByRole('heading', { name: 'Editar producto' })).toBeVisible()
  await capturar(page, '04-producto-editar')

  await page.getByTestId('selector-ubicacion').selectOption({ label: 'Todas las ubicaciones' })
  await page.goto('/inventario')
  await capturar(page, '05-inventario')
  await page.getByRole('button', { name: 'Ajuste de inventario' }).click()
  await capturar(page, '06-inventario-ajuste')
  await page.keyboard.press('Escape')

  await page.goto('/movimientos')
  await capturar(page, '07-kardex')
  await page.goto('/movimientos?tab=traslados')
  await capturar(page, '08-traslados')
  await page.locator('[data-testid^="traslado-TR-"]').first().click()
  await capturar(page, '09-traslado-detalle')
  await page.keyboard.press('Escape')
  await page.goto('/movimientos/traslados/nuevo')
  await capturar(page, '10-traslado-nuevo')

  await page.goto('/ventas/historial')
  await capturar(page, '11-ventas-historial')
  await page.locator('[data-testid^="venta-NV"]').first().click()
  await expect(page.getByText('Pagos y abonos')).toBeVisible()
  await capturar(page, '12-venta-detalle')

  await page.goto('/clientes')
  await capturar(page, '13-clientes')
  await page.goto('/clientes?tab=deudores')
  await capturar(page, '14-deudores')

  await page.goto('/compras')
  await capturar(page, '15-compras')
  await page.goto('/compras/nueva')
  await capturar(page, '16-compra-nueva')
  await page.goto('/proveedores')
  await capturar(page, '17-proveedores')

  await page.goto('/reportes')
  await capturar(page, '18-reportes-ventas')
  await page.goto('/reportes?r=productos')
  await capturar(page, '19-reportes-mas-vendidos')

  await page.goto('/usuarios')
  await capturar(page, '20-usuarios')
  await page.goto('/configuracion?tab=ubicaciones')
  await capturar(page, '21-configuracion')
})

test('pantallas del vendedor: caja y punto de venta', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await capturar(page, '22-inicio-vendedor')

  await page.goto('/caja')
  const abrir = page.getByRole('button', { name: 'Abrir caja' })
  await expect(abrir.or(page.getByText('Resumen en vivo'))).toBeVisible()
  if (await abrir.isVisible()) {
    await capturar(page, '23-caja-apertura')
    await page.getByLabel(/^Monto de apertura/).fill('80')
    await abrir.click()
  }
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill('Clavo')
  await page.getByRole('button', { name: 'Agregar Clavo de acero 2" Ciento' }).click()
  await page.getByRole('button', { name: 'Agregar Clavo para madera 3" (a granel) Medio kilo' }).click()
  await page.getByLabel('Buscar producto para vender').fill('Cable')
  await page.getByRole('button', { name: 'Agregar Cable THW 14 AWG Metro' }).click()
  await page.getByLabel('Cantidad de Cable THW 14 AWG Metro').fill('12.5')
  await page.getByLabel('Monto del pago 1').fill('20')
  await page.getByRole('button', { name: 'Agregar otro método (pago mixto)' }).click()
  await page.getByLabel('Monto del pago 2').fill('10')
  await page.getByLabel('Número de operación del pago 2').fill('48291037')
  await page.getByLabel('Buscar producto para vender').fill('')
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo(0, 0)
  })
  await capturar(page, '24-punto-de-venta')
  await page.getByRole('button', { name: /^Cobrar/ }).click()
  await expect(page.getByTestId('venta-registrada')).toBeVisible()
  await capturar(page, '25-venta-registrada')
  await page.getByRole('button', { name: 'Nueva venta' }).click()

  await page.goto('/caja')
  await expect(page.getByText('Resumen en vivo')).toBeVisible()
  await capturar(page, '26-caja-resumen')
  const esperado = ((await page.getByTestId('efectivo-esperado').textContent()) ?? '').replace(/[^\d.]/g, '')
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  await page.getByLabel(/^Efectivo contado/).fill(esperado)
  await capturar(page, '27-caja-cierre')
  await page.getByRole('button', { name: 'Confirmar cierre' }).click()
  await page.getByRole('button', { name: 'Entendido' }).click()
})

test('pantallas del almacenero y vista en tablet', async ({ page }) => {
  await iniciarSesion(page, 'almacen1')
  await capturar(page, '28-inicio-almacenero')

  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/productos')
  await capturar(page, '29-tablet-productos')
  await page.getByRole('button', { name: 'Mostrar u ocultar el menú' }).click()
  await capturar(page, '30-tablet-menu')
})
