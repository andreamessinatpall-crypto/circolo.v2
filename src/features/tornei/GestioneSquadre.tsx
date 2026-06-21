import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { eDuplicato, messaggioErrore } from '@/lib/errori'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import type { Componente, Squadra, Torneo } from './tipi'

// Padel = "coppia", Calcio = "squadra" (come la v1).
function unitaSquadra(sport: string, plurale = false) {
  if (sport === 'padel') return plurale ? 'coppie' : 'coppia'
  return plurale ? 'squadre' : 'squadra'
}

// Cognome del socio: in v2 non abbiamo un campo separato, quindi prendiamo
// l'ultima parola dell'etichetta (Nome Cognome).
function cognomeDa(etichetta: string) {
  const parti = (etichetta || '').trim().split(/\s+/)
  return parti.length ? parti[parti.length - 1] : ''
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

export default function GestioneSquadre({
  torneo,
  squadre,
  compBySquadra,
  assegnati,
}: {
  torneo: Torneo
  squadre: Squadra[]
  compBySquadra: Record<string, Componente[]>
  assegnati: Set<string>
}) {
  const qc = useQueryClient()
  const sociQuery = useSociPubblici()
  const [nuovoNome, setNuovoNome] = useState('')

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
    const cognomi = ord.map((c) => cognomeDa(etichette.get(c.socio_id) ?? '')).filter(Boolean)
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
      // TODO Fase 7 (punti/premi): assegnare i punti di iscrizione al socio.
      if (torneo.sport === 'padel') await aggiornaNomeCoppia(squadraId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        eDuplicato(e)
          ? 'Questo giocatore è già in una ' + unitaSquadra(torneo.sport) + ' di questo torneo.'
          : 'Non riuscito: ' + messaggioErrore(e),
      ),
  })

  const rimuoviComp = useMutation({
    mutationFn: async ({
      squadraId,
      socioId,
    }: {
      squadraId: number | string
      socioId: string
    }) => {
      const { error } = await supabase
        .from('squadra_componenti')
        .delete()
        .eq('squadra_id', squadraId)
        .eq('socio_id', socioId)
      if (error) throw error
      if (torneo.sport === 'padel') await aggiornaNomeCoppia(squadraId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  const impostaRiserva = useMutation({
    mutationFn: async ({
      squadraId,
      socioId,
    }: {
      squadraId: number | string
      socioId: string
    }) => {
      // Mantiene esattamente una riserva: il socio scelto diventa riserva e
      // tutti gli altri tornano titolari (sempre 2 titolari + 1 riserva).
      const { error: e1 } = await supabase
        .from('squadra_componenti')
        .update({ riserva: false })
        .eq('squadra_id', squadraId)
        .neq('socio_id', socioId)
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('squadra_componenti')
        .update({ riserva: true })
        .eq('squadra_id', squadraId)
        .eq('socio_id', socioId)
      if (e2) throw e2
      await aggiornaNomeCoppia(squadraId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) =>
      window.alert(
        mancaColonnaRiserva(e)
          ? 'Manca la colonna “riserva”: esegui lo script tappa9-riserva-coppie.sql su Supabase.'
          : 'Non riuscito: ' + messaggioErrore(e),
      ),
  })

  if (sociQuery.isLoading) return <p className="sub">Caricamento soci…</p>

  const unita = unitaSquadra(torneo.sport)

  return (
    <div>
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
            onRimuovi={(socioId) => rimuoviComp.mutate({ squadraId: s.id, socioId })}
            onImpostaRiserva={(socioId) => impostaRiserva.mutate({ squadraId: s.id, socioId })}
          />
        ))}
      </div>

      {squadre.length === 0 && (
        <p className="part-vuoto">Nessuna {unita} ancora.</p>
      )}

      <div className="aggiungi-part" style={{ marginTop: 12 }}>
        <input
          type="text"
          value={nuovoNome}
          placeholder={
            'Nome ' + unita + ' (es. ' + (torneo.sport === 'padel' ? 'Rossi/Bianchi' : 'Team A') + ')'
          }
          style={{ flex: '1 1 180px' }}
          onChange={(e) => setNuovoNome(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondario"
          onClick={() => {
            let nome = nuovoNome.trim()
            // Padel: il nome si comporrà dai cognomi, quindi un default va bene.
            if (!nome) {
              if (torneo.sport === 'padel') nome = 'Nuova coppia'
              else return
            }
            crea.mutate(nome)
            setNuovoNome('')
          }}
        >
          Aggiungi {unita}
        </button>
      </div>
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
  onRimuovi,
  onImpostaRiserva,
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
  onRimuovi: (socioId: string) => void
  onImpostaRiserva: (socioId: string) => void
}) {
  // Titolari prima, riserve in fondo.
  const ordinati = componenti
    .slice()
    .sort((a, b) => (a.riserva ? 1 : 0) - (b.riserva ? 1 : 0))

  // Padel: massimo 3 (2 titolari + 1 riserva). Il 3º entra come riserva.
  const pieno = torneo.sport === 'padel' && componenti.length >= 3
  const prossimoRiserva = torneo.sport === 'padel' && componenti.length >= 2
  const testoVuoto = pieno
    ? 'Squadra completa (3/3)'
    : prossimoRiserva
      ? '— Aggiungi riserva —'
      : '— Aggiungi un socio —'

  // Soci selezionabili: non già assegnati in questo torneo.
  const selezionabili = soci.filter((s) => !assegnati.has(s.id))

  return (
    <div className="amichevole-riga">
      <div className="amichevole-cap">
        <div className="quando">{squadra.nome}</div>
        <div className="flex gap-1.5">
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

      {ordinati.length === 0 ? (
        <div className="part-vuoto">Nessun giocatore.</div>
      ) : (
        <div>
          {ordinati.map((c) => {
            // Le icone di ruolo compaiono solo nel padel quando c'è la riserva (3 giocatori).
            const mostraRuolo = torneo.sport === 'padel' && componenti.length >= 3
            return (
              <div key={c.socio_id} className="comp-riga">
                <div className="nome flex items-center gap-2">
                  {mostraRuolo && (
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0.5 text-base leading-none"
                      style={{ cursor: c.riserva ? 'default' : 'pointer' }}
                      title={
                        c.riserva
                          ? 'Riserva — tocca un titolare per cambiarla'
                          : 'Titolare — tocca per renderlo riserva'
                      }
                      onClick={() => {
                        if (!c.riserva) onImpostaRiserva(c.socio_id)
                      }}
                    >
                      {c.riserva ? '🪑' : '⭐'}
                    </button>
                  )}
                  <span>{etichette.get(c.socio_id) ?? 'Socio'}</span>
                </div>
                <button
                  type="button"
                  className="border-0 bg-transparent px-1 text-xl font-bold leading-none text-red-700"
                  title="Togli dalla squadra"
                  onClick={() => onRimuovi(c.socio_id)}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="aggiungi-part">
        <select
          value=""
          disabled={pieno}
          onChange={(e) => {
            if (e.target.value) onAggiungi(e.target.value, prossimoRiserva)
          }}
        >
          <option value="">{testoVuoto}</option>
          {selezionabili.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etichetta}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
