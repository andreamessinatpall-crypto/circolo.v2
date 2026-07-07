import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

type StatoPush = 'non-supportato' | 'negato' | 'attivo' | 'non-attivo'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Sicura = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Sicura)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function leggiStato(): Promise<StatoPush> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return 'non-supportato'
  }
  if (Notification.permission === 'denied') return 'negato'

  const registrazione = await navigator.serviceWorker.getRegistration()
  const subscription = await registrazione?.pushManager.getSubscription()
  return subscription ? 'attivo' : 'non-attivo'
}

// Richiede il permesso di notifica e salva la subscription su Supabase.
// Da chiamare al primo utilizzo di una funzione che invia push (chat,
// lista d'attesa, ecc.), mai forzato all'avvio dell'app.
export function usePushNotifiche(socioId: string | undefined) {
  const qc = useQueryClient()

  const statoQuery = useQuery({
    queryKey: ['push-stato'],
    queryFn: leggiStato,
  })

  const attiva = useMutation({
    mutationFn: async () => {
      if (!socioId) throw new Error('Utente non autenticato')
      if (!VAPID_PUBLIC_KEY) throw new Error('Chiave VAPID non configurata (VITE_VAPID_PUBLIC_KEY mancante).')
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Le notifiche push non sono supportate su questo dispositivo/browser.')
      }

      const permesso = await Notification.requestPermission()
      if (permesso !== 'granted') throw new Error('Permesso notifiche negato.')

      const registrazione = await navigator.serviceWorker.ready
      let subscription = await registrazione.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registrazione.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const json = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          socio_id: socioId,
          endpoint: subscription.endpoint,
          chiave_p256dh: json.keys?.p256dh ?? '',
          chiave_auth: json.keys?.auth ?? '',
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['push-stato'] }) },
  })

  const disattiva = useMutation({
    mutationFn: async () => {
      const registrazione = await navigator.serviceWorker.getRegistration()
      const subscription = await registrazione?.pushManager.getSubscription()
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['push-stato'] }) },
  })

  return {
    stato: statoQuery.data ?? 'non-attivo',
    caricamento: statoQuery.isLoading,
    attiva,
    disattiva,
  }
}
