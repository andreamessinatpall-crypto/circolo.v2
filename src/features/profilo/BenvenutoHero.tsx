import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa } from '@/lib/formato'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti, useLivelliPunti } from './livelliPunti'
import { svgMedagliaColore } from './badge/medaglieSvg'
import { MedagliaRuolo } from './ruoloBadge'

// Cartellino "Nome Cognome" con livello/punti/crediti: nato in Bacheca
// (RiepilogoProfilo), riusato anche in cima al menu account (MenuUtente) —
// stessa identica interfaccia nei due punti, richiesto esplicitamente.
export default function BenvenutoHero() {
  const { profilo } = useAuth()
  const livelliQuery = useLivelliPunti()

  const collaboratore = !!profilo?.is_allenatore && !profilo?.is_admin
  const istruttore    = !!profilo?.e_allenatore && !profilo?.is_allenatore && !profilo?.is_admin

  const stat = useQuery({
    queryKey: ['riepilogo-stat', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      // Istruttori: niente punti/classifica
      if (istruttore) {
        const ora = new Date()
        const isoOra = ora.toISOString()

        // Sessioni erogate (davvero concluse: fine già passata)
        const { count: cSvolti } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .lte('fine', isoOra)

        // Sessioni in programma (future o in corso, non ancora concluse)
        const { count: cProgramma } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .gt('fine', isoOra)

        // Richieste di lezione in attesa di risposta
        const { count: cRichieste } = await supabase
          .from('richieste_lezione')
          .select('*', { count: 'exact', head: true })
          .eq('istruttore_id', profilo!.id)
          .eq('stato', 'in_attesa')

        // Attività a cui l'istruttore ha partecipato come giocatore
        const { data: att } = await supabase
          .from('partecipanti_amichevole')
          .select('prenotazione_id')
          .eq('socio_id', profilo!.id)
          .eq('confermato', true)

        // Allievi distinti allenati (solo sessioni davvero concluse)
        const { data: sessioni } = await supabase
          .from('prenotazioni')
          .select('id')
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .lte('fine', isoOra)
        const sessionIds = (sessioni ?? []).map((s: { id: string | number }) => s.id)
        let allievi = 0
        if (sessionIds.length > 0) {
          const { data: partecipanti } = await supabase
            .from('partecipanti_amichevole')
            .select('socio_id')
            .in('prenotazione_id', sessionIds)
            .neq('socio_id', profilo!.id)
          allievi = new Set((partecipanti ?? []).map((r: { socio_id: string }) => r.socio_id)).size
        }

        return {
          punti: 0, crediti: 0, posizione: null,
          attivita: att ? att.length : 0,
          prenotazioniOggi: null, daConfermare: null,
          allenamenti: null,
          svolti: cSvolti ?? 0,
          programma: cProgramma ?? 0,
          richieste: cRichieste ?? 0,
          allievi,
        }
      }

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
      } else {
        const { data: att, error: errAtt } = await supabase
          .from('partecipanti_amichevole')
          .select('prenotazione_id')
          .eq('socio_id', profilo!.id)
          .eq('confermato', true)
        if (!errAtt && att) attivita = att.length
      }

      return { punti, crediti, posizione, attivita, prenotazioniOggi, daConfermare, allenamenti: null }
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

  if (istruttore) {
    const d = stat.data
    return (
      <div className="riep-wow">
        <div className="riep-wow-top">
          <MedagliaRuolo ruolo="istruttore" size={66} />
          <div className="riep-wow-hi">
            <h1>{profilo.nome} {profilo.cognome}</h1>
            <p className="riep-liv-eyebrow">Istruttore</p>
            <p className="riep-wow-sub">Iscritto dal {dataEstesa(profilo.data_iscrizione)}</p>
          </div>
        </div>

        {/* ── Blocco Allenamenti ── */}
        <div className="riep-sez-istr">
          <p className="riep-sez-istr-label">Allenamenti</p>
          <div className="riep-istr-bar">
            <span className="riep-istr-item">
              <strong>{d?.svolti != null ? d.svolti : '—'}</strong>
              <em>Erogate</em>
            </span>
            <span className="riep-istr-pipe">|</span>
            <span className="riep-istr-item">
              <strong>{d?.allievi != null ? d.allievi : '—'}</strong>
              <em>Allievi</em>
            </span>
            <span className="riep-istr-pipe">|</span>
            <span className="riep-istr-item">
              <strong>{d?.programma != null ? d.programma : '—'}</strong>
              <em>In programma</em>
            </span>
            <span className="riep-istr-pipe">|</span>
            <span className="riep-istr-item">
              <span className="riep-istr-num-wrap">
                <strong>{d?.richieste != null ? d.richieste : '—'}</strong>
                {(d?.richieste ?? 0) > 0 && <span className="riep-istr-pallino" />}
              </span>
              <em>Richieste</em>
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
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
          <h1>{profilo.nome} {profilo.cognome}</h1>
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

      <div className={`riep-griglia${collaboratore ? ' riep-griglia-2' : ''}`}>
        <Stat valore={String(punti)} nome="Punti" />
        {!collaboratore && (
          <Stat valore={String(crediti)} nome="Crediti" />
        )}
        {!collaboratore && (
          <Stat valore={attivita != null ? String(attivita) : '—'} nome="Attività" />
        )}
        <Stat valore={posizione != null ? posizione + 'º' : '—'} nome="Posizione" />
      </div>
      {collaboratore && (
        <div className="riep-oggi">
          <p className="riep-oggi-label">Partite di oggi</p>
          <div className="riep-oggi-row">
            <div className="riep-oggi-stat">
              <span className="riep-oggi-val">
                {stat.data?.prenotazioniOggi != null ? stat.data.prenotazioniOggi : '—'}
              </span>
              <span className="riep-oggi-nome">Programmate</span>
            </div>
            <span className="riep-oggi-pipe">|</span>
            <div className="riep-oggi-stat">
              <span className="riep-oggi-val">
                {stat.data?.daConfermare != null ? stat.data.daConfermare : '—'}
              </span>
              <span className="riep-oggi-nome">Da confermare</span>
            </div>
          </div>
        </div>
      )}
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
