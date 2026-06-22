import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import { mancaColonnaManuale, useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { SchedaPartita } from '@/features/prenotazioni/MieAmichevoli'
import { assegnaPuntiPresenza, annullaPuntiPresenza } from '@/features/prenotazioni/puntiPresenze'
import { SLOT_MINUTI, dataDa, oraLocale, orariCampo } from '@/features/prenotazioni/orari'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useValoriPunti } from './datiPunti'
import { usePrenotazioniAdminIntervallo } from './datiPrenotazioniAdmin'
import type { MiaPrenotazione, Partecipante } from '@/features/prenotazioni/datiAmichevoli'
import type { Campo, Sport } from '@/features/prenotazioni/tipi'

// ── Utilità sulle date (settimana lun→dom, in ora locale) ──
function lunedi(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // lunedì = 0
  x.setDate(x.getDate() - dow)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${g}`
}
const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// Uno slot selezionato = la finestra aperta su una cella del tabellone.
interface SlotScelto {
  campo: Campo
  inizio: Date
  fine: Date
  booking: MiaPrenotazione | null
}

// (Fase 8g) Segreteria · calendario settimanale + tabellone a slot per campo;
// cliccando uno slot si aprono gestione giocatori e conferma presenze.
export default function GestionePrenotazioni() {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const [sport, setSport] = useState<Sport>('padel')
  const [inizioSettimana, setInizioSettimana] = useState<Date>(() => lunedi(new Date()))
  const [giornoSel, setGiornoSel] = useState<string>(() => ymd(new Date()))
  const [slot, setSlot] = useState<SlotScelto | null>(null)

  const campiQuery = useCampi()
  const sociQuery = useSociPubblici()
  const valoriQuery = useValoriPunti()
  const modalitaPremiQuery = useModalitaPremi()

  const campiSport = useMemo(
    () =>
      (campiQuery.data ?? [])
        .filter((c) => c.sport === sport)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)),
    [campiQuery.data, sport],
  )
  const idCampi = useMemo(() => campiSport.map((c) => c.id), [campiSport])

  const giorni = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(inizioSettimana, i)),
    [inizioSettimana],
  )
  const daIso = inizioSettimana.toISOString()
  const aIso = addDays(inizioSettimana, 7).toISOString()
  const pren = usePrenotazioniAdminIntervallo(idCampi, daIso, aIso)

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    return m
  }, [sociQuery.data])

  // Prenotazioni per giorno (ymd) e partecipanti per prenotazione.
  const prenPerGiorno = new Map<string, MiaPrenotazione[]>()
  for (const p of pren.data?.lista ?? []) {
    const k = ymd(new Date(p.inizio))
    if (!prenPerGiorno.has(k)) prenPerGiorno.set(k, [])
    prenPerGiorno.get(k)!.push(p)
  }
  const partsByPren = new Map<string, Partecipante[]>()
  for (const r of pren.data?.parts ?? []) {
    const k = String(r.prenotazione_id)
    if (!partsByPren.has(k)) partsByPren.set(k, [])
    partsByPren.get(k)!.push(r)
  }

  // Una prenotazione è "confermato" se ha partecipanti e sono tutti confermati,
  // altrimenti è "attesa" (da confermare).
  const statoPren = (prenId: number | string): 'confermato' | 'attesa' => {
    const parts = partsByPren.get(String(prenId)) ?? []
    return parts.length > 0 && parts.every((p) => p.confermato) ? 'confermato' : 'attesa'
  }

  const aggiorna = () => {
    qc.invalidateQueries({ queryKey: ['pren-admin'] })
    qc.invalidateQueries({ queryKey: ['prenotazioni'] })
  }
  const aggiornaSaldi = () => {
    qc.invalidateQueries({ queryKey: ['soci'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
    qc.invalidateQueries({ queryKey: ['riepilogo-stat'] })
    qc.invalidateQueries({ queryKey: ['storico-movimenti'] })
  }

  const aggiungi = useMutation({
    mutationFn: async ({ prenId, socioId }: { prenId: number | string; socioId: string }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .upsert([{ prenotazione_id: prenId, socio_id: socioId, confermato: false }], {
          onConflict: 'prenotazione_id,socio_id',
          ignoreDuplicates: true,
        })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Aggiunta non riuscita: ' + messaggioErrore(e)),
  })

  const aggiungiOspite = useMutation({
    mutationFn: async ({ prenId, nome }: { prenId: number | string; nome: string }) => {
      const { error } = await supabase.from('partecipanti_amichevole').insert({
        prenotazione_id: prenId,
        socio_id: null,
        nome_manuale: nome,
        confermato: false,
      })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaManuale(e)
          ? 'Per aggiungere ospiti esegui lo script tappa15-partecipanti-id.sql su Supabase.'
          : 'Aggiunta non riuscita: ' + messaggioErrore(e),
      ),
  })

  const rimuovi = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('partecipanti_amichevole').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  // Conferma/annulla presenza + punti/crediti.
  const conferma = useMutation({
    mutationFn: async ({
      part,
      pren: p,
      valore,
    }: {
      part: Partecipante
      pren: MiaPrenotazione
      valore: boolean
    }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .update({ confermato: valore })
        .eq('id', part.id)
      if (error) throw error
      if (part.socio_id && valoriQuery.data) {
        if (valore)
          await assegnaPuntiPresenza(p, part.socio_id, sport, valoriQuery.data, !!modalitaPremiQuery.data)
        else await annullaPuntiPresenza(p.id, part.socio_id)
      }
    },
    onSuccess: () => {
      aggiorna()
      aggiornaSaldi()
    },
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + messaggioErrore(e)),
  })

  // Crea una prenotazione su uno slot libero (organizzatore = admin).
  const crea = useMutation({
    mutationFn: async ({
      campo,
      inizio,
      fine,
      allenamento,
    }: {
      campo: Campo
      inizio: Date
      fine: Date
      allenamento: boolean
    }) => {
      const dati: Record<string, unknown> = {
        campo_id: campo.id,
        socio_id: profilo!.id,
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
      }
      if (allenamento) {
        dati.allenamento = true
        dati.allenatore_id = profilo!.id
      }
      const { data, error } = await supabase.from('prenotazioni').insert(dati).select('*').single()
      if (error) throw error
      return data as MiaPrenotazione
    },
    onSuccess: (data) => {
      aggiorna()
      // La finestra passa subito alla gestione della prenotazione appena creata.
      setSlot((s) => (s ? { ...s, booking: data } : null))
    },
    onError: (e: unknown) => {
      const err = e as { code?: string }
      if (err.code === '23505') window.alert('Questo slot è appena stato prenotato.')
      else if (err.code === '42501')
        window.alert(
          'Il database ha rifiutato la prenotazione (probabilmente perché nel passato): serve una modifica alle regole RLS. Segnalamelo.',
        )
      else window.alert('Prenotazione non riuscita: ' + messaggioErrore(e))
    },
  })

  const annulla = useMutation({
    mutationFn: async (prenId: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', prenId)
      if (error) throw error
    },
    onSuccess: () => {
      aggiorna()
      setSlot(null)
    },
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  if (!profilo) return null

  const adesso = new Date()
  const oggiStr = ymd(new Date())
  const candidati = sociQuery.data ?? []
  const meseLabel =
    giorni[0].getMonth() === giorni[6].getMonth()
      ? giorni[0].toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      : `${giorni[0].toLocaleDateString('it-IT', { month: 'short' })} – ${giorni[6].toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`

  const prenGiorno = prenPerGiorno.get(giornoSel) ?? []
  const labelGiornoSel = new Date(`${giornoSel}T00:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Prenotazione aggiornata dello slot aperto (per riflettere i partecipanti).
  const bookingSlot =
    slot?.booking != null
      ? (prenGiorno.find((p) => String(p.id) === String(slot.booking!.id)) ?? slot.booking)
      : null

  return (
    <div>
      <div className="eyebrow">Prenotazioni</div>

      {/* Sport */}
      <nav className="mb-3 flex gap-1.5" aria-label="Sport">
        <button
          type="button"
          className={'subtab-btn' + (sport === 'padel' ? ' attivo' : '')}
          onClick={() => setSport('padel')}
        >
          🎾 Padel
        </button>
        <button
          type="button"
          className={'subtab-btn' + (sport === 'calcio' ? ' attivo' : '')}
          onClick={() => setSport('calcio')}
        >
          ⚽ Calcio
        </button>
      </nav>

      {/* Calendario settimanale */}
      <div className="cal-sett">
        <div className="cal-sett-head">
          <div className="cal-sett-mese">{meseLabel}</div>
          <div className="cal-sett-nav">
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0"
              onClick={() => setInizioSettimana((s) => addDays(s, -7))}
              title="Settimana precedente"
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0"
              onClick={() => {
                setInizioSettimana(lunedi(new Date()))
                setGiornoSel(ymd(new Date()))
              }}
            >
              Oggi
            </button>
            <button
              type="button"
              className="btn btn-secondario btn-mini !mt-0"
              onClick={() => setInizioSettimana((s) => addDays(s, 7))}
              title="Settimana successiva"
            >
              ›
            </button>
          </div>
        </div>

        <div className="cal-sett-griglia">
          {giorni.map((d, i) => {
            const key = ymd(d)
            const conta = prenPerGiorno.get(key)?.length ?? 0
            const classi =
              'cal-giorno' + (key === oggiStr ? ' oggi' : '') + (key === giornoSel ? ' sel' : '')
            return (
              <button type="button" key={key} className={classi} onClick={() => setGiornoSel(key)}>
                <span className="cal-giorno-dow">{DOW[i]}</span>
                <span className="cal-giorno-num">{d.getDate()}</span>
                {conta > 0 && <span className="cal-giorno-badge">{conta}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabellone del giorno selezionato */}
      <div className="eyebrow capitalize">{labelGiornoSel}</div>
      {pren.isLoading || campiQuery.isLoading ? (
        <p className="sub">Caricamento…</p>
      ) : pren.error && mancaTabella(pren.error, 'partecipanti_amichevole') ? (
        <p className="sub">
          Funzione non ancora attiva: esegui lo script{' '}
          <code className="rounded bg-verde-50 px-1">tappa3a-amichevoli.sql</code> su Supabase.
        </p>
      ) : pren.error ? (
        <p className="sub">Impossibile caricare le prenotazioni: {messaggioErrore(pren.error)}</p>
      ) : campiSport.length === 0 ? (
        <p className="sub">Nessun campo {sport} configurato.</p>
      ) : (
        campiSport.map((campo) => (
          <CampoSlots
            key={campo.id}
            campo={campo}
            giorno={giornoSel}
            adesso={adesso}
            prenotazioni={prenGiorno.filter((p) => String(p.campo_id) === String(campo.id))}
            etichette={etichette}
            statoDi={statoPren}
            onSlot={(inizio, fine, booking) => setSlot({ campo, inizio, fine, booking })}
          />
        ))
      )}

      {/* Finestra dello slot */}
      {slot && (
        <div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
          onClick={() => setSlot(null)}
        >
          <div className="card my-auto w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-verde-100 pb-3">
              <div>
                <h2 className="m-0 text-lg font-bold">{slot.campo.nome}</h2>
                <p className="sub m-0 capitalize">
                  {slot.inizio.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  · {oraLocale(slot.inizio)}–{oraLocale(slot.fine)}
                </p>
              </div>
              <button type="button" className="x text-2xl" title="Chiudi" onClick={() => setSlot(null)}>
                ×
              </button>
            </div>

            {bookingSlot ? (
              <SchedaPartita
                sport={sport}
                pren={bookingSlot}
                campo={slot.campo}
                partecipanti={partsByPren.get(String(bookingSlot.id)) ?? []}
                etichette={etichette}
                candidati={candidati}
                staff
                mioId={profilo.id}
                amiciVuoti={false}
                confermaCliccando
                inModale
                onAggiungi={(socioId) => aggiungi.mutate({ prenId: bookingSlot.id, socioId })}
                onAggiungiOspite={(nome) => aggiungiOspite.mutate({ prenId: bookingSlot.id, nome })}
                onConferma={(part, valore) =>
                  conferma.mutate({ part, pren: bookingSlot, valore })
                }
                onRimuovi={(part) => rimuovi.mutate(part.id)}
                onAnnulla={() => {
                  if (window.confirm(`Annullare la prenotazione su ${slot.campo.nome}?`))
                    annulla.mutate(bookingSlot.id)
                }}
              />
            ) : (
              <SlotLibero
                disabilitato={crea.isPending}
                onCrea={(allenamento) =>
                  crea.mutate({
                    campo: slot.campo,
                    inizio: slot.inizio,
                    fine: slot.fine,
                    allenamento,
                  })
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Slot di un campo per il giorno scelto: tutti gli orari previsti dalle regole,
// liberi o prenotati. Le celle prenotate e gli slot futuri liberi sono cliccabili.
function CampoSlots({
  campo,
  giorno,
  adesso,
  prenotazioni,
  etichette,
  statoDi,
  onSlot,
}: {
  campo: Campo
  giorno: string
  adesso: Date
  prenotazioni: MiaPrenotazione[]
  etichette: Map<string, string>
  statoDi: (prenId: number | string) => 'confermato' | 'attesa'
  onSlot: (inizio: Date, fine: Date, booking: MiaPrenotazione | null) => void
}) {
  const perSlot = new Map<number, MiaPrenotazione>()
  for (const p of prenotazioni) perSlot.set(new Date(p.inizio).getTime(), p)
  const fuoriServizio = campo.in_servizio === false

  return (
    <div className="campo-blocco">
      <div className="campo-titolo">
        {campo.nome}
        {fuoriServizio && <span className="pill off">Fuori servizio</span>}
      </div>

      {fuoriServizio ? (
        <p className="sub">
          {campo.nota_servizio
            ? 'Campo momentaneamente sospeso: ' + campo.nota_servizio
            : 'Campo momentaneamente sospeso.'}
        </p>
      ) : (
        <div className="slot-griglia">
          {orariCampo(campo).map((ora) => {
            const inizio = dataDa(giorno, ora)
            const fine = new Date(inizio.getTime() + SLOT_MINUTI * 60000)
            const p = perSlot.get(inizio.getTime())
            const passato = inizio <= adesso

            let classe = 'slot'
            let chi: string

            if (p) {
              // Prenotato: distinguo "da confermare" (attesa) da "confermato".
              classe += ' occupato gestibile ' + statoDi(p.id)
              chi = p.allenamento ? 'Allenamento' : (etichette.get(p.socio_id) ?? 'Prenotato')
            } else {
              // Libero: cliccabile anche nel passato (l'admin può prenotare a posteriori).
              classe += ' libero' + (passato ? ' libero-passato' : '')
              chi = 'Libero'
            }

            return (
              <button
                key={ora}
                type="button"
                className={classe}
                onClick={() => onSlot(inizio, fine, p ?? null)}
              >
                <span>
                  {ora}–{oraLocale(fine)}
                </span>
                <span className="chi">{chi}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SlotLibero({
  disabilitato,
  onCrea,
}: {
  disabilitato: boolean
  onCrea: (allenamento: boolean) => void
}) {
  return (
    <div>
      <p className="sub mb-3">Slot libero. Cosa vuoi creare?</p>
      <button
        type="button"
        className="btn btn-block mb-2"
        disabled={disabilitato}
        onClick={() => onCrea(false)}
      >
        Prenotazione campo
      </button>
      <button
        type="button"
        className="btn btn-secondario btn-block"
        disabled={disabilitato}
        onClick={() => onCrea(true)}
      >
        🏋️ Allenamento
      </button>
    </div>
  )
}
