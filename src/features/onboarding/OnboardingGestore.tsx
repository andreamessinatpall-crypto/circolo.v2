import { useRef, useState } from 'react'
import { classiErrore, classiInput } from '@/components/stili'
import { etichettaSport } from '@/lib/formato'
import type { Circolo } from '@/features/piattaforma/tipi'
import { salvaOrariDefault, attivaDisattivaCircolo } from '@/features/piattaforma/datiPiattaforma'
import { aggiungiCampo, salvaRegole } from '@/features/segreteria/datiCampi'
import { salvaValoriPunti, type ValoriPunti, type ValoriSport } from '@/features/segreteria/datiPunti'
import { LIVELLI_PUNTI_DEFAULT, salvaLivelliPunti, type LivelloPunti } from '@/features/profilo/livelliPunti'
import { salvaModalitaClassifica } from '@/features/profilo/datiClassifica'
import { salvaModalitaPremi, creaPremio } from '@/features/segreteria/datiPremiAdmin'
import { SPORT_LIST, type FormatoCalcio, type LimitiSport, type Sport } from '@/features/prenotazioni/tipi'

const VALORI_PUNTI_SUGGERITI: ValoriSport = { partita: 10, allenamento: 5, creditiPartita: 1, creditiAllenamento: 1 }
const LIMITI_DEFAULT: LimitiSport = { maxAttive: 0, maxGiorno: 0 }

interface CampoBozza {
  key: number
  sport: Sport
  nome: string
  outdoor: boolean
  durata: number
  formato: FormatoCalcio | null
}

interface PremioBozza {
  key: number
  nome: string
  costo: number
}

const PASSI = ['sport', 'orario', 'campi', 'regole', 'punti', 'premi', 'riepilogo'] as const
type Passo = (typeof PASSI)[number]

const TITOLO_PASSO: Record<Passo, string> = {
  sport: 'Sport offerti',
  orario: 'Orario del circolo',
  campi: 'Campi',
  regole: 'Regole di prenotazione',
  punti: 'Punti e classifica',
  premi: 'Premi',
  riepilogo: 'Riepilogo',
}

