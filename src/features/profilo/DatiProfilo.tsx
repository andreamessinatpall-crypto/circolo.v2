import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { etichettaGenere } from '@/lib/formato'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { usePushNotifiche } from '@/hooks/usePushNotifiche'
import { classiErrore, classiOk } from '@/components/stili'
import { MedagliaLv } from './MedagliaLv'
import StoricoMovimenti from './StoricoMovimenti'
import CancellaAccount from './CancellaAccount'
import ModalConfermaPassword from './ModalConfermaPassword'

const schema = z
  .object({
    email: z.string().trim().email('Email non valida'),
    telefono: z.string().trim().optional(),
    data_nascita: z.string().optional(),
    sport_preferito: z.enum(['padel', 'calcio', 'entrambi']),
    password_nuova: z.string().optional(),
    password_conferma: z.string().optional(),
  })
  .refine(
    (d) => !d.password_nuova || d.password_nuova.length >= 8,
    { message: 'La nuova password deve avere almeno 8 caratteri.', path: ['password_nuova'] },
  )
  .refine(
    (d) => !d.password_nuova || d.password_nuova === d.password_conferma,
    { message: 'Le password non coincidono.', path: ['password_conferma'] },
  )

type DatiForm = z.infer<typeof schema>

type Modale = 'salva' | null

function eIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// Sezione "Notifiche push": permesso richiesto a mano dal socio (mai forzato
// all'avvio), riusata come base da chat/lista d'attesa nelle fasi successive.
function SezioneNotifiche({ socioId }: { socioId: string }) {
  const { stato, caricamento, attiva, disattiva } = usePushNotifiche(socioId)

  if (caricamento) return null

  const erroreTabella =
    (attiva.error && mancaTabella(attiva.error, 'push_subscriptions')) ||
    (disattiva.error && mancaTabella(disattiva.error, 'push_subscriptions'))

  return (
    <div className="card" style={{ marginTop: '0.75rem' }}>
      <p className="dati-check-titolo" style={{ marginBottom: '0.5rem' }}>Notifiche push</p>

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
        <>
          <p className={classiOk}>Notifiche attive su questo dispositivo.</p>
          <button
            type="button"
            className="btn btn-secondario btn-sm mt-2"
            onClick={() => disattiva.mutate()}
            disabled={disattiva.isPending}
          >
            {disattiva.isPending ? 'Disattivo…' : 'Disattiva'}
          </button>
        </>
      )}

      {stato === 'non-attivo' && (
        <>
          <p className="sub">Ricevi un avviso su questo dispositivo per messaggi, prenotazioni e tornei.</p>
          <button
            type="button"
            className="btn btn-sm mt-2"
            onClick={() => attiva.mutate()}
            disabled={attiva.isPending}
          >
            {attiva.isPending ? 'Attivo…' : 'Attiva notifiche'}
          </button>
        </>
      )}

      {attiva.error && !erroreTabella && (
        <p className={`mt-2 ${classiErrore}`}>{messaggioErrore(attiva.error)}</p>
      )}
    </div>
  )
}

