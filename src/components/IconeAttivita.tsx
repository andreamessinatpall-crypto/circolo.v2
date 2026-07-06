function IconaPartita({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19 19 5" />
      <path d="M15 5h4v4" />
      <path d="M19 19 5 5" />
      <path d="M9 5H5v4" />
    </svg>
  )
}

function IconaAllenamento({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 8v8" />
      <path d="M4 9.5v5" />
      <path d="M17.5 8v8" />
      <path d="M20 9.5v5" />
      <path d="M8.5 12h7" />
    </svg>
  )
}

function IconaTorneo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a1 1 0 0 0-1 1c0 2.5 1.8 4 4 4.3" />
      <path d="M16 5h3a1 1 0 0 1 1 1c0 2.5-1.8 4-4 4.3" />
      <path d="M12 12v3" />
      <path d="M9 20h6" />
      <path d="M10 20v-2c0-.6.4-1.1 1-1.3l1-.4 1 .4c.6.2 1 .7 1 1.3v2" />
    </svg>
  )
}

export type TipoAttivita = 'partita' | 'allenamento' | 'torneo'

const ETICHETTA: Record<TipoAttivita, string> = {
  partita: 'Partita',
  allenamento: 'Allenamento',
  torneo: 'Torneo',
}

// Sostituisce le vecchie capsule di testo (PARTITA/ALLENAMENTO/TORNEO) con
// un'icona colorata compatta, pensata per stare in alto a destra nella scheda.
export function TipoAttivitaIcona({
  tipo,
  titolo,
  size = 17,
}: {
  tipo: TipoAttivita
  titolo?: string
  size?: number
}) {
  const Icona = tipo === 'allenamento' ? IconaAllenamento : tipo === 'torneo' ? IconaTorneo : IconaPartita
  return (
    <span className={`tipo-ico tipo-ico-${tipo}`} title={titolo ?? ETICHETTA[tipo]}>
      <Icona size={size} />
    </span>
  )
}
