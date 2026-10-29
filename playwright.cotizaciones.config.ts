import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

if (existsSync('.env.cotizaciones')) {
  process.loadEnvFile('.env.cotizaciones')
}

const URL_FRONTEND = process.env.COTIZACIONES_E2E_URL ?? 'http://localhost:5174'
const URL_API = process.env.COTIZACIONES_E2E_API_URL ?? 'http://localhost:8082'
const PUERTOS_RECHAZADOS = new Set(['8081', '5434', '5545'])

function validarDestino(nombre: string, url: string, esperado: string) {
  const destino = new URL(url)
  if (PUERTOS_RECHAZADOS.has(destino.port) || url !== esperado) {
    throw new Error(`E2E de cotizaciones bloqueado: ${nombre} debe ser ${esperado}`)
  }
}

validarDestino('frontend', URL_FRONTEND, 'http://localhost:5174')
validarDestino('API', URL_API, 'http://localhost:8082')

/**
 * La infraestructura se inicia externamente: el frontend en 5174 debe usar
 * VITE_API_URL=http://localhost:8082. Esta configuracion nunca inicia servicios.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /cotizaciones\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: URL_FRONTEND,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-cotizaciones', use: { ...devices['Desktop Chrome'] } }],
})
