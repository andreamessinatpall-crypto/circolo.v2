import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useAmici } from '@/features/profilo/amici/useAmici'
import { useValoriPunti } from '@/features/segreteria/datiPunti'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useCampi } from './datiPrenotazioni'
import { mancaColonnaManuale, useMieAmichevoli, useSociPubblici } from './datiAmichevoli'
import { assegnaPuntiPresenza, annullaPuntiPresenza } from './puntiPresenze'
import { oraLocale } from './orari'
import type { MiaPrenotazione, Partecipante } from './datiAmichevoli'
import type { Campo, Sport } from './tipi'

const ICONA_CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
)

export default function MieAmichevoli({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const sociQuery = useSociPubblici()
  const amiciData = useAmici(profilo?.id ?? '')
  const valoriQuery = useValoriPunti()
  const modalitaPremiQuery = useModalitaPremi()

  const idCampi = useMemo(
    () => (campiQuery.data ?? []).filter((c) => c.sport === sport).map((c) => c.id),
    [campiQuery.data, sport],
  )
  const campiById = useMemo(() => {
    const m = new Map<string, Campo>()
    for (const c of campiQuery.data ?? []) m.set(String(c.id), c)
    return m
  }, [campiQuery.data])

  const amichevoli = useMieAmichevoli(sport, idCampi, profilo?.id ?? '')

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [sociQuery.data, profilo])

  const aggiorna = () => {
    qc.invalidateQueries({ queryKey: ['amichevoli'] })
    qc.invalidateQueries({ queryKey: ['prenotazioni'] })
  }

  // Dopo aver mosso punti/crediti: aggiorna i saldi e i riepiloghi a video.
  const aggiornaSaldi = () => {
    qc.invalidateQueries({ queryKey: ['soci'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti'] })
    qc.invalidateQueries({ queryKey: ['riepilogo-stat'] })
    qc.invalidateQueries({ queryKey: ['storico-movimenti'] })
  }

  const aggiungi = useMutation({
    mutationFn: async ({
      prenId,
      socioId,
      primo,
    }: {
      prenId: number | string
      socioId: string
      primo: boolean
    }) => {
      const righe = [{ prenotazione_id: prenId, socio_id: socioId, confermato: false }]
      if (primo && socioId !== profilo!.id) {
        righe.push({ prenotazione_id: prenId, socio_id: profilo!.id, confermato: false })
      }
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .upsert(righe, { onConflict: 'prenotazione_id,socio_id', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => {
      const err = e as { code?: string }
      if (err.code === '42501') {
        window.alert('Puoi aggiungere solo i tuoi amici (e te stesso) alle tue prenotazioni.')
      } else if (mancaTabella(e, 'partecipanti_amichevole')) {
        window.alert('Funzione non ancora attiva: esegui lo script tappa3a-amichevoli.sql su Supabase.')
      } else {
        window.alert('Aggiunta non riuscita: ' + messaggioErrore(e))
      }
    },
  })

  const rimuovi = useMutation({
    // Rimozione per id della riga: funziona anche per gli ospiti (socio_id null).
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('partecipanti_amichevole').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  // (Tappa 11) Solo l'admin: aggiunge un ospite non registrato (socio_id null).
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

  // (Tappa 11) Solo l'admin: conferma/annulla la presenza di un partecipante.
  // (Fase 8d) Confermare assegna punti/crediti; annullare li ritoglie. Gli
  // ospiti (socio_id null) non hanno account: nessun punto.
  const conferma = useMutation({
    mutationFn: async ({
      part,
      pren,
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
          await assegnaPuntiPresenza(
            pren,
            part.socio_id,
            sport,
            valoriQuery.data,
            !!modalitaPremiQuery.data,
          )
        else await annullaPuntiPresenza(pren.id, part.socio_id)
      }
    },
    onSuccess: () => {
      aggiorna()
      aggiornaSaldi()
    },
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + messaggioErrore(e)),
  })

  const annulla = useMutation({
    mutationFn: async (prenId: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', prenId)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  if (!profilo) return null
  if (amichevoli.isLoading || campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (amichevoli.error && mancaTabella(amichevoli.error, 'partecipanti_amichevole')) {
    return (
      <p className="sub">
        Funzione non ancora attiva: esegui lo script{' '}
        <code className="rounded bg-verde-50 px-1">tappa3a-amichevoli.sql</code> su Supabase.
      </p>
    )
  }
  if (amichevoli.error) {
    return <p className="sub">Impossibile caricare le prenotazioni: {messaggioErrore(amichevoli.error)}</p>
  }

  const lista = amichevoli.data?.lista ?? []
  if (lista.length === 0) {
    return (
      <p className="sub">
        Quando prenoti un campo, qui potrai indicare gli altri giocatori prima della partita. Le
        presenze le conferma poi l'admin.
      </p>
    )
  }

  const partsByPren = new Map<string, Partecipante[]>()
  for (const r of amichevoli.data?.parts ?? []) {
    const k = String(r.prenotazione_id)
    if (!partsByPren.has(k)) partsByPren.set(k, [])
    partsByPren.get(k)!.push(r)
  }

  const staff = !!(profilo.is_allenatore || profilo.is_admin || profilo.e_allenatore)
  const admin = !!profilo.is_admin
  const candidati = staff
    ? (sociQuery.data ?? []).filter((s) => s.id !== profilo.id)
    : amiciData.amici.map((a) => ({ id: a.id, etichetta: a.etichetta }))

  // Raggruppa per giorno.
  const gruppi: { giorno: string; etichetta: string; pren: MiaPrenotazione[] }[] = []
  for (const p of lista) {
    const d = new Date(p.inizio)
    const chiave = d.toDateString()
    let g = gruppi.find((x) => x.giorno === chiave)
    if (!g) {
      g = {
        giorno: chiave,
        etichetta: d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
        pren: [],
      }
      gruppi.push(g)
    }
    g.pren.push(p)
  }

  return (
    <div>
      {gruppi.map((g) => (
        <div key={g.giorno} className="gruppo-giorno">
          <div className="giorno-partite">
            {ICONA_CAL}
            <span>{g.etichetta}</span>
          </div>
          <div className="schede-griglia">
            {g.pren.map((p) => (
              <SchedaPartita
                key={p.id}
                sport={sport}
                pren={p}
                campo={campiById.get(String(p.campo_id))}
                partecipanti={partsByPren.get(String(p.id)) ?? []}
                etichette={etichette}
                candidati={candidati}
                staff={staff}
                mioId={profilo.id}
                amiciVuoti={!staff && amiciData.amici.length === 0}
                onAggiungi={(socioId, primo) => aggiungi.mutate({ prenId: p.id, socioId, primo })}
                // Nelle partite normali gli ospiti e la conferma sono solo per l'admin.
                onAggiungiOspite={
                  admin ? (nome) => aggiungiOspite.mutate({ prenId: p.id, nome }) : undefined
                }
                onConferma={
                  admin ? (part, valore) => conferma.mutate({ part, pren: p, valore }) : undefined
                }
                onRimuovi={(part) => rimuovi.mutate(part.id)}
                onAnnulla={() => {
                  const quando =
                    new Date(p.inizio).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }) +
                    ' alle ' +
                    oraLocale(new Date(p.inizio))
                  const dove = campiById.get(String(p.campo_id))?.nome ?? 'il campo'
                  if (window.confirm(`Annullare la tua prenotazione su ${dove} (${quando})?`))
                    annulla.mutate(p.id)
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SchedaPartita({
  sport,
  pren,
  campo,
  partecipanti,
  etichette,
  candidati,
  staff,
  mioId,
  amiciVuoti,
  onAggiungi,
  onAggiungiOspite,
  onConferma,
  onRimuovi,
  onAnnulla,
  confermaCliccando = false,
  inModale = false,
}: {
  sport: Sport
  pren: MiaPrenotazione
  campo: Campo | undefined
  partecipanti: Partecipante[]
  etichette: Map<string, string>
  candidati: { id: string; etichetta: string }[]
  staff: boolean
  mioId: string
  amiciVuoti: boolean
  onAggiungi: (socioId: string, primo: boolean) => void
  onAggiungiOspite?: (nome: string) => void
  onConferma?: (part: Partecipante, valore: boolean) => void
  onRimuovi: (part: Partecipante) => void
  onAnnulla: () => void
  // (Fase 8g) Modalità admin: la presenza si conferma con un clic sull'icona
  // accanto al nome (la capsula diventa verde), e solo dopo l'orario di inizio.
  confermaCliccando?: boolean
  // Scheda incassata in una finestra (pannello Prenotazioni admin): niente
  // riquadro proprio e niente data/ora/campo (sono già nell'intestazione).
  inModale?: boolean
}) {
  const inizio = new Date(pren.inizio)
  const fine = new Date(pren.fine)
  // È iniziata? Solo allora si possono confermare le presenze (modalità admin).
  const adesso = new Date()
  const iniziata = inizio <= adesso
  const lista = [...partecipanti].sort((a, b) => Number(b.confermato) - Number(a.confermato))
  const giaIds = new Set(lista.map((r) => r.socio_id).filter((x): x is string => !!x))
  const selezionabili = candidati.filter((c) => !giaIds.has(c.id))

  const cap4 = sport === 'padel' && !pren.allenamento && lista.length >= 4
  const disabilita = cap4 || amiciVuoti
  const testoVuoto = cap4
    ? 'Coppie complete (4/4)'
    : amiciVuoti
      ? 'Aggiungi prima degli amici dal Profilo'
      : staff
        ? '— Aggiungi giocatori —'
        : '— Aggiungi un amico —'

  return (
    <div className={'amichevole-riga' + (inModale ? ' in-modale' : '')}>
      <div className="amichevole-cap">
        <div>
          {!inModale && (
            <>
              <div className="quando">
                {inizio.toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="orario">
                {oraLocale(inizio)}–{oraLocale(fine)}
              </div>
              <div className="dove">{campo?.nome ?? 'Campo'}</div>
            </>
          )}
          {pren.allenamento ? (
            <>
              <div className="allenamento-badge">Allenamento</div>
              {pren.allenatore_id && (
                <div className="dove">Istruttore: {etichette.get(pren.allenatore_id) ?? '—'}</div>
              )}
            </>
          ) : (
            <div className="partita-badge">Partita</div>
          )}
        </div>
        {sport === 'padel' && <span className="part-conta">{lista.length}/4</span>}
      </div>

      {lista.length === 0 ? (
        <>
          <div className="part-vuoto">
            {staff
              ? 'Aggiungi i giocatori di questa partita.'
              : 'Indica gli altri giocatori di questa partita: verrai aggiunto in automatico.'}
          </div>
          {staff ? (
            <Selettore
              opzioni={selezionabili}
              disabilitato={disabilita}
              testoVuoto={testoVuoto}
              onScegli={(id) => onAggiungi(id, false)}
              onOspite={onAggiungiOspite}
            />
          ) : (
            <button
              type="button"
              className="btn btn-secondario btn-mini mt-2"
              onClick={() => onAggiungi(mioId, true)}
            >
              Indica i giocatori
            </button>
          )}
        </>
      ) : (
        <>
          <div className="chips">
            {lista.map((r) => {
              const nome = r.socio_id ? (etichette.get(r.socio_id) ?? 'Socio') : (r.nome_manuale ?? 'Ospite')
              const ospite = !r.socio_id && (
                <span className="stato" title="Giocatore non registrato">
                  ospite
                </span>
              )

              // (Fase 8g) Modalità admin: l'intera capsula è il pulsante di
              // conferma (verde quando confermata), attiva solo dopo l'inizio.
              if (confermaCliccando && onConferma) {
                // Non ancora iniziata: lucchetto al posto dell'icona di conferma.
                if (!iniziata) {
                  return (
                    <span key={r.id} className="chip">
                      <span
                        className="chip-lock"
                        title="Confermabile dopo l’orario di inizio"
                        aria-label="Bloccato"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      {nome}
                      {ospite}
                      {!r.confermato && (
                        <button type="button" className="x" title="Togli" onClick={() => onRimuovi(r)}>
                          ×
                        </button>
                      )}
                    </span>
                  )
                }
                return (
                  <span key={r.id} className={'chip' + (r.confermato ? ' conf' : '')}>
                    <button
                      type="button"
                      className="chip-conf"
                      aria-pressed={r.confermato}
                      title={r.confermato ? 'Annulla la conferma' : 'Conferma la presenza'}
                      onClick={() => onConferma(r, !r.confermato)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8 12.4l2.6 2.6L16 9" />
                      </svg>
                    </button>
                    {nome}
                    {ospite}
                    {!r.confermato && (
                      <button type="button" className="x" title="Togli" onClick={() => onRimuovi(r)}>
                        ×
                      </button>
                    )}
                  </span>
                )
              }

              return (
                <span key={r.id} className={'chip' + (r.confermato ? ' conf' : '')}>
                  {nome}
                  {ospite}
                  {r.confermato ? (
                    onConferma ? (
                      <button
                        type="button"
                        className="x"
                        title="Annulla conferma"
                        onClick={() => onConferma(r, false)}
                      >
                        ✓
                      </button>
                    ) : (
                      <span className="stato" title="Presenza confermata dall'admin">
                        ✓
                      </span>
                    )
                  ) : (
                    <>
                      {onConferma && (
                        <button
                          type="button"
                          className="x"
                          title="Conferma presenza"
                          onClick={() => onConferma(r, true)}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        type="button"
                        className="x"
                        title="Togli"
                        onClick={() => onRimuovi(r)}
                      >
                        ×
                      </button>
                    </>
                  )}
                </span>
              )
            })}
          </div>
          <Selettore
            opzioni={selezionabili}
            disabilitato={disabilita}
            testoVuoto={testoVuoto}
            onScegli={(id) => onAggiungi(id, false)}
            onOspite={onAggiungiOspite}
          />
        </>
      )}

      <div className="mt-auto pt-3">
        <button type="button" className="btn btn-pericolo btn-mini w-full" onClick={onAnnulla}>
          Annulla la prenotazione
        </button>
      </div>
    </div>
  )
}

function Selettore({
  opzioni,
  disabilitato,
  testoVuoto,
  onScegli,
  onOspite,
}: {
  opzioni: { id: string; etichetta: string }[]
  disabilitato: boolean
  testoVuoto: string
  onScegli: (id: string) => void
  onOspite?: (nome: string) => void
}) {
  return (
    <div className="aggiungi-part">
      <select
        value=""
        disabled={disabilitato}
        onChange={(e) => {
          const v = e.target.value
          if (!v) return
          // (Tappa 11) Voce "ospite": chiede il nome in una finestra a comparsa
          // e aggiunge un giocatore non registrato.
          if (v === '__ospite__') {
            const nome = window.prompt('Nome dell’ospite (giocatore non registrato):')
            if (nome && nome.trim()) onOspite?.(nome.trim())
            return
          }
          onScegli(v)
        }}
      >
        <option value="">{testoVuoto}</option>
        {onOspite && <option value="__ospite__">＋ Ospite (non registrato)…</option>}
        {opzioni.map((o) => (
          <option key={o.id} value={o.id}>
            {o.etichetta}
          </option>
        ))}
      </select>
    </div>
  )
}
