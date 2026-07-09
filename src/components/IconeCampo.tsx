// Icone per campi di input (email, password...), stesso linguaggio
// Feather/Lucide già usato in tutta l'app: viewBox 24, stroke
// currentColor, strokeWidth 2, angoli arrotondati, nessun riempimento.
// Pensate per .campo-con-icona (vedi index.css): l'icona sta a sinistra,
// il nome del campo è il placeholder dell'input (sparisce scrivendo),
// non testo fisso accanto all'icona.

export function IconaEmail({ size = 16 }: { size?: number }) {
  return (
    <svg className="campo-icona" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  )
}

export function IconaLucchetto({ size = 16 }: { size?: number }) {
  return (
    <svg className="campo-icona" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
