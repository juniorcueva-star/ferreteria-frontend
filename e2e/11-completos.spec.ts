import { expect, test } from '@playwright/test'
import { cerrarSesion, iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/**
 * Pedido del dueno: vender "completos". El ADMIN arma el perno completo (perno + tuerca + arandela) con precio
 * propio y el vendedor lo vende con un clic: se descuenta el stock de cada pieza.
 */
interface ProductoCreado {
  id: number
}
interface Resumen {
  contenido: { productoId: number; ubicaciones: { ubicacionNombre: string; cantidad: number }[] }[]
}

test('ADMIN arma el perno completo y el vendedor lo vende descontando cada pieza', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const crear = (codigo: string, nombre: string, precio: number) =>
    postApi<ProductoCreado>(request, admin, '/productos', {
      codigo: `${codigo}-${sufijo}`,
      nombre: `${nombre} ${sufijo}`,
      categoriaId: 5,
      unidadBase: 'UNIDAD',
      presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: precio }],
    })
  const perno = await crear('PCO', 'Perno completo', 0.5)
  const tuerca = await crear('TCO', 'Tuerca completo', 0.2)
  const arandela = await crear('ACO', 'Arandela completo', 0.1)
  for (const p of [perno, tuerca, arandela]) {
    await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: p.id, cantidad: 100 }] })
  }

  // 1. El ADMIN arma el completo en la ficha del producto
  await iniciarSesion(page, 'admin')
  await page.goto(`/productos/${perno.id}`)
  await page.getByRole('button', { name: 'Agregar completo' }).click()
  const modal = page.getByRole('dialog', { name: /Nuevo completo de Perno completo/ })
  for (const pieza of [`Tuerca completo ${sufijo}`, `Arandela completo ${sufijo}`]) {
    await modal.getByRole('combobox', { name: 'Agregar pieza' }).fill(pieza)
    await page.getByRole('listbox').getByText(pieza, { exact: true }).click()
  }
  await expect(modal.getByTestId('pieza-completo')).toHaveCount(3)
  await expect(modal.getByTestId('suma-piezas')).toHaveText('S/ 0.80')
  await modal.getByLabel('Precio del completo (S/)').fill('0.70')
  await modal.getByRole('button', { name: 'Guardar completo' }).click()
  const fila = page.getByTestId('completo-Completo')
  await expect(fila).toContainText('S/ 0.70')
  await expect(fila).toContainText(`Tuerca completo ${sufijo}`)

  // 2. El vendedor vende 10 completos con un clic
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })
  await cerrarSesion(page)
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill(`perno completo ${sufijo.toLowerCase()}`)
  const boton = page.getByRole('button', { name: `Agregar Perno completo ${sufijo} Completo` })
  await expect(boton).toContainText('Alcanza: 100')
  await boton.click()
  await page.getByLabel(`Cantidad de Perno completo ${sufijo} Completo`).fill('10')
  await expect(page.getByTestId('carrito-linea-1')).toContainText('Incluye:')
  await page.getByLabel('Monto del pago 1').fill('7')
  await page.getByRole('button', { name: /Cobrar S\/ 7\.00/ }).click()
  await expect(page.getByTestId('venta-registrada')).toBeVisible()

  // 3. Bajo el stock de las tres piezas: 100 - 10
  const ids = [perno.id, tuerca.id, arandela.id].join(',')
  const resumen = (await (await request.get(`${URL_API}/inventario/resumen?productoIds=${ids}`, { headers: auth })).json()) as Resumen
  for (const p of resumen.contenido) {
    expect(p.ubicaciones.find((u) => u.ubicacionNombre === 'Tienda Centro')?.cantidad).toBe(90)
  }

  // Deja la caja cerrada para repetir las pruebas
  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
