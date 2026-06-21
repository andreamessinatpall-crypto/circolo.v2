import { classiInput } from '@/components/stili'
import { nomeGirone } from './gironi'
import type { PuntiSet, Torneo } from './tipi'

// (Fase 7b) Editor dei punti del torneo, condiviso da "Nuovo torneo" e
// "Modifica regole". Con un solo girone mostra una terna unica; con più gironi
// mostra una terna per ciascun girone (i punti possono essere diversi).
export default function EditorPuntiTorneo({
  torneo,
  numeroGironi,
  base,
  setBase,
  gironi,
  setGironi,
}: {
  torneo: Pick<Torneo, 'nomi_gironi'>
  numeroGironi: number
  base: PuntiSet
  setBase: (p: PuntiSet) => void
  gironi: PuntiSet[]
  setGironi: (a: PuntiSet[]) => void
}) {
  if (numeroGironi <= 1) {
    return <TernaPunti valore={base} onChange={setBase} />
  }
  return (
    <div className="grid gap-4">
      {Array.from({ length: numeroGironi }, (_, i) => i).map((i) => (
        <div key={i}>
          <div className="mb-1 text-sm font-semibold">{nomeGirone(torneo, i + 1)}</div>
          <TernaPunti
            valore={gironi[i] ?? { iscrizione: 0, vittoria: 0, torneo: 0 }}
            onChange={(p) => {
              const next = gironi.slice()
              next[i] = p
              setGironi(next)
            }}
          />
        </div>
      ))}
    </div>
  )
}

function TernaPunti({
  valore,
  onChange,
}: {
  valore: PuntiSet
  onChange: (p: PuntiSet) => void
}) {
  const campo = (k: keyof PuntiSet, etichetta: string) => (
    <div>
      <label>{etichetta}</label>
      <input
        type="number"
        min={0}
        className={classiInput}
        value={valore[k]}
        onChange={(e) => onChange({ ...valore, [k]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </div>
  )
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {campo('iscrizione', 'Iscrizione')}
      {campo('vittoria', 'Partita vinta')}
      {campo('torneo', 'Vittoria torneo')}
    </div>
  )
}
