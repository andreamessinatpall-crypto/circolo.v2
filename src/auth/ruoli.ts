import type { Socio } from './tipi'

// Funzioni che traducono i ruoli del socio in "cosa può vedere/fare".
// Riprendono gli helper della v1 (sportConsentiti, puoGestireTornei).

// Gli sport che il socio vede nell'interfaccia, in base alla sua preferenza.
export function sportConsentiti(p: Socio): Array<'padel' | 'calcio'> {
  if (p.sport_preferito === 'padel') return ['padel']
  if (p.sport_preferito === 'calcio') return ['calcio']
  return ['padel', 'calcio']
}

// Chi può creare e gestire i tornei: amministratori e collaboratori.
export function puoGestireTornei(p: Socio): boolean {
  return !!(p.is_admin || p.is_allenatore)
}
