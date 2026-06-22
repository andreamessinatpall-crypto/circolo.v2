import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { titleCase } from '@/lib/formato'
import { classiInput } from '@/components/stili'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { useSoci, type SocioAdmin } from './datiSoci'
import DettaglioGiocatore from './DettaglioGiocatore'

type Ordine = 'punti' | 'cognome'

export default function GestioneGiocatori() {
  const { profilo } = useAuth()
  const { data: soci, isLoading, error } = useSoci()
  const { data: modalitaPremi } = useModalitaPremi()
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState<Ordine>('punti')
  const [selezionatoId, setSelezionatoId] = useState<string | null>(null)

  if (isLoading) return <p className="text-ink-2">Caricamento giocatori…</p>
  if (error) return <p className="msg-errore">Impossibile caricare i giocatori: {error.message}</p>

  const tutti = soci ?? []
  const inAttesa = tutti.filter((s) => !s.attivo).length

  const q = cerca.trim().toLowerCase()
  const filtrati = q
    ? tutti.filter(
        (s) =>
          (s.nome ?? '').toLowerCase().includes(q) ||
          (s.cognome ?? '').toLowerCase().includes(q),
      )
    : tutti.slice()

  const perCognome = (a: SocioAdmin, b: SocioAdmin) =>
    (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it')
  const cmp =
    ordine === 'cognome'
      ? perCognome
      : (a: SocioAdmin, b: SocioAdmin) => (b.punti ?? 0) - (a.punti ?? 0) || perCognome(a, b)

  // I non attivi (da approvare) restano sempre in cima.
  filtrati.sort((a, b) => (a.attivo === b.attivo ? cmp(a, b) : a.attivo ? 1 : -1))

  // Il selezionato viene riletto dall'elenco aggiornato (così riflette le modifiche).
  const selezionato = tutti.find((s) => s.id === selezionatoId) ?? null

  return (
    <div>
      <div className="eyebrow">Giocatori e punti</div>
      <div className="card">
        <p className="sub m-0 mb-2.5">Seleziona un giocatore per aprirne la scheda.</p>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            className={`${classiInput} w-full sm:flex-1`}
            placeholder="Cerca giocatore"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
          />
          <select
            className={`${classiInput} !mt-0 !w-auto shrink-0`}
            value={ordine}
            onChange={(e) => setOrdine(e.target.value as Ordine)}
          >
            <option value="punti">Ordina per: punti (alto → basso)</option>
            <option value="cognome">Ordina per: cognome (A → Z)</option>
          </select>
        </div>

        {inAttesa > 0 && (
          <p className="sub mb-3">
            {inAttesa === 1 ? '1 giocatore in attesa' : `${inAttesa} giocatori in attesa`} di
            approvazione (in cima). Apri la scheda e premi “Attiva” per abilitarlo.
          </p>
        )}

        {filtrati.length === 0 ? (
          <p className="text-ink-2">Nessun giocatore corrisponde alla ricerca.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtrati.map((s) => (
              <RigaSocio
                key={s.id}
                socio={s}
                modalitaPremi={!!modalitaPremi}
                onApri={() => setSelezionatoId(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selezionato && (
        <DettaglioGiocatore
          socio={selezionato}
          modalitaPremi={!!modalitaPremi}
          meId={profilo?.id}
          onChiudi={() => setSelezionatoId(null)}
        />
      )}
    </div>
  )
}

function RigaSocio({
  socio,
  modalitaPremi,
  onApri,
}: {
  socio: SocioAdmin
  modalitaPremi: boolean
  onApri: () => void
}) {
  return (
    <button
      type="button"
      onClick={onApri}
      className="flex items-center gap-3 rounded-xl border border-verde-100 bg-white px-3.5 py-2.5 text-left transition hover:border-ottone-300 hover:bg-verde-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
          {titleCase(socio.cognome)} {titleCase(socio.nome)}
          {socio.is_admin && <span className="pill bg-ottone-100 text-ottone-700">A</span>}
          {socio.is_allenatore && <span className="pill bg-verde-100 text-verde-700">C</span>}
          {!socio.attivo && <span className="pill off">Non attivo</span>}
        </div>
        <div className="text-sm text-ink-2">
          {socio.punti ?? 0} punti
          {modalitaPremi ? ` · ${socio.crediti ?? 0} crediti` : ''}
        </div>
        <div className="truncate text-xs text-ink-3">
          {socio.email}
          {socio.telefono ? ` · ${socio.telefono}` : ''}
        </div>
      </div>
      <span className="self-center text-xl text-ink-3">›</span>
    </button>
  )
}
