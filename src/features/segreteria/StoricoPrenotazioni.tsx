import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { classiErrore, classiOk } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { useSociEtichette } from '@/features/prenotazioni/datiAmichevoli'
import { costruisciCsv, scaricaCsv } from '@/lib/csv'

// Estratto da GestionePrenotazioni.tsx (era la sezione in fondo, visibile
// solo all'admin dopo aver scrollato tutta la griglia settimanale): ora è
// una voce a sé nel menu "Il tuo club" (MenuUtente.tsx), più facile da
// trovare — stessa esportazione CSV di sempre, nessun cambio di logica.
export default function StoricoPrenotazioni() {
  const etichetteQuery = useSociEtichette()
  const [msgCsv, setMsgCsv] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [csvDal, setCsvDal] = useState('')
  const [csvAl, setCsvAl] = useState('')

  const esportaCsv = useMutation({
    mutationFn: async () => {
      // Fetch tutte le prenotazioni con il nome del campo.
      let q = supabase
        .from('prenotazioni')
        .select('*, campo:campi(nome, sport)')
        .order('inizio', { ascending: false })
      if (csvDal) q = q.gte('inizio', csvDal + 'T00:00:00')
      if (csvAl)  q = q.lte('inizio', csvAl  + 'T23:59:59')
      const { data: pren, error } = await q
      if (error) throw error
      const lista = (pren ?? []) as Array<Record<string, unknown> & {
        id: number | string
        campo: { nome: string; sport: string } | null
        incontro_id?: number | string | null
        allenamento?: boolean | null
      }>
      if (!lista.length) return { vuoto: true }

      // Fetch partecipanti per tutte le prenotazioni.
      const ids = lista.map((p) => p.id)
      const { data: parts } = await supabase
        .from('partecipanti_amichevole')
        .select('prenotazione_id, socio_id, nome_manuale, confermato')
        .in('prenotazione_id', ids)
      const partsByPren = new Map<string, Array<{ socio_id: string | null; nome_manuale: string | null; confermato: boolean }>>()
      for (const r of (parts ?? []) as Array<{ prenotazione_id: number | string; socio_id: string | null; nome_manuale: string | null; confermato: boolean }>) {
        const k = String(r.prenotazione_id)
        if (!partsByPren.has(k)) partsByPren.set(k, [])
        partsByPren.get(k)!.push(r)
      }

      // Mappa socio_id → nome leggibile.
      const nomi = new Map<string, string>()
      for (const s of etichetteQuery.data ?? []) nomi.set(s.id, s.etichetta)

      const due = (n: number) => String(n).padStart(2, '0')
      function fmtData(iso: string) {
        const d = new Date(iso)
        return `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()}`
      }
      function fmtOra(iso: string) {
        const d = new Date(iso)
        return `${due(d.getHours())}:${due(d.getMinutes())}`
      }

      const righe = lista.map((p) => {
        const pp = partsByPren.get(String(p.id)) ?? []
        const tipo = (p.incontro_id || (p as Record<string, unknown>).torneo_id) ? 'Torneo' : p.allenamento ? 'Allenamento' : 'Partita'
        const nomeCampo = p.campo ? (p.campo as { nome: string }).nome : ''
        const sportCampo = p.campo ? (p.campo as { sport: string }).sport : ''
        const prenotante = p.socio_id ? (nomi.get(p.socio_id as string) ?? String(p.socio_id)) : ''
        const partecipanti = pp
          .map((r) => r.socio_id ? (nomi.get(r.socio_id) ?? r.socio_id) : (r.nome_manuale ?? 'Ospite'))
          .join(', ')
        const confermati = pp.length > 0 && pp.every((r) => r.confermato) ? 'Sì' : 'No'
        return {
          Data: fmtData(p.inizio as string),
          Inizio: fmtOra(p.inizio as string),
          Fine: fmtOra(p.fine as string),
          Campo: nomeCampo,
          Sport: sportCampo,
          Tipo: tipo,
          Prenotante: prenotante,
          Partecipanti: partecipanti,
          'Presenze confermate': confermati,
        }
      })

      const csv = costruisciCsv(righe as Record<string, unknown>[])
      scaricaCsv('storico_prenotazioni.csv', csv)
      return { vuoto: false }
    },
    onSuccess: (r) =>
      setMsgCsv(
        r?.vuoto
          ? { tipo: 'errore', testo: 'Nessuna prenotazione da esportare.' }
          : { tipo: 'ok', testo: 'CSV scaricato.' },
      ),
    onError: (e: unknown) =>
      setMsgCsv({ tipo: 'errore', testo: 'Esportazione non riuscita: ' + messaggioErrore(e) }),
  })

  return (
    <div className="card">
      <p className="sub m-0 mb-3">
        Scarica un CSV con tutte le prenotazioni effettuate, inclusi partecipanti e stato presenze.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="etichetta !mb-1">Dal</span>
          <input
            type="date"
            max="9999-12-31"
            className="campo !mt-0 !w-auto"
            value={csvDal}
            onChange={(e) => { setCsvDal(e.target.value); setMsgCsv(null) }}
          />
        </label>
        <label className="block">
          <span className="etichetta !mb-1">Al</span>
          <input
            type="date"
            max="9999-12-31"
            className="campo !mt-0 !w-auto"
            value={csvAl}
            onChange={(e) => { setCsvAl(e.target.value); setMsgCsv(null) }}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondario !mt-0"
          disabled={esportaCsv.isPending}
          onClick={() => { setMsgCsv(null); esportaCsv.mutate() }}
        >
          {esportaCsv.isPending ? 'Preparazione…' : 'Scarica CSV'}
        </button>
      </div>
      {msgCsv && (
        <p className={`mt-3 ${msgCsv.tipo === 'ok' ? classiOk : classiErrore}`}>
          {msgCsv.testo}
        </p>
      )}
    </div>
  )
}
