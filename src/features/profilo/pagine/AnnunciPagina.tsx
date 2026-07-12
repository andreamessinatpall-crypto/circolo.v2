import { useAnnunci } from '@/features/profilo/datiAnnunci'
import { tempoRelativo } from '@/lib/formato'
import { messaggioErrore } from '@/lib/errori'
import { TorneiInProgramma } from '../TorneiClub'
import TornaAreaClub from './TornaAreaClub'

// Unisce le comunicazioni del club (sola lettura: la gestione resta in
// Segreteria, vedi GestioneAnnunci.tsx) e i tornei in programma in un'unica
// pagina, raggiunta dalla scorciatoia "Annunci" di Area Club. `embedded`
// nasconde l'intestazione con freccia indietro quando il componente è
// incorporato altrove (scheda Annunci nella campanella notifiche) invece di
// essere una vera pagina/route.
export default function AnnunciPagina({ embedded = false }: { embedded?: boolean }) {
  const { data, isLoading, error } = useAnnunci()
  const lista = data ?? []

  return (
    <div>
      {!embedded && <TornaAreaClub titolo="Annunci" />}

      <div className="eyebrow" style={{ marginTop: 0 }}>Tornei in programma</div>
      <div className="card">
        <TorneiInProgramma />
      </div>

      <div className="eyebrow">Comunicazioni del club</div>
      <div className="card">
        {isLoading ? (
          <p className="sub">Caricamento…</p>
        ) : error ? (
          <p className="sub">Impossibile caricare gli annunci: {messaggioErrore(error)}</p>
        ) : lista.length === 0 ? (
          <p className="sub">Nessuna comunicazione al momento.</p>
        ) : (
          lista.map((a) => (
            <div key={a.id} className="annuncio-riga">
              <div className="font-semibold">{a.titolo}</div>
              <p className="sub m-0 mt-0.5 whitespace-pre-wrap">{a.testo}</p>
              <div className="mt-1.5 text-xs text-ink-3">{tempoRelativo(a.creato_il)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
