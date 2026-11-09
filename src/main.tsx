import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { aplicarZoom, leerZoom } from './logica/zoom'

// El tamano de letra elegido se aplica antes de dibujar, para que la pantalla no salte
aplicarZoom(leerZoom())

const raiz = document.getElementById('root')
if (!raiz) {
  throw new Error('No se encontró el elemento #root')
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
