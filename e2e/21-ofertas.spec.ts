import { expect, test } from '@playwright/test'
import { cerrarSesion, iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Ofertas: el ADMIN pone un precio rebajado entre dos fechas y la caja lo cobra con la etiqueta OFERTA. */
interface Creado {
  id: number
}

/** Dia en Lima (yyyy-MM-dd), igual que el sistema */
const diaLima = (fecha: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(fecha)

test('El ADMIN pone una oferta y el vendedor la ve y la cobra en la caja', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const nombre = `Silicona transparente ${sufijo}`
  const producto = await postApi<Creado>(request, admin, '/productos', {
    codigo: `OFE-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 12 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 20 }] })

  // 1. El ADMIN pone la oferta de hoy hasta dentro de una semana
  const hoy = diaLima(new Date())
  const enUnaSemana = diaLima(new Date(Date.now() + 7 * 86_400_000))
  await iniciarSesion(page, 'admin')
  await page.goto(`/productos/${producto.id}`)
  await page.getByTestId('boton-oferta-0').click()
  const modal = page.getByRole('dialog', { name: /Oferta/ })
  await modal.getByLabel('Precio de oferta (S/)').fill('9.90')
  await expect(modal).toContainText('El cliente ahorra S/ 2.10 (18 %)')
  await modal.getByLabel('Hasta (inclusive)').fill(enUnaSemana)
  await modal.getByRole('button', { name: 'Guardar oferta' }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByTestId('oferta-0')).toContainText(`OFERTA VIGENTE S/ 9.90 del ${hoy} al ${enUnaSemana}`)
  await cerrarSesion(page)

  // 2. En la caja: filtro "Ofertas", etiqueta en el cuadrito y precio de oferta en el carrito
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByRole('group', { name: 'Vista de productos' }).getByRole('button', { name: 'Fotos' }).click()
  await page.getByRole('button', { name: 'Ofertas', exact: true }).click()
  await page.getByLabel('Buscar producto para vender').fill(sufijo.toLowerCase())
  const cuadrito = page.getByRole('button', { name: `Elegir ${nombre}` })
  await expect(cuadrito.getByTestId('mosaico-oferta')).toBeVisible()
  await cuadrito.click()
  const linea = page.getByTestId('carrito-linea-1')
  await expect(linea.getByTestId('precio-oferta')).toBeVisible()
  await expect(linea).toContainText('S/ 9.90')

  await page.getByRole('group', { name: 'Paga con' }).getByRole('button', { name: 'Exacto' }).click()
  await page.keyboard.press('F9')
  await expect(page.getByTestId('venta-registrada')).toBeVisible()
  const ventas = (await (await request.get(`${URL_API}/ventas?size=1&sort=id,desc`, { headers: auth })).json()) as { contenido: { id: number }[] }
  await page.goto(`/ventas/${ventas.contenido[0]?.id}`)
  await expect(page.getByTestId('tipo-precio')).toHaveText('Oferta')

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
