import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/**
 * Punto 3 del encargado: un producto sin stock se encarga desde el punto de venta con precio propio (+10 %); el
 * encargo no toca el stock y al entregarlo se crea la venta y recien ahi se descuenta.
 */
interface ProductoCreado {
  id: number
}
interface Resumen {
  contenido: { ubicaciones: { ubicacionNombre: string; cantidad: number }[] }[]
}

test('Encargo: se crea sin stock, se entrega con la mercaderia y descuenta el stock', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const nombre = `Taladro encargo ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `ENC-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 100 }],
  })
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })

  // 1. El vendedor no tiene stock y registra el encargo desde el punto de venta
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill(sufijo.toLowerCase())
  await page.getByRole('button', { name: `Hacer encargo de ${nombre}` }).click()
  const modal = page.getByRole('dialog', { name: 'Hacer encargo' })
  await expect(modal.getByLabel('Precio del encargo (S/) *')).toHaveValue('110.00')
  await modal.getByLabel('Cantidad *').fill('2')
  await expect(modal.getByTestId('total-encargo')).toHaveText('S/ 220.00')
  await modal.getByLabel('Observación').fill('Lo trae el proveedor')
  await modal.getByRole('button', { name: 'Registrar encargo' }).click()
  await expect(page.getByText(/Encargo EN-\d{6} registrado/)).toBeVisible()

  // 2. Llega la mercaderia a la tienda
  await postApi(request, admin, '/inventario/inicial', {
    ubicacionId: 2,
    detalles: [{ productoId: producto.id, cantidad: 5 }],
  })

  // 3. Se entrega desde la pantalla de encargos: se ve la venta que se va a crear
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Encargos' }).click()
  const fila = page.getByRole('row').filter({ hasText: nombre })
  await expect(fila.getByText('Pendiente')).toBeVisible()
  await expect(fila.getByText('+10.00 %')).toBeVisible()
  await fila.getByRole('button', { name: 'Entregar' }).click()
  const entrega = page.getByRole('dialog', { name: /Entregar encargo EN-/ })
  await expect(entrega.getByTestId('venta-del-encargo')).toContainText('S/ 220.00')
  await entrega.getByLabel('Monto del pago 1').fill('220')
  await entrega.getByRole('button', { name: 'Confirmar entrega' }).click()
  await expect(page.getByText(/entregado · venta NV\d{2}-\d{6}/)).toBeVisible()

  // 4. El stock bajo de 5 a 3 en la Tienda Centro
  const resumen = await request.get(`${URL_API}/inventario/resumen?productoIds=${producto.id}`, { headers: auth })
  const datos = (await resumen.json()) as Resumen
  expect(datos.contenido[0]?.ubicaciones.find((u) => u.ubicacionNombre === 'Tienda Centro')?.cantidad).toBe(3)

  // Deja la caja cerrada para repetir las pruebas
  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, {
    data: { efectivoContado: actual.resumen.efectivoEsperado },
    headers: auth,
  })
})
