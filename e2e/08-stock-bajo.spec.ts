import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Mejora pedida por el dueno: al vender, el sistema avisa cuando el stock de la tienda llega a su minimo. */
interface ProductoCreado {
  id: number
}

test('El punto de venta avisa cuando la venta deja el stock en el minimo o lo agota', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const nombre = `Brocha aviso ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `AVS-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 8 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 5 }] })
  const minimo = await request.put(`${URL_API}/inventario/stock/minimo`, {
    data: { productoId: producto.id, ubicacionId: 2, stockMinimo: 2 },
    headers: { Authorization: `Bearer ${admin}` },
  })
  expect(minimo.ok()).toBeTruthy()
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })

  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill(sufijo.toLowerCase())
  await page.getByRole('button', { name: `Agregar ${nombre} Unidad` }).click()
  const cantidad = page.getByLabel(`Cantidad de ${nombre} Unidad`)
  // 1 de 5: quedan 4, mas que el minimo (2): sin aviso
  await expect(page.getByText(/pida reposición/)).toHaveCount(0)
  await cantidad.fill('3')
  await expect(page.getByText('Quedarán 2 u: pida reposición')).toBeVisible()
  await cantidad.fill('5')
  await expect(page.getByText('Se agota con esta venta: pida reposición')).toBeVisible()
  await page.screenshot({ path: 'test-results/aviso-stock-bajo.png' })

  // Deja la caja cerrada para repetir las pruebas
  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
