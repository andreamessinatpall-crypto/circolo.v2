import { useMemo, useRef, useState } from 'react'
import ModalConferma from '@/components/ModalConferma'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { useMeteo, type PrevisioneGiorno } from '@/hooks/useMeteo'
import { IconaMeteo } from '@/components/IconeMeteo'
import { puoGestirePrenotazioni } from '@/auth/ruoli'
import { messaggioErrore } from '@/lib/errori'
import { useCampi, useImpostazioni, usePrenotazioniGiorno, usePrenotaCampo } from './datiPrenotazioni'
import { oraLocale, ymd } from './orari'
import { SLOT_DEF, costruisciSlots } from './slotGiornata'
import CalendarioSettimana from './CalendarioSettimana'
import type { Campo, PrenotazioneGiorno, Sport } from './tipi'

export default function GrigliaPrenotazioni({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const location = useLocation()
  const impQuery = useImpostazioni()
  const campiQuery = useCampi()
  const [giorno, setGiorno] = useState(() => ymd(new Date()))
  const [scelta, setScelta] = useState<{ campo: Campo; inizio: Date; fine: Date } | null>(null)
  const [annullaPending, setAnnullaPending] = useState<{ id: string; domanda: string } | null>(null)
  useBloccaScrollBody(!!scelta)
  const prenQuery = usePrenotazioniGiorno(giorno)
  const meteoQuery = useMeteo()
  // ID amico da pre-aggiungere alla prenotazione (passato da AmiciProfilo via state).
  // Usato una volta sola: dopo la prima prenotazione lo azzerizziamo.
  const amicoIdRef = useRef<string | null>(
    (location.state as { amicoId?: string } | null)?.amicoId ?? null,
  )

  const imp = impQuery.data ?? {
    giorniAnticipo: 6,
    maxPadel: 0,
    maxCalcio: 0,
    maxPadelGiorno: 0,
    maxCalcioGiorno: 0,
  }

  const campiSport = useMemo(
    () =>
      (campiQuery.data ?? [])
        .filter((c) => c.sport === sport)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)),
    [campiQuery.data, sport],
  )

  const prenota = usePrenotaCampo(sport, campiSport, imp)

  const annulla = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prenotazioni'] }) },
    onError: (e: unknown) =>
      window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  function chiediAnnulla(p: PrenotazioneGiorno, campo: Campo, inizio: Date, diChi?: string) {
    const quando =
      inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) +
      ' alle ' +
      oraLocale(inizio)
    const domanda = diChi
      ? `Annullare la prenotazione di ${diChi} su ${campo.nome} (${quando})?`
      : `Annullare la tua prenotazione su ${campo.nome} (${quando})?`
    setAnnullaPending({ id: String(p.id), domanda })
  }

  // Chi sceglie tra prenotazione "partita" e "allenamento": admin, collaboratore
  // e istruttore. Il socio normale prenota direttamente una partita.
  const staff = !!(profilo && (puoGestirePrenotazioni(profilo) || profilo.e_allenatore))
  function apriPrenota(campo: Campo, inizio: Date, fine: Date) {
    if (staff) setScelta({ campo, inizio, fine })
    else {
      const amico = amicoIdRef.current
      amicoIdRef.current = null
      prenota.mutate({ campo, inizio, fine, allenamento: false, amicoId: amico })
    }
  }

  if (!profilo) return null
  if (campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (campiQuery.error) {
    return (
      <div className="card text-ink-2">
        Impossibile caricare i campi: {messaggioErrore(campiQuery.error)} — Hai eseguito lo
        script <code className="rounded bg-verde-50 px-1">tappa2.sql</code> su Supabase?
      </div>
    )
  }

  const adesso = new Date()

  return (
    <div>
      <CalendarioSettimana
        giorno={giorno}
        onGiorno={setGiorno}
        giorniAnticipo={imp.giorniAnticipo}
        meteo={meteoQuery.data}
      />

      {prenQuery.error && (
        <div className="card text-ink-2">
          Impossibile caricare le prenotazioni: {messaggioErrore(prenQuery.error)}
        </div>
      )}

      {campiSport.length === 0 && (
        <p className="sub">Nessun campo {sport} configurato.</p>
      )}

      {campiSport.map((campo) => (
        <CampoGriglia
          key={campo.id}
          campo={campo}
          giorno={giorno}
          adesso={adesso}
          prenotazioni={(prenQuery.data ?? []).filter(
            (p) => String(p.campo_id) === String(campo.id),
          )}
          isAdmin={!!profilo.is_admin}
          isStaff={staff}
          mioId={profilo.id}
          previsione={campo.outdoor ? meteoQuery.data?.get(giorno) : undefined}
          onPrenota={(inizio, fine) => apriPrenota(campo, inizio, fine)}
          onAnnulla={chiediAnnulla}
        />
      ))}

      {scelta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setScelta(null)}
        >
          <div className="card max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-xl">Cosa prenoti?</h2>
            <p className="sub mb-4">
              {scelta.campo.nome} ·{' '}
              {scelta.inizio.toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}{' '}
              {oraLocale(scelta.inizio)}
            </p>
            <button
              type="button"
              className="btn btn-block mb-2"
              onClick={() => {
                const amico = amicoIdRef.current
                amicoIdRef.current = null
                prenota.mutate({ ...scelta, allenamento: false, amicoId: amico })
                setScelta(null)
              }}
            >
              Prenotazione campo
            </button>
            <button
              type="button"
              className="btn btn-secondario btn-block mb-2"
              onClick={() => {
                prenota.mutate({ ...scelta, allenamento: true })
                setScelta(null)
              }}
            >
              🏋️ Allenamento
            </button>
            <button
              type="button"
              className="btn btn-pericolo btn-block"
              onClick={() => setScelta(null)}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {annullaPending && (
        <ModalConferma
          titolo="Annullare la prenotazione?"
          messaggio={annullaPending.domanda}
          labelConferma="Annulla prenotazione"
          pericolo
          onConferma={() => { annulla.mutate(annullaPending.id); setAnnullaPending(null) }}
          onAnnulla={() => setAnnullaPending(null)}
        />
      )}
    </div>
  )
}

