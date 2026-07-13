import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classiErrore, classiOk } from '@/components/stili'
import { IconaCalcio, IconaPadel } from '@/components/IconeSport'
import { etichettaSport } from '@/lib/formato'
import { useCampi, useImpostazioni } from '@/features/prenotazioni/datiPrenotazioni'
import { orariCampo, SLOT_MINUTI } from '@/features/prenotazioni/orari'
import type { Campo, Sport } from '@/features/prenotazioni/tipi'
import { aggiungiCampo, eliminaCampo, salvaCampo, salvaRegole } from './datiCampi'

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null

// Messaggio quando la RLS rifiuta la scrittura (manca la policy admin).
const MSG_PERMESSO =
  'Permesso negato dal database: esegui lo script tappa13-campi-rls.sql su Supabase per abilitare l’admin a gestire i campi.'

// Durate di slot selezionabili per un campo, in minuti.
const DURATE = [30, 60, 90, 120]
function durataLabel(min: number): string {
  return `${min} minuti`
}

// (Fase 8c) Segreteria · campi e regole di prenotazione.
export default function GestioneCampi() {
  const { data: campi, isLoading, error } = useCampi()
  const { data: impostazioni } = useImpostazioni()

  return (
    <div>
      <div className="eyebrow">Campi e orari</div>
      <div className="card">
        {isLoading ? (
          <p className="text-ink-2">Caricamento campi…</p>
        ) : error ? (
          <p className={classiErrore}>Impossibile caricare i campi: {error.message}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {(campi ?? []).length === 0 && <p className="text-ink-2">Nessun campo configurato.</p>}
            {(campi ?? []).map((c) => (
              <RigaCampo key={c.id} campo={c} />
            ))}
          </div>
        )}
        <AggiungiCampo campi={campi ?? []} />
      </div>

      <div className="eyebrow">Regole di prenotazione</div>
      <div className="card">
        {impostazioni ? (
          <FormRegole impostazioni={impostazioni} />
        ) : (
          <p className="text-ink-2">Caricamento…</p>
        )}
      </div>
    </div>
  )
}

// Picker orario nativo (clock/spinner del sistema): più professionale della
// vecchia coppia di tendine con l'elenco di tutte le ore. step=900 (15 min)
// mantiene i minuti vincolati a 00/15/30/45 come nella v1.
function SelettoreOra({ valore, onChange }: { valore: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      step={900}
      className="campo ora-select !mt-0 !w-auto"
      value={valore}
      onChange={(e) => e.target.value && onChange(e.target.value)}
    />
  )
}

// Numero con pulsanti +/− invece delle frecce scure native del browser.
function CampoNumero({
  id,
  value,
  onChange,
  min,
  max,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  min: number
  max: number
}) {
  const n = parseInt(value, 10)
  const attuale = Number.isFinite(n) ? n : min
  return (
    <div className="stepper-numero">
      <button
        type="button"
        className="stepper-btn"
        aria-label="Diminuisci"
        disabled={attuale <= min}
        onClick={() => onChange(String(Math.max(min, attuale - 1)))}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        required
        className="stepper-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label="Aumenta"
        disabled={attuale >= max}
        onClick={() => onChange(String(Math.min(max, attuale + 1)))}
      >
        +
      </button>
    </div>
  )
}

