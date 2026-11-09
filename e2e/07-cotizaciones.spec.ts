import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/**
 * Punto 2 del encargado: el vendedor arma una cotizacion con precio propio, descarga el PDF y luego la convierte en
 * nota de venta con el mismo total; recien ahi se descuenta el stock.
 */
interface ProductoCreado {
  id: number
}
interface Resumen {
  contenido: { ubicaciones: { ubicacionNombre: string; cantidad: number }[] }[]
}

test('Cotizacion: se crea, se descarga en PDF y se convierte en nota de venta', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const nombre = `Llave cotizada ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `CTZ-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 25 }],
  })
  await postApi(request, admin, '/inventario/inicial', {
    ubicacionId: 2,
    detalles: [{ productoId: producto.id, cantidad: 10 }],
  })
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })

  // 1. Crear: buscar por palabras, validar decimales y cambiar el precio de lista
  await iniciarSesion(page, 'vendedor1')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Cotizaciones' }).click()
  await page.getByRole('button', { name: 'Nueva cotización' }).click()
  await page.getByRole('combobox', { name: 'Agregar producto' }).fill(`llave ${sufijo.toLowerCase()}`)
  await page.getByRole('listbox').getByText(nombre, { exact: true }).click()
  const precio = page.getByLabel(`Precio de ${nombre}`)
  await expect(precio).toHaveValue('25.00')
  const cantidad = page.getByLabel(`Cantidad de ${nombre}`)
  await cantidad.fill('1.5')
  await expect(page.getByText('Unidad no acepta fracciones')).toBeVisible()
  await cantidad.fill('3')
  await precio.fill('20')
  await expect(page.getByText('Lista: S/ 25.00')).toBeVisible()
  await expect(page.getByTestId('totales-cotizacion')).toContainText('Total: S/ 60.00')
  await page.getByRole('button', { name: 'Guardar cotización' }).click()
  await expect(page.getByRole('heading', { name: /^Cotización COT-\d{6}$/ })).toBeVisible()
  await expect(page.getByTestId('total-cotizacion')).toHaveText('S/ 60.00')

  // 2. Descargar el PDF: es un PDF valido con el codigo como nombre
  const esperaDescarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF' }).click()
  const descarga = await esperaDescarga
  expect(descarga.suggestedFilename()).toMatch(/^COT-\d{6}\.pdf$/)
  const ruta = await descarga.path()
  expect(readFileSync(ruta).subarray(0, 5).toString()).toBe('%PDF-')

  // 3. Convertir en nota de venta con el mismo total, cobrando en la caja abierta
  await page.getByRole('button', { name: 'Convertir en nota de venta' }).click()
  const conversion = page.getByRole('dialog', { name: /Convertir COT-\d{6} en nota de venta/ })
  await conversion.getByLabel('Monto del pago 1').fill('60')
  await conversion.getByRole('button', { name: 'Confirmar venta' }).click()
  await expect(page.getByTestId('venta-de-cotizacion')).toContainText(/NV\d{2}-\d{6}/)
  await expect(page.getByRole('button', { name: 'Convertir en nota de venta' })).toHaveCount(0)

  // 4. La nota de venta tambien se descarga en PDF (con el logo y los datos de la empresa)
  await page.getByTestId('venta-de-cotizacion').getByRole('link').click()
  await expect(page.getByRole('heading', { name: /^Venta NV\d{2}-\d{6}$/ })).toBeVisible()
  const esperaNota = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar PDF' }).click()
  const nota = await esperaNota
  expect(nota.suggestedFilename()).toMatch(/^NV\d{2}-\d{6}\.pdf$/)
  expect(readFileSync(await nota.path()).subarray(0, 5).toString()).toBe('%PDF-')

  // 5. El stock bajo de 10 a 7 en la Tienda Centro
  const resumen = await request.get(`${URL_API}/inventario/resumen?productoIds=${producto.id}`, { headers: auth })
  const datos = (await resumen.json()) as Resumen
  expect(datos.contenido[0]?.ubicaciones.find((u) => u.ubicacionNombre === 'Tienda Centro')?.cantidad).toBe(7)

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
