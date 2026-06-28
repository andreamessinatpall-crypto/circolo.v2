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

  const collaboratore = !!profilo?.is_allenatore && !profilo?.is_admin
  const istruttore    = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin

  const stat = useQuery({
    queryKey: ['riepilogo-stat', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      const { data: me } = await supabase
        .from('soci')
        .select('punti, crediti, punti_bloccati, crediti_bloccati')
        .eq('id', profilo!.id)
        .maybeSingle()
      const punti = me?.punti_bloccati ? 0 : Number(me?.punti) || 0
      const crediti = me?.crediti_bloccati ? 0 : Number(me?.crediti) || 0

      let posizione: number | null = null
      const { data: cls } = await supabase.rpc('classifica_visibile')
      const righe = (cls ?? []) as Array<{ is_me?: boolean; posizione?: number }>
      const mia = righe.find((r) => r.is_me)
      if (mia?.posizione != null) posizione = mia.posizione

      let attivita: number | null = null
      let prenotazioniOggi: number | null = null
      let daConfermare: number | null = null
      let allenamenti: number | null = null

      if (collaboratore) {
        const oggi = new Date()
        const inizioGiorno = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).toISOString()
        const fineGiorno   = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1).toISOString()
        const { count: cOggi } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .gte('inizio', inizioGiorno)
          .lt('inizio', fineGiorno)
        prenotazioniOggi = cOggi ?? 0

        const { data: prenOggi } = await supabase
          .from('prenotazioni')
          .select('id')
          .gte('inizio', inizioGiorno)
          .lt('inizio', fineGiorno)
        const ids = (prenOggi ?? []).map((p: { id: number | string }) => p.id)
        if (ids.length > 0) {
          const { data: nonConf } = await supabase
            .from('partecipanti_amichevole')
            .select('prenotazione_id')
            .in('prenotazione_id', ids)
            .eq('confermato', false)
          daConfermare = new Set((nonConf ?? []).map((r: { prenotazione_id: number | string }) => r.prenotazione_id)).size
        } else {
          daConfermare = 0
        }
      } else if (istruttore) {
        const { count: cAll } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
        allenamenti = cAll ?? 0

        const { data: att, error: errAtt } = await supabase
          .from('partecipanti_amichevole')
          .select('prenotazione_id')
          .eq('socio_id', profilo!.id)
          .eq('confermato', true)
        if (!errAtt && att) attivita = att.length
      } else {
        const { data: att, error: errAtt } = await supabase
          .from('partecipanti_amichevole')
          .select('prenotazione_id')
          .eq('socio_id', profilo!.id)
          .eq('confermato', true)
        if (!errAtt && att) attivita = att.length
      }

      return { punti, crediti, posizione, attivita, prenotazioniOggi, daConfermare, allenamenti }
    },
  })

  if (!profilo) return null

  const punti     = stat.data?.punti ?? 0
  const crediti   = stat.data?.crediti ?? 0
  const posizione = stat.data?.posizione ?? null
  const attivita  = stat.data?.attivita ?? null

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
          {collaboratore ? (
            <>
              <Stat valore={stat.data?.prenotazioniOggi != null ? String(stat.data.prenotazioniOggi) : '—'} nome="Oggi" />
              <Stat valore={stat.data?.daConfermare != null ? String(stat.data.daConfermare) : '—'} nome="Da confermare" />
            </>
          ) : istruttore ? (
            <>
              <Stat valore={attivita != null ? String(attivita) : '—'} nome="Attività" />
              <Stat valore={stat.data?.allenamenti != null ? String(stat.data.allenamenti) : '—'} nome="Allenamenti" />
            </>
          ) : (
            <>
              <Stat valore={attivita != null ? String(attivita) : '—'} nome="Attività" />
              <Stat valore={String(crediti)} nome="Crediti" />
            </>
          )}
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
