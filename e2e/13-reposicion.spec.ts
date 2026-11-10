import { expect, test } from '@playwright/test'
import { cerrarSesion, iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** La tienda pide reposicion al almacen; el almacen la atiende con un traslado y ve el traslado sugerido. */
interface ProductoCreado {
  id: number
}
interface Resumen {
  contenido: { ubicaciones: { ubicacionNombre: string; cantidad: number }[] }[]
}

test('La tienda pide reposición, el almacén envía menos y ve el traslado sugerido', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const nombre = `Bisagra repuesta ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `REP-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 4 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 1, detalles: [{ productoId: producto.id, cantidad: 100 }] })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 3 }] })
  const minimo = await request.put(`${URL_API}/inventario/stock/minimo`, {
    data: { productoId: producto.id, ubicacionId: 2, stockMinimo: 5 },
    headers: { Authorization: `Bearer ${admin}` },
  })
  expect(minimo.ok()).toBeTruthy()

  // 1. La tienda pide 7
  await iniciarSesion(page, 'vendedor1')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Reposición' }).click()
  await page.getByRole('button', { name: 'Nuevo pedido' }).click()
  const modal = page.getByRole('dialog', { name: 'Pedir reposición al almacén' })
  await modal.getByRole('combobox', { name: 'Agregar producto' }).fill(sufijo.toLowerCase())
  await page.getByRole('listbox').getByText(nombre, { exact: true }).click()
  await modal.getByLabel(`Cantidad pedida de ${nombre}`).fill('7')
  await modal.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByText(/Pedido SR-\d{6} enviado al almacén/)).toBeVisible()
  const fila = page.getByRole('row').filter({ hasText: nombre })
  await expect(fila.getByText('Pendiente')).toBeVisible()
  await cerrarSesion(page)

  // 2. El almacen ve el traslado sugerido y atiende el pedido enviando 5
  await iniciarSesion(page, 'almacen1')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Reposición' }).click()
  await page.getByLabel('Tienda a reponer').selectOption({ label: 'Tienda Centro' })
  await expect(page.getByLabel(`Enviar de ${nombre}`)).toHaveValue('7') // 2 x 5 - 3
  const pedido = page.getByRole('row').filter({ hasText: nombre }).filter({ hasText: 'Pendiente' })
  await pedido.getByRole('button', { name: 'Atender' }).click()
  const atencion = page.getByRole('dialog', { name: /Atender pedido SR-/ })
  await atencion.getByLabel(`Cantidad a enviar de ${nombre}`).fill('5')
  await atencion.getByRole('button', { name: 'Enviar traslado' }).click()
  await expect(page.getByText(/atendido con el traslado TR-\d{6}/)).toBeVisible()
  await page.getByLabel('Filtrar por estado').selectOption('ATENDIDA')
  await expect(page.getByRole('row').filter({ hasText: nombre }).getByText(/Traslado TR-\d{6}/)).toBeVisible()

  // 3. Salieron 5 del almacen
  const resumen = (await (await request.get(`${URL_API}/inventario/resumen?productoIds=${producto.id}`, {
    headers: { Authorization: `Bearer ${admin}` },
  })).json()) as Resumen
  expect(resumen.contenido[0]?.ubicaciones.find((u) => u.ubicacionNombre.startsWith('Almac'))?.cantidad).toBe(95)
})
