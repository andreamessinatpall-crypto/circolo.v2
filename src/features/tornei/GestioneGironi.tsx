import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'
import { classiInput } from '@/components/stili'
import {
  LETTERE_GIRONE,
  mancaColonnaGironi,
  nomeGirone,
  numGironi,
  SCRIPT_GIRONI,
  unitaTorneo,
} from './gironi'
import type { Squadra, Torneo } from './tipi'

// (Fase 6c) Pannello staff per organizzare le squadre/coppie nei gironi:
// quanti gironi, sorteggio automatico, rinomina e assegnazione manuale.
export default function GestioneGironi({
  torneo,
  squadre,
}: {
  torneo: Torneo
  squadre: Squadra[]
}) {
  const qc = useQueryClient()
  const aggiorna = () => qc.invalidateQueries({ queryKey: ['tornei'] })
  const n = numGironi(torneo)

  // Mostra il messaggio giusto: o lo script SQL mancante, o l'errore vero.
  const segnalaErrore = (e: unknown) =>
    window.alert(mancaColonnaGironi(e) ? SCRIPT_GIRONI : 'Non riuscito: ' + messaggioErrore(e))

  const cambiaNumero = useMutation({
    mutationFn: async (nuovo: number) => {
      const val = Math.min(12, Math.max(1, nuovo || 1))
      const { error } = await supabase
        .from('tornei')
        .update({ numero_gironi: val })
        .eq('id', torneo.id)
      if (error) throw error
      // Le squadre finite in un girone che non esiste più tornano "non assegnate".
      await supabase.from('squadre').update({ girone: null }).eq('torneo_id', torneo.id).gt('girone', val)
    },
    onSuccess: aggiorna,
    onError: segnalaErrore,
  })

  const sorteggia = useMutation({
    mutationFn: async () => {
      // Mescolo e distribuisco a giro: gironi il più equilibrati possibile.
      const mescolate = squadre.slice().sort(() => Math.random() - 0.5)
      for (let i = 0; i < mescolate.length; i++) {
        const g = (i % n) + 1
        const { error } = await supabase.from('squadre').update({ girone: g }).eq('id', mescolate[i].id)
        if (error) throw error
      }
    },
    onSuccess: aggiorna,
    onError: segnalaErrore,
  })

  const rinomina = useMutation({
    mutationFn: async ({ g, nome }: { g: number; nome: string | null }) => {
      const nomi = { ...(torneo.nomi_gironi ?? {}) }
      if (nome) nomi[g] = nome
      else delete nomi[g] // vuoto = torna al nome predefinito
      const { error } = await supabase.from('tornei').update({ nomi_gironi: nomi }).eq('id', torneo.id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: segnalaErrore,
  })

  const assegna = useMutation({
    mutationFn: async ({ squadraId, girone }: { squadraId: number | string; girone: number | null }) => {
      const { error } = await supabase.from('squadre').update({ girone }).eq('id', squadraId)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: segnalaErrore,
  })

  function avviaSorteggio() {
    if (!squadre.length) {
      window.alert('Aggiungi prima le ' + unitaTorneo(torneo.sport, true) + '.')
      return
    }
    if (
      window.confirm(
        'Distribuire a caso le ' +
          unitaTorneo(torneo.sport, true) +
          ' nei ' +
          n +
          ' gironi? Le assegnazioni attuali verranno sovrascritte.',
      )
    )
      sorteggia.mutate()
  }

  function avviaRinomina(g: number) {
    const predefinito = 'Girone ' + (LETTERE_GIRONE[g - 1] || g)
    const attuale = torneo.nomi_gironi?.[g] != null ? String(torneo.nomi_gironi[g]) : ''
    const nuovo = window.prompt(
      'Nome del girone (lascia vuoto per tornare a “' + predefinito + '”):',
      attuale,
    )
    if (nuovo == null) return // annullato
    rinomina.mutate({ g, nome: nuovo.trim() || null })
  }

  return (
    <div className="mb-4">
      <div className="aggiungi-part" style={{ marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: '.85rem', alignSelf: 'center' }}>
          Numero di gironi:
        </span>
        <select
          className={classiInput}
          style={{ width: 'auto', flex: '0 0 auto', marginTop: 0 }}
          value={n}
          onChange={(e) => cambiaNumero.mutate(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {n > 1 && (
          <button type="button" className="btn btn-secondario" onClick={avviaSorteggio}>
            🎲 Sorteggia nei gironi
          </button>
        )}
      </div>

      {n > 1 && (
        <>
          <div className="aggiungi-part" style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: '.85rem', alignSelf: 'center' }}>
              Rinomina gironi:
            </span>
            {Array.from({ length: n }, (_, i) => i + 1).map((g) => (
              <button
                key={g}
                type="button"
                className="btn btn-secondario"
                onClick={() => avviaRinomina(g)}
              >
                {nomeGirone(torneo, g)}
              </button>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop: 4 }}>
            Assegnazione ai gironi
          </div>
          {squadre.length === 0 ? (
            <p className="sub">
              Aggiungi le {unitaTorneo(torneo.sport, true)} qui sotto, poi assegnale ai gironi.
            </p>
          ) : (
            <div>
              {squadre.map((s) => (
                <div key={s.id} className="comp-riga">
                  <span className="nome">{s.nome}</span>
                  <select
                    className={classiInput}
                    style={{ width: 'auto', marginTop: 0 }}
                    value={s.girone ?? ''}
                    onChange={(e) =>
                      assegna.mutate({
                        squadraId: s.id,
                        girone: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">— Non assegnata —</option>
                    {Array.from({ length: n }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>
                        {nomeGirone(torneo, g)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
