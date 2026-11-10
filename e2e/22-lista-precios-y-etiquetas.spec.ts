import { expect, test } from '@playwright/test'
import { cerrarSesion, iniciarSesion, postApi, sufijoUnico, tokenApi } from './ayudantes.ts'

/** Lista de precios en PDF para el cliente y etiquetas con codigo de barras para los estantes. */
interface Creado {
  id: number
}

test('El vendedor descarga la lista de precios y el almacenero imprime etiquetas', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const nombre = `Cinta aislante ${sufijo}`
  await postApi<Creado>(request, admin, '/productos', {
    codigo: `ETI-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 3.5, codigoBarras: `775${sufijo}` }],
  })

  // 1. El vendedor descarga la lista de precios (para mandarla por WhatsApp)
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/productos')
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar lista de precios' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^lista-precios-\d{4}-\d{2}-\d{2}\.pdf$/)
  // El vendedor no elige productos: no imprime etiquetas
  await expect(page.getByRole('checkbox', { name: `Seleccionar ${nombre}` })).toHaveCount(0)
  await cerrarSesion(page)

  // 2. El almacenero elige el producto e imprime 3 etiquetas
  await iniciarSesion(page, 'almacen1')
  await page.goto('/productos')
  await page.getByLabel('Buscar producto').fill(sufijo.toLowerCase())
  await page.getByRole('checkbox', { name: `Seleccionar ${nombre}` }).check()
  const barra = page.getByTestId('barra-lote')
  await expect(barra.getByRole('button', { name: 'Activar' })).toHaveCount(0)
  await barra.getByRole('button', { name: 'Imprimir etiquetas' }).click()
  const modal = page.getByRole('dialog', { name: 'Imprimir etiquetas' })
  await modal.getByLabel('Copias de cada etiqueta').fill('51')
  await modal.getByRole('button', { name: 'Imprimir etiquetas' }).click()
  await expect(modal).toContainText('De 1 a 50 copias')
  await modal.getByLabel('Copias de cada etiqueta').fill('3')
  await expect(modal.getByTestId('resumen-etiquetas')).toHaveText('3 etiqueta(s) · 1 hoja(s) A4')
  const pestana = page.waitForEvent('popup')
  await modal.getByRole('button', { name: 'Imprimir etiquetas' }).click()
  const pdf = await pestana
  await pdf.waitForURL(/^blob:/)
  expect(pdf.url()).toMatch(/^blob:/)
})
