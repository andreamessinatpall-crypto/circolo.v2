import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa, etichettaSport } from '@/lib/formato'
import { messaggioErrore } from '@/lib/errori'
import { oraLocale } from '@/features/prenotazioni/orari'
import { STATI_TORNEO } from '@/features/tornei/tipi'
import StoricoMovimenti from './StoricoMovimenti'
import {
  usePartiteGiocate,
  useLezioniStoriche,
  useTorneiPartecipati,
} from './attivita/useStoricoAttivita'
import type { PartitaStorico, TorneoStorico } from './attivita/useStoricoAttivita'

const MOSTRATI_INIZIALI = 5

function IcoScendi() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function RigaPartita({ p }: { p: PartitaStorico }) {
  return (
    <div className="storico-riga">
      <div className="storico-riga-info">
        <span className="storico-riga-titolo">{p.campoNome ?? 'Campo'}</span>
        <span className="storico-riga-sub">
          {dataEstesa(p.inizio.slice(0, 10))} · {oraLocale(new Date(p.inizio))}–{oraLocale(new Date(p.fine))}
        </span>
        {p.risultato && <span className="storico-riga-risultato">Risultato: {p.risultato}</span>}
      </div>
      {p.sport && <span className="storico-riga-pill">{etichettaSport(p.sport)}</span>}
    </div>
  )
}

function RigaTorneo({ t }: { t: TorneoStorico }) {
  return (
    <div className="storico-riga">
      <div className="storico-riga-info">
        <span className="storico-riga-titolo">{t.nome}</span>
        <span className="storico-riga-sub">
          {t.data_inizio ? dataEstesa(t.data_inizio.slice(0, 10)) : 'Data da definire'}
          {t.data_fine ? ` – ${dataEstesa(t.data_fine.slice(0, 10))}` : ''}
        </span>
      </div>
      <span className="storico-riga-pill">{STATI_TORNEO[t.stato as keyof typeof STATI_TORNEO] ?? t.stato}</span>
    </div>
  )
}

// Mostra solo le prime 5 righe, con un bottone "Mostra altre N" per
// estendere l'elenco (freccia verso il basso, richiesto esplicitamente
// invece di scaricare/mostrare subito uno storico potenzialmente lunghissimo).
function ListaEspandibile<T>({ dati, chiave, riga }: { dati: T[]; chiave: (t: T) => string | number; riga: (t: T) => React.ReactNode }) {
  const [espansa, setEspansa] = useState(false)
  const visibili = espansa ? dati : dati.slice(0, MOSTRATI_INIZIALI)
  const altre = dati.length - MOSTRATI_INIZIALI

  return (
    <>
      <div className="flex flex-col">
        {visibili.map((el) => <div key={chiave(el)}>{riga(el)}</div>)}
      </div>
      {altre > 0 && (
        <button
          type="button"
          className="storico-espandi-btn"
          onClick={() => setEspansa((v) => !v)}
        >
          {espansa ? 'Mostra meno' : `Mostra altre ${altre}`}
          <span className={'storico-espandi-ico' + (espansa ? ' ruotata' : '')}><IcoScendi /></span>
        </button>
      )}
    </>
  )
}

// Fase D (Modifica profilo → Storico attività): storico di partite giocate,
// lezioni svolte e tornei a cui il socio ha partecipato. Niente titolo in
// cima: la schermata che la ospita (MenuUtente) mostra già "Storico attività"
// nell'intestazione fissa in alto.
export default function AttivitaPage() {
  const { profilo } = useAuth()
  const partite = usePartiteGiocate(profilo?.id)
  const lezioni = useLezioniStoriche(profilo?.id)
  const tornei = useTorneiPartecipati(profilo?.id)

  return (
    <div>
      <div className="club-sez-header">
        <h2 className="club-sez-titolo">Partite giocate</h2>
      </div>
      <div className="card">
        {partite.isLoading && <p className="sub m-0">Caricamento…</p>}
        {partite.error && <p className="msg-errore m-0">{messaggioErrore(partite.error)}</p>}
        {!partite.isLoading && !partite.error && partite.data?.length === 0 && (
          <p className="sub m-0">Nessuna partita giocata finora.</p>
        )}
        {(partite.data?.length ?? 0) > 0 && (
          <ListaEspandibile dati={partite.data!} chiave={(p) => p.id} riga={(p) => <RigaPartita p={p} />} />
        )}
      </div>

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Lezioni</h2>
      </div>
      <div className="card">
        {lezioni.isLoading && <p className="sub m-0">Caricamento…</p>}
        {lezioni.error && <p className="msg-errore m-0">{messaggioErrore(lezioni.error)}</p>}
        {!lezioni.isLoading && !lezioni.error && lezioni.data?.length === 0 && (
          <p className="sub m-0">Nessuna lezione svolta finora.</p>
        )}
        {(lezioni.data?.length ?? 0) > 0 && (
          <ListaEspandibile dati={lezioni.data!} chiave={(p) => p.id} riga={(p) => <RigaPartita p={p} />} />
        )}
      </div>

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Competizioni</h2>
      </div>
      <div className="card">
        {tornei.isLoading && <p className="sub m-0">Caricamento…</p>}
        {tornei.error && <p className="msg-errore m-0">{messaggioErrore(tornei.error)}</p>}
        {!tornei.isLoading && !tornei.error && tornei.data?.length === 0 && (
          <p className="sub m-0">Nessun torneo a cui hai partecipato finora.</p>
        )}
        {(tornei.data?.length ?? 0) > 0 && (
          <ListaEspandibile dati={tornei.data!} chiave={(t) => t.id} riga={(t) => <RigaTorneo t={t} />} />
        )}
      </div>

      <StoricoMovimenti />
    </div>
  )
}
