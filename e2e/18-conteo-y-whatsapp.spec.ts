import { expect, test } from '@playwright/test'
import { cerrarSesion, iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Inventario fisico (ajusta las diferencias) y envio por WhatsApp de la nota de venta y del recordatorio de deuda. */
interface Creado {
  id: number
}
interface Resumen {
  contenido: { ubicaciones: { ubicacionNombre: string; cantidad: number }[] }[]
}

test('El almacenero cuenta y ajusta; el vendedor envía la nota y recuerda la deuda por WhatsApp', async ({ page, request }) => {
  // WhatsApp es un sitio externo: en la prueba se responde con una pagina vacia
  await page.context().route('https://wa.me/**', (ruta) => ruta.fulfill({ status: 200, body: 'WhatsApp' }))
  const sufijo = sufijoUnico()
  const nombre = `Taladro conteo ${sufijo}`
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<Creado & { presentaciones: { id: number }[] }>(request, admin, '/productos', {
    codigo: `CNT-${sufijo}`,
    nombre,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 3 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 1, detalles: [{ productoId: producto.id, cantidad: 10 }] })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 10 }] })

  // 1. Inventario fisico: se cuentan 8 (faltan 2)
  await iniciarSesion(page, 'almacen1')
  await page.goto('/inventario')
  await page.getByRole('button', { name: 'Inventario físico' }).click()
  await page.getByLabel('Buscar producto a contar').fill(`CNT-${sufijo}`)
  await page.getByLabel(`Contado de ${nombre}`).fill('8')
  await expect(page.getByTestId(`conteo-CNT-${sufijo}`)).toContainText('-2')
  await page.getByRole('button', { name: /Aplicar conteo \(1\)/ }).click()
  await expect(page.getByRole('dialog', { name: 'Aplicar inventario físico' })).toContainText('Faltan 2 u')
  await page.getByRole('button', { name: 'Aplicar ajustes' }).click()
  await expect(page.getByTestId('resultado-conteo')).toContainText('1')
  const resumen = (await (await request.get(`${URL_API}/inventario/resumen?productoIds=${producto.id}`, {
    headers: { Authorization: `Bearer ${admin}` },
  })).json()) as Resumen
  expect(resumen.contenido[0]?.ubicaciones.find((u) => u.ubicacionNombre.startsWith('Almac'))?.cantidad).toBe(8)
  await page.getByRole('button', { name: 'Listo' }).click()
  await cerrarSesion(page)

  // 2. Venta al credito a un cliente con celular
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  const cliente = await postApi<Creado>(request, vendedor, '/clientes', { nombre: `Rosa Deudora`, telefono: '912345678' })
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })
  const venta = await postApi<Creado>(request, vendedor, '/ventas', {
    condicion: 'CREDITO',
    clienteId: cliente.id,
    detalles: [{ presentacionId: producto.presentaciones[0]?.id, cantidad: 2 }],
    pagos: [],
  })

  // 3. Nota de venta por WhatsApp: sin escribir el celular se usa el del cliente
  await iniciarSesion(page, 'vendedor1')
  await page.goto(`/ventas/${venta.id}`)
  await page.getByRole('button', { name: 'WhatsApp' }).click()
  const nota = page.getByRole('dialog', { name: /por WhatsApp/ })
  await nota.getByRole('button', { name: 'Abrir WhatsApp' }).click()
  await expect(nota.getByTestId('enlace-whatsapp')).toHaveAttribute('href', /^https:\/\/wa\.me\/51912345678\?text=/)
  await nota.getByRole('button', { name: 'Cerrar', exact: true }).last().click()

  // 4. Recordatorio de deuda desde Reportes > Deudores
  await page.goto('/reportes?r=deudores')
  await page.getByRole('button', { name: 'Recordar deuda a Rosa Deudora' }).first().click()
  const recordatorio = page.getByRole('dialog', { name: /Recordar deuda a Rosa Deudora/ })
  await expect(recordatorio.getByLabel('Celular')).toHaveValue('912345678')
  await recordatorio.getByRole('button', { name: 'Abrir WhatsApp' }).click()
  await expect(recordatorio).toContainText('saldo pendiente')

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
