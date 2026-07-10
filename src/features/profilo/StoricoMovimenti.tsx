import { useAuth } from '@/auth/useAuth'
import { costruisciCsv, scaricaCsv } from '@/lib/csv'
import { useStoricoMovimenti, mancaStorico, SCRIPT_STORICO } from './datiMovimenti'

// Colonne da NON esportare nel CSV ("quando" è identica a "data_evento").
const COLONNE_NASCOSTE = ['socio_id', 'chiave', 'quando']

export default function StoricoMovimenti() {
  const { profilo } = useAuth()
  const storico = useStoricoMovimenti(profilo?.id)

  if (!profilo) return null

  // Tabella non ancora creata su Supabase.
  if (storico.error && mancaStorico(storico.error)) {
    return (
      <>
        <div className="club-sez-header" style={{ marginTop: '2rem' }}>
          <h2 className="club-sez-titolo">Storico movimenti</h2>
        </div>
        <p className="sub">
          Storico non ancora attivo: esegui lo script{' '}
          <code className="rounded bg-verde-50 px-1">{SCRIPT_STORICO}</code> su Supabase.
        </p>
      </>
    )
  }

  const righe = storico.data ?? []
  const vuoto = !storico.isLoading && righe.length === 0

  const scarica = () => {
    const csv = costruisciCsv(righe, COLONNE_NASCOSTE)
    scaricaCsv(`movimenti_${profilo.cognome || 'socio'}_${profilo.nome || ''}.csv`, csv)
  }

  return (
    <>
      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <h2 className="club-sez-titolo">Storico movimenti</h2>
      </div>
      <div className="card">
        <p className="mb-3 text-sm text-ink-2">
          Scarica un file CSV con tutti i tuoi movimenti di punti e crediti (uno per ogni evento),
          con tutti i dettagli registrati.
        </p>
        <button
          type="button"
          className="btn"
          disabled={storico.isLoading || righe.length === 0}
          onClick={scarica}
        >
          {storico.isLoading
            ? 'Caricamento…'
            : vuoto
              ? 'Nessun movimento da scaricare'
              : `Scarica CSV (${righe.length})`}
        </button>
      </div>
    </>
  )
}
