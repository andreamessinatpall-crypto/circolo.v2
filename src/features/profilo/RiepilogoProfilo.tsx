import { useAuth } from '@/auth/useAuth'
import { dataEstesa, etichettaGenere, etichettaSport } from '@/lib/formato'

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-verde-700/10 py-2.5 last:border-0">
      <span className="text-sm text-ink-3">{etichetta}</span>
      <span className="text-sm font-medium text-ink">{valore}</span>
    </div>
  )
}

export default function RiepilogoProfilo() {
  const { profilo } = useAuth()
  if (!profilo) return null

  const ruolo = profilo.is_admin
    ? 'Amministratore'
    : profilo.is_allenatore
      ? 'Collaboratore'
      : 'Socio'

  return (
    <div className="rounded-2xl border border-verde-700/10 bg-superficie p-6 shadow-sm">
      <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-verde-800">
        {profilo.nome} {profilo.cognome}
      </h2>
      <Riga etichetta="Email" valore={profilo.email ?? '—'} />
      <Riga etichetta="Telefono" valore={profilo.telefono ?? '—'} />
      <Riga etichetta="Genere" valore={etichettaGenere(profilo.genere)} />
      <Riga etichetta="Data di nascita" valore={dataEstesa(profilo.data_nascita)} />
      <Riga etichetta="Sport preferito" valore={etichettaSport(profilo.sport_preferito)} />
      <Riga etichetta="Iscritto dal" valore={dataEstesa(profilo.data_iscrizione)} />
      <Riga etichetta="Ruolo" valore={ruolo} />
    </div>
  )
}