export default function DatiProfilo() {
  const { profilo, utente, ricaricaProfilo } = useAuth()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [modale, setModale] = useState<Modale>(null)
  const pendingData = useRef<DatiForm | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DatiForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: profilo?.email ?? '',
      telefono: profilo?.telefono ?? '',
      data_nascita: profilo?.data_nascita ?? '',
      sport_preferito: profilo?.sport_preferito ?? 'entrambi',
      password_nuova: '',
      password_conferma: '',
    },
  })

  const istruttore = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin
  const [mostraNome, setMostraNome] = useState(profilo?.mostra_in_classifica ?? false)

  if (!profilo) return null

  async function handleToggleMostraNome() {
    const nuovo = !mostraNome
    setMostraNome(nuovo)
    await supabase.from('soci').update({ mostra_in_classifica: nuovo }).eq('id', profilo!.id)
    await ricaricaProfilo()
  }

  function apriModale(data: DatiForm) {
    pendingData.current = data
    setModale('salva')
  }

  async function confermaSalva(password: string) {
    const data = pendingData.current
    if (!data) return
    const emailCorrente = utente?.email ?? profilo!.email ?? ''

    // 1. Verifica password
    const { error: errPw } = await supabase.auth.signInWithPassword({
      email: emailCorrente,
      password,
    })
    if (errPw) throw new Error('Password non corretta.')

    // 2. Aggiorna dati soci (telefono, data nascita, sport, classifica, email display)
    const aggiornaSoci: Record<string, unknown> = {
      telefono: data.telefono?.trim() || null,
      data_nascita: data.data_nascita || null,
      sport_preferito: data.sport_preferito,
    }
    const emailCambiata = data.email.trim() !== emailCorrente
    if (emailCambiata) aggiornaSoci.email = data.email.trim()

    const { error: errSoci } = await supabase
      .from('soci')
      .update(aggiornaSoci)
      .eq('id', profilo!.id)
    if (errSoci) throw new Error('Salvataggio non riuscito: ' + errSoci.message)

    // 3. Se email cambiata: invia link di conferma
    if (emailCambiata) {
      const { error: errEmail } = await supabase.auth.updateUser({ email: data.email.trim() })
      if (errEmail) throw new Error('Cambio email non riuscito: ' + errEmail.message)
    }

    // 4. Se nuova password: aggiorna
    if (data.password_nuova) {
      const { error: errPwNuova } = await supabase.auth.updateUser({ password: data.password_nuova })
      if (errPwNuova) throw new Error('Cambio password non riuscito: ' + errPwNuova.message)
    }

    await ricaricaProfilo()
    setModale(null)
    pendingData.current = null
    reset({
      email: data.email.trim(),
      telefono: data.telefono,
      data_nascita: data.data_nascita,
      sport_preferito: data.sport_preferito,
      password_nuova: '',
      password_conferma: '',
    })
    setMsg({
      tipo: 'ok',
      testo: emailCambiata
        ? `Dati aggiornati. Abbiamo inviato un link di conferma a ${data.email.trim()}. Il cambio diventerà effettivo solo dopo aver cliccato il link nella tua casella di posta.`
        : 'Dati aggiornati.',
    })
  }

  return (
    <div>
      <div className="sez-hero">
        <div className="sez-hero-top">
          <MedagliaLv punti={profilo.punti ?? 0} size={54} />
          <div className="sez-hero-info">
            <div className="sez-hero-eyebrow">Il tuo profilo</div>
            <h2>{profilo.nome} {profilo.cognome}</h2>
          </div>
        </div>
      </div>

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </span>
        <h2 className="club-sez-titolo">I tuoi dati</h2>
      </div>
      <form onSubmit={handleSubmit(apriModale)} className="card form-verde form-campo">

        {/* Nome + Cognome separati con icona propria */}
        <div className="dati-coppia" style={{ marginTop: 0 }}>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </span>
            <div className="ro flex-1 min-w-0">{profilo.nome}</div>
          </div>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </span>
            <div className="ro flex-1 min-w-0">{profilo.cognome}</div>
          </div>
        </div>

        {/* Genere + Data nascita sulla stessa riga */}
        <div className="dati-coppia">
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>
            </span>
            <div className="ro flex-1 min-w-0">{etichettaGenere(profilo.genere)}</div>
          </div>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <input id="dati-data-nascita" type="date" max="9999-12-31" aria-label="Data di nascita" {...register('data_nascita')} />
          </div>
        </div>

        {/* Email + Telefono sulla stessa riga */}
        <div className="dati-coppia">
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
            </span>
            <div className="flex-1 min-w-0">
              <input id="dati-email" type="email" autoComplete="email" aria-label="Email" {...register('email')} />
              {errors.email && <p className={`mt-1 ${classiErrore}`}>{errors.email.message}</p>}
            </div>
          </div>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </span>
            <input id="dati-telefono" type="tel" aria-label="Telefono" {...register('telefono')} />
          </div>
        </div>

        {/* Sport preferito */}
        <div className="dati-riga">
          <span className="dati-riga-ico" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="15" cy="4" r="2"/><path d="M14.5 6L12 12"/><path d="M13 8.5L9.5 6"/><path d="M13 8.5L17 11"/><path d="M12 12L16 15L15 21"/><path d="M12 12L8 16"/></svg>
          </span>
          <select id="dati-sport" aria-label="Sport preferito" {...register('sport_preferito')}>
            <option value="entrambi">Padel e Calcio</option>
            <option value="padel">Padel</option>
            <option value="calcio">Calcio</option>
          </select>
        </div>

        {/* Password */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1.25rem' }}>
          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-xs font-semibold opacity-70">Nuova password</p>
              <input id="dati-pw-nuova" type="password" autoComplete="new-password" aria-label="Nuova password (min. 8 caratteri)" placeholder="Min. 8 caratteri" {...register('password_nuova')} />
              {errors.password_nuova && <p className={`mt-1 ${classiErrore}`}>{errors.password_nuova.message}</p>}
            </div>
          </div>

          <div className="dati-riga">
            <span className="dati-riga-ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/><polyline points="9 16 11 18 15 14"/></svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-xs font-semibold opacity-70">Conferma password</p>
              <input id="dati-pw-conferma" type="password" autoComplete="new-password" aria-label="Ripeti la nuova password" placeholder="Ripeti la password" {...register('password_conferma')} />
              {errors.password_conferma && <p className={`mt-1 ${classiErrore}`}>{errors.password_conferma.message}</p>}
            </div>
          </div>
        </div>

        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        <button type="submit" className="btn mt-4" style={{ border: '2px solid rgba(255,255,255,0.7)' }}>
          Salva modifiche
        </button>
      </form>

      {!istruttore && (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <label className="dati-check-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              className="dati-check"
              checked={mostraNome}
              onChange={handleToggleMostraNome}
            />
            <span>
              <span className="dati-check-titolo">Mostra il mio nome nella classifica del club agli altri giocatori</span>
            </span>
          </label>
        </div>
      )}

      <SezioneNotifiche socioId={profilo.id} />

      <StoricoMovimenti />

      <CancellaAccount />

      {modale === 'salva' && (
        <ModalConfermaPassword
          titolo="Conferma le modifiche"
          descrizione="Inserisci la password attuale per salvare i dati."
          onConferma={confermaSalva}
          onAnnulla={() => setModale(null)}
        />
      )}
    </div>
  )
}
