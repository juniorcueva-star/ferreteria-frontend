import { expect, test } from '@playwright/test'
import { campo, iniciarSesion, sufijoUnico } from './ayudantes.ts'

/**
 * Catalogo de la segunda fase: atributos del producto (tipo, acabado, medida y marca VARIADO), unidades de medida
 * en las presentaciones, busqueda por palabras ("per hex zin") y acciones en lote.
 */
test.describe.configure({ mode: 'serial' })

const sufijo = sufijoUnico()
const CODIGO = `PHZ-${sufijo}`
const NOMBRE = `Perno hexagonal zincado ${sufijo}`

test('ADMIN crea un perno con tipo, acabado, medida y una docena propuesta por la unidad de medida', async ({ page }) => {
  await iniciarSesion(page, 'admin')
  await page.goto('/productos/nuevo')
  await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible()

  await campo(page, 'Código').fill(CODIGO)
  await page.getByRole('textbox', { name: 'Nombre *', exact: true }).fill(NOMBRE)
  await campo(page, 'Categoría').selectOption({ label: 'Pernos y tuercas' })
  await expect(page.getByLabel('Marca')).toHaveValue('VARIADO')
  await campo(page, 'Tipo').fill('Hexagonal')
  await campo(page, 'Acabado').fill('Zincado')
  await campo(page, 'Medida').fill('1/4 X 1/2')

  await page.getByTestId('presentacion-0').getByLabel('Precio (S/)').fill('0.40')
  await page.getByRole('button', { name: 'Agregar presentación' }).click()
  const docena = page.getByTestId('presentacion-1')
  await docena.getByLabel('Unidad de medida').selectOption({ label: 'Docena (12)' })
  await expect(docena.getByLabel('Nombre')).toHaveValue('Docena')
  await expect(docena.getByLabel('Factor (u)')).toHaveValue('12')
  await expect(docena.getByLabel('Decimales')).toHaveValue('0')
  await expect(docena.getByText('Solo cantidades enteras')).toBeVisible()
  await docena.getByLabel('Precio (S/)').fill('4.50')

  await page.getByRole('button', { name: 'Guardar' }).first().click()
  await expect(page.getByText(`Producto "${NOMBRE}" creado`)).toBeVisible()
})

test('La busqueda por abreviaturas "per hex zin" encuentra el perno', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.goto('/productos')
  await page.getByRole('searchbox', { name: 'Buscar producto' }).fill(`per hex zin ${sufijo.toLowerCase()}`)
  const fila = page.getByTestId(`producto-${CODIGO}`)
  await expect(fila).toBeVisible()
  await expect(fila.getByText('Hexagonal · Zincado · 1/4 X 1/2')).toBeVisible()
  await expect(page.getByTestId('producto-CLA-0200')).toHaveCount(0)
})

test('ADMIN asigna categoria y desactiva en lote con confirmacion', async ({ page }) => {
  await iniciarSesion(page, 'admin')
  await page.goto('/productos')
  await page.getByRole('searchbox', { name: 'Buscar producto' }).fill(sufijo.toLowerCase())
  const fila = page.getByTestId(`producto-${CODIGO}`)
  await expect(fila).toBeVisible()
  await fila.getByRole('checkbox', { name: `Seleccionar ${NOMBRE}` }).check()

  const barra = page.getByTestId('barra-lote')
  await expect(barra.getByText('1 producto seleccionado')).toBeVisible()
  await barra.getByLabel('Categoría a asignar').selectOption({ label: 'Pernos' })
  await barra.getByRole('button', { name: 'Asignar categoría' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Confirmar acción en lote' })
  await expect(dialogo.getByText('Se asignará la categoría “Pernos” a 1 producto.')).toBeVisible()
  await dialogo.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('1 producto actualizado')).toBeVisible()
  await expect(fila.getByRole('cell', { name: 'Pernos', exact: true })).toBeVisible()

  await fila.getByRole('checkbox', { name: `Seleccionar ${NOMBRE}` }).check()
  await page.getByTestId('barra-lote').getByRole('button', { name: 'Desactivar' }).click()
  await page.getByRole('dialog', { name: 'Confirmar acción en lote' }).getByRole('button', { name: 'Confirmar' }).click()
  await expect(fila.getByText('Inactivo')).toBeVisible()
})
