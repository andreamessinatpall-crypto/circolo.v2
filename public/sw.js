// Service worker del Circolo Sportivo.
// Tre strategie diverse a seconda del tipo di risorsa:
// - navigazione (l'HTML della pagina, cioè ogni apertura/riapertura
//   dell'app): network-first. È il file che punta ai bundle JS/CSS della
//   build corrente, quindi deve sempre riflettere l'ultima versione appena
//   la rete è disponibile — altrimenti un'app installata sul telefono, che
//   resta sospesa e viene "riaperta" invece che ricaricata da zero, potrebbe
//   continuare a mostrare indefinitamente l'ultima versione già in cache
//   anche a distanza di settimane da un aggiornamento.
// - JS/CSS/icone same-origin: stale-while-revalidate, risposta istantanea
//   dalla cache + aggiornamento in background. Va bene perché i file
//   JS/CSS della build hanno un hash nel nome (cambiano nome ad ogni
//   modifica, quindi non c'è mai staleness reale su di essi).
// - letture Supabase (GET /rest/v1/...): network-first con la cache SOLO come
//   ripiego se la rete non risponde (offline/rete instabile). Questi dati sono
//   già gestiti da TanStack Query con invalidation/realtime propri: se li
//   mettessimo anche in stale-while-revalidate, il SW servirebbe sempre la
//   versione precedente prima di quella fresca dopo ogni scrittura (messaggio
//   inviato, presenza confermata, ecc.), facendo sembrare l'azione "sparita"
//   o lenta finché non si riapre la pagina.
// Le scritture (POST/PATCH/DELETE) non passano mai dalla cache: falliscono
// normalmente offline, gestite dagli errori già presenti nell'app.

const CACHE_STATICA = 'circolo-statica-v2'
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

function eLetturaSupabase(url, metodo) {
  return metodo === 'GET' && url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/')
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

// Prova sempre la rete per prima: solo se fallisce (offline) ripiega sulla
// cache. Così i dati letti/aggiornati mentre si è online sono sempre freschi.
function networkFirst(request, nomeCache) {
  return fetch(request)
    .then((rispostaRete) => {
      if (rispostaRete && rispostaRete.ok) {
        // Clonare SUBITO, in modo sincrono: se lo facessimo dentro il .then()
        // di caches.open() (asincrono), la pagina potrebbe aver già iniziato a
        // leggere il corpo della risposta originale nel frattempo, e clone()
        // fallirebbe con "Response body is already used".
        const daSalvare = rispostaRete.clone()
        caches.open(nomeCache).then((cache) => cache.put(request, daSalvare))
      }
      return rispostaRete
    })
    .catch(() =>
      caches.open(nomeCache).then((cache) => cache.match(request)).then((risposta) => risposta || Response.error()),
    )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (eLetturaSupabase(url, request.method)) {
    event.respondWith(networkFirst(request, CACHE_DATI))
    return
  }

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request, CACHE_STATICA))
      return
    }
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
