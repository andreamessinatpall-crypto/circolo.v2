// Gestione giocatori per i tornei Americano.
// A differenza del girone/eliminazione, ogni "squadra" è un singolo giocatore;
// il componente crea la squadra e aggiunge il giocatore in un solo gesto.

import { useMemo, useState } from 'react'
import ModalConferma from '@/components/ModalConferma'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { useSociPubblici } from '@/features/prenotazioni/datiAmichevoli'
import { assegnaPuntiIscrizione, annullaPuntiIscrizione } from './punti'
import { genereEffettivoComponente, validaIscrizioneMista } from './americano'
import { ICO_WARN } from './icone'
import type { Componente, Squadra, Torneo } from './tipi'

export default function GestioneGiocatoriAmericano({
  torneo,
  giocatori,
  compBySquadra,
  assegnati,
}: {
  torneo: Torneo
  giocatori: Squadra[]
  compBySquadra: Record<string, Componente[]>
  assegnati: Set<string>
}) {
  const qc = useQueryClient()
  const sociQuery = useSociPubblici()
  const [daRimuovere, setDaRimuovere] = useState<{ id: string; nome: string } | null>(null)

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    return m
  }, [sociQuery.data])

  // (Fase 6bis) Genere per socio, per validare l'iscrizione alla modalità Mista.
  const genereBySocio = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.genere ?? null)
    return m
  }, [sociQuery.data])

  const isMisto = torneo.modalita_americano === 'misto'
  const conteggioGenere = useMemo(() => {
    if (!isMisto) return null
    let uomini = 0, donne = 0, senzaGenere = 0
    for (const g of giocatori) {
      const comp = compBySquadra[String(g.id)]?.[0]
      const genere = genereEffettivoComponente(comp, genereBySocio)
      if (genere === 'M') uomini++
      else if (genere === 'F') donne++
      else senzaGenere++
    }
    return { uomini, donne, senzaGenere }
  }, [isMisto, giocatori, compBySquadra, genereBySocio])

  const erroreMisto = conteggioGenere
    ? conteggioGenere.senzaGenere > 0
      ? `${conteggioGenere.senzaGenere} ${conteggioGenere.senzaGenere === 1 ? 'giocatore non ha' : 'giocatori non hanno'} il genere impostato (M/F): non ${conteggioGenere.senzaGenere === 1 ? 'può' : 'possono'} partecipare alla modalità Mista.`
      : validaIscrizioneMista(conteggioGenere.uomini, conteggioGenere.donne)
    : null

  const aggiorna = () => {
    qc.invalidateQueries({ queryKey: ['tornei'] })
    qc.invalidateQueries({ queryKey: ['prenotazioni'] })
  }

  // Aggiunge un socio registrato: crea la squadra col suo nome e aggiunge il componente.
  const aggiungi = useMutation({
    mutationFn: async (socioId: string) => {
      const nome = etichette.get(socioId) ?? 'Giocatore'
      const { data: sq, error: errSq } = await supabase
        .from('squadre')
        .insert({ torneo_id: torneo.id, nome })
        .select('id')
        .single()
      if (errSq) throw errSq
      const { error } = await supabase.from('squadra_componenti').insert({
        squadra_id: sq.id,
        socio_id: socioId,
        torneo_id: torneo.id,
        riserva: false,
      })
      if (error) throw error
      // Assegna punti iscrizione se configurati.
      const squadra: Squadra = { id: sq.id, torneo_id: torneo.id, nome, logo_url: null, girone: null }
      await assegnaPuntiIscrizione(torneo, squadra, socioId)
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  // Aggiunge un ospite non registrato.
  const aggiungiOspite = useMutation({
    mutationFn: async (nome: string) => {
      const { data: sq, error: errSq } = await supabase
        .from('squadre')
        .insert({ torneo_id: torneo.id, nome })
        .select('id')
        .single()
      if (errSq) throw errSq
      const { error } = await supabase.from('squadra_componenti').insert({
        squadra_id: sq.id,
        socio_id: null,
        nome_manuale: nome,
        torneo_id: torneo.id,
        riserva: false,
      })
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  // (Fase 6bis) Imposta/corregge il genere di un componente per questo torneo
  // (override rispetto al profilo, unico modo per assegnarlo agli ospiti).
  const aggiornaGenere = useMutation({
    mutationFn: async ({ compId, genere }: { compId: number | string; genere: string | null }) => {
      const { error } = await supabase.from('squadra_componenti').update({ genere }).eq('id', compId)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  const rimuovi = useMutation({
    mutationFn: async (squadraId: number | string) => {
      // Annulla punti iscrizione prima di eliminare il record.
      const { data: comp } = await supabase
        .from('squadra_componenti')
        .select('socio_id')
        .eq('squadra_id', squadraId)
        .single()
      if (comp?.socio_id) await annullaPuntiIscrizione(squadraId, comp.socio_id)
      await supabase.from('squadra_componenti').delete().eq('squadra_id', squadraId)
      const { error } = await supabase.from('squadre').delete().eq('id', squadraId)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Non riuscito: ' + messaggioErrore(e)),
  })

  if (sociQuery.isLoading) return <p className="sub">Caricamento soci…</p>

  const selezionabili = (sociQuery.data ?? []).filter((s) => !assegnati.has(s.id))
  const limite = torneo.max_squadre
  const pieno = limite != null && giocatori.length >= limite

  return (
    <div>
      {conteggioGenere && (
        <p className="sub mb-2" style={{ fontSize: '0.82rem' }}>
          Modalità Mista: {conteggioGenere.uomini} uomini · {conteggioGenere.donne} donne
          {conteggioGenere.senzaGenere > 0 ? ` · ${conteggioGenere.senzaGenere} senza genere` : ''}
        </p>
      )}
      {erroreMisto && (
        <p className="mb-2" style={{ fontSize: '0.82rem', color: 'var(--errore, #b91c1c)' }}>
          {ICO_WARN}{erroreMisto}
        </p>
      )}
      {!pieno && (
        <div className="mb-3 flex items-center gap-3">
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              if (v === '__ospite__') {
                const nome = window.prompt('Nome del giocatore ospite:')
                if (nome?.trim()) aggiungiOspite.mutate(nome.trim())
                return
              }
              aggiungi.mutate(v)
            }}
            className="flex-1"
            style={{ maxWidth: 320 }}
          >
            <option value="">Aggiungi</option>
            <option value="__ospite__">＋ Ospite</option>
            {selezionabili.map((s) => (
              <option key={s.id} value={s.id}>
                {s.etichetta}
              </option>
            ))}
          </select>
          <span className="sub" style={{ marginLeft: 'auto' }}>
            {limite != null
              ? `${giocatori.length}/${limite} giocatori`
              : giocatori.length > 0
                ? `${giocatori.length} giocatori`
                : null}
          </span>
        </div>
      )}

      {giocatori.length === 0 ? (
        <p className="part-vuoto">Nessun giocatore ancora.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {giocatori.map((g, idx) => {
            const comp = compBySquadra[String(g.id)]?.[0]
            const isOspite = comp && !comp.socio_id
            return (
              <div key={g.id} className="comp-riga" style={{ padding: '6px 8px', background: 'var(--card-bg)', borderRadius: 6 }}>
                <span className="sub" style={{ minWidth: 24, textAlign: 'right', color: 'var(--ink-3)' }}>
                  {idx + 1}.
                </span>
                <span className="nome" style={{ marginLeft: 8 }}>
                  {g.nome}
                  {isOspite && <span className="sub text-xs"> · ospite</span>}
                </span>
                {isMisto && (
                  <select
                    value={genereEffettivoComponente(comp, genereBySocio) ?? ''}
                    disabled={aggiornaGenere.isPending}
                    onChange={(e) =>
                      comp && aggiornaGenere.mutate({ compId: comp.id, genere: e.target.value || null })
                    }
                    style={{
                      fontSize: '0.78rem',
                      padding: '2px 0',
                      marginLeft: 'auto',
                      width: '2.6rem',
                      textAlign: 'center',
                      textAlignLast: 'center',
                    }}
                  >
                    <option value="">—</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                )}
                <button
                  type="button"
                  className="border-0 bg-transparent px-1 text-xl font-bold leading-none text-red-700"
                  title="Rimuovi dal torneo"
                  onClick={() => setDaRimuovere({ id: String(g.id), nome: g.nome })}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {daRimuovere && (
        <ModalConferma
          titolo="Rimuovere dal torneo?"
          messaggio={`${daRimuovere.nome} verrà rimosso dal torneo.`}
          labelConferma="Rimuovi"
          pericolo
          onConferma={() => { rimuovi.mutate(daRimuovere.id); setDaRimuovere(null) }}
          onAnnulla={() => setDaRimuovere(null)}
        />
      )}
    </div>
  )
}
