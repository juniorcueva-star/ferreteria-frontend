import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Contrasenas de los usuarios de prueba: archivo .env.e2e (no se sube a Git; ver .env.e2e.example)
if (existsSync('.env.e2e')) {
  process.loadEnvFile('.env.e2e')
}

/**
 * Pruebas de punta a punta exclusivamente contra el backend E2E aislado.
 * Variables obligatorias (en .env.e2e): E2E_ADMIN_PASSWORD y E2E_DEMO_PASSWORD.
 * Variables opcionales:
 *  - E2E_URL: URL del frontend aislado (por defecto http://localhost:5174)
 *  - E2E_API_URL: URL del backend aislado (obligatoria: http://localhost:8081)
 *  - CHROMIUM_PATH: ruta a un Chromium ya instalado (si no, usa el de "npx playwright install chromium")
 */
const URL_FRONTEND = process.env.E2E_URL ?? 'http://localhost:5174'
const URL_API = process.env.E2E_API_URL ?? 'http://localhost:8081'

if (process.env.E2E_ALLOW_WRITE !== 'true') {
  throw new Error('E2E bloqueado: defina E2E_ALLOW_WRITE=true solo para el entorno aislado')
}
if (URL_FRONTEND !== 'http://localhost:5174' || URL_API !== 'http://localhost:8081') {
  throw new Error('E2E bloqueado: use exclusivamente frontend 5174 y backend 8081')
}

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
  projects: [
    // Pruebas funcionales (npm run e2e)
    {
      name: 'chromium',
      testIgnore: /capturas\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    // Capturas para docs/capturas (npm run e2e:capturas)
    {
      name: 'capturas',
      // Regenerar documentacion es una accion separada y nunca forma parte del E2E funcional.
      testMatch: process.env.E2E_ALLOW_CAPTURE === 'true' ? /capturas\.spec\.ts/ : /$a/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174',
    env: { VITE_API_URL: URL_API },
    url: URL_FRONTEND,
    // Un servidor existente podria estar configurado contra la API de demostracion.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
