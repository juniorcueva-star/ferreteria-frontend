import { expect, test, type Page } from '@playwright/test'
import { cerrarSesion, iniciarSesion } from './ayudantes.ts'

const menu = (page: Page) => page.getByRole('navigation', { name: 'Menú principal' })

test.describe('Inicio de sesión y menú por rol', () => {
  test('rechaza una contraseña incorrecta con el mensaje del backend', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('admin')
    await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta-123')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toContainText('CREDENCIALES_INVALIDAS')
  })

  test('valida los campos obligatorios', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Ingrese su usuario')).toBeVisible()
    await expect(page.getByText('Ingrese su contraseña')).toBeVisible()
  })

  test('ADMIN ve todos los módulos', async ({ page }) => {
    await iniciarSesion(page, 'admin')
    for (const item of ['Inicio', 'Productos', 'Inventario', 'Movimientos', 'Caja', 'Ventas', 'Compras', 'Proveedores', 'Clientes', 'Reportes', 'Usuarios', 'Configuración']) {
      await expect(menu(page).getByRole('link', { name: item })).toBeVisible()
    }
    await expect(page.getByTestId('selector-ubicacion')).toBeEnabled()
    await cerrarSesion(page)
  })

  test('VENDEDOR trabaja solo en su tienda y no ve compras ni administración', async ({ page }) => {
    await iniciarSesion(page, 'vendedor1')
    for (const item of ['Caja', 'Ventas', 'Clientes']) {
      await expect(menu(page).getByRole('link', { name: item })).toBeVisible()
    }
    for (const item of ['Compras', 'Proveedores', 'Usuarios', 'Configuración']) {
      await expect(menu(page).getByRole('link', { name: item })).toHaveCount(0)
    }
    await expect(page.getByTestId('selector-ubicacion')).toBeDisabled()
    await expect(page.getByTestId('selector-ubicacion')).toHaveValue(/\d+/)
    // En productos no puede crear ni editar
    await menu(page).getByRole('link', { name: 'Productos' }).click()
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nuevo Producto' })).toHaveCount(0)
    // Una ruta de otro rol muestra el aviso en lugar de llamar a la API
    await page.goto('/usuarios')
    await expect(page.getByText('No tienes permiso para ver esta sección')).toBeVisible()
    await cerrarSesion(page)
  })

  test('ALMACENERO ve compras y traslados, pero no caja ni ventas', async ({ page }) => {
    await iniciarSesion(page, 'almacen1')
    for (const item of ['Compras', 'Proveedores', 'Movimientos']) {
      await expect(menu(page).getByRole('link', { name: item })).toBeVisible()
    }
    for (const item of ['Caja', 'Ventas', 'Clientes', 'Usuarios']) {
      await expect(menu(page).getByRole('link', { name: item })).toHaveCount(0)
    }
    await cerrarSesion(page)
  })

  test('si la API responde 401 vuelve al login', async ({ page }) => {
    await iniciarSesion(page, 'vendedor2')
    // Se simula un token vencido o revocado: la sesion sigue en el navegador pero el backend lo rechaza
    await page.evaluate(() => {
      const clave = 'todopernos.sesion'
      const sesion = JSON.parse(sessionStorage.getItem(clave) ?? '{}') as Record<string, unknown>
      sessionStorage.setItem(clave, JSON.stringify({ ...sesion, token: 'token-invalido' }))
    })
    await page.goto('/productos')
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByText('Tu sesión expiró o fue cerrada')).toBeVisible()
  })

  test('muestra "Sincronizado" cuando hay conexión con la API', async ({ page }) => {
    await iniciarSesion(page, 'admin')
    await expect(page.getByRole('button', { name: /Sincronizado/ })).toHaveAttribute('data-estado', 'conectado')
  })
})
