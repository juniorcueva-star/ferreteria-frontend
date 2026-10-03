import { expect, test, type Page } from '@playwright/test'
import { campo, elegirProducto, iniciarSesion, sufijoUnico } from './ayudantes.ts'

/**
 * Recorrido completo del negocio contra el backend real, en orden:
 * crear producto -> compra -> traslado -> recepcion -> abrir caja -> venta al contado ->
 * venta a credito -> abono -> cierre de caja con cuadre.
 * Cada ejecucion usa un producto y un comprobante nuevos, asi se puede repetir sobre la misma base.
 */
test.describe.configure({ mode: 'serial' })

const sufijo = sufijoUnico()
const CODIGO = `E2E-${sufijo}`
const NOMBRE = `Perno hexagonal M8 E2E ${sufijo}`
let codigoTraslado = ''
let numeroCredito = ''

async function irA(page: Page, enlace: string) {
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: enlace }).click()
}

test('ADMIN crea un producto con dos presentaciones y su foto', async ({ page }) => {
  await iniciarSesion(page, 'admin')
  await irA(page, 'Productos')
  await page.getByRole('button', { name: 'Nuevo Producto' }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible()

  await campo(page, 'Código').fill(CODIGO)
  await page.getByRole('textbox', { name: 'Nombre *', exact: true }).fill(NOMBRE)
  await campo(page, 'Categoría').selectOption({ label: 'Pernos y tuercas' })
  await page.getByLabel('Marca').fill('Prueba')

  const primera = page.getByTestId('presentacion-0')
  await expect(primera.getByLabel('Nombre')).toHaveValue('Unidad')
  await primera.getByLabel('Precio (S/)').fill('0.35')

  await page.getByRole('button', { name: 'Agregar presentación' }).click()
  const segunda = page.getByTestId('presentacion-1')
  await segunda.getByLabel('Nombre').fill('Caja x100')
  await segunda.getByLabel('Factor (u)').fill('100')
  await segunda.getByLabel('Precio (S/)').fill('30')
  await expect(segunda).toContainText('1 Caja x100 = 100 u')

  // Un producto por unidad no acepta factores con decimales
  await segunda.getByLabel('Factor (u)').fill('0.5')
  await page.getByRole('button', { name: 'Guardar' }).first().click()
  await expect(segunda.getByText('Un producto por unidad solo acepta factores enteros')).toBeVisible()
  await segunda.getByLabel('Factor (u)').fill('100')

  await page.getByTestId('entrada-foto').setInputFiles('e2e/fixtures/perno.png')
  await expect(page.getByAltText('Foto del producto')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar' }).first().click()

  await expect(page.getByText(`Producto "${NOMBRE}" creado`)).toBeVisible()
  await page.getByLabel('Buscar producto').fill(CODIGO)
  const fila = page.getByTestId(`producto-${CODIGO}`)
  await expect(fila).toBeVisible()
  await expect(fila).toContainText('Caja x100 · 100 u')
  await expect(fila).toContainText('S/ 0.35')
  await expect(fila.getByRole('img', { name: NOMBRE })).toBeVisible()
})

test('ALMACENERO registra una compra con factura y la mercadería entra al almacén', async ({ page }) => {
  await iniciarSesion(page, 'almacen1')
  await irA(page, 'Compras')
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Registrar compra' })).toBeVisible()
  await campo(page, 'Proveedor').selectOption({ label: 'Aceros Arequipa Distribuidora S.A.' })
  await page.getByLabel('Tipo de comprobante').selectOption('FACTURA')
  await page.getByLabel('Serie y número').fill(`F001-${sufijo}`)

  await elegirProducto(page, 'Producto 1', CODIGO, NOMBRE)
  await page.getByLabel('Presentación 1').selectOption({ label: 'Caja x100 (100)' })
  await page.getByLabel('Cantidad 1').fill('5')
  await page.getByLabel('Precio 1').fill('20')
  await expect(page.getByTestId('linea-compra-1')).toContainText('Entran 500 u')
  await expect(page.getByTestId('total-compra')).toHaveText('S/ 100.00')

  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page.getByText(/Compra N\.° \d+ registrada por S\/ 100\.00/)).toBeVisible()
  await expect(page).toHaveURL(/\/compras$/)

  await irA(page, 'Inventario')
  await page.getByLabel('Buscar en el inventario').fill(CODIGO)
  await expect(page.getByRole('row', { name: new RegExp(NOMBRE) })).toContainText('500')
})

test('ALMACENERO envía un traslado del almacén a la Tienda Centro', async ({ page }) => {
  await iniciarSesion(page, 'almacen1')
  await page.goto('/movimientos/traslados/nuevo')
  await expect(page.getByRole('heading', { name: 'Nuevo traslado' })).toBeVisible()
  await campo(page, 'Destino').selectOption({ label: 'Tienda Centro' })
  await page.getByLabel('Observación').fill('Reposición de prueba E2E')
  await elegirProducto(page, 'Producto 1', CODIGO, NOMBRE)
  await page.getByLabel('Presentación 1').selectOption({ label: 'Caja x100 (100)' })
  await page.getByLabel('Cantidad 1').fill('3')
  await expect(page.getByTestId('linea-1')).toContainText('= 300 u')
  await expect(page.getByTestId('linea-1')).toContainText('Disponible: 500 u')
  await page.getByRole('button', { name: 'Enviar traslado' }).click()

  const aviso = page.getByText(/Traslado TR-\d+ enviado a Tienda Centro/)
  await expect(aviso).toBeVisible()
  codigoTraslado = /TR-\d+/.exec((await aviso.textContent()) ?? '')?.[0] ?? ''
  expect(codigoTraslado).not.toBe('')
  await expect(page.getByTestId(`traslado-${codigoTraslado}`)).toContainText('En camino')
})

test('VENDEDOR recibe el traslado en su tienda', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await expect(page.getByTestId('indicador-traslados')).toBeVisible()
  await page.goto('/movimientos?tab=traslados')
  await page.getByTestId(`traslado-${codigoTraslado}`).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toContainText('Reposición de prueba E2E')
  // El vendedor no puede anular (solo almacen o ADMIN)
  await expect(dialogo.getByRole('button', { name: 'Anular' })).toHaveCount(0)
  await dialogo.getByRole('button', { name: 'Recibir mercadería' }).click()
  await expect(page.getByText(`Traslado ${codigoTraslado} recibido`)).toBeVisible()
  await expect(dialogo).toContainText('Recibido')
  await dialogo.getByRole('button', { name: 'Cerrar' }).click()

  await page.goto('/inventario')
  await page.getByLabel('Buscar en el inventario').fill(CODIGO)
  await expect(page.getByRole('row', { name: new RegExp(NOMBRE) })).toContainText('300')
})

