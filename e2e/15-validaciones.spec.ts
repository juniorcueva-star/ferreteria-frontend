import { expect, test } from '@playwright/test'
import { campo, iniciarSesion } from './ayudantes.ts'

/** Pedido del dueno: no letras donde van numeros, celulares de 9 digitos con 9 y nombres de personas sin numeros. */
test('El formulario de cliente no deja letras en el celular y avisa los datos mal escritos', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  await page.getByRole('navigation', { name: 'Menú principal' }).getByRole('link', { name: 'Clientes' }).click()
  await page.getByRole('button', { name: 'Nuevo cliente' }).click()
  const modal = page.getByRole('dialog', { name: 'Nuevo cliente' })

  // Las letras no se pueden escribir en el celular
  await campo(modal, 'Celular').pressSequentially('98a76b54c')
  await expect(campo(modal, 'Celular')).toHaveValue('987654')

  // Nombre con numeros y celular incompleto: no se guarda y se explica por que
  await campo(modal, 'Nombre o razón social').fill('Juan 123')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText('Solo letras (sin números ni símbolos)')).toBeVisible()
  await expect(modal.getByText('Celular de 9 dígitos que empieza con 9 (Ej: 987654321)')).toBeVisible()

  // Con RUC, el documento solo acepta numeros y debe empezar con 10, 15, 16, 17 o 20
  await modal.getByLabel('Tipo de documento').selectOption('RUC')
  await campo(modal, 'Número de documento').pressSequentially('30abc123456789')
  await expect(campo(modal, 'Número de documento')).toHaveValue('30123456789')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText(/RUC inválido/)).toBeVisible()
})
