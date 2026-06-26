import { useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mancaTabella, messaggioErrore } from '@/lib/errori'
import { useCampi } from './datiPrenotazioni'
import { useMieLezioni, useSociPubblici } from './datiAmichevoli'
import { oraLocale } from './orari'
import type { MiaPrenotazione, Partecipante } from './datiAmichevoli'
import type { Campo, Sport } from './tipi'

const ICONA_CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
)

// Vista in sola lettura degli allenamenti di cui il socio è istruttore.
// L'istruttore NON gestisce le presenze (lo fanno admin/collaboratore): qui
// può solo consultare data, campo e l'elenco dei partecipanti.
export default function VistaLezioni({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
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
              <SchedaLezioneVista
                key={p.id}
                pren={p}
                campo={campiById.get(String(p.campo_id))}
                partecipanti={partsByPren.get(String(p.id)) ?? []}
                etichette={etichette}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Scheda di un allenamento in sola lettura: nessun pulsante di gestione.
function SchedaLezioneVista({
  pren,
  campo,
  partecipanti,
  etichette,
}: {
  pren: MiaPrenotazione
  campo: Campo | undefined
  partecipanti: Partecipante[]
  etichette: Map<string, string>
}) {
  const inizio = new Date(pren.inizio)
  const fine = new Date(pren.fine)
  const lista = [...partecipanti].sort((a, b) => Number(b.confermato) - Number(a.confermato))

  return (
    <div className="amichevole-riga">
      <div className="amichevole-cap">
        <div>
          <div className="quando">
            {inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="orario">
            {oraLocale(inizio)}–{oraLocale(fine)}
          </div>
          <div className="dove">{campo?.nome ?? 'Campo'}</div>
          <div className="allenamento-badge">Allenamento</div>
          {pren.allenatore_id && (
            <div className="dove">Istruttore: {etichette.get(pren.allenatore_id) ?? '—'}</div>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="part-vuoto">Nessun partecipante indicato.</div>
      ) : (
        <div className="chips">
          {lista.map((r) => {
            const nome = r.socio_id ? (etichette.get(r.socio_id) ?? 'Socio') : (r.nome_manuale ?? 'Ospite')
            return (
              <span key={r.id} className={'chip' + (r.confermato ? ' conf' : '')}>
                {nome}
                {!r.socio_id && (
                  <span className="stato" title="Giocatore non registrato">
                    ospite
                  </span>
                )}
                {r.confermato && (
                  <span className="stato" title="Presenza confermata">
                    ✓
                  </span>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
