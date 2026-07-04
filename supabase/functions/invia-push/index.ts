// Edge Function "invia-push": manda una notifica Web Push a un socio dato il
// suo socio_id. Richiamabile da RPC/trigger lato database (es. via pg_net) o
// da altre Edge Function, mai direttamente dal frontend con la chiave anon:
// legge tutte le subscription del socio con la service role key.
//
// Body atteso: { socio_id: string, titolo: string, corpo?: string, url?: string }
//
// Secret richiesti (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — coppia generata con `npx web-push generate-vapid-keys`
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già forniti automaticamente
// dal runtime delle Edge Function.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:info@circolosportivo.it', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface RichiestaPush {
  socio_id: string
  titolo: string
  corpo?: string
  url?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ errore: 'Metodo non consentito' }), { status: 405 })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ errore: 'VAPID non configurato lato server' }), { status: 500 })
  }

  let corpoRichiesta: RichiestaPush
  try {
    corpoRichiesta = await req.json()
  } catch {
    return new Response(JSON.stringify({ errore: 'JSON non valido' }), { status: 400 })
  }

  const { socio_id, titolo, corpo, url } = corpoRichiesta
  if (!socio_id || !titolo) {
    return new Response(JSON.stringify({ errore: 'socio_id e titolo sono obbligatori' }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Log in-app: il socio la ritrova qui anche se il dispositivo era offline,
  // il permesso non era ancora stato dato o ha ignorato la notifica di sistema.
  await supabase.from('notifiche').insert({ socio_id, titolo, corpo: corpo ?? null, url: url ?? null })

  const { data: subscription, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, chiave_p256dh, chiave_auth')
    .eq('socio_id', socio_id)

  if (error) {
    return new Response(JSON.stringify({ errore: error.message }), { status: 500 })
  }

  const payload = JSON.stringify({ title: titolo, body: corpo ?? '', url: url ?? '/' })

  const risultati = await Promise.allSettled(
    (subscription ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.chiave_p256dh, auth: s.chiave_auth } },
          payload,
        )
      } catch (err) {
        // Subscription scaduta o revocata dal browser: la rimuoviamo.
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
        throw err
      }
    }),
  )

  const inviate = risultati.filter((r) => r.status === 'fulfilled').length
  return new Response(JSON.stringify({ inviate, totali: risultati.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