function CampoGriglia({
  campo,
  giorno,
  adesso,
  prenotazioni,
  isAdmin,
  isStaff,
  mioId,
  previsione,
  onPrenota,
  onAnnulla,
}: {
  campo: Campo
  giorno: string
  adesso: Date
  prenotazioni: PrenotazioneGiorno[]
  isAdmin: boolean
  isStaff: boolean
  mioId: string
  previsione?: PrevisioneGiorno
  onPrenota: (inizio: Date, fine: Date) => void
  onAnnulla: (p: PrenotazioneGiorno, campo: Campo, inizio: Date, diChi?: string) => void
}) {
  const fuoriServizio = campo.in_servizio === false
  // (Fase 8g · C) Griglia dinamica: gli slot si adattano agli orari/durate reali
  // delle prenotazioni (così la disponibilità è corretta anche dopo allenamenti
  // da 1h o orari modificati a mano dall'admin).
  const slots = costruisciSlots(campo, giorno, prenotazioni)

  return (
    <div className="campo-blocco">
      <div className="campo-titolo">
        {campo.nome}
        {fuoriServizio && <span className="pill off">Fuori servizio</span>}
        {previsione && (
          <span className="meteo-badge" title={`Previsione: ${Math.round(previsione.tempMax)}°`}>
            <IconaMeteo codice={previsione.weathercode} size={17} />
            {Math.round(previsione.tempMax)}°
          </span>
        )}
      </div>

      {fuoriServizio ? (
        <p className="sub">
          {campo.nota_servizio
            ? 'Campo momentaneamente non prenotabile: ' + campo.nota_servizio
            : 'Campo momentaneamente non prenotabile.'}
        </p>
      ) : (
        <div className="slot-griglia">
          {slots.map((s) => {
            const p = s.booking
            const passato = s.inizio <= adesso
            const mio = p ? p.socio_id === mioId : false

            let classe = 'slot'
            let chi: string
            let disabilitato = false
            let onClick: (() => void) | undefined

            if (p) {
              // Slot occupato da una prenotazione.
              const eTorneo = !!(p.incontro_id || p.torneo_id)
              const tipo = eTorneo ? 'torneo' : p.allenamento ? 'allenamento' : 'partita'
              const labelTorneo = eTorneo ? ((isStaff || isAdmin) ? (p.torneo_nome ?? 'Torneo') : 'Torneo') : null
              const labelTipo = labelTorneo ?? (p.allenamento ? 'Allenamento' : null)
              if (passato) {
                classe += ' occupato tipo-' + tipo
                chi = labelTipo ?? (isAdmin ? p.etichetta ?? 'Prenotato' : mio ? 'Tua' : 'Prenotato')
                disabilitato = true
              } else if (mio && !eTorneo) {
                // Gli slot torneo non sono cancellabili dalla griglia: vanno gestiti
                // dalla pagina del torneo, quindi ricadono sempre nel ramo "occupato".
                classe += ' mio tipo-' + tipo
                chi = 'Tua · tocca per annullare'
                onClick = () => onAnnulla(p, campo, s.inizio)
              } else {
                classe += ' occupato tipo-' + tipo
                if (isAdmin && !eTorneo) {
                  classe += ' annullabile'
                  chi = labelTipo ?? (p.etichetta ?? 'Prenotato')
                  onClick = () => onAnnulla(p, campo, s.inizio, p.etichetta ?? undefined)
                } else {
                  chi = labelTipo ?? (isAdmin ? p.etichetta ?? 'Prenotato' : 'Prenotato')
                  disabilitato = true
                }
              }
            } else if (passato) {
              classe += ' passato'
              chi = '—'
              disabilitato = true
            } else if (s.disponibileMin < (campo.durata_minuti || SLOT_DEF)) {
              // Spazio residuo fra due prenotazioni troppo corto per uno slot
              // pieno di questo campo: lo mostriamo ma non è prenotabile.
              classe += ' libero corto'
              chi = 'Spazio ridotto'
              disabilitato = true
            } else {
              classe += ' libero'
              chi = 'Libero'
              onClick = () => onPrenota(s.inizio, s.fine)
            }

            return (
              <button
                key={`${s.inizio.getTime()}-${p?.id ?? 'free'}`}
                type="button"
                className={classe}
                disabled={disabilitato}
                onClick={onClick}
              >
                <span>
                  {oraLocale(s.inizio)}–{oraLocale(s.fine)}
                </span>
                <span className="chi">{chi}</span>
                {isAdmin && p?.giocatori_torneo && (
                  <span className="sub" style={{ fontSize: '0.72em', lineHeight: 1.3, whiteSpace: 'normal' }}>
                    {p.giocatori_torneo}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
