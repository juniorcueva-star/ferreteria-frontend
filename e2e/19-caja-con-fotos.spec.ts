import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Caja con fotos: los productos en cuadritos, se agregan con un toque y se filtran por categoria. */
interface Creado {
  id: number
}

test('El vendedor agrega productos tocando los cuadritos con foto', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const crear = async (nombre: string, presentaciones: { nombre: string; factor: number; precioVenta: number }[]) => {
    const p = await postApi<Creado>(request, admin, '/productos', {
      codigo: `FOT-${nombre.slice(0, 3).toUpperCase()}-${sufijo}`,
      nombre: `${nombre} ${sufijo}`,
      categoriaId: 5,
      unidadBase: 'UNIDAD',
      presentaciones,
    })
    await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: p.id, cantidad: 50 }] })
  }
  await crear('Taco fisher', [{ nombre: 'Unidad', factor: 1, precioVenta: 0.2 }])
  await crear('Tirafon', [
    { nombre: 'Unidad', factor: 1, precioVenta: 0.5 },
    { nombre: 'Caja x10', factor: 10, precioVenta: 4.5 },
  ])
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })

  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  const vista = page.getByRole('group', { name: 'Vista de productos' })
  await vista.getByRole('button', { name: 'Fotos' }).click()
  await expect(page.getByTestId('pos-mosaico')).toBeVisible()

  // 1. Con una sola presentacion se agrega con un toque
  await page.getByLabel('Buscar producto para vender').fill(sufijo.toLowerCase())
  await page.getByRole('button', { name: `Elegir Taco fisher ${sufijo}` }).click()
  await expect(page.getByTestId('carrito-linea-1')).toContainText(`Taco fisher ${sufijo}`)

  // 2. Con varias presentaciones se elige en una ventanita
  await expect(page.getByRole('button', { name: `Elegir Tirafon ${sufijo}` })).toContainText(/desde\s*S\/\s0\.50/)
  await page.getByRole('button', { name: `Elegir Tirafon ${sufijo}` }).click()
  await page.getByRole('dialog', { name: `Tirafon ${sufijo}` }).getByRole('button', { name: `Agregar Tirafon ${sufijo} Caja x10` }).click()
  await expect(page.getByTestId('carrito-linea-2')).toContainText('Caja x10')

  // 3. La vista se recuerda y las categorias filtran
  await page.reload()
  await expect(vista.getByRole('button', { name: 'Fotos' })).toHaveAttribute('aria-pressed', 'true')
  const categorias = page.getByRole('group', { name: 'Categorías' })
  // Botones: Ofertas, Todas y luego las categorias
  const segunda = categorias.getByRole('button').nth(2)
  await segunda.click()
  await expect(segunda).toHaveAttribute('aria-pressed', 'true')
  await expect(categorias.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false')
  await vista.getByRole('button', { name: 'Lista' }).click()

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
