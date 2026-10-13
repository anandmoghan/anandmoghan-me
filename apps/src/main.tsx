import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

window.addEventListener('vite:preloadError', () => {
  const key = 'vite-preload-reload-at'
  const lastReload = Number(sessionStorage.getItem(key) ?? 0)
  if (Date.now() - lastReload > 10_000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
