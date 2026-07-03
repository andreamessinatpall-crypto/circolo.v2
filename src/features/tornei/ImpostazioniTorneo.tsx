import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { messaggioErrore } from '@/lib/errori'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import NumeroInput from '@/components/NumeroInput'
import { useCampi } from '@/features/prenotazioni/datiPrenotazioni'
import { costruisciPuntiGironi, numGironi, puntiBase, puntiGironiArray } from './gironi'
import { ricalcolaPuntiTorneo } from './punti'
import EditorPuntiTorneo from './EditorPuntiTorneo'
import { SPORT_LABEL } from './tipi'
import type { Componente, Incontro, PuntiSet, Squadra, Torneo } from './tipi'

// (Fase 6c) Modifica delle "regole" del torneo decise alla creazione:
// nome, date e i valori dei punti. Sport e formato restano fissi: cambiarli
// a torneo avviato romperebbe squadre e calendario già inseriti.
// (Fase 7b) I punti si modificano per girone (se più di uno); dopo il
// salvataggio i punti già assegnati vengono ricalcolati.
const schema = z
  .object({
    nome: z.string().trim().min(1, 'Inserisci il nome'),
    data_inizio: z.string().optional(),
    data_fine: z.string().optional(),
    durata_minuti: z.coerce.number().int().min(30).max(240),
    max_squadre: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(2).max(500).nullable(),
    ),
  })
  .refine((v) => !(v.data_inizio && v.data_fine && v.data_fine < v.data_inizio), {
    message: 'La data fine non può precedere la data inizio.',
    path: ['data_fine'],
  })

