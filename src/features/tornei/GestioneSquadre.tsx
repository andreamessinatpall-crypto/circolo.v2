import { useMemo, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { eDuplicato, messaggioErrore } from '@/lib/errori'
import { logoDaFile } from '@/lib/immagini'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { nomeSquadraElegante } from './gironi'
import { annullaPuntiIscrizione, assegnaPuntiIscrizione } from './punti'
import type { Componente, RichiestaIscrizione, Squadra, Torneo } from './tipi'

// Cognome del socio: in v2 non abbiamo un campo separato, quindi prendiamo
// l'ultima parola dell'etichetta (Nome Cognome).
function cognomeDa(etichetta: string) {
  const parti = (etichetta || '').trim().split(/\s+/)
  return parti.length ? parti[parti.length - 1] : ''
}

// Nome da mostrare per un componente: il socio registrato, oppure il nome
// inserito a mano per un giocatore non registrato.
function nomeComponente(c: Componente, etichette: Map<string, string>) {
  if (c.socio_id) return etichette.get(c.socio_id) ?? 'Socio'
  return c.nome_manuale ?? 'Giocatore'
}

// La colonna "nome_manuale" potrebbe non esistere ancora nel database.
function mancaColonnaManuale(error: unknown) {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  return (
    e.code === 'PGRST204' ||
    e.code === '42703' ||
    (e.message ?? '').toLowerCase().includes('nome_manuale')
  )
}

// La colonna "riserva" potrebbe non esistere ancora nel database.
function mancaColonnaRiserva(error: unknown) {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  return (
    e.code === 'PGRST204' ||
    e.code === '42703' ||
    (e.message ?? '').toLowerCase().includes('riserva')
  )
}

// La colonna "logo_url" potrebbe non esistere ancora nel database.
function mancaColonnaLogo(error: unknown) {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  return (
    e.code === 'PGRST204' ||
    e.code === '42703' ||
    (e.message ?? '').toLowerCase().includes('logo_url')
  )
}

export default function GestioneSquadre({
  torneo,
  squadre,
  compBySquadra,
  assegnati,
  richieste = [],
}: {
  torneo: Torneo
  squadre: Squadra[]
  compBySquadra: Record<string, Componente[]>
  assegnati: Set<string>
  richieste?: RichiestaIscrizione[]
}) {
  const qc = useQueryClient()
  const sociQuery = useSociPubblici()

  // Mappa id socio -> etichetta (per i nomi e per comporre il nome della coppia).
  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    return m
  }, [sociQuery.data])

  const aggiorna = () => qc.invalidateQueries({ queryKey: ['tornei'] })

  // Padel: il nome della coppia = cognomi dei giocatori (titolari prima, riserva in fondo).
  async function aggiornaNomeCoppia(squadraId: number | string) {
    const { data: comp } = await supabase
      .from('squadra_componenti')
      .select('*')
      .eq('squadra_id', squadraId)
    if (!comp || !comp.length) return
    const ord = (comp as Componente[])
      .slice()
      .sort((a, b) => (a.riserva ? 1 : 0) - (b.riserva ? 1 : 0))
    const cognomi = ord
      .map((c) => cognomeDa(c.socio_id ? (etichette.get(c.socio_id) ?? '') : (c.nome_manuale ?? '')))
      .filter(Boolean)
    if (!cognomi.length) return
    await supabase.from('squadre').update({ nome: cognomi.join('/') }).eq('id', squadraId)
  }

  const crea = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from('squadre').insert({ torneo_id: torneo.id, nome })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  const rinomina = useMutation({
    mutationFn: async ({ id, nome }: { id: number | string; nome: string }) => {
      const { error } = await supabase.from('squadre').update({ nome }).eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Rinomina non riuscita: ' + messaggioErrore(e)),
  })

  const elimina = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('squadre').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  const aggiungiComp = useMutation({
    mutationFn: async ({
      squadraId,
      socioId,
      riserva,
    }: {
      squadraId: number | string
      socioId: string
      riserva: boolean
    }) => {
      const riga: Record<string, unknown> = {
        squadra_id: squadraId,
        socio_id: socioId,
        torneo_id: torneo.id,
        riserva,
      }
      let { error } = await supabase.from('squadra_componenti').insert(riga)
      // Tollerante: se la colonna "riserva" non esiste ancora, reinserisco senza.
      if (error && mancaColonnaRiserva(error)) {
        delete riga.riserva
        ;({ error } = await supabase.from('squadra_componenti').insert(riga))
        if (!error)
          window.alert(
            'Giocatore aggiunto, ma la colonna “riserva” manca: esegui lo script tappa9-riserva-coppie.sql su Supabase.',
          )
      }
      if (error) throw error
      // (Fase 7b) Punti di iscrizione al socio, in base al girone della squadra
      // (silenzioso: il riepilogo punti mostra comunque quanto spetta).
      const squadra = squadre.find((s) => String(s.id) === String(squadraId))
      if (squadra) await assegnaPuntiIscrizione(torneo, squadra, socioId)
      if (torneo.sport === 'padel') await aggiornaNomeCoppia(squadraId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        eDuplicato(e)
          ? 'Questo giocatore è già in una squadra di questo torneo.'
          : 'Non riuscito: ' + messaggioErrore(e),
      ),
  })

  // (Tappa 10) Giocatore NON registrato, inserito a mano: nessun socio_id,
  // quindi non guadagna punti né crediti.
  const aggiungiCompManuale = useMutation({
    mutationFn: async ({
      squadraId,
      nome,
      riserva,
    }: {
      squadraId: number | string
      nome: string
      riserva: boolean
    }) => {
      const riga: Record<string, unknown> = {
        squadra_id: squadraId,
        socio_id: null,
        nome_manuale: nome,
        torneo_id: torneo.id,
        riserva,
      }
      let { error } = await supabase.from('squadra_componenti').insert(riga)
      // Tollerante: se manca la colonna "riserva", reinserisco senza.
      if (error && mancaColonnaRiserva(error)) {
        delete riga.riserva
        ;({ error } = await supabase.from('squadra_componenti').insert(riga))
      }
      if (error) throw error
      if (torneo.sport === 'padel') await aggiornaNomeCoppia(squadraId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaManuale(e)
          ? 'Per inserire giocatori non registrati esegui lo script tappa10-componenti-manuali.sql su Supabase.'
          : 'Non riuscito: ' + messaggioErrore(e),
      ),
  })

  // (Calcio) logo della squadra: salvo il data URL nella colonna squadre.logo_url.
  const logo = useMutation({
    mutationFn: async ({ id, dataUrl }: { id: number | string; dataUrl: string | null }) => {
      const { error } = await supabase.from('squadre').update({ logo_url: dataUrl }).eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaLogo(e)
          ? 'Manca la colonna logo_url nella tabella squadre. Esegui su Supabase: ALTER TABLE squadre ADD COLUMN logo_url text;'
          : 'Salvataggio logo non riuscito: ' + messaggioErrore(e),
      ),
  })

  const rimuoviComp = useMutation({
    mutationFn: async ({
      squadraId,
      comp,
    }: {
      squadraId: number | string
      comp: Componente
    }) => {
      // Rimuovo per id del componente: funziona anche per i giocatori manuali
      // (che non hanno socio_id).
      const { error } = await supabase.from('squadra_componenti').delete().eq('id', comp.id)
      if (error) throw error
      // (Fase 7b) Tolgo i punti di iscrizione assegnati a questo socio (i
      // componenti manuali non ne hanno).
      if (comp.socio_id) await annullaPuntiIscrizione(squadraId, comp.socio_id)
      if (torneo.sport === 'padel') await aggiornaNomeCoppia(squadraId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  const accettaRichiesta = useMutation({
    mutationFn: async (r: RichiestaIscrizione) => {
      // Crea una squadra con nome provvisorio, poi aggiunge tutti i componenti.
      const { data: sq, error: errSq } = await supabase
        .from('squadre')
        .insert({ torneo_id: torneo.id, nome: 'Nuova squadra' })
        .select('id')
        .single()
      if (errSq) throw errSq
      const squadraId = sq.id
      const tuttiIds = [r.richiedente_id, ...r.componenti]
      for (let i = 0; i < tuttiIds.length; i++) {
        const riga: Record<string, unknown> = {
          squadra_id: squadraId,
          socio_id: tuttiIds[i],
          torneo_id: torneo.id,
          riserva: i >= 2, // i primi 2 titolari, gli altri riserve
        }
        const { error } = await supabase.from('squadra_componenti').insert(riga)
        if (error && !error.message?.toLowerCase().includes('riserva')) throw error
      }
      // Aggiorno il nome della coppia/squadra in base ai cognomi.
      await aggiornaNomeCoppia(squadraId)
      // Rimuovo la richiesta.
      await supabase.from('richieste_iscrizione').delete().eq('id', r.id)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  const eliminaRichiesta = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('richieste_iscrizione').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  if (sociQuery.isLoading) return <p className="sub">Caricamento soci…</p>

  return (
    <div>
      {richieste.length > 0 && (
        <div className="mb-5">
          <div className="eyebrow mb-2">
            Richieste di iscrizione ({richieste.length})
          </div>
          <div className="flex flex-col gap-2">
            {richieste.map((r) => {
              const tutti = [r.richiedente_id, ...r.componenti]
              return (
                <div key={r.id} className="richiesta-riga">
                  <div className="richiesta-nomi">
                    {tutti.map((id, i) => (
                      <span key={id} className="richiesta-nome">
                        {i > 0 && <span className="richiesta-sep">·</span>}
                        {etichette.get(id) ?? 'Giocatore'}
                      </span>
                    ))}
                  </div>
                  <div className="richiesta-data">
                    {new Date(r.creata_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-mini"
                      disabled={accettaRichiesta.isPending}
                      onClick={() => accettaRichiesta.mutate(r)}
                    >
                      Crea squadra
                    </button>
                    <button
                      type="button"
                      className="btn btn-pericolo btn-mini"
                      disabled={eliminaRichiesta.isPending}
                      onClick={() => {
                        if (window.confirm('Eliminare questa richiesta?')) eliminaRichiesta.mutate(r.id)
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-3" style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn-secondario"
          onClick={() => crea.mutate('Nuova squadra')}
          disabled={torneo.max_squadre != null && squadre.length >= torneo.max_squadre}
        >
          Aggiungi squadra
        </button>
        <span className="sub" style={{ marginLeft: 'auto' }}>
          {torneo.max_squadre != null
            ? `${squadre.length}/${torneo.max_squadre} ${squadre.length === 1 ? 'squadra iscritta' : 'squadre iscritte'}`
            : squadre.length > 0
              ? `${squadre.length} ${squadre.length === 1 ? 'squadra iscritta' : 'squadre iscritte'}`
              : null}
        </span>
      </div>

      <div className="schede-griglia">
        {squadre.map((s) => (
          <RigaSquadra
            key={s.id}
            torneo={torneo}
            squadra={s}
            componenti={compBySquadra[String(s.id)] ?? []}
            etichette={etichette}
            soci={sociQuery.data ?? []}
            assegnati={assegnati}
            onRinomina={(nome) => rinomina.mutate({ id: s.id, nome })}
            onElimina={() => elimina.mutate(s.id)}
            onAggiungi={(socioId, riserva) =>
              aggiungiComp.mutate({ squadraId: s.id, socioId, riserva })
            }
            onAggiungiManuale={(nome, riserva) =>
              aggiungiCompManuale.mutate({ squadraId: s.id, nome, riserva })
            }
            onRimuovi={(comp) => rimuoviComp.mutate({ squadraId: s.id, comp })}
            onLogo={(dataUrl) => logo.mutate({ id: s.id, dataUrl })}
          />
        ))}
      </div>

      {squadre.length === 0 && <p className="part-vuoto">Nessuna squadra ancora.</p>}
    </div>
  )
}

function RigaSquadra({
  torneo,
  squadra,
  componenti,
  etichette,
  soci,
  assegnati,
  onRinomina,
  onElimina,
  onAggiungi,
  onAggiungiManuale,
  onRimuovi,
  onLogo,
}: {
  torneo: Torneo
  squadra: Squadra
  componenti: Componente[]
  etichette: Map<string, string>
  soci: { id: string; etichetta: string }[]
  assegnati: Set<string>
  onRinomina: (nome: string) => void
  onElimina: () => void
  onAggiungi: (socioId: string, riserva: boolean) => void
  onAggiungiManuale: (nome: string, riserva: boolean) => void
  onRimuovi: (comp: Componente) => void
  onLogo: (dataUrl: string | null) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Titolari prima, riserve in fondo.
  const ordinati = componenti
    .slice()
    .sort((a, b) => (a.riserva ? 1 : 0) - (b.riserva ? 1 : 0))

  // Padel: massimo 3 giocatori per squadra.
  const pieno = torneo.sport === 'padel' && componenti.length >= 3
  const prossimoRiserva = torneo.sport === 'padel' && componenti.length >= 2

  // Soci selezionabili: non già assegnati in questo torneo.
  const selezionabili = soci.filter((s) => !assegnati.has(s.id))

  return (
    <div className="amichevole-riga squadra-card">
      <div className="amichevole-cap">
        <div className="quando">
          <span className="chip-squadra">{nomeSquadraElegante(squadra.nome)}</span>
        </div>
        <div className="azioni-squadra flex gap-1.5">
          <button
            type="button"
            className="btn btn-secondario btn-mini"
            title="Rinomina"
            onClick={() => {
              const nuovo = window.prompt('Nuovo nome:', squadra.nome)
              if (nuovo == null) return
              const nome = nuovo.trim()
              if (nome && nome !== squadra.nome) onRinomina(nome)
            }}
          >
            ✏️
          </button>
          <button
            type="button"
            className="btn btn-pericolo btn-mini"
            title="Elimina"
            onClick={() => {
              if (window.confirm('Eliminare “' + squadra.nome + '”?')) onElimina()
            }}
          >
            🗑
          </button>
        </div>
      </div>

      {torneo.sport === 'calcio' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
          {squadra.logo_url ? (
            <img
              className="logo-squadra grande"
              src={squadra.logo_url}
              alt={'Logo ' + squadra.nome}
              style={{ display: 'block', flexShrink: 0 }}
            />
          ) : (
            <span className="logo-segnaposto grande" aria-hidden style={{ flexShrink: 0 }}>
              ⚽
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                onLogo(await logoDaFile(file))
              } catch (err) {
                window.alert(messaggioErrore(err))
              }
            }}
          />
          <button
            type="button"
            title={squadra.logo_url ? 'Cambia logo' : 'Carica logo'}
            onClick={() => fileInputRef.current?.click()}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              boxSizing: 'border-box',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2, #f0f0f0)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          {squadra.logo_url && (
            <button
              type="button"
              title="Rimuovi logo"
              onClick={() => onLogo(null)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                boxSizing: 'border-box',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--errore, #b91c1c)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(185,28,28,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {ordinati.length === 0 ? (
        <div className="part-vuoto">Nessun giocatore.</div>
      ) : (
        <div>
          {ordinati.map((c) => (
            <div key={c.id} className="comp-riga">
              <span className="nome">
                {nomeComponente(c, etichette)}
                {!c.socio_id && <span className="sub text-xs"> · ospite</span>}
              </span>
              <button
                type="button"
                className="border-0 bg-transparent px-1 text-xl font-bold leading-none text-red-700"
                title="Togli dalla squadra"
                onClick={() => onRimuovi(c)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {!pieno && (
        <div className="aggiungi-part">
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              // (Tappa 10) Voce "ospite": chiede il nome in una finestra a comparsa
              // e aggiunge un giocatore non registrato (niente punti/crediti).
              if (v === '__ospite__') {
                const nome = window.prompt('Nome del giocatore non registrato:')
                if (nome && nome.trim()) onAggiungiManuale(nome.trim(), prossimoRiserva)
                return
              }
              onAggiungi(v, prossimoRiserva)
            }}
          >
            <option value="">— Aggiungi un giocatore —</option>
            <option value="__ospite__">＋ Ospite (non registrato)…</option>
            {selezionabili.map((s) => (
              <option key={s.id} value={s.id}>
                {s.etichetta}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
