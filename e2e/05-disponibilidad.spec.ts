import { expect, test } from '@playwright/test'
import { iniciarSesion, tokenApi, URL_API } from './ayudantes.ts'

/**
 * Punto 1 del encargado: el vendedor ve el stock de las otras tiendas y del almacen (solo lectura), en la pantalla
 * Disponibilidad y en el punto de venta. Usa los datos de demostracion (perno PER-3802 y candado CAN-0040).
 */
test('VENDEDOR busca "per hex zin" en Disponibilidad y ve las tres ubicaciones con su total', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Disponibilidad' }).click()
  await page.getByRole('searchbox', { name: 'Buscar en disponibilidad' }).fill('per hex zin')
  const fila = page.getByTestId('disponibilidad-PER-3802')
  await expect(fila).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Tienda Norte' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Almacen Central' })).toBeVisible()
  const total = await fila.getByRole('cell').nth(4).innerText()
  const ubicaciones = await Promise.all([1, 2, 3].map((i) => fila.getByRole('cell').nth(i).innerText()))
  expect(Number(total)).toBe(ubicaciones.reduce((suma, v) => suma + Number(v), 0))
})

test('Disponibilidad resalta en rojo lo que llego al stock minimo', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/disponibilidad')
  await page.getByRole('searchbox', { name: 'Buscar en disponibilidad' }).fill('candado')
  const centro = page.getByTestId('disponibilidad-CAN-0040').getByRole('cell').nth(1)
  await expect(centro).toHaveAttribute('data-estado', 'bajo')
})

test('El punto de venta muestra el stock de las otras ubicaciones sin permitir venderlo', async ({ page, request }) => {
  // El vendedor necesita su caja abierta para ver el punto de venta (si ya estaba abierta, el 422 se ignora)
  const token = await tokenApi(request, 'vendedor1')
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: { Authorization: `Bearer ${token}` } })

  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill('per hex')
  const otras = page.getByTestId('pos-otras-PER-3802')
  await expect(otras).toContainText('Tienda Norte')
  await expect(otras).toContainText('Almacen Central')
  await expect(otras).not.toContainText('Tienda Centro')

  // Deja la caja cerrada para que el flujo completo (02) pueda volver a abrirla en la siguiente ejecucion
  const actual = await request.get(`${URL_API}/cajas/actual`, { headers: { Authorization: `Bearer ${token}` } })
  const caja = (await actual.json()) as { id: number; resumen: { efectivoEsperado: number } }
  await request.post(`${URL_API}/cajas/${caja.id}/cerrar`, {
    data: { efectivoContado: caja.resumen.efectivoEsperado },
    headers: { Authorization: `Bearer ${token}` },
  })
})
