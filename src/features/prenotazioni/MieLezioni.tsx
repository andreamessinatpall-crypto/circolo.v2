import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useCampi } from './datiPrenotazioni'
import { mancaColonnaManuale, useMieLezioni, useSociPubblici } from './datiAmichevoli'
import { SchedaPartita } from './MieAmichevoli'
import { oraLocale } from './orari'
import type { MiaPrenotazione, Partecipante } from './datiAmichevoli'
import type { Campo, Sport } from './tipi'

const ICONA_CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
)

export default function MieLezioni({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const campiQuery = useCampi()
  const sociQuery = useSociPubblici()

  const idCampi = useMemo(
    () => (campiQuery.data ?? []).filter((c) => c.sport === sport).map((c) => c.id),
    [campiQuery.data, sport],
  )
  const campiById = useMemo(() => {
    const m = new Map<string, Campo>()
    for (const c of campiQuery.data ?? []) m.set(String(c.id), c)
    return m
  }, [campiQuery.data])

  const lezioni = useMieLezioni(sport, idCampi, profilo?.id ?? '')

  const etichette = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sociQuery.data ?? []) m.set(s.id, s.etichetta)
    if (profilo) m.set(profilo.id, `${profilo.nome} ${profilo.cognome}`)
    return m
  }, [sociQuery.data, profilo])

  const aggiorna = () => qc.invalidateQueries({ queryKey: ['lezioni'] })

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

  const rimuovi = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('partecipanti_amichevole').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Rimozione non riuscita: ' + messaggioErrore(e)),
  })

  // (Tappa 11) Conferma/annulla la presenza di un partecipante alla lezione.
  const conferma = useMutation({
    mutationFn: async ({ id, valore }: { id: number | string; valore: boolean }) => {
      const { error } = await supabase
        .from('partecipanti_amichevole')
        .update({ confermato: valore })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: aggiorna,
    onError: (e: unknown) => window.alert('Operazione non riuscita: ' + messaggioErrore(e)),
  })

  // (Tappa 11) Ospite non registrato in una lezione: nessun account, niente punti.
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
          ? 'Per aggiungere ospiti esegui lo script tappa11-partecipanti-manuali.sql su Supabase.'
          : 'Aggiunta non riuscita: ' + messaggioErrore(e),
      ),
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
  if (lezioni.isLoading || campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (lezioni.error && mancaTabella(lezioni.error, 'partecipanti_amichevole')) {
    return (
      <p className="sub">
        Funzione non ancora attiva: esegui lo script{' '}
        <code className="rounded bg-verde-50 px-1">tappa3a-amichevoli.sql</code> su Supabase.
      </p>
    )
  }
  if (lezioni.error) {
    return <p className="sub">Impossibile caricare le lezioni: {messaggioErrore(lezioni.error)}</p>
  }

  const lista = lezioni.data?.lista ?? []
  if (lista.length === 0) {
    return (
      <p className="sub">
        Non hai lezioni in programma. Gli allenamenti di cui sei istruttore compariranno qui.
      </p>
    )
  }

  const partsByPren = new Map<string, Partecipante[]>()
  for (const r of lezioni.data?.parts ?? []) {
    const k = String(r.prenotazione_id)
    if (!partsByPren.has(k)) partsByPren.set(k, [])
    partsByPren.get(k)!.push(r)
  }

  const candidati = (sociQuery.data ?? []).filter((s) => s.id !== profilo.id)

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
                staff
                mioId={profilo.id}
                amiciVuoti={false}
                onAggiungi={(socioId) => aggiungi.mutate({ prenId: p.id, socioId })}
                onAggiungiOspite={(nome) => aggiungiOspite.mutate({ prenId: p.id, nome })}
                onConferma={(id, valore) => conferma.mutate({ id, valore })}
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
                  if (window.confirm(`Annullare la lezione su ${dove} (${quando})?`))
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
