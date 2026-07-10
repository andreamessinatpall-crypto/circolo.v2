import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaRpc, messaggioErrore } from '@/lib/errori'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { oraLocale } from '@/features/prenotazioni/orari'
import { SportIcona } from '@/components/IconeSport'
import { TipoAttivitaIcona } from '@/components/IconeAttivita'
import { useImpostaRisultato } from './datiRisultato'
import { arricchisciTipoAttivita, cognomeIniziale, righeInMappa, type Attivita, type RigaAttivitaBase } from './attivitaComune'
import type { Sport } from '@/features/prenotazioni/tipi'

const SPORT_LABEL: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }
const GIORNI_FINESTRA = 7

interface AttivitaConclusa extends Attivita {
  risultato: string | null
  risultato_inserito_da: string | null
}

interface RigaConclusa extends RigaAttivitaBase {
  risultato: string | null
  risultato_inserito_da: string | null
}

function IcoFreccia() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// Attività già iniziate negli ultimi 7 giorni (la RPC filtra su `inizio`,
// vedi tappa80-risultato-partite.sql): non più annullabili — al posto del
// bottone "Annulla", chi ha giocato una partita semplice (non allenamento/
// torneo, che hanno il proprio punteggio altrove) può inserire il
// risultato. Oltre i 7 giorni le stesse partite restano visibili solo nello
// Storico attività (con il risultato, se inserito).
export default function AttivitaConcluse({ sport }: { sport?: Sport } = {}) {
  const { profilo } = useAuth()
  const sociQuery = useSociEtichette()
  const [espansa, setEspansa] = useState(false)

  const query = useQuery({
    queryKey: ['partite-concluse', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('partite_concluse', { p_giorni: GIORNI_FINESTRA })
      if (error) throw error
      const righe = (data ?? []) as RigaConclusa[]
      const map = righeInMappa(righe) as Map<string, AttivitaConclusa>
      for (const r of righe) {
        const a = map.get(String(r.prenotazione_id))
        if (a) {
          a.risultato = r.risultato
          a.risultato_inserito_da = r.risultato_inserito_da
        }
      }
      const lista = [...map.values()].sort(
        (a, b) => new Date(b.inizio).getTime() - new Date(a.inizio).getTime(),
      )
      await arricchisciTipoAttivita(map)
      return lista
    },
  })

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [sociQuery.data, profilo])

  if (query.isLoading) return <p className="sub">Caricamento…</p>
  if (query.error) {
    return (
      <p className="sub">
        {mancaRpc(query.error)
          ? 'Esegui lo script tappa80-risultato-partite.sql su Supabase per attivare questa sezione.'
          : 'Impossibile caricare le attività concluse: ' + messaggioErrore(query.error)}
      </p>
    )
  }

  const lista = (query.data ?? []).filter((m) => !sport || m.sport === sport)
  if (lista.length === 0) {
    return <p className="sub">Nessuna attività conclusa questa settimana.</p>
  }

  const label = (id: string) => etichette.get(id) ?? 'Giocatore'
  const visibili = espansa ? lista : lista.slice(0, 1)

  return (
    <div>
      <div className="flex flex-col gap-3">
        {visibili.map((m) => {
          const mia = !!profilo && m.prenotante_id === profilo.id
          const gioco = m.parti.some((p) => p.socio_id === profilo?.id)
          const tipo = m.allenamento ? 'allenamento' : m.torneo_nome ? 'torneo' : 'partita'
          const puoInserire = tipo === 'partita' && (mia || gioco)
          return (
            <div key={m.id} className="amichevole-riga conclusa">
              <div className="amichevole-cap">
                <div>
                  <div className="orario orario-blu">
                    {oraLocale(new Date(m.inizio))}–{oraLocale(new Date(m.fine))}
                  </div>
                  <div className="att-sport">
                    <span className="att-sport-ic"><SportIcona sport={m.sport} /></span>
                    {SPORT_LABEL[m.sport] ?? m.sport}
                    <span className="att-parti-sep">·</span>
                    <span className="att-campo">{m.campo_nome ?? 'Campo'}</span>
                  </div>
                  {m.allenamento && m.allenatore_id && (
                    <div className="dove">Istruttore: {label(m.allenatore_id)}</div>
                  )}
                </div>
                {tipo !== 'partita' && (
                  <TipoAttivitaIcona tipo={tipo} titolo={m.torneo_nome ?? undefined} />
                )}
              </div>
              {m.parti.length > 0 && (
                <div className="att-parti">
                  {m.parti.map((r, i) => (
                    <span key={r.socio_id}>
                      {i > 0 && <span className="att-parti-sep">·</span>}
                      {cognomeIniziale(label(r.socio_id))}
                    </span>
                  ))}
                </div>
              )}
              {tipo === 'partita' && (
                <RisultatoPartita
                  prenotazioneId={String(m.id)}
                  risultato={m.risultato}
                  puoInserire={puoInserire}
                />
              )}
            </div>
          )
        })}
      </div>

      {lista.length > 1 && (
        <button
          type="button"
          className="btn btn-secondario btn-mini mt-3"
          onClick={() => setEspansa((v) => !v)}
        >
          {espansa ? 'Mostra solo la più recente' : `Mostra tutte (${lista.length})`}
          <span className={'freccia-espandi' + (espansa ? ' aperta' : '')}><IcoFreccia /></span>
        </button>
      )}
    </div>
  )
}

function RisultatoPartita({
  prenotazioneId,
  risultato,
  puoInserire,
}: {
  prenotazioneId: string
  risultato: string | null
  puoInserire: boolean
}) {
  const imposta = useImpostaRisultato()
  const [modifica, setModifica] = useState(false)
  const [valore, setValore] = useState(risultato ?? '')

  if (!puoInserire && !risultato) return null

  if (risultato && !modifica) {
    return (
      <div className="mt-auto pt-3 risultato-riga">
        <span className="risultato-etichetta">Risultato</span>
        <span className="risultato-valore">{risultato}</span>
        {puoInserire && (
          <button type="button" className="icon-btn" onClick={() => { setValore(risultato); setModifica(true) }} title="Modifica risultato">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  if (!puoInserire) return null

  return (
    <div className="mt-auto pt-3 flex gap-2">
      <input
        type="text"
        className="!mt-0 flex-1"
        placeholder="es. 6-4, 6-3"
        maxLength={40}
        value={valore}
        onChange={(e) => setValore(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-mini !mt-0"
        disabled={imposta.isPending || !valore.trim()}
        onClick={() =>
          imposta.mutate(
            { prenotazioneId, risultato: valore.trim() },
            { onSuccess: () => setModifica(false) },
          )
        }
      >
        Salva
      </button>
    </div>
  )
}
