import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { dataEstesa } from '@/lib/formato'
import Sezione from '@/components/Sezione'
import { SportIcona } from '@/components/IconeSport'
import { unitaTorneo } from '@/features/tornei/gironi'
import CreaTorneoAmiciModal from './CreaTorneoAmiciModal'
import DettaglioTorneoAmici from './DettaglioTorneoAmici'
import { useCreaTorneoAmici, useTorneiAmici } from './useTorneiAmici'
import type { TorneoAmici } from './tipi'

const ETICHETTE_SPORT: Record<string, string> = { padel: 'Padel', calcio: 'Calcio' }
const ETICHETTE_FORMATO: Record<string, string> = { girone: "Girone all'italiana", eliminazione: 'Eliminazione diretta' }
const ETICHETTE_STATO: Record<string, string> = { creazione: 'In formazione', in_corso: 'In corso', concluso: 'Concluso' }

// Card di un torneo tra amici nell'elenco — stesso linguaggio grafico "sobrio"
// delle card dei tornei del club: nome, poi una riga informativa in testo
// piano (senza capsule né emoji), poi la barra in fondo (avanzamento partite
// o, se il torneo non è ancora iniziato, una barra vuota con lo stato).
function CardTorneoAmici({
  torneo,
  nSquadre,
  incontri,
  onApri,
}: {
  torneo: TorneoAmici
  nSquadre: number
  incontri: { totali: number; disputate: number }
  onApri: () => void
}) {
  const formato = ETICHETTE_FORMATO[torneo.formato] + (torneo.andata_ritorno ? ' · Andata e ritorno' : '')
  const creato = 'Creato il ' + dataEstesa(torneo.creato_il.slice(0, 10))
  const unita = unitaTorneo(torneo.sport, nSquadre !== 1)
  const pct = incontri.totali > 0 ? Math.round((incontri.disputate / incontri.totali) * 100) : 0

  return (
    <div className="torneo-club-card verde">
      <button type="button" className="torneo-club-header" onClick={onApri}>
        <div className="tcl-top-row">
          <div className="tcl-nome">{torneo.nome}</div>
          <span className="tcl-chevron" aria-hidden>▸</span>
        </div>
        <div className="tcl-info-riga">
          <div className="tcl-info-sport">
            <SportIcona sport={torneo.sport} size={14} /> {ETICHETTE_SPORT[torneo.sport]} · {formato}
          </div>
          <div className="tcl-info-dettagli">
            {creato}<br />
            {nSquadre} {unita} iscritte
          </div>
        </div>
        <div className="tcl-progress">
          <div className="tcl-progress-track">
            {incontri.totali > 0 && <div className="tcl-progress-fill" style={{ width: pct + '%' }} />}
          </div>
          <span className="tcl-progress-label">
            {incontri.totali > 0 ? `${incontri.disputate}/${incontri.totali} partite giocate` : ETICHETTE_STATO[torneo.stato]}
          </span>
        </div>
      </button>
    </div>
  )
}

// Sezione "Torneo tra amici" incorporata dentro la tab Tornei (stesso
// principio di "Cerco compagno": niente tab/route dedicata in più).
export default function SezioneTorneiAmici() {
  const { profilo } = useAuth()
  const { tornei, perTorneoSquadre, perTorneoIncontri, caricamento, errore } = useTorneiAmici(profilo?.id)
  const crea = useCreaTorneoAmici(profilo?.id)
  const [creando, setCreando] = useState(false)
  const [apertoId, setApertoId] = useState<string | null>(null)

  if (!profilo) return null

  if (errore) {
    return (
      <div className="card text-ink-2">
        {mancaTabella(errore, 'tornei_amici')
          ? 'Esegui lo script tappa56-tornei-amici.sql su Supabase per attivare questa sezione.'
          : 'Impossibile caricare: ' + messaggioErrore(errore)}
      </div>
    )
  }

  if (apertoId) {
    return <DettaglioTorneoAmici torneoId={apertoId} profiloId={profilo.id} onChiuso={() => setApertoId(null)} />
  }

  const attivi = tornei.filter((t) => t.stato !== 'concluso')
  const conclusi = tornei.filter((t) => t.stato === 'concluso')

  function cardDi(t: TorneoAmici) {
    return (
      <CardTorneoAmici
        key={t.id}
        torneo={t}
        nSquadre={perTorneoSquadre[t.id] ?? 0}
        incontri={perTorneoIncontri[t.id] ?? { totali: 0, disputate: 0 }}
        onApri={() => setApertoId(t.id)}
      />
    )
  }

  return (
    <div>
      <button type="button" className="btn btn-oro btn-riflesso btn-block mb-3" onClick={() => setCreando(true)}>
        + Nuovo torneo tra amici
      </button>

      {caricamento ? (
        <p className="sub">Caricamento…</p>
      ) : tornei.length === 0 ? (
        <div className="card py-6 text-center text-sm text-ink-3">
          Nessun torneo tra amici ancora. Creane uno con chi vuoi giocare!
        </div>
      ) : (
        <>
          {attivi.length > 0 ? (
            <div className="flex flex-col gap-3 mb-3">
              {attivi.map(cardDi)}
            </div>
          ) : (
            <p className="sub mb-3">Nessun torneo attivo al momento.</p>
          )}

          {conclusi.length > 0 && (
            <Sezione titolo={`Conclusi (${conclusi.length})`} apertaIniziale={false}>
              <div className="flex flex-col gap-3 mb-3">
                {conclusi.map(cardDi)}
              </div>
            </Sezione>
          )}
        </>
      )}

      {creando && (
        <CreaTorneoAmiciModal crea={crea} onChiudi={() => setCreando(false)} />
      )}
    </div>
  )
}
