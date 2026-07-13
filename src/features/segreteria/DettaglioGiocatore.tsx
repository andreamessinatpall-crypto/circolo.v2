import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useBloccaScrollBody } from '@/hooks/useBloccaScrollBody'
import { titleCase, dataEstesa } from '@/lib/formato'
import { classiErrore, classiOk } from '@/components/stili'
import { costruisciCsv, scaricaCsv } from '@/lib/csv'
import ModificaGiocatore from './ModificaGiocatore'
import { aggiustaSaldo, completaCancellazione, fetchStoricoSocio, impostaBlocco, impostaSospensione, riattivaSocio, type SocioAdmin } from './datiSoci'

const COLONNE_NASCOSTE = ['socio_id', 'chiave', 'quando']

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
  useBloccaScrollBody()
  const qc = useQueryClient()
  const [modifica, setModifica] = useState(false)
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
    onSuccess: () => { invalida(); onChiudi() },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: 'Operazione non riuscita: ' + e.message }),
  })

  const sospendi = useMutation({
    mutationFn: async (valore: boolean) => {
      const esito = await impostaSospensione(socio.id, valore)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Operazione non riuscita.')
    },
    onSuccess: () => { invalida(); onChiudi() },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const blocca = useMutation({
    mutationFn: async ({
      campo,
      valore,
    }: {
      campo: 'punti_bloccati' | 'crediti_bloccati'
      valore: boolean
    }) => {
      const esito = await impostaBlocco(socio.id, campo, valore)
      if (!esito.ok) throw new Error(esito.messaggio ?? 'Operazione non riuscita.')
    },
    onSuccess: () => invalida(),
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const aggiusta = useMutation({
    mutationFn: async ({ deltaPunti, deltaCrediti }: { deltaPunti: number; deltaCrediti: number }) => {
      const esito = await aggiustaSaldo(socio.id, deltaPunti, deltaCrediti, modalitaPremi)
      if (!esito.ok) {
        throw new Error(
          esito.mancaScript
            ? 'Sistema punti non ancora attivo: esegui lo script tappa4-punti.sql su Supabase.'
            : 'Aggiustamento non riuscito: ' + (esito.messaggio ?? ''),
        )
      }
    },
    onSuccess: () => { invalida(); setMsg({ tipo: 'ok', testo: 'Saldi aggiornati.' }) },
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

  const cancella = useMutation({
    mutationFn: () => completaCancellazione(socio.id),
    onSuccess: (r) => {
      if (!r.ok) { setMsg({ tipo: 'errore', testo: r.messaggio ?? 'Operazione non riuscita.' }); return }
      invalida()
      onChiudi()
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const riattiva = useMutation({
    mutationFn: () => riattivaSocio(socio.id),
    onSuccess: (r) => {
      if (!r.ok) { setMsg({ tipo: 'errore', testo: r.messaggio ?? 'Operazione non riuscita.' }); return }
      invalida()
      onChiudi()
    },
    onError: (e: Error) => setMsg({ tipo: 'errore', testo: e.message }),
  })

  const nomeCompleto = `${titleCase(socio.cognome)} ${titleCase(socio.nome)}`
  const cancellato = (socio.email ?? '').endsWith('@cancellato.invalid')
  const haCancellazione = !!socio.richiesta_cancellazione
  const giorniRimasti = haCancellazione
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(socio.richiesta_cancellazione!).getTime()) / 86_400_000))
    : 0

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center overflow-y-auto overscroll-contain bg-black/40 p-4"
      onClick={onChiudi}
    >
      <div className="card modale-leggibile my-auto w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="m-0 text-xl">{nomeCompleto}</h2>
            <p className="sub mt-1">
              {(socio.email ?? '').endsWith('@cancellato.invalid')
                ? 'Account anonimizzato'
                : [
                    socio.email,
                    socio.telefono,
                    socio.data_nascita ? `nato/a il ${dataEstesa(socio.data_nascita)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
          {socio.is_admin && <span className="pill bg-ottone-100 text-ottone-700">Admin</span>}
          {socio.is_allenatore && <span className="pill bg-verde-100 text-verde-700">Collaboratore</span>}
          {socio.e_allenatore && !socio.is_allenatore && (
            <span className="pill bg-terra/10 text-terra">Istruttore</span>
          )}
          {!socio.attivo && !socio.sospeso && !cancellato && <span className="pill off">In attesa</span>}
          {socio.sospeso && (
            <span className="pill" style={{ background: 'rgba(234,88,12,0.1)', color: '#c2410c', border: '1px solid rgba(234,88,12,0.25)' }}>
              Sospeso
            </span>
          )}
          {haCancellazione && (
            <span className="pill bg-red-100 text-red-700 font-semibold">
              Richiesta cancellazione
            </span>
          )}
        </div>

        {/* Sezione richiesta cancellazione (GDPR Art. 17) */}
        {haCancellazione && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-red-800">Richiesta cancellazione account</p>
              <span className={`text-xs font-bold ${giorniRimasti <= 5 ? 'text-red-700' : 'text-red-500'}`}>
                {giorniRimasti > 0 ? `${giorniRimasti} giorni rimasti` : 'Scaduto'}
              </span>
            </div>
            <p className="mb-3 text-xs text-red-700">
              Richiesta il {new Date(socio.richiesta_cancellazione!).toLocaleDateString('it-IT')}.
              Puoi riattivare l'account entro 30 giorni, oppure completare la cancellazione
              (anonimizza i dati — irreversibile).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-mini"
                disabled={riattiva.isPending || cancella.isPending}
                onClick={() => riattiva.mutate()}
              >
                {riattiva.isPending ? 'Elaborazione…' : 'Riattiva account'}
              </button>
              <button
                type="button"
                className="btn btn-pericolo btn-mini"
                disabled={cancella.isPending || riattiva.isPending}
                onClick={() => cancella.mutate()}
              >
                {cancella.isPending ? 'Elaborazione…' : 'Completa cancellazione'}
              </button>
            </div>
          </div>
        )}

        {/* Saldi con +/- inline */}
        <div className="mt-4 flex gap-3">
          <SaldoInterattivo
            etichetta="Punti"
            valore={socio.punti ?? 0}
            bloccato={!!socio.punti_bloccati}
            disabled={aggiusta.isPending || blocca.isPending}
            onAggiusta={(delta) => aggiusta.mutate({ deltaPunti: delta, deltaCrediti: 0 })}
            onToggleBlocco={() =>
              blocca.mutate({ campo: 'punti_bloccati', valore: !socio.punti_bloccati })
            }
          />
          {modalitaPremi && (
            <SaldoInterattivo
              etichetta="Crediti"
              valore={socio.crediti ?? 0}
              bloccato={!!socio.crediti_bloccati}
              disabled={aggiusta.isPending || blocca.isPending}
              onAggiusta={(delta) => aggiusta.mutate({ deltaPunti: 0, deltaCrediti: delta })}
              onToggleBlocco={() =>
                blocca.mutate({ campo: 'crediti_bloccati', valore: !socio.crediti_bloccati })
              }
            />
          )}
        </div>
        {msg && (
          <p className={`mt-2 ${msg.tipo === 'ok' ? classiOk : classiErrore}`}>{msg.testo}</p>
        )}

        {/* Azioni principali */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondario" onClick={() => setModifica(true)}>
            Modifica dati
          </button>
          {/* Un account cancellato/anonimizzato non va mai riattivato: è un'operazione
              irreversibile (GDPR Art. 17), niente bottone "Attiva" per lui. */}
          {socio.id !== meId && !socio.attivo && !socio.sospeso && !cancellato && (
            <button
              type="button"
              className="btn"
              disabled={cambiaStato.isPending}
              onClick={() => cambiaStato.mutate()}
            >
              Attiva
            </button>
          )}
          {socio.id !== meId && socio.attivo && !socio.sospeso && (
            <button
              type="button"
              className="btn btn-pericolo"
              disabled={sospendi.isPending}
              onClick={() => sospendi.mutate(true)}
            >
              Sospendi
            </button>
          )}
          {socio.id !== meId && socio.sospeso && (
            <button
              type="button"
              className="btn"
              disabled={sospendi.isPending}
              onClick={() => sospendi.mutate(false)}
            >
              Riattiva
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
      </div>

      {modifica && <ModificaGiocatore socio={socio} onChiudi={() => setModifica(false)} />}
    </div>
  )
}

function IconaPower({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3v9" />
      <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
    </svg>
  )
}

function SaldoInterattivo({
  etichetta,
  valore,
  bloccato,
  disabled,
  onAggiusta,
  onToggleBlocco,
}: {
  etichetta: string
  valore: number
  bloccato: boolean
  disabled: boolean
  onAggiusta: (delta: number) => void
  onToggleBlocco: () => void
}) {
  const [importo, setImporto] = useState('')
  const delta = Math.abs(parseInt(importo, 10) || 0)

  return (
    <div
      className={
        'relative flex flex-1 flex-col items-center rounded-xl border px-4 py-3 ' +
        (bloccato ? 'border-terra/20 bg-terra/5' : 'border-verde-100 bg-verde-50')
      }
    >
      <button
        type="button"
        aria-label={bloccato ? `Sblocca ${etichetta}` : `Blocca ${etichetta}`}
        disabled={disabled}
        onClick={onToggleBlocco}
        className={
          'absolute right-2 top-2 transition disabled:cursor-default disabled:opacity-50 ' +
          (bloccato ? 'text-terra hover:text-terra/70' : 'text-ink-3 hover:text-ink')
        }
      >
        <IconaPower size={15} />
      </button>

      <div
        className={
          'font-display text-2xl font-bold ' +
          (bloccato ? 'text-ink-3' : 'text-verde-800')
        }
      >
        {valore}
      </div>
      <div className="mb-2 text-xs uppercase tracking-wide text-ink-3">{etichetta}</div>

      {!bloccato && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Riduci ${etichetta}`}
            disabled={disabled || delta === 0}
            onClick={() => onAggiusta(-delta)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-verde-200 bg-white text-sm font-bold text-verde-800 transition hover:bg-verde-100 disabled:cursor-default disabled:border-verde-100 disabled:bg-verde-50 disabled:text-ink-3"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            className="casella-num !mt-0 h-7 !w-14 rounded-lg border border-verde-100 text-sm"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
          />
          <button
            type="button"
            aria-label={`Aumenta ${etichetta}`}
            disabled={disabled || delta === 0}
            onClick={() => onAggiusta(+delta)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-verde-200 bg-white text-sm font-bold text-verde-800 transition hover:bg-verde-100 disabled:cursor-default disabled:border-verde-100 disabled:bg-verde-50 disabled:text-ink-3"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
