import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Tienda: ventas en espera (pausar un carrito y atender a otro) y conteo de billetes y monedas al cerrar la caja. */
interface Creado {
  id: number
}

test('El vendedor pausa una venta, atiende a otro cliente, la retoma y cuenta billetes al cerrar', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const crear = async (nombre: string, precio: number) => {
    const p = await postApi<Creado>(request, admin, '/productos', {
      codigo: `ESP-${nombre.slice(0, 3).toUpperCase()}-${sufijo}`,
      nombre: `${nombre} ${sufijo}`,
      categoriaId: 5,
      unidadBase: 'UNIDAD',
      presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: precio }],
    })
    await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: p.id, cantidad: 20 }] })
  }
  await crear('Espatula', 6)
  await crear('Brocha', 4)
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })

  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  const buscar = page.getByLabel('Buscar producto para vender')

  // 1. Cliente A: espatula -> en espera
  await buscar.fill(`espatula ${sufijo.toLowerCase()}`)
  await page.getByRole('button', { name: `Agregar Espatula ${sufijo} Unidad` }).click()
  await page.getByRole('button', { name: 'Poner en espera' }).click()
  await expect(page.getByTestId('ventas-en-espera')).toContainText('1 producto')
  await expect(page.getByText('Carrito vacío')).toBeVisible()

  // 2. Cliente B: brocha; al retomar A, B pasa a espera
  await buscar.fill(`brocha ${sufijo.toLowerCase()}`)
  await page.getByRole('button', { name: `Agregar Brocha ${sufijo} Unidad` }).click()
  await page.getByTestId('ventas-en-espera').getByRole('button', { name: /^Retomar/ }).click()
  await expect(page.getByTestId('carrito-linea-1')).toContainText(`Espatula ${sufijo}`)
  await expect(page.getByTestId('ventas-en-espera')).toContainText('S/ 4.00')

  // 3. Se cobra A y se descarta B
  await page.getByRole('group', { name: 'Paga con' }).getByRole('button', { name: 'Exacto' }).click()
  await page.keyboard.press('F9')
  await expect(page.getByTestId('venta-registrada')).toBeVisible()
  await page.getByRole('button', { name: 'Nueva venta' }).click()
  await page.getByTestId('ventas-en-espera').getByRole('button', { name: /^Descartar/ }).click()
  await expect(page.getByTestId('ventas-en-espera')).toHaveCount(0)

  // 4. Al cerrar la caja, el conteo de billetes y monedas llena el efectivo contado
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Caja' }).click()
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  const cierre = page.getByRole('dialog', { name: 'Cerrar caja' })
  await cierre.getByRole('button', { name: 'Contar billetes y monedas' }).click()
  await cierre.getByLabel('Cantidad de billetes de S/ 100').fill('2')
  await cierre.getByLabel('Cantidad de monedas de S/ 0.50').fill('3')
  await expect(cierre.getByLabel(/Efectivo contado/)).toHaveValue('201.50')
  await cierre.getByRole('button', { name: 'Cancelar' }).click()

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