type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export default function ImpostazioniTorneo({
  torneo,
  squadre,
  incontri,
  compBySquadra,
}: {
  torneo: Torneo
  squadre: Squadra[]
  incontri: Incontro[]
  compBySquadra: Record<string, Componente[]>
}) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const isAmericano = torneo.formato === 'americano'
  const isEliminazione = torneo.formato === 'eliminazione'
  const [aperto, setAperto] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  // Stato locale per il blocco orario americano.
  const inizioStr = torneo.americano_inizio ? new Date(torneo.americano_inizio) : null
  const fineStr   = torneo.americano_fine   ? new Date(torneo.americano_fine)   : null
  const [amCampiIds, setAmCampiIds] = useState<string[]>(() => {
    if (torneo.americano_campi_ids?.length) return torneo.americano_campi_ids.map(String)
    if (torneo.americano_campo_id) return [String(torneo.americano_campo_id)]
    return []
  })
  const [amData,    setAmData]    = useState(inizioStr ? inizioStr.toISOString().slice(0, 10) : '')
  const [amOraInizio, setAmOraInizio] = useState(
    inizioStr ? inizioStr.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  )
  const [amOraFine, setAmOraFine] = useState(
    fineStr ? fineStr.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  )
  // Controllo disponibilità slot americano: esclude le prenotazioni di questo torneo.
  const slotDisponibile = useQuery({
    queryKey: ['am-disponibilita', amCampiIds, amData, amOraInizio, amOraFine, torneo.id],
    enabled: !!(amCampiIds.length > 0 && amData && amOraInizio && amOraFine && amOraFine > amOraInizio),
    queryFn: async () => {
      const inizio = new Date(`${amData}T${amOraInizio}`).toISOString()
      const fine   = new Date(`${amData}T${amOraFine}`).toISOString()
      const { data } = await supabase
        .from('prenotazioni')
        .select('id, inizio, fine, campo_id, torneo_id')
        .in('campo_id', amCampiIds.map(Number))
        .lt('inizio', fine)
        .gt('fine', inizio)
      const rows = (data ?? []) as Array<{ id: unknown; inizio: string; fine: string; campo_id: number; torneo_id: string | null }>
      // Escludi le prenotazioni di questo stesso torneo.
      return rows.filter((r) => String(r.torneo_id) !== String(torneo.id))
    },
  })

  // I punti stanno fuori da react-hook-form (con più gironi sono dinamici).
  const [base, setBase] = useState<PuntiSet>(() => puntiBase(torneo))
  const [gironi, setGironi] = useState<PuntiSet[]>(() => puntiGironiArray(torneo))
  const [puntiTocchi, setPuntiTocchi] = useState(false)

  // (Tappa 31) Opzioni andata/ritorno, finale secca, terzo posto.
  const [andataRitorno, setAndataRitorno] = useState(!!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno)
  const [finaleSecca, setFinaleSecca] = useState(!!(torneo as { finale_secca?: boolean | null }).finale_secca)
  const [terzoPosto, setTerzoPosto] = useState(!!(torneo as { terzo_posto?: boolean | null }).terzo_posto)

  const numeroGironi = numGironi(torneo)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: torneo.nome,
      data_inizio: (torneo.data_inizio ?? '').slice(0, 10),
      data_fine: (torneo.data_fine ?? '').slice(0, 10),
      durata_minuti: torneo.durata_minuti ?? 90,
      max_squadre: torneo.max_squadre ?? null,
    },
  })

  // Apre la modale ripristinando i valori correnti del torneo.
  function apri() {
    setMsg(null)
    reset({
      nome: torneo.nome,
      data_inizio: (torneo.data_inizio ?? '').slice(0, 10),
      data_fine: (torneo.data_fine ?? '').slice(0, 10),
      durata_minuti: torneo.durata_minuti ?? 90,
      max_squadre: torneo.max_squadre ?? null,
    })
    setBase(puntiBase(torneo))
    setGironi(puntiGironiArray(torneo))
    setPuntiTocchi(false)
    setAndataRitorno(!!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno)
    setFinaleSecca(!!(torneo as { finale_secca?: boolean | null }).finale_secca)
    setTerzoPosto(!!(torneo as { terzo_posto?: boolean | null }).terzo_posto)
    const ids = torneo.americano_campi_ids?.length
      ? torneo.americano_campi_ids.map(String)
      : torneo.americano_campo_id ? [String(torneo.americano_campo_id)] : []
    setAmCampiIds(ids)
    setAperto(true)
  }

  async function onSubmit(v: FormOut) {
    setMsg(null)
    const puntiGironi = costruisciPuntiGironi(numeroGironi, gironi)
    const baseVal = numeroGironi > 1 ? (gironi[0] ?? base) : base

    let durata = v.durata_minuti
    if (isAmericano && amOraInizio && amOraFine) {
      const [hi, mi] = amOraInizio.split(':').map(Number)
      const [hf, mf] = amOraFine.split(':').map(Number)
      const diff = (hf * 60 + mf) - (hi * 60 + mi)
      if (diff > 0) durata = diff
    }

    const payload: Record<string, unknown> = {
      nome: v.nome,
      data_inizio: isAmericano ? (amData || null) : (v.data_inizio || null),
      data_fine:   isAmericano ? (amData || null) : (v.data_fine   || null),
      durata_minuti: durata,
      max_squadre: v.max_squadre ?? null,
      punti_iscrizione: baseVal.iscrizione,
      punti_vittoria: baseVal.vittoria,
      punti_torneo: baseVal.torneo,
      andata_ritorno: andataRitorno,
      finale_secca: isEliminazione ? finaleSecca : false,
      terzo_posto: isEliminazione ? terzoPosto : false,
    }
    if (puntiGironi) payload.punti_gironi = puntiGironi
    if (isAmericano) {
      payload.americano_campo_id  = amCampiIds.length ? Number(amCampiIds[0]) : null
      payload.americano_campi_ids = amCampiIds.length ? amCampiIds.map(Number) : null
      payload.americano_inizio = amData && amOraInizio ? new Date(`${amData}T${amOraInizio}`).toISOString() : null
      payload.americano_fine   = amData && amOraFine   ? new Date(`${amData}T${amOraFine}`).toISOString()   : null
    }

    const { error } = await supabase.from('tornei').update(payload).eq('id', torneo.id)

    if (error) {
      const err = error as { code?: string; message?: string }
      const m = (err.message ?? '').toLowerCase()
      const mancaPuntiGironi = puntiGironi != null && (err.code === '42703' || m.includes('punti_gironi'))
      const mancaCol = err.code === '42703' || m.includes('punti_iscrizione')
      setMsg({
        tipo: 'errore',
        testo: mancaPuntiGironi
          ? 'Per i punti diversi per girone esegui prima lo script tappa7-punti-gironi.sql su Supabase.'
          : mancaCol
            ? 'Per i punti del torneo esegui prima lo script tappa6-pannello-admin.sql su Supabase.'
            : 'Salvataggio non riuscito: ' + messaggioErrore(error),
      })
      return
    }

    // Ricrea le prenotazioni (una per campo) per il blocco orario americano.
    if (isAmericano && amCampiIds.length > 0 && amData && amOraInizio && amOraFine && profilo) {
      await supabase.from('prenotazioni').delete().eq('torneo_id', torneo.id)
      for (const campoId of amCampiIds) {
        await supabase.from('prenotazioni').insert({
          campo_id: Number(campoId),
          socio_id: profilo.id,
          inizio: new Date(`${amData}T${amOraInizio}`).toISOString(),
          fine:   new Date(`${amData}T${amOraFine}`).toISOString(),
          torneo_id: torneo.id,
        })
      }
    }

    // Ricalcola i punti già assegnati con le nuove regole.
    const torneoNuovo: Torneo = {
      ...torneo,
      nome: v.nome,
      data_inizio: isAmericano ? (amData || null) : (v.data_inizio || null),
      data_fine:   isAmericano ? (amData || null) : (v.data_fine   || null),
      durata_minuti: durata,
      max_squadre: v.max_squadre ?? null,
      punti_iscrizione: baseVal.iscrizione,
      punti_vittoria: baseVal.vittoria,
      punti_torneo: baseVal.torneo,
      punti_gironi: puntiGironi ?? torneo.punti_gironi,
    }
    if (!isAmericano) await ricalcolaPuntiTorneo(torneoNuovo, squadre, incontri, compBySquadra)

    qc.invalidateQueries({ queryKey: ['tornei'] })
    setPuntiTocchi(false)
    setMsg({ tipo: 'ok', testo: 'Modifiche salvate.' })
  }

  return (
    <>
      <button type="button" className="btn btn-secondario" onClick={apri}>
        Modifica regole del torneo
      </button>

      {aperto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAperto(false)}
        >
          <div
            className="card max-h-[90vh] w-full max-w-md overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="m-0 text-xl">Modifica regole del torneo</h2>
              <button
                type="button"
                className="border-0 bg-transparent px-1 text-2xl leading-none text-ink-2"
                title="Chiudi"
                onClick={() => setAperto(false)}
              >
                ×
              </button>
            </div>

            <p className="sub mt-2">
              Sport: <strong>{SPORT_LABEL[torneo.sport] ?? torneo.sport}</strong> · Formato fisso.
              Per cambiare sport crea un nuovo torneo.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
              <label>Nome torneo</label>
              <input className={classiInput} {...register('nome')} />
              {errors.nome && <p className="mt-1 text-xs text-red-700">{errors.nome.message}</p>}

              {isAmericano ? (
                <div>
                  <div className="eyebrow mb-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 5 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Data e orario
                  </div>
                  <label>Campi utilizzati</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(campiQuery.data ?? [])
                      .filter((c) => c.sport === 'padel' && c.in_servizio !== false)
                      .map((c) => {
                        const sel = amCampiIds.includes(String(c.id))
                        return (
                          <label
                            key={c.id}
                            className={`opzione-btn${sel ? ' attivo' : ''}`}
                            style={{ minHeight: 0, minWidth: 0, flexDirection: 'row', padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={sel}
                              onChange={(e) =>
                                setAmCampiIds((prev) =>
                                  e.target.checked
                                    ? [...prev, String(c.id)]
                                    : prev.filter((id) => id !== String(c.id))
                                )
                              }
                            />
                            {c.nome}
                          </label>
                        )
                      })}
                    {(campiQuery.data ?? []).filter((c) => c.sport === 'padel' && c.in_servizio !== false).length === 0 && (
                      <p className="sub" style={{ fontSize: '0.82rem' }}>Nessun campo padel disponibile.</p>
                    )}
                  </div>
                  <div className="mt-1 min-w-0">
                    <label>Data</label>
                    <input
                      type="date"
                      max="9999-12-31"
                      className={classiInput}
                      value={amData}
                      onChange={(e) => setAmData(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label>Orario inizio</label>
                      <select
                        className={classiInput}
                        value={amOraInizio}
                        onChange={(e) => setAmOraInizio(e.target.value)}
                      >
                        <option value="">—</option>
                        {Array.from({ length: 36 }, (_, i) => {
                          const h = Math.floor(i / 2) + 6
                          const m = i % 2 === 0 ? '00' : '30'
                          const val = `${String(h).padStart(2, '0')}:${m}`
                          return <option key={val} value={val}>{val}</option>
                        })}
                      </select>
                    </div>
                    <div>
                      <label>Orario fine</label>
                      <select
                        className={classiInput}
                        value={amOraFine}
                        onChange={(e) => setAmOraFine(e.target.value)}
                      >
                        <option value="">—</option>
                        {Array.from({ length: 36 }, (_, i) => {
                          const h = Math.floor(i / 2) + 6
                          const m = i % 2 === 0 ? '00' : '30'
                          const val = `${String(h).padStart(2, '0')}:${m}`
                          return <option key={val} value={val}>{val}</option>
                        })}
                      </select>
                    </div>
                  </div>
                  {amCampiIds.length > 0 && amData && amOraInizio && amOraFine && amOraFine > amOraInizio && (
                    <div className="mt-2">
                      {slotDisponibile.isFetching ? (
                        <p className="sub" style={{ fontSize: '0.8rem' }}>Verifica disponibilità…</p>
                      ) : slotDisponibile.data && slotDisponibile.data.length > 0 ? (
                        <p className="sub" style={{ color: '#fb923c', fontSize: '0.82rem' }}>
                          ⚠️ {amCampiIds.length > 1 ? 'Uno o più campi già occupati' : 'Il campo è già occupato'} in questo orario ({slotDisponibile.data.length} prenotazione/i in conflitto).
                        </p>
                      ) : slotDisponibile.data ? (
                        <p className="sub" style={{ color: 'var(--ok, #1a6b3c)', fontSize: '0.82rem' }}>
                          {amCampiIds.length > 1 ? 'Tutti i campi disponibili' : 'Slot disponibile'}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0 overflow-hidden">
                      <label>Data inizio</label>
                      <input type="date" max="9999-12-31" className={classiInput} {...register('data_inizio')} />
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <label>Data fine</label>
                      <input type="date" max="9999-12-31" className={classiInput} {...register('data_fine')} />
                      {errors.data_fine && (
                        <p className="mt-1 text-xs text-red-700">{errors.data_fine.message}</p>
                      )}
                    </div>
                  </div>
                  <label>Durata partita</label>
                  <select className={classiInput} {...register('durata_minuti')}>
                    <option value={60}>1h (60 min)</option>
                    <option value={75}>1h15 (75 min)</option>
                    <option value={90}>1h30 (90 min)</option>
                    <option value={105}>1h45 (105 min)</option>
                    <option value={120}>2h (120 min)</option>
                  </select>
                </>
              )}

              <label>Squadre massime (vuoto = illimitato)</label>
              <NumeroInput
                min={2}
                max={500}
                placeholder="Es. 8"
                {...register('max_squadre')}
              />
              {errors.max_squadre && (
                <p className="mt-1 text-xs text-red-700">{errors.max_squadre.message as string}</p>
              )}

              {!isAmericano && (
                <>
                  <div className="eyebrow" style={{ marginTop: 16 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 5 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Punti di questo torneo
                  </div>
                  <p className="sub mb-2">
                    {numeroGironi > 1
                      ? 'Punti per ciascun girone. Il numero di gironi si cambia nella sezione "Gironi".'
                      : 'Valgono solo per questo torneo.'}
                  </p>
                  <EditorPuntiTorneo
                    torneo={torneo}
                    numeroGironi={numeroGironi}
                    base={base}
                    setBase={(p) => {
                      setBase(p)
                      setPuntiTocchi(true)
                    }}
                    gironi={gironi}
                    setGironi={(a) => {
                      setGironi(a)
                      setPuntiTocchi(true)
                    }}
                  />
                </>
              )}

              {/* ── (Tappa 31) Sola andata / Andata e ritorno ─────── */}
              <div className="opzione-grid" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className={`opzione-btn${!andataRitorno ? ' attivo' : ''}`}
                  onClick={() => { setAndataRitorno(false); setFinaleSecca(false) }}
                >
                  <span className="opzione-btn-icon">→</span>
                  <span className="opzione-btn-nome">Sola{' '}andata</span>
                </button>
                <button
                  type="button"
                  className={`opzione-btn${andataRitorno ? ' attivo' : ''}`}
                  onClick={() => setAndataRitorno(true)}
                >
                  <span className="opzione-btn-icon">⇄</span>
                  <span className="opzione-btn-nome">Andata{' '}e ritorno</span>
                </button>
                {isEliminazione && andataRitorno && (
                  <button
                    type="button"
                    className={`opzione-btn${finaleSecca ? ' attivo' : ''}`}
                    onClick={() => setFinaleSecca(!finaleSecca)}
                  >
                    <span className="opzione-btn-icon">⚡</span>
                    <span className="opzione-btn-nome">Finale{' '}secca</span>
                  </button>
                )}
                {isEliminazione && (
                  <button
                    type="button"
                    className={`opzione-btn${terzoPosto ? ' attivo' : ''}`}
                    onClick={() => setTerzoPosto(!terzoPosto)}
                  >
                    <span className="opzione-btn-icon">🥉</span>
                    <span className="opzione-btn-nome">3°/4°{' '}posto</span>
                  </button>
                )}
              </div>

              {msg && (
                <p className={`mt-4 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="btn"
                  disabled={
                    isSubmitting ||
                    (!isAmericano && !isDirty && !puntiTocchi &&
                      andataRitorno === !!(torneo as { andata_ritorno?: boolean | null }).andata_ritorno &&
                      finaleSecca   === !!(torneo as { finale_secca?: boolean | null }).finale_secca &&
                      terzoPosto    === !!(torneo as { terzo_posto?: boolean | null }).terzo_posto) ||
                    (isAmericano && !!(slotDisponibile.data && slotDisponibile.data.length > 0))
                  }
                >
                  {isSubmitting ? 'Salvataggio…' : 'Salva modifiche'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondario"
                  onClick={() => setAperto(false)}
                >
                  Chiudi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
