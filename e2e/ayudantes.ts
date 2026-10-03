import { expect, type Page } from '@playwright/test'

/**
 * Ayudantes de las pruebas de punta a punta. Las contrasenas se leen de variables de entorno
 * (archivo .env.e2e), nunca del codigo.
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(`Falta la variable ${nombre}: copie .env.e2e.example como .env.e2e y complétela`)
  }
  return valor
}

export type Quien = 'admin' | 'vendedor1' | 'vendedor2' | 'almacen1'

export function credenciales(quien: Quien): { usuario: string; clave: string } {
  return quien === 'admin'
    ? { usuario: 'admin', clave: requerida('E2E_ADMIN_PASSWORD') }
    : { usuario: quien, clave: requerida('E2E_DEMO_PASSWORD') }
}

export async function iniciarSesion(page: Page, quien: Quien): Promise<void> {
  const { usuario, clave } = credenciales(quien)
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(usuario)
  await page.getByLabel('Contraseña', { exact: true }).fill(clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('navigation', { name: 'Menú principal' })).toBeVisible()
}

export async function cerrarSesion(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Opciones de usuario' }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
}

/** Elige un producto en un SelectorProducto buscando por codigo. */
export async function elegirProducto(page: Page, etiqueta: string, codigo: string, nombre: string): Promise<void> {
  await page.getByRole('combobox', { name: etiqueta }).fill(codigo)
  await page.getByRole('listbox').getByText(nombre, { exact: true }).click()
}

/** Codigo unico por ejecucion, para que las pruebas se puedan repetir sobre la misma base. */
export function sufijoUnico(): string {
  return Date.now().toString(36).toUpperCase()
}

/** Campo por su etiqueta exacta, sea obligatorio ("Código *") o no ("Código"). */
export function campo(page: Page, etiqueta: string) {
  const escapada = etiqueta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.getByLabel(new RegExp(`^${escapada}( \\*)?$`))
}
