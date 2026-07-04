// Edge Function "invia-push": manda una notifica Web Push a un socio dato il
// suo socio_id. Chiamata direttamente dal frontend (supabase.functions.invoke,
// vedi useChat.ts/usePushNotifiche.ts) oppure da RPC/trigger lato database —
// legge tutte le subscription del socio con la service role key, quindi non
// serve che il chiamante abbia accesso diretto a push_subscriptions.
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
  // Se true, non aggiunge una nuova riga in "notifiche" quando esiste già
  // una notifica con la stessa url per lo stesso socio creata oggi (usato
  // dalla chat: tante notifiche push quanti messaggi, ma un solo promemoria
  // in campanella al giorno per amico).
  unaVoltaAlGiorno?: boolean
}

// Chiamata dal browser via supabase.functions.invoke: senza questi header
// il preflight OPTIONS fallisce e il browser blocca la richiesta per CORS.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ errore: 'Metodo non consentito' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ errore: 'VAPID non configurato lato server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let corpoRichiesta: RichiestaPush
  try {
    corpoRichiesta = await req.json()
  } catch {
    return new Response(JSON.stringify({ errore: 'JSON non valido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { socio_id, titolo, corpo, url, unaVoltaAlGiorno } = corpoRichiesta
  if (!socio_id || !titolo) {
    return new Response(JSON.stringify({ errore: 'socio_id e titolo sono obbligatori' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Log in-app: il socio la ritrova qui anche se il dispositivo era offline,
  // il permesso non era ancora stato dato o ha ignorato la notifica di sistema.
  let giaOggi = false
  if (unaVoltaAlGiorno) {
    const inizioGiorno = new Date()
    inizioGiorno.setUTCHours(0, 0, 0, 0)
    const { data: esistente } = await supabase
      .from('notifiche')
      .select('id')
      .eq('socio_id', socio_id)
      .eq('url', url ?? '')
      .gte('creato_il', inizioGiorno.toISOString())
      .limit(1)
    giaOggi = !!esistente && esistente.length > 0
  }
  if (!giaOggi) {
    await supabase.from('notifiche').insert({ socio_id, titolo, corpo: corpo ?? null, url: url ?? null })
  }

  const { data: subscription, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, chiave_p256dh, chiave_auth')
    .eq('socio_id', socio_id)

  if (error) {
    return new Response(JSON.stringify({ errore: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
