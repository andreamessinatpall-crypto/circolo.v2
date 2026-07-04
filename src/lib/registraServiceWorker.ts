// Registra il service worker (public/sw.js) per il funzionamento offline minimo.
export function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((errore) => {
      console.error('Registrazione service worker fallita:', errore)
    })
  })
}
