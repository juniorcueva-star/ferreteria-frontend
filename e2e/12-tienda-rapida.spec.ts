import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Mejoras de la tienda: mas vendidos sin buscar, billetes rapidos y atajos de teclado (F2 buscar, F9 cobrar). */
interface ProductoCreado {
  id: number
}

test('El vendedor cobra con billete rápido y F9, y ve los más vendidos sin buscar', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const nombre = `Tarugo rapido ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `RAP-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 3.5 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 50 }] })
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })

  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  // F2 lleva al buscador
  await page.getByRole('heading', { name: 'Punto de venta' }).click()
  await page.keyboard.press('F2')
  await expect(page.getByLabel('Buscar producto para vender')).toBeFocused()
  await page.keyboard.type(sufijo.toLowerCase())
  await page.getByRole('button', { name: `Agregar ${nombre} Unidad` }).click()
  await page.getByLabel(`Cantidad de ${nombre} Unidad`).fill('2')

  // Total S/ 7.00: el cliente paga con S/ 10 y el vuelto es S/ 3.00
  const pagaCon = page.getByRole('group', { name: 'Paga con' })
  await expect(pagaCon.getByRole('button')).toHaveText(['Exacto', 'S/ 10', 'S/ 20', 'S/ 50', 'S/ 100'])
  await pagaCon.getByRole('button', { name: 'S/ 10', exact: true }).click()
  await expect(page.getByLabel('Monto del pago 1')).toHaveValue('10.00')
  await page.keyboard.press('F9')
  const registrada = page.getByTestId('venta-registrada')
  await expect(registrada).toContainText('S/ 3.00')
  await page.getByRole('button', { name: 'Nueva venta' }).click()

  // Sin buscar, se ven los mas vendidos de la tienda (el producto recien vendido esta entre ellos)
  await page.getByLabel('Buscar producto para vender').fill('')
  await expect(page.getByTestId('pos-frecuentes')).toBeVisible()

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
