import NumeroInput from '@/components/NumeroInput'

export default function EditorPuntiPosizioni({
  value,
  onChange,
}: {
  value: Record<string, number>
  onChange: (v: Record<string, number>) => void
}) {
  const righe = Object.keys(value)
    .map(Number)
    .sort((a, b) => a - b)

  function set(pos: number, punti: number) {
    onChange({ ...value, [String(pos)]: Math.max(0, punti) })
  }

  function aggiungi() {
    const prossima = righe.length ? Math.max(...righe) + 1 : 1
    onChange({ ...value, [String(prossima)]: 0 })
  }

  function rimuovi(pos: number) {
    const next = { ...value }
    delete next[String(pos)]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      {righe.map((pos) => (
        <div key={pos} className="flex items-center gap-2">
          <span className="sub" style={{ minWidth: 70, fontSize: '0.85rem' }}>
            {pos}° posto
          </span>
          <NumeroInput
            min={0}
            style={{ width: 80 }}
            value={value[String(pos)] ?? 0}
            onChange={(e) => set(pos, parseInt(e.target.value) || 0)}
          />
          <span className="sub" style={{ fontSize: '0.8rem' }}>pt</span>
          <button
            type="button"
            className="border-0 bg-transparent px-1 text-lg font-bold leading-none text-red-700"
            onClick={() => rimuovi(pos)}
            title="Rimuovi posizione"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondario"
        style={{ alignSelf: 'flex-start', marginTop: 4 }}
        onClick={aggiungi}
      >
        + Aggiungi posizione
      </button>
    </div>
  )
}
