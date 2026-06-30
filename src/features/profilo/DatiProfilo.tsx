import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { etichettaGenere } from '@/lib/formato'
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

type Modale = 'salva' | 'scarica' | null

export default function DatiProfilo() {
  const { profilo, ricaricaProfilo } = useAuth()
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

  if (!profilo) return null

  function apriModale(data: DatiForm) {
    pendingData.current = data
    setModale('salva')
  }

  async function confermaSalva(password: string) {
    const data = pendingData.current
    if (!data) return
    const emailCorrente = profilo!.email ?? ''

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
        ? `Dati aggiornati. Abbiamo inviato un link di conferma a ${data.email.trim()}.`
        : 'Dati aggiornati.',
    })
  }

  async function confermaScarica(password: string) {
    const emailCorrente = profilo!.email ?? ''
    const { error } = await supabase.auth.signInWithPassword({ email: emailCorrente, password })
    if (error) throw new Error('Password non corretta.')
    setModale(null)
    const dati = {
      esportato_il: new Date().toISOString(),
      nome: profilo!.nome,
      cognome: profilo!.cognome,
      email: profilo!.email,
      telefono: profilo!.telefono,
      data_nascita: profilo!.data_nascita,
      genere: profilo!.genere,
      sport_preferito: profilo!.sport_preferito,
      data_iscrizione: profilo!.data_iscrizione,
      punti: profilo!.punti,
    }
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dati_personali_${profilo!.cognome}_${profilo!.nome}.json`
    a.click()
    URL.revokeObjectURL(url)
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
      <form onSubmit={handleSubmit(apriModale)} className="card">
        <p className="mb-3 text-sm text-ink-2">
          Nome, cognome e genere non sono modificabili: contatta la segreteria per correggerli.
          Le modifiche verranno confermate con la password.
        </p>

        <label>Nome</label>
        <div className="ro">{profilo.nome}</div>

        <label>Cognome</label>
        <div className="ro">{profilo.cognome}</div>

        <label>Genere</label>
        <div className="ro">{etichettaGenere(profilo.genere)}</div>

        <label htmlFor="dati-email">Email</label>
        <input id="dati-email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className={`mt-1 ${classiErrore}`}>{errors.email.message}</p>}

        <label htmlFor="dati-telefono">Telefono</label>
        <input id="dati-telefono" type="tel" {...register('telefono')} />

        <label htmlFor="dati-data-nascita">Data di nascita</label>
        <input id="dati-data-nascita" type="date" max="9999-12-31" {...register('data_nascita')} />

        <label htmlFor="dati-sport">Sport preferito</label>
        <select id="dati-sport" {...register('sport_preferito')}>
          <option value="entrambi">Padel e Calcio</option>
          <option value="padel">Padel</option>
          <option value="calcio">Calcio</option>
        </select>

        {/* ── Cambia password (opzionale) ── */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <p className="mb-2 text-sm font-semibold text-ink-2">
            Nuova password{' '}
            <span className="font-normal text-ink-3">(lascia vuoto per non cambiarla)</span>
          </p>
          <label htmlFor="dati-pw-nuova">Nuova password (min. 8 caratteri)</label>
          <input
            id="dati-pw-nuova"
            type="password"
            autoComplete="new-password"
            {...register('password_nuova')}
          />
          {errors.password_nuova && (
            <p className={`mt-1 ${classiErrore}`}>{errors.password_nuova.message}</p>
          )}

          <label htmlFor="dati-pw-conferma">Ripeti la nuova password</label>
          <input
            id="dati-pw-conferma"
            type="password"
            autoComplete="new-password"
            {...register('password_conferma')}
          />
          {errors.password_conferma && (
            <p className={`mt-1 ${classiErrore}`}>{errors.password_conferma.message}</p>
          )}
        </div>

        {msg && (
          <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        <button type="submit" className="btn mt-4">
          Salva modifiche
        </button>
      </form>

      <StoricoMovimenti />

      {/* Scarica dati personali (GDPR Art. 20 - portabilità) */}
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </span>
        <h2 className="club-sez-titolo">I tuoi dati personali</h2>
      </div>
      <div className="card">
        <p className="mb-3 text-sm text-ink-2">
          Scarica una copia dei tuoi dati personali in formato JSON (art. 20 GDPR —
          diritto alla portabilità).
        </p>
        <button
          type="button"
          className="btn btn-secondario !mt-0"
          onClick={() => setModale('scarica')}
        >
          Scarica dati personali (JSON)
        </button>
      </div>

      <CancellaAccount />

      {modale === 'salva' && (
        <ModalConfermaPassword
          titolo="Conferma le modifiche"
          descrizione="Inserisci la password attuale per salvare i dati."
          onConferma={confermaSalva}
          onAnnulla={() => setModale(null)}
        />
      )}
      {modale === 'scarica' && (
        <ModalConfermaPassword
          titolo="Scarica i tuoi dati"
          descrizione="Inserisci la password attuale per scaricare i dati personali."
          onConferma={confermaScarica}
          onAnnulla={() => setModale(null)}
        />
      )}
    </div>
  )
}
