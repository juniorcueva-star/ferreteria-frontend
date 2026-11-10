import { expect, test } from '@playwright/test'
import { iniciarSesion, postApi, sufijoUnico, tokenApi, URL_API } from './ayudantes.ts'

/** Ticket de 80 mm de la venta y guia de traslado: se abren en una pestana para imprimir. */
interface Creado {
  id: number
  codigo?: string
}

test('Se imprime el ticket de la venta y la guía del traslado', async ({ page, request }) => {
  const sufijo = sufijoUnico()
  const admin = await tokenApi(request, 'admin')
  const producto = await postApi<Creado>(request, admin, '/productos', {
    codigo: `DOC-${sufijo}`,
    nombre: `Lija documento ${sufijo}`,
    categoriaId: 5,
    unidadBase: 'UNIDAD',
    presentaciones: [{ nombre: 'Unidad', factor: 1, precioVenta: 2 }],
  })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 1, detalles: [{ productoId: producto.id, cantidad: 30 }] })
  await postApi(request, admin, '/inventario/inicial', { ubicacionId: 2, detalles: [{ productoId: producto.id, cantidad: 10 }] })
  const almacen = await tokenApi(request, 'almacen1')
  const traslado = await postApi<Creado>(request, almacen, '/traslados', {
    destinoId: 2,
    detalles: [{ productoId: producto.id, cantidad: 5 }],
  })
  const vendedor = await tokenApi(request, 'vendedor1')
  const auth = { Authorization: `Bearer ${vendedor}` }
  await request.post(`${URL_API}/cajas/abrir`, { data: { montoApertura: 0 }, headers: auth })
  const conPresentaciones = (await (await request.get(`${URL_API}/productos/${producto.id}`, { headers: auth })).json()) as {
    presentaciones: { id: number }[]
  }
  const venta = await postApi<Creado>(request, vendedor, '/ventas', {
    condicion: 'CONTADO',
    detalles: [{ presentacionId: conPresentaciones.presentaciones[0]?.id, cantidad: 2 }],
    pagos: [{ metodoPago: 'EFECTIVO', monto: 4 }],
  })

  // 1. Ticket de la venta
  await iniciarSesion(page, 'vendedor1')
  await page.goto(`/ventas/${venta.id}`)
  const ticket = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Ticket' }).click()
  const pestanaTicket = await ticket
  await pestanaTicket.waitForURL(/^blob:/)
  expect(pestanaTicket.url()).toMatch(/^blob:/)

  // 2. Guia del traslado (la tienda destino tambien la puede imprimir)
  await page.goto('/movimientos?tab=traslados')
  await page.getByTestId(`traslado-${traslado.codigo}`).click()
  const guia = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Imprimir guía' }).click()
  const pestanaGuia = await guia
  await pestanaGuia.waitForURL(/^blob:/)
  expect(pestanaGuia.url()).toMatch(/^blob:/)

  const actual = (await (await request.get(`${URL_API}/cajas/actual`, { headers: auth })).json()) as {
    id: number
    resumen: { efectivoEsperado: number }
  }
  await request.post(`${URL_API}/cajas/${actual.id}/cerrar`, { data: { efectivoContado: actual.resumen.efectivoEsperado }, headers: auth })
})
