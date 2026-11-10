import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Mejoras del almacen: pedido sugerido al proveedor, valor del inventario y ubicacion fisica. */
interface ProductoCreado {
  id: number
}

test('El almacenero ve qué comprar, el valor del inventario y guarda dónde está cada producto', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const nombre = `Escalera almacen ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `ALM-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 120 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 1, detalles: [{ productoId: producto.id, cantidad: 10 }] })
  const minimo = await request.put(`${URL_API}/inventario/stock/minimo`, {
    data: { productoId: producto.id, ubicacionId: 1, stockMinimo: 20 },
    headers: { Authorization: `Bearer ${admin}` },
  })
  expect(minimo.ok()).toBeTruthy()

  await iniciarSesion(page, 'almacen1')
  // 1. Pedido sugerido: comprar hasta el doble del minimo (2 x 20 - 10 = 30)
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Reportes' }).click()
  await page.getByRole('tab', { name: 'Pedido sugerido' }).click()
  await expect(page.getByTestId(`pedido-sugerido-ALM-${sufijo}`)).toContainText('30 u')
  const espera = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar en Excel' }).click()
  const descarga = await espera
  expect(descarga.suggestedFilename()).toMatch(/^pedido-sugerido-\d{4}-\d{2}-\d{2}\.xlsx$/)
  expect(readFileSync(await descarga.path()).subarray(0, 2).toString()).toBe('PK')

  // 2. Valor del inventario: el producto nunca salio
  await page.getByRole('tab', { name: 'Valor del inventario' }).click()
  await expect(page.getByTestId('valor-total')).toContainText('S/')
  await page.getByLabel('Productos a mostrar').selectOption('90')
  await expect(page.getByRole('row').filter({ hasText: nombre }).getByText('Nunca salió')).toBeVisible()

  // 3. Ubicacion fisica en el almacen
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Inventario' }).click()
  await page.getByLabel('Buscar en el inventario').fill(`ALM-${sufijo}`)
  await page.getByRole('button', { name: `Ubicar ${nombre}` }).click()
  await page.getByLabel('Pasillo, estante o lugar').fill('Pasillo 2 - Estante C')
  await page.getByRole('dialog', { name: 'Ubicación en el almacén' }).getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('row').filter({ hasText: nombre })).toContainText('Pasillo 2 - Estante C')
})
