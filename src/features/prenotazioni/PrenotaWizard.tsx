import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { useMeteo } from '@/hooks/useMeteo'
import { IconaMeteo } from '@/components/IconeMeteo'
import { SportIcona } from '@/components/IconeSport'
import { messaggioErrore } from '@/lib/errori'
import CalendarioSettimana from './CalendarioSettimana'
import { useCampi, useImpostazioni, usePrenotaCampo, usePrenotazioniGiorno } from './datiPrenotazioni'
import { oraLocale, ymd } from './orari'
import { costruisciSlots, SLOT_DEF } from './slotGiornata'
import type { Campo, Sport } from './tipi'

const ETICHETTA: Record<Sport, string> = { padel: 'Padel', calcio: 'Calcio' }

// Un orario libero, con l'elenco dei campi che a quell'ora hanno uno slot pieno
// disponibile (durate diverse per campo → orari di inizio diversi per campo).
interface OrarioDisponibile {
  chiave: string // "HH:MM", per ordinare
  label: string
  campi: { campo: Campo; inizio: Date; fine: Date }[]
}

interface DettagliConferma {
  campoNome: string
  giornoLabel: string
  oraInizio: string
  oraFine: string
}

// Finestra di esito dopo la conferma, stesso pattern "risultato" dei
// questionari (QuestionarioLivello.tsx/QuestionarioPreferenze.tsx): overlay
// scuro a tutto schermo via portale, box bianco centrato, eyebrow + titolo
// grande + riepilogo + bottone dorato di chiusura.
function PrenotazioneConfermataModal({ dettagli, onChiudi }: { dettagli: DettagliConferma; onChiudi: () => void }) {
  useBloccaScrollBody()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onChiudi])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onChiudi}>
      <div className="card w-full max-w-lg questionario-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="questionario-chiudi" onClick={onChiudi} aria-label="Chiudi">
          ✕
        </button>
        <div className="questionario-risultato">
          <p className="eyebrow" style={{ marginTop: 0 }}>Prenotazione</p>
          <p className="questionario-risultato-intro">La tua prenotazione è</p>
          <h2 className="questionario-risultato-livello">CONFERMATA</h2>
          <p className="sub mb-1">{dettagli.campoNome}</p>
          <p className="sub mb-4">{dettagli.giornoLabel} · {dettagli.oraInizio}–{dettagli.oraFine}</p>
          <button type="button" className="btn btn-oro" onClick={onChiudi}>
            Fatto
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Flusso guidato di prenotazione per il giocatore normale (non staff):
// calendario → sport → orari liberi → campo disponibile → conferma. Sostituisce,
// solo per questo ruolo, la griglia per-campo di GrigliaPrenotazioni.tsx (che
// resta invariata per admin/collaboratore/istruttore).
export default function PrenotaWizard({ sportOptions }: { sportOptions: Sport[] }) {
  const { profilo } = useAuth()
  const location = useLocation()
  const [giorno, setGiornoRaw] = useState(() => ymd(new Date()))
  const [sport, setSportRaw] = useState<Sport>(sportOptions[0] ?? 'padel')
  const [oraSel, setOraSelRaw] = useState<string | null>(null)
  const [campoSel, setCampoSel] = useState<Campo | null>(null)
  const [ultimaConferma, setUltimaConferma] = useState<DettagliConferma | null>(null)

  const amicoIdRef = useRef<string | null>(
    (location.state as { amicoId?: string } | null)?.amicoId ?? null,
  )

  const impQuery = useImpostazioni()
  const campiQuery = useCampi()
  const prenQuery = usePrenotazioniGiorno(giorno)
  const meteoQuery = useMeteo()

  const imp = impQuery.data ?? { giorniAnticipo: 6, maxPadel: 0, maxCalcio: 0 }
  const attivo = sportOptions.includes(sport) ? sport : (sportOptions[0] ?? 'padel')

  function setGiorno(g: string) {
    setGiornoRaw(g)
    setOraSelRaw(null)
    setCampoSel(null)
  }
  function setSport(s: Sport) {
    setSportRaw(s)
    setOraSelRaw(null)
    setCampoSel(null)
  }
  function setOraSel(o: string) {
    setOraSelRaw(o)
    setCampoSel(null)
  }

  const campiSport = useMemo(
    () =>
      (campiQuery.data ?? [])
        .filter((c) => c.sport === attivo && c.in_servizio !== false)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)),
    [campiQuery.data, attivo],
  )

  const prenota = usePrenotaCampo(attivo, campiSport, imp)

  const orari = useMemo<OrarioDisponibile[]>(() => {
    const adesso = new Date()
    const mappa = new Map<string, OrarioDisponibile>()
    for (const campo of campiSport) {
      const durata = campo.durata_minuti || SLOT_DEF
      const prenotazioniCampo = (prenQuery.data ?? []).filter(
        (p) => String(p.campo_id) === String(campo.id),
      )
      const slots = costruisciSlots(campo, giorno, prenotazioniCampo)
      for (const s of slots) {
        if (s.booking) continue
        if (s.inizio <= adesso) continue
        if (s.disponibileMin < durata) continue // "spazio ridotto", non prenotabile qui
        const chiave = `${String(s.inizio.getHours()).padStart(2, '0')}:${String(s.inizio.getMinutes()).padStart(2, '0')}`
        let voce = mappa.get(chiave)
        if (!voce) {
          voce = { chiave, label: oraLocale(s.inizio), campi: [] }
          mappa.set(chiave, voce)
        }
        voce.campi.push({ campo, inizio: s.inizio, fine: s.fine })
      }
    }
    return [...mappa.values()].sort((a, b) => a.chiave.localeCompare(b.chiave))
  }, [campiSport, prenQuery.data, giorno])

  const orarioSel = orari.find((o) => o.chiave === oraSel) ?? null

  function conferma() {
    if (!campoSel || !orarioSel) return
    const scelta = orarioSel.campi.find((c) => c.campo.id === campoSel.id)
    if (!scelta) return
    const amico = amicoIdRef.current
    amicoIdRef.current = null
    const dettagli: DettagliConferma = {
      campoNome: scelta.campo.nome,
      giornoLabel: scelta.inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
      oraInizio: oraLocale(scelta.inizio),
      oraFine: oraLocale(scelta.fine),
    }
    prenota.mutate(
      { campo: scelta.campo, inizio: scelta.inizio, fine: scelta.fine, allenamento: false, amicoId: amico },
      {
        onSuccess: () => {
          setOraSelRaw(null)
          setCampoSel(null)
          setUltimaConferma(dettagli)
        },
      },
    )
  }

  if (!profilo) return null
  if (campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (campiQuery.error) {
    return (
      <div className="card text-ink-2">
        Impossibile caricare i campi: {messaggioErrore(campiQuery.error)}
      </div>
    )
  }

  return (
    <div>
      <CalendarioSettimana
        giorno={giorno}
        onGiorno={setGiorno}
        giorniAnticipo={imp.giorniAnticipo}
        meteo={meteoQuery.data}
      />

      {sportOptions.length > 1 && (
        <nav className="sport-selettore" aria-label="Scegli lo sport">
          {sportOptions.map((s) => (
            <button
              key={s}
              type="button"
              className={'sport-rett' + (s === attivo ? ' attivo' : '')}
              onClick={() => setSport(s)}
            >
              <SportIcona sport={s} size={18} />{ETICHETTA[s]}
            </button>
          ))}
        </nav>
      )}

      <div className="eyebrow">Orari liberi</div>
      {prenQuery.error ? (
        <div className="card text-ink-2">
          Impossibile caricare le prenotazioni: {messaggioErrore(prenQuery.error)}
        </div>
      ) : campiSport.length === 0 ? (
        <p className="sub">Nessun campo {ETICHETTA[attivo].toLowerCase()} configurato.</p>
      ) : orari.length === 0 ? (
        <p className="sub">Nessun orario libero per {ETICHETTA[attivo].toLowerCase()} in questo giorno.</p>
      ) : (
        <div className="slot-griglia">
          {orari.map((o) => (
            <button
              key={o.chiave}
              type="button"
              className={'slot libero' + (o.chiave === oraSel ? ' mio' : '')}
              onClick={() => setOraSel(o.chiave)}
            >
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}

      {orarioSel && (
        <>
          <div className="eyebrow">Campo disponibile · {orarioSel.label}</div>
          <div className="flex flex-col gap-2.5">
            {orarioSel.campi.map(({ campo, inizio, fine }) => {
              const previsione = campo.outdoor ? meteoQuery.data?.get(giorno) : undefined
              return (
                <button
                  key={campo.id}
                  type="button"
                  className={'campo-scelta' + (campoSel?.id === campo.id ? ' sel' : '')}
                  onClick={() => setCampoSel(campo)}
                >
                  <span className="campo-scelta-nome">{campo.nome}</span>
                  <span className="campo-scelta-orario">
                    {oraLocale(inizio)}–{oraLocale(fine)}
                  </span>
                  {previsione && (
                    <span className="meteo-badge" title={`Previsione: ${Math.round(previsione.tempMax)}°`}>
                      <IconaMeteo codice={previsione.weathercode} size={16} />
                      {Math.round(previsione.tempMax)}°
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {campoSel && orarioSel && (
        <div className="card mt-4">
          {(() => {
            const scelta = orarioSel.campi.find((c) => c.campo.id === campoSel.id)
            if (!scelta) return null
            return (
              <p className="sub mb-3">
                {scelta.campo.nome} ·{' '}
                {scelta.inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' '}· {oraLocale(scelta.inizio)}–{oraLocale(scelta.fine)}
              </p>
            )
          })()}
          <button
            type="button"
            className="btn btn-block"
            disabled={prenota.isPending}
            onClick={conferma}
          >
            Prenota il campo
          </button>
        </div>
      )}

      {ultimaConferma && (
        <PrenotazioneConfermataModal dettagli={ultimaConferma} onChiudi={() => setUltimaConferma(null)} />
      )}
    </div>
  )
}
