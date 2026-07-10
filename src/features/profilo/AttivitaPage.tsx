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

function RigaPartita({ p }: { p: PartitaStorico }) {
  return (
    <div className="storico-riga">
      <div className="storico-riga-info">
        <span className="storico-riga-titolo">{p.campoNome ?? 'Campo'}</span>
        <span className="storico-riga-sub">
          {dataEstesa(p.inizio.slice(0, 10))} · {oraLocale(new Date(p.inizio))}–{oraLocale(new Date(p.fine))}
        </span>
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
          <div className="flex flex-col">
            {partite.data!.map((p) => <RigaPartita key={p.id} p={p} />)}
          </div>
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
          <div className="flex flex-col">
            {lezioni.data!.map((p) => <RigaPartita key={p.id} p={p} />)}
          </div>
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
          <div className="flex flex-col">
            {tornei.data!.map((t) => <RigaTorneo key={t.id} t={t} />)}
          </div>
        )}
      </div>

      <StoricoMovimenti />
    </div>
  )
}
