# invia-push

Edge Function che manda una notifica Web Push a un socio dato il suo `socio_id`,
leggendo le sue subscription dalla tabella `push_subscriptions`.

## Deploy e configurazione (una tantum)

```
supabase functions deploy invia-push
supabase secrets set VAPID_PUBLIC_KEY=<chiave pubblica>
supabase secrets set VAPID_PRIVATE_KEY=<chiave privata>
```

La stessa chiave pubblica va anche in `.env.local` come `VITE_VAPID_PUBLIC_KEY`
(la usa il frontend per la `pushManager.subscribe()`). La chiave privata NON va
mai nel frontend: vive solo come secret di questa funzione.

Per generare una nuova coppia: `npx web-push generate-vapid-keys`.

## Chiamata

```
POST /functions/v1/invia-push
Authorization: Bearer <service_role o anon con verifica JWT>
Content-Type: application/json

{ "socio_id": "uuid-del-socio", "titolo": "Titolo", "corpo": "Testo", "url": "/prenota" }
```

Pensata per essere richiamata da un trigger/RPC lato database (es. `pg_net.http_post`)
o da un'altra Edge Function quando si verifica uno degli eventi che generano
una push (vedi elenco nel prompt di progetto), non direttamente dal frontend.
