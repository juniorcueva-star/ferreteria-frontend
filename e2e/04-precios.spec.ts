import { expect, test } from '@playwright/test'
import { hoyEnLima, iniciarSesion, postApi, sufijoUnico, tokenApi } from './ayudantes.ts'

/**
 * Precios de la segunda fase: costo de referencia desde la ultima compra, precio sugerido con ganancia y
 * adicional, "Usar sugerido" (solo copia) e historial de precios.
 */
interface ProductoCreado {
  id: number
  presentaciones: { id: number; nombre: string }[]
}

test('ADMIN ve el costo de la ultima compra, usa el precio sugerido y revisa el historial', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<ProductoCreado>(request, admin, '/productos', {
    codigo: `PRE-${sufijo}`,
    nombre: `Silicona precio ${sufijo}`,
    categoriaId: 9,
    unidadBase: 'UNIDAD',
    presentaciones: [
      { nombre: 'Unidad', factor: 1, precioVenta: 2.5 },
      { nombre: 'Caja x10', factor: 10, precioVenta: 25 },
    ],
  })
  const caja = producto.presentaciones.find((p) => p.nombre === 'Caja x10')
  const almacen = await tokenApi(request, 'almacen1')
  await postApi(request, almacen, '/compras', {
    empresaId: 1,
    proveedorId: 1,
    tipoComprobante: 'BOLETA',
    fechaEmision: hoyEnLima(),
    detalles: [{ productoId: producto.id, presentacionId: caja?.id, cantidad: 2, precioUnitario: 20 }],
  })

  await iniciarSesion(page, 'admin')
  await page.goto(`/productos/${producto.id}`)
  const fila = page.getByTestId('precios-1')
  await expect(fila.getByTestId('costo-1')).toHaveText('S/ 20.0000')
  await fila.getByLabel('Ganancia (%)').fill('30')
  await fila.getByLabel('Adicional (S/)').fill('1')
  await expect(fila.getByTestId('sugerido-1')).toHaveText('S/ 27.00')

  // "Usar sugerido" solo copia el valor: el precio se guarda al presionar Guardar
  await fila.getByRole('button', { name: 'Usar sugerido' }).click()
  await expect(page.getByTestId('presentacion-1').getByLabel('Precio (S/)')).toHaveValue('27.00')
  await page.getByRole('button', { name: 'Guardar' }).first().click()
  await expect(page.getByText(`Producto "Silicona precio ${sufijo}" actualizado`)).toBeVisible()

  await page.goto(`/productos/${producto.id}`)
  await expect(page.getByTestId('precios-1').getByLabel('Ganancia (%)')).toHaveValue('30')
  await page.getByTestId('precios-1').getByRole('button', { name: 'Historial' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Historial de precios · Caja x10' })
  await expect(dialogo.getByRole('cell', { name: 'S/ 25.00' })).toBeVisible()
  await expect(dialogo.getByRole('cell', { name: 'S/ 27.00' })).toBeVisible()
  await expect(dialogo.getByRole('cell', { name: 'admin' })).toBeVisible()
})
