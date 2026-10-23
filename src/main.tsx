import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// registra o service worker para cache de capas (somente no browser;
// no Electron (file://) service workers não são suportados)
if ('serviceWorker' in navigator && import.meta.env.PROD && !window.electronAPI) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* service worker é opcional */
    })
  })
}
