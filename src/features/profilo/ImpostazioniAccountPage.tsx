import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { supabase } from '@/lib/supabase'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { usePushNotifiche } from '@/hooks/usePushNotifiche'
import { classiErrore } from '@/components/stili'
import CancellaAccount from './CancellaAccount'

// Fase A (restyling scheda account): "Impostazioni" raccoglie Notifiche ed
// Elimina account, già esistenti (spostati qui da DatiProfilo.tsx). Fase F:
// "Account privato" collegato a soci.account_privato (nasconde da classifica,
// ricerca amici e nuove richieste — vedi tappa77-account-privato.sql). Il
// blocco dei singoli utenti resta segnaposto, fase a parte. Niente titolo
// qui dentro: la schermata che la ospita (MenuUtente) mostra già
// "Impostazioni" nell'intestazione fissa in alto.

function eIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function IcoCampanella() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IcoScudo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  )
}

function IcoLucchetto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

const PILL_STATO: Record<string, { testo: string; classe: string }> = {
  attivo: { testo: 'Attive', classe: 'ok' },
  'non-attivo': { testo: 'Non attive', classe: 'off' },
  negato: { testo: 'Bloccate', classe: 'bloccato' },
  'non-supportato': { testo: 'Non disponibili', classe: 'off' },
}

function SezioneNotifiche({ socioId }: { socioId: string }) {
  const { stato, caricamento, attiva, disattiva } = usePushNotifiche(socioId)

  if (caricamento) return null

  const erroreTabella =
    (attiva.error && mancaTabella(attiva.error, 'push_subscriptions')) ||
    (disattiva.error && mancaTabella(disattiva.error, 'push_subscriptions'))
  const pill = PILL_STATO[stato]

  return (
    <div className="card sezione-moderna">
      <div className="sezione-moderna-head">
        <span className="sezione-moderna-icona"><IcoCampanella /></span>
        <div className="sezione-moderna-testi">
          <h3 className="sezione-moderna-titolo">Notifiche push</h3>
          <p className="sezione-moderna-sub">Avvisi in tempo reale su questo dispositivo</p>
        </div>
        <span className={`sezione-moderna-pill ${pill.classe}`}>{pill.testo}</span>
      </div>

      {erroreTabella && (
        <p className={classiErrore}>
          Esegui lo script tappa43-push-subscriptions.sql su Supabase per attivare le notifiche.
        </p>
      )}

      {stato === 'non-supportato' && (
        <p className="sub">
          {eIos()
            ? "Su iPhone/iPad le notifiche funzionano solo se l'app è installata sulla schermata Home (tocca Condividi → Aggiungi alla schermata Home nel browser Safari) e la apri da lì, con iOS 16.4 o successivo."
            : 'Le notifiche push non sono supportate su questo browser.'}
        </p>
      )}

      {stato === 'negato' && (
        <p className="sub">Le notifiche sono bloccate nelle impostazioni del browser per questo sito.</p>
      )}

      {stato === 'attivo' && (
        <button type="button" className="btn btn-secondario btn-sm" onClick={() => disattiva.mutate()} disabled={disattiva.isPending}>
          {disattiva.isPending ? 'Disattivo…' : 'Disattiva'}
        </button>
      )}

      {stato === 'non-attivo' && (
        <button type="button" className="btn btn-sm" onClick={() => attiva.mutate()} disabled={attiva.isPending}>
          {attiva.isPending ? 'Attivo…' : 'Attiva notifiche'}
        </button>
      )}

      {attiva.error && !erroreTabella && (
        <p className={`mt-2 ${classiErrore}`}>{messaggioErrore(attiva.error)}</p>
      )}
    </div>
  )
}

function SezionePrivacy({ socioId, attivo }: { socioId: string; attivo: boolean }) {
  const { ricaricaProfilo } = useAuth()

  const cambia = useMutation({
    mutationFn: async (nuovo: boolean) => {
      const { error } = await supabase.from('soci').update({ account_privato: nuovo }).eq('id', socioId)
      if (error) throw error
    },
    onSuccess: ricaricaProfilo,
    onError: (e: unknown) => window.alert('Salvataggio non riuscito: ' + messaggioErrore(e)),
  })

  return (
    <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
      <div className="sezione-moderna-head">
        <span className="sezione-moderna-icona"><IcoScudo /></span>
        <div className="sezione-moderna-testi">
          <h3 className="sezione-moderna-titolo">Account privato</h3>
          <p className="sezione-moderna-sub">
            Non comparirai in classifica, nella ricerca amici né nei nuovi inviti — puoi comunque prenotare normalmente
          </p>
        </div>
        <span className={'sezione-moderna-pill ' + (attivo ? 'ok' : 'off')}>{attivo ? 'Attivo' : 'Disattivo'}</span>
      </div>
      <button
        type="button"
        className="btn btn-secondario btn-sm"
        onClick={() => cambia.mutate(!attivo)}
        disabled={cambia.isPending}
      >
        {cambia.isPending ? 'Salvataggio…' : attivo ? 'Disattiva' : 'Attiva'}
      </button>
      <p className="sub mt-2 mb-0" style={{ fontSize: '0.76rem' }}>
        Le amicizie già esistenti non vengono toccate. Il blocco di singoli utenti arriverà in una fase dedicata.
      </p>
    </div>
  )
}

export default function ImpostazioniAccountPage() {
  const { profilo } = useAuth()
  if (!profilo) return null

  return (
    <div>
      <SezioneNotifiche socioId={profilo.id} />

      <SezionePrivacy socioId={profilo.id} attivo={!!profilo.account_privato} />

      <div className="card sezione-moderna" style={{ marginTop: '0.75rem' }}>
        <div className="sezione-moderna-head">
          <span className="sezione-moderna-icona"><IcoLucchetto /></span>
          <div className="sezione-moderna-testi">
            <h3 className="sezione-moderna-titolo">Sicurezza</h3>
            <p className="sezione-moderna-sub">Il cambio password si trova in Modifica profilo</p>
          </div>
        </div>
      </div>

      <CancellaAccount />
    </div>
  )
}
