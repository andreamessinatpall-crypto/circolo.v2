import { useContext } from 'react'
import { CircoloContext } from './CircoloContext'

// Il ruolo del socio corrente NEL circolo corrente (da soci_circoli, non il
// vecchio is_admin/is_allenatore globale su `soci` — uguale in ogni
// circolo). Risolto una volta sola da <CircoloProvider>, non fa una query
// propria. Va usato solo da componenti dentro <CircoloProvider>.
export function useMioRuolo() {
  const ctx = useContext(CircoloContext)
  if (!ctx) throw new Error('useMioRuolo() dev\'essere usato dentro <CircoloProvider>.')
  const eGestore = ctx.ruolo === 'gestore'
  const eCollaboratore = ctx.ruolo === 'collaboratore'
  return {
    ruolo: ctx.ruolo,
    eGestore,
    eCollaboratore,
    // "Staff" del circolo: gestore o collaboratore, come il vecchio
    // is_admin||is_allenatore globale ma per-circolo.
    puoGestire: eGestore || eCollaboratore,
    // Il gestore può sempre dare lezioni (non serve un flag); il
    // collaboratore solo se il gestore glielo ha concesso.
    puoDareLezioni: eGestore || ctx.puoDareLezioni,
  }
}
