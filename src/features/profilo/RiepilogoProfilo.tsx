import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa } from '@/lib/formato'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti, useLivelliPunti } from './livelliPunti'
import { svgMedagliaColore } from './badge/medaglieSvg'
import AttivitaInProgramma from './AttivitaInProgramma'

export default function RiepilogoProfilo() {
  const { profilo } = useAuth()
  const livelliQuery = useLivelliPunti()

  const stat = useQuery({
    queryKey: ['riepilogo-stat', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      // Punti e crediti dalla riga del socio (se le colonne non esistono, 0).
      const { data: me } = await supabase
        .from('soci')
        .select('punti, crediti')
        .eq('id', profilo!.id)
        .maybeSingle()
      const punti = Number(me?.punti) || 0
      const crediti = Number(me?.crediti) || 0

      // Posizione in classifica.
      let posizione: number | null = null
      const { data: cls } = await supabase.rpc('classifica_visibile')
      const righe = (cls ?? []) as Array<{ is_me?: boolean; posizione?: number }>
      const mia = righe.find((r) => r.is_me)
      if (mia?.posizione != null) posizione = mia.posizione

      // Attività: amichevoli confermate.
      let attivita: number | null = null
      const { data: att, error: errAtt } = await supabase
        .from('partecipanti_amichevole')
        .select('prenotazione_id')
        .eq('socio_id', profilo!.id)
        .eq('confermato', true)
      if (!errAtt && att) attivita = att.length

      return { punti, crediti, posizione, attivita }
    },
  })

  if (!profilo) return null

  const punti = stat.data?.punti ?? 0
  const crediti = stat.data?.crediti ?? 0
  const posizione = stat.data?.posizione ?? null
  const attivita = stat.data?.attivita ?? null

  const livelli = livelliQuery.data ?? LIVELLI_PUNTI_DEFAULT
  const livN = livelloDaPunti(punti, livelli)
  const liv = livelli[livN - 1] ?? livelli[0]
  const prossimo = livelli[livN] // undefined se livello massimo
  const pct = prossimo
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(((punti - liv.soglia) / (prossimo.soglia - liv.soglia || 1)) * 100),
        ),
      )
    : 100

  return (
    <div>
      <div className="riep-wow">
        <div className="riep-wow-top">
          {liv.img ? (
            <span className="riep-liv-medal" style={{ borderColor: liv.colore }}>
              <img src={liv.img} alt="" />
            </span>
          ) : (
            <span
              className="riep-liv-medal"
              style={{ borderColor: liv.colore }}
              dangerouslySetInnerHTML={{ __html: svgMedagliaColore(livN, liv.colore) }}
            />
          )}
          <div className="riep-wow-hi">
            <h1>Benvenuto, {profilo.nome}</h1>
            <p className="riep-liv-eyebrow">
              Livello {livN} · {liv.nome}
            </p>
            <p className="riep-wow-sub">Iscritto dal {dataEstesa(profilo.data_iscrizione)}</p>
          </div>
        </div>

        <div className="riep-liv-prog">
          {prossimo ? (
            <>
              <div className="pp-top">
                <span>Prossimo livello</span>
                <b>{prossimo.nome}</b>
              </div>
              <div className="pp-bar">
                <i style={{ width: pct + '%' }} />
              </div>
              <div className="pp-top" style={{ marginTop: 4 }}>
                <span>
                  {punti} / {prossimo.soglia} punti
                </span>
                <span>{pct}%</span>
              </div>
            </>
          ) : (
            <div className="pp-top">
              <span>Livello massimo raggiunto</span>
              <b>★</b>
            </div>
          )}
        </div>

        <div className="riep-griglia">
          <Stat valore={String(punti)} nome="Punti" />
          <Stat valore={posizione != null ? posizione + 'º' : '—'} nome="Posizione" />
          <Stat valore={attivita != null ? String(attivita) : '—'} nome="Attività" />
          <Stat valore={String(crediti)} nome="Crediti" />
        </div>
      </div>

      <div className="eyebrow">Attività in programma</div>
      <div className="card">
        <AttivitaInProgramma />
      </div>
    </div>
  )
}

function Stat({ valore, nome }: { valore: string; nome: string }) {
  return (
    <div className="riep-stat">
      <div className="valore">{valore}</div>
      <div className="nome-stat">{nome}</div>
    </div>
  )
}