test('VENDEDOR abre su caja', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await irA(page, 'Caja')
  // Si quedo una caja abierta de una ejecucion anterior, se cierra primero con su cuadre exacto
  const resumen = page.getByText('Resumen en vivo')
  const abrir = page.getByRole('button', { name: 'Abrir caja' })
  await expect(resumen.or(abrir)).toBeVisible()
  if (await resumen.isVisible()) {
    const esperado = ((await page.getByTestId('efectivo-esperado').textContent()) ?? '').replace(/[^\d.]/g, '')
    await page.getByRole('button', { name: 'Cerrar caja' }).click()
    await campo(page, 'Efectivo contado (S/)').fill(esperado)
    await page.getByRole('button', { name: 'Confirmar cierre' }).click()
    await page.getByRole('button', { name: 'Entendido' }).click()
  }
  await campo(page, 'Monto de apertura (S/)').fill('100')
  await page.getByRole('button', { name: 'Abrir caja' }).click()
  await expect(page.getByText('Resumen en vivo')).toBeVisible()
  await expect(page.getByTestId('efectivo-esperado')).toHaveText('S/ 100.00')
})

test('VENDEDOR registra una venta al contado con vuelto', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await irA(page, 'Ventas')
  await page.getByLabel('Buscar producto para vender').fill(CODIGO)
  await page.getByRole('button', { name: `Agregar ${NOMBRE} Caja x100` }).click()
  await page.getByRole('button', { name: `Agregar ${NOMBRE} Unidad` }).click()
  await page.getByLabel(`Cantidad de ${NOMBRE} Unidad`).fill('15')
  // 1 caja x S/ 30.00 + 15 unidades x S/ 0.35 = S/ 35.25
  await expect(page.getByTestId('total-venta')).toHaveText('S/ 35.25')

  // Las unidades no aceptan decimales
  await page.getByLabel(`Cantidad de ${NOMBRE} Unidad`).fill('1.5')
  await expect(page.getByText('Cantidad inválida (número entero mayor que 0)')).toBeVisible()
  await page.getByLabel(`Cantidad de ${NOMBRE} Unidad`).fill('15')

  await page.getByLabel('Monto del pago 1').fill('50')
  await expect(page.getByTestId('vuelto')).toHaveText('S/ 14.75')
  await page.getByRole('button', { name: 'Cobrar S/ 35.25' }).click()

  const venta = page.getByTestId('venta-registrada')
  await expect(venta).toContainText('S/ 35.25')
  await expect(venta).toContainText('S/ 14.75')
  await page.getByRole('button', { name: 'Nueva venta' }).click()
  await expect(page.getByText('Carrito vacío')).toBeVisible()
})

