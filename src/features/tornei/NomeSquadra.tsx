import { nomeSquadraElegante } from './gironi'

// Nome di una squadra/coppia da mostrare nel calendario e in classifica.
// Per il calcio mostra il logo (o un segnaposto ⚽) accanto al nome; per il
// padel resta il nome "elegante" della coppia (cognomi separati da " · ").
export function NomeSquadra({
  nome,
  logoUrl,
  sport,
}: {
  nome: string
  logoUrl?: string | null
  sport: string
}) {
  if (sport !== 'calcio') return <>{nomeSquadraElegante(nome)}</>
  return (
    <span className="nome-con-logo">
      {logoUrl ? (
        <img className="logo-squadra" src={logoUrl} alt="" />
      ) : (
        <span className="logo-segnaposto" aria-hidden>
          ⚽
        </span>
      )}
      <span>{nome || '?'}</span>
    </span>
  )
}
