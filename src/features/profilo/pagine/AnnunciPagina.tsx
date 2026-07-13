import { useAuth } from '@/auth/useAuth'
import { annuncioAttivo, useAnnunci } from '@/features/profilo/datiAnnunci'
import { tempoRelativo } from '@/lib/formato'
import { messaggioErrore } from '@/lib/errori'
import { FormNuovoAnnuncio, RigaAnnuncio } from '@/features/segreteria/GestioneAnnunci'
import { TorneiInProgramma } from '../TorneiClub'
import TornaAreaClub from './TornaAreaClub'

// Unisce le comunicazioni del club (per i soci sola lettura; admin e
// collaboratori possono invece pubblicare, modificare ed eliminare
// direttamente da qui — stessi componenti di GestioneAnnunci.tsx, non
// duplicati) e i tornei in programma in un'unica pagina, raggiunta dalla
// scorciatoia "Annunci" di Area Club. `embedded` nasconde l'intestazione con
// freccia indietro quando il componente è incorporato altrove (scheda
// Annunci nella campanella notifiche) invece di essere una vera pagina/route.
export default function AnnunciPagina({ embedded = false }: { embedded?: boolean }) {
  const { profilo } = useAuth()
  const puoPubblicare = !!profilo?.is_admin || !!profilo?.is_allenatore
  const { data, isLoading, error } = useAnnunci()
  const lista = (data ?? []).filter((a) => annuncioAttivo(a))

  return (
    <div>
      {!embedded && <TornaAreaClub titolo="Annunci" />}

      <div className="eyebrow" style={{ marginTop: 0 }}>Tornei in programma</div>
      <div className="card">
        <TorneiInProgramma />
      </div>

      <div className="eyebrow">Comunicazioni del club</div>
      <div className="card">
        {puoPubblicare && <FormNuovoAnnuncio autoreId={profilo!.id} />}
        {isLoading ? (
          <p className="sub">Caricamento…</p>
        ) : error ? (
          <p className="sub">Impossibile caricare gli annunci: {messaggioErrore(error)}</p>
        ) : lista.length === 0 ? (
          <p className="sub">Nessuna comunicazione al momento.</p>
        ) : puoPubblicare ? (
          lista.map((a) => <RigaAnnuncio key={a.id} annuncio={a} />)
        ) : (
          lista.map((a) => (
            <div key={a.id} className="annuncio-riga">
              {a.immagine ? (
                <div className="annuncio-img-wrap">
                  <img src={a.immagine} alt="" className="annuncio-img" />
                  <div className="annuncio-img-titolo">{a.titolo}</div>
                </div>
              ) : (
                <div className="font-semibold">{a.titolo}</div>
              )}
              {a.testo && <p className="sub m-0 mt-1.5 whitespace-pre-wrap">{a.testo}</p>}
              <div className="mt-1.5 text-xs text-ink-3">{tempoRelativo(a.creato_il)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
