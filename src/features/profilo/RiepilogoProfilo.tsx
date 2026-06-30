import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { dataEstesa } from '@/lib/formato'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti, useLivelliPunti } from './livelliPunti'
import { svgMedagliaColore } from './badge/medaglieSvg'
import { MedagliaRuolo } from './ruoloBadge'
import AttivitaInProgramma from './AttivitaInProgramma'

function AllenamentiInProgramma() {
  const { profilo } = useAuth()

  const query = useQuery({
    queryKey: ['allenamenti-programma-istr', profilo?.id],
    enabled: !!profilo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prenotazioni')
        .select('id, inizio, fine, campo_id')
        .eq('allenamento', true)
        .eq('allenatore_id', profilo!.id)
        .gte('inizio', new Date().toISOString())
        .order('inizio')
        .limit(30)
      if (error) throw error
      const pren = (data ?? []) as Array<{ id: string | number; inizio: string; fine: string; campo_id: number | null }>

      const campoIds = [...new Set(pren.map((p) => p.campo_id).filter(Boolean))] as number[]
      const nomeCampo: Record<number, string> = {}
      if (campoIds.length) {
        const { data: campi } = await supabase.from('campi').select('id, nome').in('id', campoIds)
        for (const c of (campi ?? []) as Array<{ id: number; nome: string }>) nomeCampo[c.id] = c.nome
      }

      const ids = pren.map((p) => p.id)
      const contiMap: Record<string, number> = {}
      if (ids.length) {
        const { data: parti } = await supabase
          .from('partecipanti_amichevole')
          .select('prenotazione_id')
          .in('prenotazione_id', ids)
        for (const p of (parti ?? []) as Array<{ prenotazione_id: string | number }>) {
          const k = String(p.prenotazione_id)
          contiMap[k] = (contiMap[k] ?? 0) + 1
        }
      }

      return pren.map((p) => ({
        id: p.id,
        inizio: p.inizio,
        fine: p.fine,
        campoNome: p.campo_id ? (nomeCampo[p.campo_id] ?? null) : null,
        nPartecipanti: contiMap[String(p.id)] ?? 0,
      }))
    },
  })

  if (query.isLoading) return <p className="sub">Caricamento…</p>
  const lista = query.data ?? []
  if (lista.length === 0) return <p className="sub">Nessun allenamento in programma.</p>

  function fmt(iso: string) {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const gruppi: { chiave: string; label: string; items: typeof lista }[] = []
  for (const s of lista) {
    const d = new Date(s.inizio)
    const chiave = d.toDateString()
    let g = gruppi.find((x) => x.chiave === chiave)
    if (!g) {
      g = { chiave, label: d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }), items: [] }
      gruppi.push(g)
    }
    g.items.push(s)
  }

  return (
    <div>
      {gruppi.map((g) => (
        <div key={g.chiave} className="gruppo-giorno">
          <div className="giorno-partite">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{g.label}</span>
          </div>
          <div className="flex flex-col gap-3">
            {g.items.map((s) => (
              <div key={String(s.id)} className="amichevole-riga">
                <div className="amichevole-cap">
                  <div>
                    <div className="orario">{fmt(s.inizio)}–{fmt(s.fine)}</div>
                    {s.campoNome && <div className="att-sport">{s.campoNome}</div>}
                  </div>
                  <span className="all-badge">
                    {s.nPartecipanti > 0
                      ? `${s.nPartecipanti} ${s.nPartecipanti === 1 ? 'allievo' : 'allievi'}`
                      : 'Allenamento'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RiepilogoProfilo() {
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

        // Sessioni svolte (passate)
        const { count: cSvolti } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .lt('inizio', isoOra)

        // Tutta la settimana corrente (lun–dom), fatte + in programma
        const lunedi = new Date(ora)
        lunedi.setDate(ora.getDate() - (ora.getDay() === 0 ? 6 : ora.getDay() - 1))
        lunedi.setHours(0, 0, 0, 0)
        const lunediPross = new Date(lunedi)
        lunediPross.setDate(lunedi.getDate() + 7)
        const { count: cSett } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .gte('inizio', lunedi.toISOString())
          .lt('inizio', lunediPross.toISOString())

        // Tutto il mese corrente (fatte + in programma)
        const inizioMese = new Date(ora.getFullYear(), ora.getMonth(), 1).toISOString()
        const inizioMesePross = new Date(ora.getFullYear(), ora.getMonth() + 1, 1).toISOString()
        const { count: cMese } = await supabase
          .from('prenotazioni')
          .select('*', { count: 'exact', head: true })
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .gte('inizio', inizioMese)
          .lt('inizio', inizioMesePross)

        // Attività a cui l'istruttore ha partecipato come giocatore
        const { data: att } = await supabase
          .from('partecipanti_amichevole')
          .select('prenotazione_id')
          .eq('socio_id', profilo!.id)
          .eq('confermato', true)

        // Giocatori distinti allenati (solo sessioni passate)
        const { data: sessioni } = await supabase
          .from('prenotazioni')
          .select('id')
          .eq('allenamento', true)
          .eq('allenatore_id', profilo!.id)
          .lt('inizio', isoOra)
        const sessionIds = (sessioni ?? []).map((s: { id: string | number }) => s.id)
        let allenati = 0
        if (sessionIds.length > 0) {
          const { data: partecipanti } = await supabase
            .from('partecipanti_amichevole')
            .select('socio_id')
            .in('prenotazione_id', sessionIds)
            .neq('socio_id', profilo!.id)
          allenati = new Set((partecipanti ?? []).map((r: { socio_id: string }) => r.socio_id)).size
        }

        return {
          punti: 0, crediti: 0, posizione: null,
          attivita: att ? att.length : 0,
          prenotazioniOggi: null, daConfermare: null,
          allenamenti: null,
          svolti: cSvolti ?? 0,
          settimana: cSett ?? 0,
          mese: cMese ?? 0,
          allenati,
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

  // Riepilogo istruttore: blocco allenamenti + attività separata
  if (istruttore) {
    const d = stat.data
    return (
      <div>
        <div className="riep-wow">
          <div className="riep-wow-top">
            <MedagliaRuolo ruolo="istruttore" size={66} />
            <div className="riep-wow-hi">
              <h1>Benvenuto, {profilo.nome}</h1>
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
                <em>Svolti</em>
              </span>
              <span className="riep-istr-pipe">|</span>
              <span className="riep-istr-item">
                <strong>{d?.settimana != null ? d.settimana : '—'}</strong>
                <em>Settimana</em>
              </span>
              <span className="riep-istr-pipe">|</span>
              <span className="riep-istr-item">
                <strong>{d?.mese != null ? d.mese : '—'}</strong>
                <em>Mese</em>
              </span>
              <span className="riep-istr-pipe">|</span>
              <span className="riep-istr-item">
                <strong>{d?.allenati != null ? d.allenati : '—'}</strong>
                <em>Allenati</em>
              </span>
            </div>
          </div>
        </div>

        <div className="club-sez-header" style={{ marginTop: '2rem' }}>
          <span className="club-sez-icona">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12h4M12 16h4M8 12h.01M8 16h.01"/></svg>
          </span>
          <h2 className="club-sez-titolo">Allenamenti in programma</h2>
        </div>
        <div className="card">
          <AllenamentiInProgramma />
        </div>

        <div className="club-sez-header" style={{ marginTop: '2rem' }}>
          <span className="club-sez-icona">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </span>
          <h2 className="club-sez-titolo">Attività in programma</h2>
        </div>
        <div className="card">
          <AttivitaInProgramma />
        </div>
      </div>
    )
  }

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

        <div className={`riep-griglia${collaboratore ? ' riep-griglia-2' : ''}`}>
          <Stat valore={String(punti)} nome="Punti" />
          {!collaboratore && (
            <Stat valore={String(crediti)} nome="Crediti" />
          )}
          <Stat valore={posizione != null ? posizione + 'º' : '—'} nome="Posizione" />
          {!collaboratore && (
            <Stat valore={attivita != null ? String(attivita) : '—'} nome="Attività" />
          )}
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

      <div className="club-sez-header" style={{ marginTop: '2rem' }}>
        <span className="club-sez-icona">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </span>
        <h2 className="club-sez-titolo">Attività in programma</h2>
      </div>
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