// ---- Una riga = un campo ----
function RigaCampo({ campo }: { campo: Campo }) {
  const qc = useQueryClient()
  const [nome, setNome] = useState(campo.nome)
  const [apertura, setApertura] = useState((campo.apertura || '08:00').slice(0, 5))
  const [chiusura, setChiusura] = useState((campo.chiusura || '22:00').slice(0, 5))
  const [inServizio, setInServizio] = useState(campo.in_servizio !== false)
  const [nota, setNota] = useState(campo.nota_servizio || '')
  const [outdoor, setOutdoor] = useState(campo.outdoor === true)
  const [durata, setDurata] = useState(campo.durata_minuti || SLOT_MINUTI)
  const [msg, setMsg] = useState<Esito>(null)

  const minuti = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))

  const salva = useMutation({
    mutationFn: async () => {
      const n = nome.trim()
      if (!n) throw new Error('Il nome del campo non può essere vuoto.')
      if (chiusura <= apertura)
        throw new Error("La chiusura deve venire dopo l'apertura.")
      if (minuti(chiusura) - minuti(apertura) < durata)
        throw new Error(`La fascia è più corta di uno slot (${durataLabel(durata)}): non verrebbe generato nessuno slot.`)

      const esito = await salvaCampo(campo.id, {
        nome: n,
        apertura,
        chiusura,
        in_servizio: inServizio,
        nota_servizio: inServizio ? null : nota.trim() || null,
        outdoor,
        durata_minuti: durata,
      })
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? MSG_PERMESSO
            : esito.mancaScript
              ? 'Colonne mancanti nel database: esegui gli script campi-orari.sql e realtime-e-servizio.sql su Supabase.'
              : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campi'] })
      setMsg(
        inServizio
          ? {
              tipo: 'ok',
              testo: `Salvato: ${orariCampo({ apertura, chiusura }, durata).length} slot da ${durataLabel(durata)} al giorno (${apertura}–${chiusura}).`,
            }
          : { tipo: 'ok', testo: 'Campo sospeso: non sarà prenotabile finché non lo riattivi.' },
      )
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const elimina = useMutation({
    mutationFn: async () => {
      const esito = await eliminaCampo(campo.id)
      if (!esito.ok)
        throw new Error(esito.mancaPermesso ? MSG_PERMESSO : esito.messaggio ?? 'Eliminazione non riuscita.')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campi'] }) },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const intestazione = inServizio
    ? campo.sport === 'padel'
      ? 'campo-head-padel'
      : 'campo-head-calcio'
    : 'campo-head-off'

  return (
    <div className="campo-card">
      {/* Intestazione colorata: icona + sport + stato + interruttore */}
      <div className={`campo-head ${intestazione}`}>
        <span className="campo-head-icona">
          {campo.sport === 'padel' ? <IconaPadel /> : <IconaCalcio />}
        </span>
        <span className="campo-head-sport">{etichettaSport(campo.sport)}</span>
        {!inServizio && <span className="campo-head-tag">Sospeso</span>}
        <button
          type="button"
          className="campo-toggle"
          aria-pressed={inServizio}
          title={inServizio ? 'Campo attivo · clicca per sospendere' : 'Campo sospeso · clicca per attivare'}
          onClick={() => {
            setInServizio((v) => !v)
            setMsg(null)
          }}
        >
          ⏻
        </button>
      </div>

      <div className="campo-body">
        {/* Nome e tipologia (coperto/scoperto, per il badge meteo in griglia), sulla stessa riga */}
        <div className="flex items-end gap-3">
          <label className="block flex-1">
            <span className="etichetta !mb-1">Nome del campo</span>
            <input
              type="text"
              maxLength={20}
              className="campo !mt-0 w-full text-[1.05rem] font-semibold"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="etichetta !mb-1">Tipologia</span>
            <select
              className="campo !mt-0 !w-auto"
              value={outdoor ? 'scoperto' : 'coperto'}
              onChange={(e) => {
                setOutdoor(e.target.value === 'scoperto')
                setMsg(null)
              }}
            >
              <option value="coperto">Coperto</option>
              <option value="scoperto">Scoperto</option>
            </select>
          </label>
        </div>

        {/* Orari e durata, sulla stessa riga */}
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="etichetta !mb-1">Apertura</span>
            <SelettoreOra valore={apertura} onChange={setApertura} />
          </label>
          <label className="block">
            <span className="etichetta !mb-1">Chiusura</span>
            <SelettoreOra valore={chiusura} onChange={setChiusura} />
          </label>
          <label className="block">
            <span className="etichetta !mb-1">Durata prenotazione</span>
            <select
              className="campo !mt-0 !w-auto"
              value={durata}
              onChange={(e) => setDurata(Number(e.target.value))}
            >
              {DURATE.map((d) => (
                <option key={d} value={d}>
                  {durataLabel(d)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Motivo, solo quando il campo è sospeso */}
        {!inServizio && (
          <label className="mt-2 block">
            <span className="etichetta !mb-1">Motivo della sospensione</span>
            <input
              type="text"
              maxLength={80}
              placeholder="es. manutenzione"
              className="campo !mt-0 w-full"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </label>
        )}

        {/* Azioni */}
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            className="btn !mt-0"
            disabled={salva.isPending}
            onClick={() => {
              setMsg(null)
              salva.mutate()
            }}
          >
            Salva
          </button>
          <button
            type="button"
            title="Elimina campo"
            disabled={elimina.isPending}
            onClick={() => {
              if (confirm(`Eliminare il campo “${campo.nome}”? L'operazione non si può annullare.`))
                elimina.mutate()
            }}
            className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-black/5 hover:text-ink"
          >
            🗑 Elimina
          </button>
        </div>

        {msg && (
          <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}
      </div>
    </div>
  )
}

// ---- Aggiunta di un nuovo campo ----
function AggiungiCampo({ campi }: { campi: Campo[] }) {
  const qc = useQueryClient()
  const [aperto, setAperto] = useState(false)
  const [sport, setSport] = useState<Sport>('padel')
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState<Esito>(null)

  const crea = useMutation({
    mutationFn: async () => {
      const n = nome.trim()
      if (!n) throw new Error('Dai un nome al campo.')
      const ordine = campi.reduce((max, c) => Math.max(max, c.ordine ?? 0), 0) + 1
      const esito = await aggiungiCampo(sport, n, ordine)
      if (!esito.ok)
        throw new Error(
          esito.mancaPermesso
            ? MSG_PERMESSO
            : esito.mancaScript
              ? 'Colonne mancanti nel database: esegui gli script campi-orari.sql e realtime-e-servizio.sql su Supabase.'
              : 'Creazione non riuscita: ' + (esito.messaggio ?? ''),
        )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campi'] })
      setNome('')
      setAperto(false)
      setMsg(null)
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  if (!aperto)
    return (
      <button type="button" className="btn btn-secondario mt-3" onClick={() => setAperto(true)}>
        ＋ Aggiungi campo
      </button>
    )

  return (
    <div className="mt-3 rounded-xl border border-dashed border-ottone-300 bg-verde-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="campo !mt-0 !w-auto"
          value={sport}
          onChange={(e) => setSport(e.target.value as Sport)}
        >
          <option value="padel">Padel</option>
          <option value="calcio">Calcio</option>
        </select>
        <input
          type="text"
          maxLength={20}
          placeholder="Nome del campo"
          className="campo !mt-0 min-w-0 flex-1"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <button
          type="button"
          className="btn !mt-0"
          disabled={crea.isPending}
          onClick={() => {
            setMsg(null)
            crea.mutate()
          }}
        >
          Crea
        </button>
        <button
          type="button"
          className="btn btn-secondario !mt-0"
          onClick={() => {
            setAperto(false)
            setMsg(null)
          }}
        >
          Annulla
        </button>
      </div>
      {msg && <p className={`mt-2.5 ${classiErrore}`}>{msg.testo}</p>}
    </div>
  )
}

// ---- Regole globali di prenotazione ----
function FormRegole({
  impostazioni,
}: {
  impostazioni: {
    giorniAnticipo: number
    maxPadel: number
    maxCalcio: number
    maxPadelGiorno: number
    maxCalcioGiorno: number
  }
}) {
  const qc = useQueryClient()
  const [giorni, setGiorni] = useState(String(impostazioni.giorniAnticipo))
  const [maxPadel, setMaxPadel] = useState(String(impostazioni.maxPadel))
  const [maxCalcio, setMaxCalcio] = useState(String(impostazioni.maxCalcio))
  const [maxPadelGiorno, setMaxPadelGiorno] = useState(String(impostazioni.maxPadelGiorno))
  const [maxCalcioGiorno, setMaxCalcioGiorno] = useState(String(impostazioni.maxCalcioGiorno))
  const [msg, setMsg] = useState<Esito>(null)

  const salva = useMutation({
    mutationFn: async () => {
      const g = parseInt(giorni, 10)
      if (!Number.isInteger(g) || g < 1 || g > 30)
        throw new Error('Inserisci un numero di giorni tra 1 e 30.')
      const mp = parseInt(maxPadel, 10)
      const mc = parseInt(maxCalcio, 10)
      if (!Number.isInteger(mp) || mp < 0 || mp > 50 || !Number.isInteger(mc) || mc < 0 || mc > 50)
        throw new Error("Il numero massimo di prenotazioni attive dev'essere tra 0 e 50 (0 = nessun limite).")
      const mpg = parseInt(maxPadelGiorno, 10)
      const mcg = parseInt(maxCalcioGiorno, 10)
      if (!Number.isInteger(mpg) || mpg < 0 || mpg > 20 || !Number.isInteger(mcg) || mcg < 0 || mcg > 20)
        throw new Error("Il numero massimo di prenotazioni al giorno dev'essere tra 0 e 20 (0 = nessun limite).")

      const esito = await salvaRegole(g, mp, mc, mpg, mcg)
      if (!esito.ok)
        throw new Error(
          esito.mancaScript
            ? 'Tabella o colonne impostazioni mancanti: esegui gli script regole-prenotazione.sql e max-prenotazioni.sql su Supabase.'
            : 'Salvataggio non riuscito: ' + (esito.messaggio ?? ''),
        )
      return { g, mp, mc, mpg, mcg }
    },
    onSuccess: ({ g, mp, mc, mpg, mcg }) => {
      qc.invalidateQueries({ queryKey: ['impostazioni'] })
      setMsg({
        tipo: 'ok',
        testo: `Regole aggiornate: prenotazione fino a ${g} ${g === 1 ? 'giorno' : 'giorni'} di anticipo; max attive — padel ${mp === 0 ? 'illimitate' : mp}, calcio ${mc === 0 ? 'illimitate' : mc}; max al giorno — padel ${mpg === 0 ? 'illimitate' : mpg}, calcio ${mcg === 0 ? 'illimitate' : mcg}.`,
      })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setMsg(null)
        salva.mutate()
      }}
    >
      <label className="etichetta" htmlFor="rg-giorni">
        Finestra di prenotazione: quanti giorni di anticipo (1–30)
      </label>
      <CampoNumero id="rg-giorni" min={1} max={30} value={giorni} onChange={setGiorni} />

      <span className="etichetta mt-3 block">Padel</span>
      <div className="flex items-end gap-3">
        <label className="block flex-1">
          <span className="etichetta !mb-1">Prenotazioni attive max (0 = nessun limite)</span>
          <CampoNumero id="rg-max-padel" min={0} max={50} value={maxPadel} onChange={setMaxPadel} />
        </label>
        <label className="block flex-1">
          <span className="etichetta !mb-1">Prenotazioni al giorno max (0 = nessun limite)</span>
          <CampoNumero
            id="rg-max-padel-giorno"
            min={0}
            max={20}
            value={maxPadelGiorno}
            onChange={setMaxPadelGiorno}
          />
        </label>
      </div>

      <span className="etichetta mt-3 block">Calcio</span>
      <div className="flex items-end gap-3">
        <label className="block flex-1">
          <span className="etichetta !mb-1">Prenotazioni attive max (0 = nessun limite)</span>
          <CampoNumero id="rg-max-calcio" min={0} max={50} value={maxCalcio} onChange={setMaxCalcio} />
        </label>
        <label className="block flex-1">
          <span className="etichetta !mb-1">Prenotazioni al giorno max (0 = nessun limite)</span>
          <CampoNumero
            id="rg-max-calcio-giorno"
            min={0}
            max={20}
            value={maxCalcioGiorno}
            onChange={setMaxCalcioGiorno}
          />
        </label>
      </div>

      <button type="submit" className="btn mt-6" disabled={salva.isPending}>
        Salva regole
      </button>
      {msg && <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>}
    </form>
  )
}
