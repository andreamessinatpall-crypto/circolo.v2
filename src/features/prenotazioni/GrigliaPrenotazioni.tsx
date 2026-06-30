import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { puoGestirePrenotazioni, prenotaSenzaLimite } from '@/auth/ruoli'
import { messaggioErrore } from '@/lib/errori'
import { useCampi, useImpostazioni, usePrenotazioniGiorno } from './datiPrenotazioni'
import { oraLocale, ymd } from './orari'
import { SLOT_DEF, costruisciSlots } from './slotGiornata'
import type { Campo, PrenotazioneGiorno, Sport } from './tipi'

export default function GrigliaPrenotazioni({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const impQuery = useImpostazioni()
  const campiQuery = useCampi()
  const [giorno, setGiorno] = useState(() => ymd(new Date()))
  const [scelta, setScelta] = useState<{ campo: Campo; inizio: Date; fine: Date } | null>(null)
  const [offset, setOffset] = useState(0)
  const prenQuery = usePrenotazioniGiorno(giorno)
  // ID amico da pre-aggiungere alla prenotazione (passato da AmiciProfilo via state).
  // Usato una volta sola: dopo la prima prenotazione lo azzerizziamo.
  const amicoIdRef = useRef<string | null>(
    (location.state as { amicoId?: string } | null)?.amicoId ?? null,
  )

  const imp = impQuery.data ?? { giorniAnticipo: 6, maxPadel: 0, maxCalcio: 0 }

  const campiSport = useMemo(
    () =>
      (campiQuery.data ?? [])
        .filter((c) => c.sport === sport)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)),
    [campiQuery.data, sport],
  )

  const prenota = useMutation({
    mutationFn: async ({
      campo,
      inizio,
      fine,
      allenamento,
      amicoId,
    }: {
      campo: Campo
      inizio: Date
      fine: Date
      allenamento: boolean
      amicoId?: string | null
    }) => {
      if (!profilo) throw new Error('Profilo non disponibile')
      // Limite di prenotazioni attive per socio (0 = nessun limite; staff esente).
      const limite = sport === 'padel' ? imp.maxPadel : imp.maxCalcio
      const senzaLimite = prenotaSenzaLimite(profilo)
      if (limite > 0 && !senzaLimite) {
        const idCampiSport = campiSport.map((c) => c.id)
        const { count } = await supabase
          .from('prenotazioni')
          .select('id', { count: 'exact', head: true })
          .eq('socio_id', profilo.id)
          .in('campo_id', idCampiSport)
          .gte('fine', new Date().toISOString())
        if (count != null && count >= limite) throw new Error(`LIMITE:${count}:${limite}`)
      }
      const dati: Record<string, unknown> = {
        campo_id: campo.id,
        socio_id: profilo.id,
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
      }
      if (allenamento) {
        dati.allenamento = true
        // Chi è istruttore (o gestisce le prenotazioni) si auto-assegna come
        // istruttore dell'allenamento, così gli compare nella vista Lezioni.
        if (profilo.e_allenatore || puoGestirePrenotazioni(profilo)) dati.allenatore_id = profilo.id
      }
      const { data: creata, error } = await supabase
        .from('prenotazioni')
        .insert(dati)
        .select('id')
        .single()
      if (error) throw error
      // Nelle partite normali il prenotante è subito tra i giocatori.
      // Se è stata avviata da AmiciProfilo, aggiungiamo subito anche l'amico.
      if (!allenamento && creata) {
        const righe: { prenotazione_id: number; socio_id: string; confermato: boolean }[] = [
          { prenotazione_id: creata.id, socio_id: profilo.id, confermato: false },
        ]
        if (amicoId) {
          righe.push({ prenotazione_id: creata.id, socio_id: amicoId, confermato: false })
        }
        await supabase
          .from('partecipanti_amichevole')
          .upsert(righe, { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true })
      }
    },
    onSuccess: () => {
      // Pulisce lo state di navigazione per non ripetere l'auto-aggiunta in booking successivi
      if (amicoIdRef.current) {
        amicoIdRef.current = null
        navigate(location.pathname + location.search, { replace: true, state: {} })
      }
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
      qc.invalidateQueries({ queryKey: ['amichevoli'] })
    },
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string }
      if (err.message?.startsWith('LIMITE:')) {
        const [, c, l] = err.message.split(':')
        window.alert(
          `Hai già ${c} prenotazioni ${sport} attive: il limite è ${l}. Annullane una per prenotare di nuovo.`,
        )
      } else if (err.code === '23505') {
        window.alert('Qualcuno ha appena prenotato questo slot.')
      } else if (err.code === '42501') {
        window.alert(
          `Prenotazione non consentita: si può prenotare solo entro ${imp.giorniAnticipo} giorni e per orari futuri.`,
        )
      } else {
        window.alert('Prenotazione non riuscita: ' + (err.message ?? ''))
      }
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
    },
  })

  const annulla = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prenotazioni'] }),
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
    if (window.confirm(domanda)) annulla.mutate(p.id)
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
  const DOW_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const giorni = Array.from({ length: imp.giorniAnticipo + 1 }, (_, i) => {
    const g = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + i)
    return {
      chiave: ymd(g),
      dow: DOW_IT[g.getDay()],
      num: g.getDate(),
      isOggi: i === 0,
    }
  })

  const WINDOW = 7
  const haNav = giorni.length > WINDOW
  const visibili = giorni.slice(offset, offset + WINDOW)
  const puoSx = offset > 0
  const puoDx = offset + WINDOW < giorni.length

  function navSx() {
    setOffset((o) => Math.max(0, o - WINDOW))
  }
  function navDx() {
    setOffset((o) => Math.min(giorni.length - WINDOW, o + WINDOW))
  }

  return (
    <div>
      <div className={haNav ? 'giorni-nav' : ''}>
        {haNav && (
          <button
            type="button"
            className="giorni-freccia"
            onClick={navSx}
            disabled={!puoSx}
            aria-label="Giorni precedenti"
          >
            ‹
          </button>
        )}
        <div
          className="giorni"
          style={{ gridTemplateColumns: `repeat(${haNav ? WINDOW : visibili.length}, 1fr)` }}
        >
          {visibili.map((g) => (
            <button
              key={g.chiave}
              type="button"
              className={
                'giorno-btn' +
                (g.chiave === giorno ? ' attivo' : '') +
                (g.isOggi ? ' oggi' : '')
              }
              onClick={() => setGiorno(g.chiave)}
            >
              <span className="giorno-btn-dow">{g.dow}</span>
              <span className="giorno-btn-num">{g.num}</span>
            </button>
          ))}
        </div>
        {haNav && (
          <button
            type="button"
            className="giorni-freccia"
            onClick={navDx}
            disabled={!puoDx}
            aria-label="Giorni successivi"
          >
            ›
          </button>
        )}
      </div>

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
            } else if (s.disponibileMin < SLOT_DEF) {
              // Spazio residuo fra due prenotazioni troppo corto per uno slot
              // standard da 1h30: lo mostriamo ma non è prenotabile.
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