test('VENDEDOR registra una venta a crédito con adelanto por Yape', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/ventas')
  await page.getByLabel('Buscar producto para vender').fill(CODIGO)
  await page.getByRole('button', { name: `Agregar ${NOMBRE} Caja x100` }).click()
  await expect(page.getByTestId('total-venta')).toHaveText('S/ 30.00')
  await page.getByRole('radio', { name: 'Crédito (fiado)' }).click()

  // Sin cliente no se puede fiar
  await page.getByRole('button', { name: /Registrar venta a crédito/ }).click()
  await expect(page.getByText('Una venta a crédito necesita un cliente').first()).toBeVisible()

  await page.getByLabel('Buscar cliente').fill('Juan')
  await page.getByRole('listbox').getByText('Juan Perez Quispe').click()
  await page.getByLabel('Método del pago 1').selectOption('YAPE')
  await page.getByLabel('Monto del pago 1').fill('10')
  // Yape exige numero de operacion
  await page.getByRole('button', { name: /Registrar venta a crédito/ }).click()
  await expect(page.getByText('Yape requiere el número de operación')).toBeVisible()
  await page.getByLabel('Número de operación del pago 1').fill('00123456')
  await expect(page.getByTestId('saldo-credito')).toHaveText('S/ 20.00')
  await page.getByRole('button', { name: 'Registrar venta a crédito S/ 30.00' }).click()

  const dialogo = page.getByRole('dialog', { name: 'Venta registrada' })
  await expect(dialogo).toContainText('Saldo pendiente de Juan Perez Quispe')
  await expect(dialogo).toContainText('S/ 20.00')
  numeroCredito = /NV\d+-\d+/.exec((await dialogo.textContent()) ?? '')?.[0] ?? ''
  expect(numeroCredito).not.toBe('')
})

test('VENDEDOR registra el abono que cancela la deuda', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/clientes?tab=deudas')
  const fila = page.getByTestId(`deuda-${numeroCredito}`)
  await expect(fila).toContainText('S/ 20.00')
  await fila.getByRole('button', { name: 'Abonar' }).click()
  const dialogo = page.getByRole('dialog')
  // No se puede abonar mas que la deuda
  await dialogo.getByLabel('Monto del pago 1').fill('25')
  await dialogo.getByRole('button', { name: 'Registrar abono' }).click()
  await expect(dialogo.getByText('El abono no puede superar el saldo pendiente')).toBeVisible()
  await dialogo.getByLabel('Monto del pago 1').fill('20')
  await dialogo.getByRole('button', { name: 'Registrar abono' }).click()
  await expect(page.getByText(`Deuda de ${numeroCredito} cancelada`)).toBeVisible()
  await expect(page.getByTestId(`deuda-${numeroCredito}`)).toHaveCount(0)
})

test('VENDEDOR cierra la caja y el cuadre es exacto', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/caja')
  // 100 de apertura + 35.25 de la venta al contado (en efectivo, sin el vuelto) + 20 del abono
  await expect(page.getByTestId('efectivo-esperado')).toHaveText('S/ 155.25')
  await expect(page.getByRole('listitem').filter({ hasText: 'Yape' })).toContainText('S/ 10.00')
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  await campo(page, 'Efectivo contado (S/)').fill('150')
  await expect(page.getByTestId('diferencia-cierre')).toContainText('Falta')
  await campo(page, 'Efectivo contado (S/)').fill('155.25')
  await expect(page.getByTestId('diferencia-cierre')).toContainText('Cuadra exacto')
  await page.getByRole('button', { name: 'Confirmar cierre' }).click()
  await expect(page.getByTestId('resultado-cuadre')).toContainText('Cuadre exacto')
  await page.getByRole('button', { name: 'Entendido' }).click()
  await expect(page.getByRole('button', { name: 'Abrir caja' })).toBeVisible()
})