// Questionario di primo accesso: il gestore configura campi/orari/regole/
// punti/livelli/premi del suo circolo appena creato (non ancora "attivo",
// vedi CircoloProvider.tsx). Riusa SOLO funzioni di scrittura che accettano
// già circoloId esplicito — nessuna nuova chiamata Supabase, solo
// orchestrazione + form. Skippabile ("Configura più tardi"): il circolo
// resta comunque non attivo finché il gestore non arriva in fondo.
export default function OnboardingGestore({
  circolo,
  onSaltaPerOra,
  onCompletato,
}: {
  circolo: Circolo
  onSaltaPerOra: () => void
  onCompletato: () => void
}) {
  const [passo, setPasso] = useState(0)
  const contatore = useRef(0)

  const [sportOfferti, setSportOfferti] = useState<Sport[]>(['padel'])
  const [formatoCalcioDefault, setFormatoCalcioDefault] = useState<FormatoCalcio>('a7')
  const [apertura, setApertura] = useState(circolo.apertura_default.slice(0, 5))
  const [chiusura, setChiusura] = useState(circolo.chiusura_default.slice(0, 5))
  const [campi, setCampi] = useState<CampoBozza[]>([])
  const [giorniAnticipo, setGiorniAnticipo] = useState(7)
  const [limitiPerSport, setLimitiPerSport] = useState<Partial<Record<Sport, LimitiSport>>>({})
  // null = non ancora risposto: la prima domanda del passo Punti blocca
  // l'avanzamento finché il gestore non sceglie sì/no.
  const [vuoleClassifica, setVuoleClassifica] = useState<boolean | null>(null)
  const [valoriPunti, setValoriPunti] = useState<Partial<Record<Sport, ValoriSport>>>({})
  const [livelli, setLivelli] = useState<LivelloPunti[]>(LIVELLI_PUNTI_DEFAULT.map((l) => ({ ...l })))
  const [modalitaPremi, setModalitaPremi] = useState(false)
  const [premi, setPremi] = useState<PremioBozza[]>([])

  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState('')

  // Tracciano cosa è già andato a buon fine: un nuovo tentativo dopo un
  // errore a metà non ripete le scritture già riuscite (es. non ricrea gli
  // stessi campi due volte).
  const fatti = useRef<Set<string>>(new Set())
  const campiCreati = useRef<Set<number>>(new Set())
  const premiCreati = useRef<Set<number>>(new Set())

  function aggiungiCampoBozza(sport: Sport) {
    contatore.current += 1
    setCampi((c) => [
      ...c,
      {
        key: contatore.current,
        sport,
        nome: `Campo ${c.filter((x) => x.sport === sport).length + 1}`,
        outdoor: false,
        durata: 90,
        formato: sport === 'calcio' ? formatoCalcioDefault : null,
      },
    ])
  }
  function rimuoviCampoBozza(key: number) {
    setCampi((c) => c.filter((x) => x.key !== key))
  }

  function aggiungiPremioBozza() {
    contatore.current += 1
    setPremi((p) => [...p, { key: contatore.current, nome: '', costo: 100 }])
  }
  function rimuoviPremioBozza(key: number) {
    setPremi((p) => p.filter((x) => x.key !== key))
  }

  const passoAttuale = PASSI[passo]
  const ultimoPasso = passo === PASSI.length - 1

  function puoAvanzare(): string | null {
    if (passoAttuale === 'sport' && sportOfferti.length === 0) return 'Scegli almeno uno sport.'
    if (passoAttuale === 'orario' && chiusura <= apertura) return "La chiusura deve venire dopo l'apertura."
    if (passoAttuale === 'campi' && campi.length === 0) return 'Aggiungi almeno un campo.'
    if (passoAttuale === 'punti' && vuoleClassifica === null) return 'Rispondi sì o no per continuare.'
    return null
  }

  function avanti() {
    const msg = puoAvanzare()
    if (msg) {
      setErrore(msg)
      return
    }
    setErrore('')
    if (!ultimoPasso) setPasso((p) => p + 1)
  }

  async function creaIlClub() {
    setErrore('')
    setInCorso(true)
    try {
      if (!fatti.current.has('orari')) {
        const esito = await salvaOrariDefault(circolo.id, apertura, chiusura)
        if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio orario non riuscito.')
        fatti.current.add('orari')
      }

      let ordine = 0
      for (const c of campi) {
        ordine += 1
        if (campiCreati.current.has(c.key)) continue
        const esito = await aggiungiCampo(c.sport, c.nome.trim() || `Campo ${ordine}`, ordine, circolo.id, {
          apertura,
          chiusura,
          durata_minuti: c.durata,
          outdoor: c.outdoor,
          formato: c.sport === 'calcio' ? c.formato : null,
        })
        if (!esito.ok) throw new Error(esito.messaggio ?? 'Creazione campo non riuscita.')
        campiCreati.current.add(c.key)
      }

      if (!fatti.current.has('regole')) {
        const limitiCompleti: Partial<Record<Sport, LimitiSport>> = {}
        for (const s of sportOfferti) limitiCompleti[s] = limitiPerSport[s] ?? LIMITI_DEFAULT
        const esito = await salvaRegole(giorniAnticipo, limitiCompleti, circolo.id)
        if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio regole non riuscito.')
        fatti.current.add('regole')
      }

      if (!fatti.current.has('classifica')) {
        await salvaModalitaClassifica(vuoleClassifica === true, circolo.id)
        fatti.current.add('classifica')
      }

      if (vuoleClassifica) {
        if (!fatti.current.has('punti')) {
          const valoriCompleti: ValoriPunti = {}
          for (const s of sportOfferti) valoriCompleti[s] = valoriPunti[s] ?? VALORI_PUNTI_SUGGERITI
          const esito = await salvaValoriPunti(valoriCompleti, circolo.id)
          if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio punti non riuscito.')
          fatti.current.add('punti')
        }
        if (!fatti.current.has('livelli')) {
          const esito = await salvaLivelliPunti(livelli, circolo.id)
          if (!esito.ok) throw new Error(esito.messaggio ?? 'Salvataggio livelli non riuscito.')
          fatti.current.add('livelli')
        }
      }

      if (!fatti.current.has('modalita-premi')) {
        await salvaModalitaPremi(modalitaPremi, circolo.id)
        fatti.current.add('modalita-premi')
      }

      if (modalitaPremi) {
        for (const p of premi) {
          if (!p.nome.trim() || premiCreati.current.has(p.key)) continue
          await creaPremio({ nome: p.nome.trim(), descrizione: null, costo: p.costo, stock: null, circoloId: circolo.id })
          premiCreati.current.add(p.key)
        }
      }

      if (!fatti.current.has('attivazione')) {
        const esito = await attivaDisattivaCircolo(circolo.id, true)
        if (!esito.ok) throw new Error(esito.messaggio ?? 'Attivazione del circolo non riuscita.')
        fatti.current.add('attivazione')
      }

      onCompletato()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito. Riprova.')
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="auth-page flex min-h-[100dvh] flex-col items-center px-4 py-6">
      <div className="flex w-full max-w-[560px] flex-1 flex-col justify-center">
        <div className="card auth-card">
          <p className="eyebrow" style={{ marginTop: 0 }}>Benvenuto</p>
          <h1 className="mb-1 text-2xl">Configuriamo {circolo.nome}</h1>
          <p className="sub mb-4">
            Qualche domanda per impostare il tuo circolo: campi, orari, regole, punti e premi. Puoi
            modificare tutto in seguito da Impostazioni.
          </p>

          <div className="questionario-progresso">
            <span>{TITOLO_PASSO[passoAttuale]} · {passo + 1} di {PASSI.length}</span>
            <div className="questionario-barra">
              <div className="questionario-barra-fill" style={{ width: `${((passo + 1) / PASSI.length) * 100}%` }} />
            </div>
          </div>

          {passoAttuale === 'sport' && (
            <PassoSport
              sportOfferti={sportOfferti}
              setSportOfferti={setSportOfferti}
              formatoCalcioDefault={formatoCalcioDefault}
              setFormatoCalcioDefault={setFormatoCalcioDefault}
            />
          )}
          {passoAttuale === 'orario' && (
            <PassoOrario apertura={apertura} chiusura={chiusura} setApertura={setApertura} setChiusura={setChiusura} />
          )}
          {passoAttuale === 'campi' && (
            <PassoCampi
              sportOfferti={sportOfferti}
              campi={campi}
              onAggiungi={aggiungiCampoBozza}
              onRimuovi={rimuoviCampoBozza}
              onCambia={(key, patch) => setCampi((c) => c.map((x) => (x.key === key ? { ...x, ...patch } : x)))}
            />
          )}
          {passoAttuale === 'regole' && (
            <PassoRegole
              sportOfferti={sportOfferti}
              giorniAnticipo={giorniAnticipo}
              setGiorniAnticipo={setGiorniAnticipo}
              limitiPerSport={limitiPerSport}
              onCambia={(sport, campo, valore) =>
                setLimitiPerSport((prev) => ({
                  ...prev,
                  [sport]: { ...(prev[sport] ?? LIMITI_DEFAULT), [campo]: valore },
                }))
              }
            />
          )}
          {passoAttuale === 'punti' && (
            <PassoPunti
              sportOfferti={sportOfferti}
              vuoleClassifica={vuoleClassifica}
              setVuoleClassifica={setVuoleClassifica}
              valoriPunti={valoriPunti}
              onCambiaValori={(sport, campo, valore) =>
                setValoriPunti((prev) => ({
                  ...prev,
                  [sport]: { ...(prev[sport] ?? VALORI_PUNTI_SUGGERITI), [campo]: valore },
                }))
              }
              livelli={livelli}
              setLivelli={setLivelli}
            />
          )}
          {passoAttuale === 'premi' && (
            <PassoPremi
              modalitaPremi={modalitaPremi}
              setModalitaPremi={setModalitaPremi}
              premi={premi}
              onAggiungi={aggiungiPremioBozza}
              onRimuovi={rimuoviPremioBozza}
              onCambia={(key, patch) => setPremi((p) => p.map((x) => (x.key === key ? { ...x, ...patch } : x)))}
            />
          )}
          {passoAttuale === 'riepilogo' && (
            <PassoRiepilogo
              sportOfferti={sportOfferti}
              apertura={apertura}
              chiusura={chiusura}
              campi={campi}
              vuoleClassifica={!!vuoleClassifica}
              modalitaPremi={modalitaPremi}
              premi={premi}
            />
          )}

          {errore && <p className={`mt-3 ${classiErrore}`}>{errore}</p>}

          <div className="mt-5 flex gap-2">
            {passo > 0 && (
              <button type="button" className="btn btn-secondario" disabled={inCorso} onClick={() => setPasso((p) => p - 1)}>
                ‹ Indietro
              </button>
            )}
            {ultimoPasso ? (
              <button type="button" className="btn flex-1" disabled={inCorso} onClick={creaIlClub}>
                {inCorso ? 'Creazione in corso…' : 'Crea il tuo club'}
              </button>
            ) : (
              <button type="button" className="btn flex-1" onClick={avanti}>
                Avanti ›
              </button>
            )}
          </div>

          <button type="button" className="btn btn-secondario btn-block mt-3" disabled={inCorso} onClick={onSaltaPerOra}>
            Configura più tardi
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Passo 1: sport ----
function PassoSport({
  sportOfferti,
  setSportOfferti,
  formatoCalcioDefault,
  setFormatoCalcioDefault,
}: {
  sportOfferti: Sport[]
  setSportOfferti: (s: Sport[]) => void
  formatoCalcioDefault: FormatoCalcio
  setFormatoCalcioDefault: (f: FormatoCalcio) => void
}) {
  function toggle(sport: Sport) {
    setSportOfferti(sportOfferti.includes(sport) ? sportOfferti.filter((s) => s !== sport) : [...sportOfferti, sport])
  }
  return (
    <div>
      <p className="questionario-domanda">Quali sport offre il tuo circolo?</p>
      <div className="flex flex-col gap-2">
        {SPORT_LIST.map((s) => (
          <label key={s} className={'questionario-opzione' + (sportOfferti.includes(s) ? ' selezionata' : '')}>
            <input type="checkbox" className="sr-only" checked={sportOfferti.includes(s)} onChange={() => toggle(s)} />
            {etichettaSport(s)}
          </label>
        ))}
      </div>
      {sportOfferti.includes('calcio') && (
        <label className="mt-3 block">
          <span className="etichetta !mb-1">Formato calcio (di default per i nuovi campi)</span>
          <select
            className={`${classiInput} !mt-0 !w-auto`}
            value={formatoCalcioDefault}
            onChange={(e) => setFormatoCalcioDefault(e.target.value as FormatoCalcio)}
          >
            <option value="a5">A 5</option>
            <option value="a7">A 7</option>
          </select>
        </label>
      )}
    </div>
  )
}

// ---- Passo 2: orario ----
function PassoOrario({
  apertura,
  chiusura,
  setApertura,
  setChiusura,
}: {
  apertura: string
  chiusura: string
  setApertura: (v: string) => void
  setChiusura: (v: string) => void
}) {
  return (
    <div>
      <p className="questionario-domanda">A che ora apre e chiude di solito il circolo?</p>
      <div className="flex flex-wrap gap-3">
        <label className="block">
          <span className="etichetta !mb-1">Apertura</span>
          <input type="time" step={900} className={`${classiInput} !mt-0 !w-auto`} value={apertura} onChange={(e) => e.target.value && setApertura(e.target.value)} />
        </label>
        <label className="block">
          <span className="etichetta !mb-1">Chiusura</span>
          <input type="time" step={900} className={`${classiInput} !mt-0 !w-auto`} value={chiusura} onChange={(e) => e.target.value && setChiusura(e.target.value)} />
        </label>
      </div>
      <p className="sub mt-3">Sarà l'orario di default dei tuoi campi: potrai personalizzarlo campo per campo dopo.</p>
    </div>
  )
}

// ---- Passo 3: campi ----
function PassoCampi({
  sportOfferti,
  campi,
  onAggiungi,
  onRimuovi,
  onCambia,
}: {
  sportOfferti: Sport[]
  campi: CampoBozza[]
  onAggiungi: (sport: Sport) => void
  onRimuovi: (key: number) => void
  onCambia: (key: number, patch: Partial<CampoBozza>) => void
}) {
  return (
    <div>
      <p className="questionario-domanda">Quanti campi hai per ciascuno sport?</p>
      <div className="flex flex-col gap-2.5">
        {campi.map((c) => (
          <div key={c.key} className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] p-3">
            <label className="block flex-1 min-w-[120px]">
              <span className="etichetta !mb-1">Nome</span>
              <input
                type="text"
                maxLength={20}
                className={`${classiInput} !mt-0 w-full`}
                value={c.nome}
                onChange={(e) => onCambia(c.key, { nome: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Sport</span>
              <div className="pt-2 text-sm font-medium">{etichettaSport(c.sport)}</div>
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Tipologia</span>
              <select
                className={`${classiInput} !mt-0 !w-auto`}
                value={c.outdoor ? 'scoperto' : 'coperto'}
                onChange={(e) => onCambia(c.key, { outdoor: e.target.value === 'scoperto' })}
              >
                <option value="coperto">Coperto</option>
                <option value="scoperto">Scoperto</option>
              </select>
            </label>
            {c.sport === 'calcio' && (
              <label className="block">
                <span className="etichetta !mb-1">Formato</span>
                <select
                  className={`${classiInput} !mt-0 !w-auto`}
                  value={c.formato ?? 'a7'}
                  onChange={(e) => onCambia(c.key, { formato: e.target.value as FormatoCalcio })}
                >
                  <option value="a5">A 5</option>
                  <option value="a7">A 7</option>
                </select>
              </label>
            )}
            <button type="button" className="ml-auto rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-black/5" onClick={() => onRimuovi(c.key)}>
              🗑
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {sportOfferti.map((s) => (
          <button key={s} type="button" className="btn btn-secondario" onClick={() => onAggiungi(s)}>
            ＋ Campo {etichettaSport(s)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- Passo 4: regole (loop sugli sport scelti al passo 1) ----
function PassoRegole({
  sportOfferti,
  giorniAnticipo,
  setGiorniAnticipo,
  limitiPerSport,
  onCambia,
}: {
  sportOfferti: Sport[]
  giorniAnticipo: number
  setGiorniAnticipo: (v: number) => void
  limitiPerSport: Partial<Record<Sport, LimitiSport>>
  onCambia: (sport: Sport, campo: keyof LimitiSport, valore: number) => void
}) {
  return (
    <div>
      <p className="questionario-domanda">Con quali regole si prenota?</p>
      <label className="block">
        <span className="etichetta !mb-1">Giorni di anticipo massimo per prenotare</span>
        <input
          type="number"
          min={1}
          max={30}
          className={`${classiInput} !mt-0 !w-24`}
          value={giorniAnticipo}
          onChange={(e) => setGiorniAnticipo(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
        />
      </label>

      {sportOfferti.map((s) => {
        const limiti = limitiPerSport[s] ?? LIMITI_DEFAULT
        return (
          <div key={s} className="mt-3 flex flex-wrap items-end gap-4">
            <span className="etichetta w-full">{etichettaSport(s)}</span>
            <label className="block">
              <span className="etichetta !mb-1">Max prenotazioni attive (0 = illimitate)</span>
              <input
                type="number"
                min={0}
                max={50}
                className={`${classiInput} !mt-0 !w-24`}
                value={limiti.maxAttive}
                onChange={(e) => onCambia(s, 'maxAttive', Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
            <label className="block">
              <span className="etichetta !mb-1">Max al giorno (0 = illimitate)</span>
              <input
                type="number"
                min={0}
                max={20}
                className={`${classiInput} !mt-0 !w-24`}
                value={limiti.maxGiorno}
                onChange={(e) => onCambia(s, 'maxGiorno', Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </div>
        )
      })}
    </div>
  )
}

// ---- Passo 5: punti e classifica ----
function PassoPunti({
  sportOfferti,
  vuoleClassifica,
  setVuoleClassifica,
  valoriPunti,
  onCambiaValori,
  livelli,
  setLivelli,
}: {
  sportOfferti: Sport[]
  vuoleClassifica: boolean | null
  setVuoleClassifica: (v: boolean) => void
  valoriPunti: Partial<Record<Sport, ValoriSport>>
  onCambiaValori: (sport: Sport, campo: keyof ValoriSport, valore: number) => void
  livelli: LivelloPunti[]
  setLivelli: (l: LivelloPunti[]) => void
}) {
  return (
    <div>
      <p className="questionario-domanda">Vuoi un sistema di punti per una classifica interna?</p>
      <div className="flex flex-col gap-2">
        <label className={'questionario-opzione' + (vuoleClassifica === true ? ' selezionata' : '')}>
          <input type="radio" name="classifica" className="sr-only" checked={vuoleClassifica === true} onChange={() => setVuoleClassifica(true)} />
          Sì, voglio punti e classifica
        </label>
        <label className={'questionario-opzione' + (vuoleClassifica === false ? ' selezionata' : '')}>
          <input type="radio" name="classifica" className="sr-only" checked={vuoleClassifica === false} onChange={() => setVuoleClassifica(false)} />
          No, non mi serve
        </label>
      </div>

      {vuoleClassifica && (
        <>
          <p className="sub mt-4 mb-2">Quanti punti/crediti valgono le attività? Valori suggeriti, modificali come preferisci.</p>
          <div className="flex flex-col gap-3">
            {sportOfferti.map((s) => {
              const v = valoriPunti[s] ?? VALORI_PUNTI_SUGGERITI
              return (
                <div key={s}>
                  <span className="etichetta">{etichettaSport(s)}</span>
                  <div className="mt-1 flex flex-wrap gap-4">
                    <label className="block">
                      <span className="etichetta !mb-1">Punti a partita</span>
                      <input type="number" min={0} className={`${classiInput} !mt-0 !w-24`} value={v.partita} onChange={(e) => onCambiaValori(s, 'partita', Math.max(0, Number(e.target.value) || 0))} />
                    </label>
                    <label className="block">
                      <span className="etichetta !mb-1">Punti ad allenamento</span>
                      <input type="number" min={0} className={`${classiInput} !mt-0 !w-24`} value={v.allenamento} onChange={(e) => onCambiaValori(s, 'allenamento', Math.max(0, Number(e.target.value) || 0))} />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="questionario-domanda mt-4">Livelli a punti</p>
          <div className="flex flex-col gap-2">
            {livelli.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: l.colore }} />
                <input
                  type="text"
                  maxLength={30}
                  className={`${classiInput} !mt-0 flex-1`}
                  value={l.nome}
                  onChange={(e) => setLivelli(livelli.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))}
                />
                <input
                  type="number"
                  min={0}
                  disabled={i === 0}
                  className={`${classiInput} !mt-0 !w-24`}
                  value={l.soglia}
                  onChange={(e) => setLivelli(livelli.map((x, k) => (k === i ? { ...x, soglia: Math.max(0, Number(e.target.value) || 0) } : x)))}
                />
                <span className="text-sm text-ink-2">pt</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---- Passo 6: premi ----
function PassoPremi({
  modalitaPremi,
  setModalitaPremi,
  premi,
  onAggiungi,
  onRimuovi,
  onCambia,
}: {
  modalitaPremi: boolean
  setModalitaPremi: (v: boolean) => void
  premi: PremioBozza[]
  onAggiungi: () => void
  onRimuovi: (key: number) => void
  onCambia: (key: number, patch: Partial<PremioBozza>) => void
}) {
  return (
    <div>
      <p className="questionario-domanda">Vuoi attivare un programma premi?</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={modalitaPremi} onChange={(e) => setModalitaPremi(e.target.checked)} />
        <span>Attiva il programma premi (i soci riscattano i crediti per dei premi)</span>
      </label>

      {modalitaPremi && (
        <div className="mt-3">
          <div className="flex flex-col gap-2">
            {premi.map((p) => (
              <div key={p.key} className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] p-3">
                <label className="block flex-1 min-w-[140px]">
                  <span className="etichetta !mb-1">Nome del premio</span>
                  <input type="text" maxLength={40} className={`${classiInput} !mt-0 w-full`} value={p.nome} onChange={(e) => onCambia(p.key, { nome: e.target.value })} />
                </label>
                <label className="block">
                  <span className="etichetta !mb-1">Costo (crediti)</span>
                  <input type="number" min={1} className={`${classiInput} !mt-0 !w-24`} value={p.costo} onChange={(e) => onCambia(p.key, { costo: Math.max(1, Number(e.target.value) || 1) })} />
                </label>
                <button type="button" className="ml-auto rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-black/5" onClick={() => onRimuovi(p.key)}>
                  🗑
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondario mt-2" onClick={onAggiungi}>
            ＋ Aggiungi premio
          </button>
          <p className="sub mt-2">Puoi anche non aggiungerne ora e farlo più tardi da Impostazioni.</p>
        </div>
      )}
    </div>
  )
}

// ---- Passo 7: riepilogo ----
function PassoRiepilogo({
  sportOfferti,
  apertura,
  chiusura,
  campi,
  vuoleClassifica,
  modalitaPremi,
  premi,
}: {
  sportOfferti: Sport[]
  apertura: string
  chiusura: string
  campi: CampoBozza[]
  vuoleClassifica: boolean
  modalitaPremi: boolean
  premi: PremioBozza[]
}) {
  return (
    <div>
      <p className="questionario-domanda">Tutto pronto?</p>
      <ul className="flex flex-col gap-1.5 text-sm text-ink">
        <li>Sport: {sportOfferti.map((s) => etichettaSport(s)).join(', ')}</li>
        <li>Orario: {apertura}–{chiusura}</li>
        <li>Campi: {campi.length} ({campi.map((c) => c.nome).join(', ')})</li>
        <li>Classifica: {vuoleClassifica ? 'attiva' : 'non attiva'}</li>
        <li>Programma premi: {modalitaPremi ? `attivo (${premi.length} premi)` : 'non attivo'}</li>
      </ul>
      <p className="sub mt-3">
        Al conferma il circolo diventa attivo e visibile ai soci. Potrai cambiare tutto in seguito da
        Impostazioni.
      </p>
    </div>
  )
}
