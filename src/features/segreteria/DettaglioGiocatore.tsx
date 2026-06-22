import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { titleCase, dataEstesa } from '@/lib/formato'
import { classiErrore, classiOk } from '@/components/stili'
import { costruisciCsv, scaricaCsv } from '@/lib/csv'
import ModificaGiocatore from './ModificaGiocatore'
import { aggiustaSaldo, fetchStoricoSocio, type SocioAdmin } from './datiSoci'

// Colonne da NON esportare nel CSV dei movimenti.
// "quando" è identica a "data_evento", quindi la escludiamo.
const COLONNE_NASCOSTE = ['socio_id', 'chiave', 'quando']

// (Fase 8b) Scheda di dettaglio di un giocatore: saldi, attiva/blocca,
// modifica dati e aggiustamento manuale dei saldi.
export default function DettaglioGiocatore({
  socio,
  modalitaPremi,
  meId,
  onChiudi,
}: {
  socio: SocioAdmin
  modalitaPremi: boolean
  meId: string | undefined
  onChiudi: () => void
}) {
  const qc = useQueryClient()
  const [modifica, setModifica] = useState(false)
  const [dPunti, setDPunti] = useState('')
  const [dCrediti, setDCrediti] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [msgCsv, setMsgCsv] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const invalida = () => {
    qc.invalidateQueries({ queryKey: ['soci'] })
    qc.invalidateQueries({ queryKey: ['saldo-crediti', socio.id] })
  }

  const cambiaStato = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('soci')
        .update({ attivo: !socio.attivo })
        .eq('id', socio.id)
      if (error) throw error
    },
    onSuccess: () => {
      invalida()
      onChiudi()
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: 'Operazione non riuscita: ' + e.message }),
  })

  const applica = useMutation({
    mutationFn: async () => {
      const p = parseInt(dPunti, 10) || 0
      const c = modalitaPremi ? parseInt(dCrediti, 10) || 0 : 0
      if (!p && !c) throw new Error('Inserisci una variazione.')
      const esito = await aggiustaSaldo(socio.id, p, c, modalitaPremi)
      if (!esito.ok) {
        throw new Error(
          esito.mancaScript
            ? 'Sistema punti non ancora attivo: esegui lo script tappa4-punti.sql su Supabase.'
            : 'Aggiustamento non riuscito: ' + (esito.messaggio ?? ''),
        )
      }
    },
    onSuccess: () => {
      invalida()
      setDPunti('')
      setDCrediti('')
      setMsg({ tipo: 'ok', testo: 'Saldi aggiornati.' })
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const esportaCsv = useMutation({
    mutationFn: async () => {
      const esito = await fetchStoricoSocio(socio.id)
      if (!esito.ok) {
        throw new Error(
          esito.mancaScript
            ? 'Storico non ancora attivo: esegui lo script tappa6b-classifica-storico.sql su Supabase.'
            : 'Impossibile leggere lo storico: ' + (esito.messaggio ?? ''),
        )
      }
      if (esito.righe.length === 0) return { vuoto: true }
      const csv = costruisciCsv(esito.righe, COLONNE_NASCOSTE)
      scaricaCsv(`movimenti_${socio.cognome || 'giocatore'}_${socio.nome || ''}.csv`, csv)
      return { vuoto: false }
    },
    onSuccess: (r) =>
      setMsgCsv(
        r.vuoto
          ? { tipo: 'errore', testo: 'Nessun movimento da scaricare.' }
          : { tipo: 'ok', testo: 'CSV scaricato.' },
      ),
    onError: (e: Error) => setMsgCsv({ tipo: 'errore', testo: e.message }),
  })

  const nomeCompleto = `${titleCase(socio.cognome)} ${titleCase(socio.nome)}`

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
      onClick={onChiudi}
    >
      <div className="card my-auto w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="m-0 text-xl">{nomeCompleto}</h2>
            <p className="sub mt-1">
              {socio.email}
              {socio.telefono ? ` · ${socio.telefono}` : ''}
              {socio.data_nascita ? ` · nato/a il ${dataEstesa(socio.data_nascita)}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="border-0 bg-transparent px-1 text-2xl leading-none text-ink-2"
            title="Chiudi"
            onClick={onChiudi}
          >
            ×
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {socio.is_admin && (
            <span className="pill bg-ottone-100 text-ottone-700">Admin</span>
          )}
          {socio.is_allenatore && (
            <span className="pill bg-verde-100 text-verde-700">Collaboratore</span>
          )}
          {socio.e_allenatore && (
            <span className="pill bg-verde-100 text-verde-700">Istruttore</span>
          )}
          {!socio.attivo && <span className="pill off">Non attivo</span>}
        </div>

        {/* Saldi */}
        <div className="mt-4 flex gap-3">
          <Saldo etichetta="Punti" valore={socio.punti ?? 0} />
          {modalitaPremi && <Saldo etichetta="Crediti" valore={socio.crediti ?? 0} />}
        </div>

        {/* Azioni principali */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondario" onClick={() => setModifica(true)}>
            Modifica dati
          </button>
          {socio.id !== meId && (
            <button
              type="button"
              className={'btn ' + (socio.attivo ? 'btn-pericolo' : '')}
              disabled={cambiaStato.isPending}
              onClick={() => cambiaStato.mutate()}
            >
              {socio.attivo ? 'Disattiva' : 'Attiva'}
            </button>
          )}
        </div>

        {/* Storico movimenti */}
        <div className="eyebrow">Storico movimenti</div>
        <div className="card">
          <p className="sub m-0 mb-2.5">
            Scarica un CSV con tutti i movimenti di punti e crediti del giocatore.
          </p>
          <button
            type="button"
            className="btn btn-secondario !mt-0"
            disabled={esportaCsv.isPending}
            onClick={() => esportaCsv.mutate()}
          >
            {esportaCsv.isPending ? 'Preparazione…' : 'Scarica CSV'}
          </button>
          {msgCsv && (
            <p className={`mt-3 ${msgCsv.tipo === 'ok' ? classiOk : classiErrore}`}>{msgCsv.testo}</p>
          )}
        </div>

        {/* Aggiusta i saldi a mano */}
        <div className="eyebrow">Aggiusta i saldi a mano</div>
        <div className="card">
          <p className="sub m-0 mb-2.5">
            {modalitaPremi
              ? 'Inserisci una variazione (anche negativa). I crediti si toccano solo a modalità premi accesa.'
              : 'Inserisci una variazione di punti (anche negativa).'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="±punti"
              className="!mt-0 !w-24"
              value={dPunti}
              onChange={(e) => setDPunti(e.target.value)}
            />
            {modalitaPremi && (
              <input
                type="number"
                inputMode="numeric"
                placeholder="±crediti"
                className="!mt-0 !w-24"
                value={dCrediti}
                onChange={(e) => setDCrediti(e.target.value)}
              />
            )}
            <button
              type="button"
              className="btn btn-secondario !mt-0"
              disabled={applica.isPending}
              onClick={() => applica.mutate()}
            >
              Applica
            </button>
          </div>
          {msg && (
            <p className={`mt-3 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
          )}
        </div>
      </div>

      {modifica && <ModificaGiocatore socio={socio} onChiudi={() => setModifica(false)} />}
    </div>
  )
}

function Saldo({ etichetta, valore }: { etichetta: string; valore: number }) {
  return (
    <div className="flex-1 rounded-xl border border-verde-100 bg-verde-50 px-4 py-3 text-center">
      <div className="font-display text-2xl font-bold text-verde-800">{valore}</div>
      <div className="text-xs uppercase tracking-wide text-ink-3">{etichetta}</div>
    </div>
  )
}
