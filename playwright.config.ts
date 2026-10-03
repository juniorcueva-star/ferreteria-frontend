import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Contrasenas de los usuarios de prueba: archivo .env.e2e (no se sube a Git; ver .env.e2e.example)
if (existsSync('.env.e2e')) {
  process.loadEnvFile('.env.e2e')
}

/**
 * Pruebas de punta a punta contra el backend REAL (debe estar levantado con el perfil dev y sus datos
 * de demostracion). Playwright levanta el frontend con "npm run dev" si no esta corriendo.
 * Variables obligatorias (en .env.e2e): E2E_ADMIN_PASSWORD y E2E_DEMO_PASSWORD.
 * Variables opcionales:
 *  - E2E_URL: URL del frontend (por defecto http://localhost:5173)
 *  - CHROMIUM_PATH: ruta a un Chromium ya instalado (si no, usa el de "npx playwright install chromium")
 */
const URL_FRONTEND = process.env.E2E_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  // Los flujos comparten la base de datos del backend: se ejecutan en orden, uno a la vez
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URL_FRONTEND,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'npm run dev',
    url: URL_FRONTEND,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
