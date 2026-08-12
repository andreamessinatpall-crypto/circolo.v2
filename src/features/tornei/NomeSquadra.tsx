import { nomeSquadraElegante } from './gironi'
import { SportIcona } from '@/components/IconeSport'

// Nome di una squadra/coppia da mostrare nel calendario e in classifica.
// Per gli sport a rosa libera mostra il logo (o un segnaposto) accanto al
// nome; per il padel resta il nome "elegante" della coppia fissa (cognomi
// separati da " · ").
export function NomeSquadra({
  nome,
  logoUrl,
  sport,
}: {
  nome: string
  logoUrl?: string | null
  sport: string
}) {
  if (sport === 'padel') return <>{nomeSquadraElegante(nome)}</>
  return (
    <span className="nome-con-logo">
      {logoUrl ? (
        <img className="logo-squadra" src={logoUrl} alt="" />
      ) : (
        <span className="logo-segnaposto" aria-hidden>
          <SportIcona sport={sport} size={18} />
        </span>
      )}
      <span>{nome || '?'}</span>
    </span>
  )
}
