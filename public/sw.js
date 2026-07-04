// Service worker del Circolo Sportivo.
// Strategia: stale-while-revalidate su risorse statiche e sulle letture Supabase
// (GET a /rest/v1/...), così l'app riapre mostrando gli ultimi dati anche
// offline o con rete instabile. Le scritture (POST/PATCH/DELETE) non passano
// mai dalla cache: falliscono normalmente offline, gestite dagli errori già
// presenti nell'app.

const CACHE_STATICA = 'circolo-statica-v1'
const CACHE_DATI = 'circolo-dati-v1'
const CACHE_ATTUALI = [CACHE_STATICA, CACHE_DATI]

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chiavi) =>
      Promise.all(
        chiavi
          .filter((chiave) => !CACHE_ATTUALI.includes(chiave))
          .map((chiave) => caches.delete(chiave)),
      ),
    ),
  )
  self.clients.claim()
})

// Tabelle "vive" (chat, notifiche): aggiornate via realtime/polling e lette
// di continuo dall'app. Se le mettessimo in cache, lo stale-while-revalidate
// restituirebbe sempre la versione vecchia PRIMA di quella fresca, facendo
// sparire messaggi/notifiche appena arrivati finché non si riapre la pagina.
const TABELLE_SENZA_CACHE = ['messaggi_chat', 'notifiche']

function eLetturaSupabase(url, metodo) {
  if (metodo !== 'GET') return false
  if (!url.hostname.endsWith('.supabase.co') || !url.pathname.startsWith('/rest/v1/')) return false
  const tabella = url.pathname.slice('/rest/v1/'.length).split('?')[0]
  return !TABELLE_SENZA_CACHE.includes(tabella)
}

// Risponde subito con la cache se c'è, aggiorna in background per la prossima volta.
function staleWhileRevalidate(request, nomeCache) {
  return caches.open(nomeCache).then((cache) =>
    cache.match(request).then((risposta) => {
      const fetchPromise = fetch(request)
        .then((rispostaRete) => {
          if (rispostaRete && rispostaRete.ok) {
            cache.put(request, rispostaRete.clone())
          }
          return rispostaRete
        })
        .catch(() => risposta)
      return risposta || fetchPromise
    }),
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (eLetturaSupabase(url, request.method)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DATI))
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATICA))
  }
})

// (Fase 1) Notifiche push: la Edge Function "invia-push" manda un payload
// { title, body, url }. Mostriamo la notifica di sistema e, al click, apriamo
// (o portiamo in primo piano) la relativa pagina dell'app. Se l'utente ha già
// aperta e visibile proprio quella pagina (es. la chat con lo stesso amico),
// saltiamo la notifica di sistema: la vede già aggiornarsi in tempo reale.
self.addEventListener('push', (event) => {
  if (!event.data) return

  let dati = {}
  try {
    dati = event.data.json()
  } catch {
    dati = { title: 'Circolo Sportivo', body: event.data.text() }
  }
  const url = dati.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((elenco) => {
      const giaVisibile = elenco.some((c) => c.visibilityState === 'visible' && c.url.includes(url))
      if (giaVisibile) return

      return self.registration.showNotification(dati.title || 'Circolo Sportivo', {
        body: dati.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url },
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((elenco) => {
      const aperta = elenco.find((c) => c.url.includes(url))
      if (aperta) return aperta.focus()
      return self.clients.openWindow(url)
    }),
  )
})
