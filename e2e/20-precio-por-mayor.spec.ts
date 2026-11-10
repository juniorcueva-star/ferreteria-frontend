import { expect, test } from '@playwright/test'
import { cerrarSesion, iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Precio por mayor: el ADMIN pone la escala y en la caja el precio baja solo al llegar a la cantidad. */
interface Creado {
  id: number
}

test('El precio baja solo al vender por mayor y la venta lo muestra', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const nombre = `Arandela plana ${sufijo}`
  const producto = await postApi<Creado>(request, admin, '/productos', {
    codigo: `MAY-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 0.5 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 500 }] })

  // 1. El ADMIN define: desde 100 a S/ 0.40
  await iniciarSesion(page, 'admin')
  await page.goto(`/productos/${producto.id}`)
  await page.getByTestId('por-mayor-0').click()
  const modal = page.getByRole('dialog', { name: /Precio por mayor/ })
  await modal.getByRole('button', { name: 'Agregar escala' }).click()
  await modal.getByLabel('Desde (cantidad)').fill('100')
  await modal.getByLabel('Precio c/u (S/)').fill('0.55')
  await modal.getByRole('button', { name: 'Guardar precio por mayor' }).click()
  await expect(modal).toContainText('Debe ser menor que el de lista')
  await modal.getByLabel('Precio c/u (S/)').fill('0.40')
  await expect(modal).toContainText('100 × S/ 0.40 = S/ 40.00')
  await modal.getByRole('button', { name: 'Guardar precio por mayor' }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByTestId('por-mayor-0')).toContainText('Precio por mayor (1)')
  await cerrarSesion(page)

  // 2. En la caja: 99 a precio de lista, 120 a precio por mayor
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill(sufijo.toLowerCase())
  await page.getByRole('button', { name: `Agregar ${nombre} Unidad` }).click()
  const linea = page.getByTestId('carrito-linea-1')
  const cantidad = page.getByLabel(`Cantidad de ${nombre} Unidad`)
  await cantidad.fill('99')
  await expect(linea).toContainText('Desde 100: S/ 0.40 c/u')
  await expect(linea.getByTestId('precio-mayor')).toHaveCount(0)
  await cantidad.fill('120')
  await expect(linea.getByTestId('precio-mayor')).toBeVisible()
  await expect(linea).toContainText('S/ 48.00')

  await page.getByRole('group', { name: 'Paga con' }).getByRole('button', { name: 'Exacto' }).click()
  await page.keyboard.press('F9')
  await expect(page.getByTestId('venta-registrada')).toBeVisible()

  // 3. La venta guarda el precio por mayor
  const ventas = (await (await request.get(`${URL_API}/ventas?size=1&sort=id,desc`, { headers: auth })).json()) as { contenido: { id: number }[] }
  await page.goto(`/ventas/${ventas.contenido[0]?.id}`)
  await expect(page.getByTestId('tipo-precio')).toHaveText('Precio por mayor')

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
