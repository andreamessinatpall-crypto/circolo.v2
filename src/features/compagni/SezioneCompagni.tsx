import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { titleCase, dataEstesa } from '@/lib/formato'
import { ETICHETTE_LIVELLO } from '@/features/profilo/livelloGioco/domande'
import ChatModal from '@/features/chat/ChatModal'
import NuovaRichiestaModal from './NuovaRichiestaModal'
import { useRichiestePartner } from './useRichiestePartner'
import type { RichiestaPartner, Sport } from './useRichiestePartner'

function orario(t: string): string {
  return t.slice(0, 5)
}

// Sezione "Cerco giocatori" incorporata dentro la tab Club del profilo
// (niente tab/route dedicata) così è visibile a tutti i soci del club,
// indipendentemente dal ruolo (socio, collaboratore o istruttore).
export default function SezioneCompagni() {
  const { profilo } = useAuth()
  const { richieste, candidature, sociById, caricamento, errore, crea, aggiorna, elimina, candidati, rispondiCandidatura } =
    useRichiestePartner(profilo?.id)
  const [sport, setSport] = useState<Sport>('padel')
  // null = chiuso, 'nuovo' = crea, altrimenti l'annuncio da modificare.
  const [modaleAnnuncio, setModaleAnnuncio] = useState<'nuovo' | RichiestaPartner | null>(null)
  const [chatCon, setChatCon] = useState<{ id: string; etichetta: string } | null>(null)

  if (!profilo) return null

  if (errore) {
    return (
      <div className="card text-ink-2">
        {mancaTabella(errore, 'richieste_partner')
          ? 'Esegui lo script tappa50-richieste-partner.sql su Supabase per attivare questa sezione.'
          : 'Impossibile caricare: ' + messaggioErrore(errore)}
      </div>
    )
  }

  function candidatureDi(richiestaId: number) {
    return candidature.filter((c) => c.richiesta_id === richiestaId)
  }

  const richiesteVisibili = richieste.filter((r) => {
    if (r.sport !== sport) return false
    if (r.sport !== 'calcio' || r.socio_id === profilo.id) return true
    const accettati = candidatureDi(r.id).filter((c) => c.stato === 'accettato').length
    return (r.giocatori_mancanti ?? 0) - accettati > 0
  })

  return (
    <div>
      <div className="seg-group mb-3">
        <button type="button" className={'seg-btn' + (sport === 'padel' ? ' attivo' : '')} onClick={() => setSport('padel')}>
          Padel
        </button>
        <button type="button" className={'seg-btn' + (sport === 'calcio' ? ' attivo' : '')} onClick={() => setSport('calcio')}>
          Calcio
        </button>
      </div>

      <button type="button" className="btn btn-verde-scuro btn-block mb-3" onClick={() => setModaleAnnuncio('nuovo')}>
        + Nuovo annuncio
      </button>

      {caricamento ? (
        <p className="sub">Caricamento…</p>
      ) : richiesteVisibili.length === 0 ? (
        <div className="card py-6 text-center text-sm text-ink-3">
          Nessun annuncio attivo per {sport === 'padel' ? 'il padel' : 'il calcio'}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {richiesteVisibili.map((r) => {
            const mio = r.socio_id === profilo.id
            const nome = mio ? 'Tu' : titleCase(sociById.get(r.socio_id) ?? 'Giocatore')
            const mieCandidature = candidatureDi(r.id)
            const miaCandidatura = mieCandidature.find((c) => c.socio_id === profilo.id)
            const accettati = mieCandidature.filter((c) => c.stato === 'accettato').length

            return (
              <div key={r.id} className="card compagni-card">
                <div className="compagni-card-head">
                  <span className="compagni-card-nome">{nome}</span>
                  <span className="compagni-card-quando">
                    {dataEstesa(r.giorno)} · {orario(r.ora_inizio)}
                  </span>
                </div>

                {r.sport === 'padel' && r.livello && (
                  <p className="sub">Livello: {ETICHETTE_LIVELLO[r.livello]}</p>
                )}
                {r.sport === 'padel' ? (
                  <p className="sub">
                    Manca{r.giocatori_mancanti === 1 ? '' : 'no'} {r.giocatori_mancanti} giocator
                    {r.giocatori_mancanti === 1 ? 'e' : 'i'}
                  </p>
                ) : (
                  <p className="sub">Mancano {Math.max(0, (r.giocatori_mancanti ?? 0) - accettati)} giocatori</p>
                )}

                {mio ? (
                  <>
                    {r.sport === 'calcio' && mieCandidature.length > 0 && (
                      <div className="compagni-candidature">
                        {mieCandidature.map((c) => (
                          <div key={c.id} className="compagni-candidatura-riga">
                            <span>{titleCase(sociById.get(c.socio_id) ?? 'Giocatore')}</span>
                            {c.stato === 'in_attesa' ? (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  className="btn btn-mini"
                                  onClick={() => rispondiCandidatura.mutate({ candidatura: c, stato: 'accettato' })}
                                >
                                  Accetta
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-pericolo btn-mini"
                                  onClick={() => rispondiCandidatura.mutate({ candidatura: c, stato: 'rifiutato' })}
                                >
                                  Rifiuta
                                </button>
                              </div>
                            ) : (
                              <span className={'pill' + (c.stato === 'accettato' ? '' : ' off')}>
                                {c.stato === 'accettato' ? 'Accettato' : 'Rifiutato'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      <button
                        type="button"
                        className="btn btn-secondario btn-mini"
                        onClick={() => setModaleAnnuncio(r)}
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        className="btn btn-pericolo btn-mini"
                        onClick={() => elimina.mutate(r.id)}
                        disabled={elimina.isPending}
                      >
                        Elimina annuncio
                      </button>
                    </div>
                  </>
                ) : r.sport === 'padel' ? (
                  <button
                    type="button"
                    className="btn btn-sm mt-2"
                    onClick={() => setChatCon({ id: r.socio_id, etichetta: nome })}
                  >
                    Rispondi
                  </button>
                ) : miaCandidatura ? (
                  <span className="pill off mt-2">
                    {miaCandidatura.stato === 'in_attesa'
                      ? 'In attesa di risposta'
                      : miaCandidatura.stato === 'accettato'
                        ? 'Accettato ✓'
                        : 'Non accettato'}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm mt-2"
                    onClick={() => candidati.mutate(r)}
                    disabled={candidati.isPending}
                  >
                    Candidati
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modaleAnnuncio && (
        <NuovaRichiestaModal
          crea={crea}
          aggiorna={aggiorna}
          modifica={modaleAnnuncio !== 'nuovo' ? modaleAnnuncio : undefined}
          onChiudi={() => setModaleAnnuncio(null)}
        />
      )}
      {chatCon && <ChatModal profiloId={profilo.id} amico={chatCon} onChiudi={() => setChatCon(null)} />}
    </div>
  )
}
