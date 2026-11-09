import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { iniciarSesion } from './ayudantes.ts'

/** Pedido del dueno: descargar en Excel las ventas, el stock y los deudores desde Reportes. */
test('ADMIN descarga en Excel las ventas, el stock y los deudores', async ({ page }) => {
  await iniciarSesion(page, 'admin')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Reportes' }).click()
  const grupo = page.getByRole('group', { name: 'Exportar a Excel' })
  for (const [boton, nombre] of [
    ['Ventas en Excel', /^ventas-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.xlsx$/],
    ['Stock en Excel', /^stock-\d{4}-\d{2}-\d{2}\.xlsx$/],
    ['Deudores en Excel', /^deudores-\d{4}-\d{2}-\d{2}\.xlsx$/],
  ] as const) {
    const espera = page.waitForEvent('download')
    await grupo.getByRole('button', { name: boton }).click()
    const descarga = await espera
    expect(descarga.suggestedFilename()).toMatch(nombre)
    // Un .xlsx es un archivo ZIP: empieza con "PK"
    expect(readFileSync(await descarga.path()).subarray(0, 2).toString()).toBe('PK')
  }
})

test('ALMACENERO solo puede exportar el stock', async ({ page }) => {
  await iniciarSesion(page, 'almacen1')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Reportes' }).click()
  const grupo = page.getByRole('group', { name: 'Exportar a Excel' })
  await expect(grupo.getByRole('button', { name: 'Stock en Excel' })).toBeVisible()
  await expect(grupo.getByRole('button', { name: 'Ventas en Excel' })).toHaveCount(0)
  await expect(grupo.getByRole('button', { name: 'Deudores en Excel' })).toHaveCount(0)
})
