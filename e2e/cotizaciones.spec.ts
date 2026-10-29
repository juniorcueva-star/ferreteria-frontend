import { expect, test, type Page } from '@playwright/test'

/*
 * Prerrequisito de datos para una futura ejecucion de integracion:
 * - El backend integration debe estar en http://localhost:8082 y el frontend de
 *   5174 debe haber sido iniciado con VITE_API_URL=http://localhost:8082.
 * - Un seed externo debe proporcionar el usuario, cliente y producto activos
 *   indicados por las variables COTIZACIONES_E2E_*. No se crean ni reinician
 *   datos aqui porque este flujo debe ejecutarse contra una base aislada.
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable requerida ${nombre} para el seed de cotizaciones`)
  return valor
}

test.describe.configure({ mode: 'serial' })

async function iniciarAdmin(page: Page) {
  const usuario = requerida('COTIZACIONES_E2E_USERNAME')
  const clave = requerida('COTIZACIONES_E2E_PASSWORD')
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(usuario)
  await page.getByLabel('Contraseña', { exact: true }).fill(clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('navigation', { name: 'Menú principal' })).toBeVisible()
  const ubicacion = page.getByRole('combobox', { name: 'Ubicación de trabajo' })
  await ubicacion.selectOption({ label: 'Tienda 1' })
  await expect(ubicacion).toHaveValue(/\d+/)
}

async function crearBorrador(page: Page, cantidad = '0.5') {
  const cliente = requerida('COTIZACIONES_E2E_CLIENTE')
  const producto = requerida('COTIZACIONES_E2E_PRODUCTO')

  await page.getByRole('link', { name: 'Cotizaciones' }).click()
  await expect(page.getByRole('heading', { name: 'Cotizaciones' })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva cotización' }).click()
  await expect(page.getByRole('heading', { name: 'Nueva cotización' })).toBeVisible()

  await page.getByRole('combobox', { name: 'Buscar cliente' }).fill(cliente)
  await page.getByRole('listbox').getByRole('button', { name: cliente, exact: false }).click()

  await page.getByRole('combobox', { name: 'Producto' }).fill(producto)
  await page.getByRole('listbox').getByRole('button', { name: producto, exact: false }).click()
  const presentacion = page.getByLabel('Presentación')
  const valorMillar = await presentacion.locator('option').filter({ hasText: /^Millar\b/i }).getAttribute('value')
  if (!valorMillar) throw new Error('No se encontró el valor de la presentación Millar')
  await presentacion.selectOption(valorMillar)
  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('Cantidad').fill(cantidad)
  await expect(page.getByText('Producto PER-COT')).toBeVisible()
  await page.getByText(/Original/).waitFor()

  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/\d+$/)
  await expect(page.getByText('Estado:').locator('..')).toContainText('BORRADOR')
}

test('crea y emite una cotizacion usando los datos preparados', async ({ page }) => {
  await iniciarAdmin(page)
  await crearBorrador(page)
  await expect(page.getByText(/Total.*350\.00/)).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Emitir' }).click()
  await expect(page.getByText('Estado:').locator('..')).toContainText('EMITIDA')
})

test('edita un borrador y conserva su estado', async ({ page }) => {
  await iniciarAdmin(page)
  await crearBorrador(page)
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByRole('heading', { name: /Editar/ })).toBeVisible()
  await page.getByLabel('Cantidad').fill('0.75')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Estado:').locator('..')).toContainText('BORRADOR')
  await expect(page.getByText(/Total.*525\.00/)).toBeVisible()
})

test('anula un borrador desde el detalle', async ({ page }) => {
  await iniciarAdmin(page)
  await crearBorrador(page)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Anular' }).click()
  await expect(page.getByText('Estado:').locator('..')).toContainText('ANULADA')
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Emitir' })).toHaveCount(0)
})
