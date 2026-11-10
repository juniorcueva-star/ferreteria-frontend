import { expect, test } from '@playwright/test'
import { iniciarSesion } from './ayudantes.ts'

/**
 * Asistente de IA basico. Sin clave en el servidor avisa que no esta activado; la conversacion se prueba con las
 * respuestas del servidor simuladas (no se llama a la IA real en las pruebas).
 */
test('El asistente avisa si no está activado y conversa con preguntas sugeridas', async ({ page }) => {
  // 1. Servidor real sin clave: avisa que falta activarlo
  await iniciarSesion(page, 'vendedor1')
  await page.getByRole('button', { name: 'Asistente', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Asistente de ventas' })
  await expect(panel.getByTestId('asistente-sin-configurar')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  // 2. Con el servidor simulado: pregunta sugerida y respuesta con negritas
  await page.route('**/api/asistente/estado', (ruta) =>
    ruta.fulfill({
      json: {
        configurado: true,
        nombre: 'Asistente de ventas',
        saludo: 'Hola, te ayudo a encontrar productos.',
        sugerencias: ['Tarugo para pared con su tornillo', '¿Cuánto cuestan 100 pernos 3/8?'],
        preguntasRestantes: 50,
        preguntasPorDia: 50,
      },
    }),
  )
  let historialRecibido: unknown = null
  await page.route('**/api/asistente/preguntar', async (ruta) => {
    const cuerpo = ruta.request().postDataJSON() as { pregunta: string; historial: unknown[] }
    historialRecibido = cuerpo.historial
    await ruta.fulfill({
      json: {
        respuesta: cuerpo.historial.length === 0 ? 'Es el **taco fisher 1/4**: S/ 0.20 c/u.\nHay 120 en tu tienda.' : '100 le salen a S/ 40.00.',
        consultas: ['buscar_productos'],
        preguntasRestantes: cuerpo.historial.length === 0 ? 49 : 48,
      },
    })
  })
  await page.reload()
  await page.getByRole('button', { name: 'Asistente', exact: true }).click()
  await panel.getByRole('group', { name: 'Preguntas sugeridas' }).getByRole('button', { name: 'Tarugo para pared con su tornillo' }).click()
  await expect(panel.getByTestId('mensaje-usuario')).toHaveText('Tarugo para pared con su tornillo')
  const respuesta = panel.getByTestId('mensaje-asistente').first()
  await expect(respuesta.locator('strong')).toHaveText('taco fisher 1/4')
  await expect(respuesta).toContainText('Revisó: productos')
  await expect(panel.getByTestId('asistente-restantes')).toHaveText('Te quedan 49 de 50 preguntas hoy')

  // 3. Segunda pregunta escrita: lleva la conversacion anterior
  await panel.getByLabel('Pregunta para el asistente').fill('¿Y si llevo 100?')
  await page.keyboard.press('Enter')
  await expect(panel.getByTestId('mensaje-asistente').nth(1)).toContainText('100 le salen a S/ 40.00.')
  expect(historialRecibido).toEqual([
    { rol: 'USUARIO', texto: 'Tarugo para pared con su tornillo' },
    { rol: 'ASISTENTE', texto: 'Es el **taco fisher 1/4**: S/ 0.20 c/u.\nHay 120 en tu tienda.' },
  ])

  // 4. Cerrar el chat no borra la conversación: al volver a abrirlo sigue ahí
  await panel.getByRole('button', { name: 'Cerrar asistente' }).click()
  await expect(panel).toBeHidden()
  await page.getByRole('button', { name: 'Asistente', exact: true }).click()
  await expect(panel.getByTestId('mensaje-asistente')).toHaveCount(2)

  // 5. Nueva conversación vuelve a mostrar las sugerencias
  await panel.getByRole('button', { name: 'Nueva conversación' }).click()
  await expect(panel.getByRole('group', { name: 'Preguntas sugeridas' })).toBeVisible()
})

test('La mascota del asistente se arrastra, no abre el chat al soltarla y recuerda dónde quedó', async ({ page }) => {
  await iniciarSesion(page, 'vendedor1')
  const mascota = page.getByTestId('asistente-mascota')
  const antes = await mascota.boundingBox()
  if (!antes) throw new Error('No se ve la mascota')
  await page.mouse.move(antes.x + antes.width / 2, antes.y + antes.height / 2)
  await page.mouse.down()
  await page.mouse.move(antes.x - 300, antes.y - 250, { steps: 8 })
  await page.mouse.up()
  const despues = await mascota.boundingBox()
  expect(despues?.x).toBeLessThan(antes.x - 200)
  expect(despues?.y).toBeLessThan(antes.y - 150)
  // Soltar después de arrastrar no abre el chat
  await expect(page.getByRole('dialog', { name: /Asistente/ })).toHaveCount(0)
  // Al recargar sigue donde la dejó
  await page.reload()
  const recargada = await page.getByTestId('asistente-mascota').boundingBox()
  expect(Math.abs((recargada?.x ?? 0) - (despues?.x ?? 0))).toBeLessThan(2)
  // Un toque sí abre el chat, al lado de la mascota
  await page.getByTestId('asistente-mascota').click()
  await expect(page.getByRole('dialog', { name: /Asistente/ })).toBeVisible()
})
