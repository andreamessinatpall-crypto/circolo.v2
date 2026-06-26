import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTornei } from '@/features/tornei/datiTornei'
import type { DatiTornei } from '@/features/tornei/datiTornei'
import ClassificaTorneo from '@/features/tornei/ClassificaTorneo'
import Risultati from '@/features/tornei/Risultati'
import Sezione from '@/components/Sezione'
import { incontroDisputato } from '@/features/tornei/calendario'
import { numGironi, unitaTorneo } from '@/features/tornei/gironi'
import { FORMATI_TORNEO, SPORT_LABEL } from '@/features/tornei/tipi'
import type { Torneo } from '@/features/tornei/tipi'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useAuth } from '@/auth/useAuth'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { supabase } from '@/lib/supabase'

const SPORT_ICONA: Record<string, string> = { padel: '🎾', calcio: '⚽' }

function fmtData(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function periodoTorneo(t: Torneo): string | null {
  if (t.data_inizio && t.data_fine) return `${fmtData(t.data_inizio)} – ${fmtData(t.data_fine)}`
  if (t.data_inizio) return `Dal ${fmtData(t.data_inizio)}`
  if (t.data_fine) return `Fino al ${fmtData(t.data_fine)}`
  return null
}

function CardTorneo({ torneo, dati }: { torneo: Torneo; dati: DatiTornei }) {
  const [aperto, setAperto] = useState(false)

  const squadre = dati.perTorneoSquadre[String(torneo.id)] ?? []
  const incontri = dati.perTorneoIncontri[String(torneo.id)] ?? []
  const nGironi = numGironi(torneo)
  const nSquadre = squadre.length
  const nIncontri = incontri.length
  const disputate = incontri.filter(incontroDisputato).length
  const pct = nIncontri > 0 ? Math.round((disputate / nIncontri) * 100) : 0
  const periodo = periodoTorneo(torneo)
  const formato = FORMATI_TORNEO[torneo.formato] ?? torneo.formato

  return (
    <div className={'torneo-club-card' + (aperto ? ' aperta' : '')}>
      <button
        type="button"
        className="torneo-club-header"
        aria-expanded={aperto}
        onClick={() => setAperto((a) => !a)}
      >
        <div className="tcl-top-row">
          <span className={`tcl-sport-badge tcl-sport-${torneo.sport}`}>
            {SPORT_ICONA[torneo.sport]} {SPORT_LABEL[torneo.sport] ?? torneo.sport}
          </span>
          <span className="tcl-chevron" aria-hidden>{aperto ? '▾' : '▸'}</span>
        </div>

        <div className="tcl-nome">{torneo.nome}</div>
        <div className="tcl-formato">{formato}</div>

        <div className="tcl-meta-row">
          {periodo && (
            <span className="tcl-chip">
              <span className="tcl-chip-ic">📅</span>{periodo}
            </span>
          )}
          <span className="tcl-chip">
            <span className="tcl-chip-ic">👥</span>
            {nSquadre} {nSquadre === 1 ? unitaTorneo(torneo.sport, false) : unitaTorneo(torneo.sport, true)}
          </span>
          {nGironi > 1 && (
            <span className="tcl-chip">
              <span className="tcl-chip-ic">🏆</span>{nGironi} gironi
            </span>
          )}
        </div>

        {nIncontri > 0 && (
          <div className="tcl-progress">
            <div className="tcl-progress-track">
              <div className="tcl-progress-fill" style={{ width: pct + '%' }} />
            </div>
            <span className="tcl-progress-label">
              {disputate}/{nIncontri} partite giocate
            </span>
          </div>
        )}
      </button>

      {aperto && (
        <div className="torneo-club-body">
          <Sezione titolo="Classifica">
            <ClassificaTorneo torneo={torneo} squadre={squadre} incontri={incontri} />
          </Sezione>
          <Sezione titolo="Calendario e risultati" apertaIniziale={false}>
            <Risultati
              torneo={torneo}
              squadre={squadre}
              incontri={incontri}
              gestore={false}
              prenByIncontro={dati.prenByIncontro}
              compBySquadra={dati.perSquadraComp}
            />
          </Sezione>
        </div>
      )}
    </div>
  )
}

// ─── Modale iscrizione torneo in programma ─────────────────────────────────

function ModaleIscrizione({
  torneo,
  onClose,
}: {
  torneo: Torneo
  onClose: () => void
}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const sociQuery = useSociPubblici()
  const soci = sociQuery.data ?? []

  const [compagni, setCompagni] = useState<string[]>([])
  const [selezionato, setSelezionato] = useState('')

  const maxCompagni = torneo.sport === 'padel' ? 2 : Infinity
  const pieno = compagni.length >= maxCompagni

  const disponibili = soci.filter(
    (s) => s.id !== profilo?.id && !compagni.includes(s.id),
  )

  const etichette = new Map(soci.map((s) => [s.id, s.etichetta]))

  function aggiungi() {
    if (!selezionato || pieno) return
    setCompagni((prev) => [...prev, selezionato])
    setSelezionato('')
  }

  const invia = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('iscriviti_torneo', {
        p_torneo_id: torneo.id,
        p_componenti: compagni,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tornei'] })
      onClose()
    },
    onError: (e: unknown) => window.alert('Errore: ' + messaggioErrore(e)),
  })

  return (
    <div className="modale-sfondo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modale-box">
        <div className="modale-titolo">Iscriviti a {torneo.nome}</div>

        <p className="sub mb-3">
          {torneo.sport === 'padel'
            ? 'La squadra può avere fino a 3 giocatori incluso te.'
            : 'Aggiungi i tuoi compagni di squadra.'}
        </p>

        {/* Richiedente sempre presente */}
        <div className="iscrizione-team">
          <div className="iscrizione-giocatore iscrizione-richiedente">
            <span className="iscrizione-nome">{profilo?.cognome} {profilo?.nome?.charAt(0)}.</span>
            <span className="iscrizione-tag">tu</span>
          </div>

          {compagni.map((id) => (
            <div key={id} className="iscrizione-giocatore">
              <span className="iscrizione-nome">{etichette.get(id) ?? 'Giocatore'}</span>
              <button
                type="button"
                className="iscrizione-rimuovi"
                onClick={() => setCompagni((prev) => prev.filter((x) => x !== id))}
                aria-label="Rimuovi"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {!pieno && (
          <div className="iscrizione-aggiungi-row">
            <select
              className="select-campo"
              value={selezionato}
              onChange={(e) => setSelezionato(e.target.value)}
              disabled={sociQuery.isLoading}
            >
              <option value="">— Scegli un compagno —</option>
              {disponibili.map((s) => (
                <option key={s.id} value={s.id}>{s.etichetta}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondario"
              onClick={aggiungi}
              disabled={!selezionato}
            >
              Aggiungi
            </button>
          </div>
        )}

        <div className="modale-azioni">
          <button type="button" className="btn btn-secondario" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="btn btn-oro btn-riflesso"
            onClick={() => invia.mutate()}
            disabled={invia.isPending}
          >
            {invia.isPending ? 'Invio…' : 'Invia richiesta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card torneo in programma ──────────────────────────────────────────────

function CardTorneoInProgramma({
  torneo,
  dati,
}: {
  torneo: Torneo
  dati: DatiTornei
}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const [apriModale, setApriModale] = useState(false)

  const squadre = dati.perTorneoSquadre[String(torneo.id)] ?? []
  const nSquadre = squadre.length
  const periodo = periodoTorneo(torneo)
  const formato = FORMATI_TORNEO[torneo.formato] ?? torneo.formato

  const isIscritto = !!(profilo && dati.assegnati[String(torneo.id)]?.has(profilo.id))
  const isFull = torneo.max_squadre != null && nSquadre >= torneo.max_squadre

  const disdici = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('disdici_torneo', { p_torneo_id: torneo.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tornei'] }),
    onError: (e: unknown) => window.alert('Errore: ' + messaggioErrore(e)),
  })

  return (
    <>
      <div className="torneo-club-card torneo-club-card-programma">
        <div className="tcl-top-row">
          <span className={`tcl-sport-badge tcl-sport-${torneo.sport}`}>
            {SPORT_ICONA[torneo.sport]} {SPORT_LABEL[torneo.sport] ?? torneo.sport}
          </span>
          {isIscritto ? (
            <div className="tcl-iscritto-col">
              <span className="tcl-iscritto-badge">✓ Iscritto</span>
              <button
                type="button"
                className="tcl-disdici-btn"
                title="Annulla iscrizione"
                disabled={disdici.isPending}
                onClick={() => {
                  if (window.confirm('Vuoi annullare l\'iscrizione a questo torneo?')) disdici.mutate()
                }}
              >
                {disdici.isPending ? '…' : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                )}
              </button>
            </div>
          ) : isFull ? (
            <span className="tcl-chiuse-badge">🔒 Completo</span>
          ) : (
            <button
              type="button"
              className="btn btn-oro btn-riflesso btn-mini"
              onClick={() => setApriModale(true)}
            >
              Iscriviti
            </button>
          )}
        </div>

        <div className="tcl-nome">{torneo.nome}</div>
        <div className="tcl-formato">{formato}</div>

        <div className="tcl-meta-row">
          {periodo && (
            <span className="tcl-chip">
              <span className="tcl-chip-ic">📅</span>{periodo}
            </span>
          )}
          <span className="tcl-chip">
            <span className="tcl-chip-ic">👥</span>
            {torneo.max_squadre
              ? `${nSquadre}/${torneo.max_squadre} squadre iscritte`
              : nSquadre > 0
                ? `${nSquadre} ${nSquadre === 1 ? unitaTorneo(torneo.sport, false) : unitaTorneo(torneo.sport, true)} iscritte`
                : 'Nessuna squadra ancora'}
          </span>
        </div>
      </div>

      {apriModale && (
        <ModaleIscrizione torneo={torneo} onClose={() => setApriModale(false)} />
      )}
    </>
  )
}

// ─── Sezione pubblica ──────────────────────────────────────────────────────

export function TorneiInCorso() {
  const { profilo } = useAuth()
  const torneiQuery = useTornei()

  if (torneiQuery.isLoading) return <p className="sub">Caricamento…</p>

  if (torneiQuery.error) {
    if (mancaTabella(torneiQuery.error, 'tornei')) return <p className="sub">Nessun torneo disponibile.</p>
    return <p className="sub">Impossibile caricare i tornei: {messaggioErrore(torneiQuery.error)}</p>
  }

  const d = torneiQuery.data!
  const sport = profilo?.sport_preferito ?? 'entrambi'

  const inCorso = d.tornei.filter((t) => {
    if (t.stato !== 'in_corso') return false
    if (sport === 'entrambi') return true
    return t.sport === sport
  })

  if (inCorso.length === 0) {
    return (
      <p className="sub">
        {sport === 'entrambi'
          ? 'Nessun torneo in corso al momento.'
          : `Nessun torneo di ${SPORT_LABEL[sport] ?? sport} in corso. Puoi cambiare la tua preferenza sport nel profilo.`}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {inCorso.map((t) => (
        <CardTorneo key={t.id} torneo={t} dati={d} />
      ))}
    </div>
  )
}

export function TorneiInProgramma() {
  const { profilo } = useAuth()
  const torneiQuery = useTornei()

  if (torneiQuery.isLoading) return <p className="sub">Caricamento…</p>

  if (torneiQuery.error) {
    if (mancaTabella(torneiQuery.error, 'tornei')) return <p className="sub">Nessun torneo disponibile.</p>
    return <p className="sub">Impossibile caricare i tornei: {messaggioErrore(torneiQuery.error)}</p>
  }

  const d = torneiQuery.data!
  const sport = profilo?.sport_preferito ?? 'entrambi'

  const inProgramma = d.tornei.filter((t) => {
    if (t.stato !== 'in_programma') return false
    if (sport === 'entrambi') return true
    return t.sport === sport
  })

  if (inProgramma.length === 0) {
    return (
      <p className="sub">
        {sport === 'entrambi'
          ? 'Nessun torneo in programma al momento.'
          : `Nessun torneo di ${SPORT_LABEL[sport] ?? sport} in programma. Puoi cambiare la tua preferenza sport nel profilo.`}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {inProgramma.map((t) => (
        <CardTorneoInProgramma key={t.id} torneo={t} dati={d} />
      ))}
    </div>
  )
}
