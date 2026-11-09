import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Pedido del dueno: ver quien cambio un precio y cuando. */
interface ProductoCreado {
  id: number
  presentaciones: { id: number }[]
}

test('ADMIN ve en Auditoría quién cambió un precio; el vendedor no ve la pantalla', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `AUD-${sufijo}`,
    nombre: `Tarugo auditado ${sufijo}`,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 1.5 }],
  })
  const cambio = await request.put(`${URL_API}/productos/${producto.id}/presentaciones/${producto.presentaciones[0]?.id}`, {
    data: { nombre: 'Unidad', factor: 1, precioVenta: 1.8 },
    headers: { Authorization: `Bearer ${admin}` },
  })
  expect(cambio.ok()).toBeTruthy()

  await iniciarSesion(page, 'admin')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Auditoría' }).click()
  await page.getByLabel('Filtrar por tipo de cambio').selectOption('PRECIO')
  await page.getByLabel('Buscar en la auditoría').fill(`AUD-${sufijo}`)
  const fila = page.getByTestId('fila-auditoria').filter({ hasText: `AUD-${sufijo}` })
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText('S/ 1.50 → S/ 1.80')
  await expect(fila).toContainText('admin')

  // Crear el producto tambien quedo registrado
  await page.getByLabel('Filtrar por tipo de cambio').selectOption('PRODUCTO')
  await expect(page.getByTestId('fila-auditoria').filter({ hasText: `Creó AUD-${sufijo}` })).toHaveCount(1)
})

test('El vendedor no tiene la opción Auditoría en el menú', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await expect(page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Auditoría' })).toHaveCount(0)
})
