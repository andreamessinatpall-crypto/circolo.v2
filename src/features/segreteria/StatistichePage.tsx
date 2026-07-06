import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/errori'

// ── Date helpers ──────────────────────────────────────────────────────────────

function inizioAnno(): string {
  const d = new Date()
  return new Date(d.getFullYear(), 0, 1).toISOString()
}
function inizioMese(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function inizioMesePrecedente(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString()
}
function inizioSettimana(): string {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).toISOString()
}
function inizioSettimanaPrecedente(): string {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7
  const inizioCorrente = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)
  return new Date(inizioCorrente.getFullYear(), inizioCorrente.getMonth(), inizioCorrente.getDate() - 7).toISOString()
}

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const DOW = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const DOW_ORD = [1, 2, 3, 4, 5, 6, 0]

// ── Tipi ─────────────────────────────────────────────────────────────────────

type PrenRow = {
  id: number | string
  inizio: string
  fine: string
  campo_id: string | number | null
  allenamento: boolean | null
  incontro_id: number | string | null
}

// ── Helpers analisi ───────────────────────────────────────────────────────────

function fasciaRanking(items: PrenRow[]) {
  const oraCount = new Map<number, number>()
  for (const p of items) {
    const h = new Date(p.inizio).getHours()
    oraCount.set(h, (oraCount.get(h) ?? 0) + 1)
  }
  return [...oraCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([h, n]) => ({
      label: `${String(h).padStart(2, '0')}:00`,
      val: n,
    }))
}

function dowRanking(items: PrenRow[]) {
  const perDow = new Array(7).fill(0)
  for (const p of items) perDow[new Date(p.inizio).getDay()]++
  return DOW_ORD.map(i => ({ label: DOW[i], val: perDow[i] }))
}

function settimanaTrend(items: PrenRow[], settimane = 8) {
  const oggi = new Date()
  const dow = (oggi.getDay() + 6) % 7
  const inizioCorrente = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - dow)
  const risultato: { label: string; val: number }[] = []
  for (let i = settimane - 1; i >= 0; i--) {
    const inizio = new Date(inizioCorrente.getFullYear(), inizioCorrente.getMonth(), inizioCorrente.getDate() - i * 7)
    const fine = new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate() + 7)
    const count = items.filter(p => {
      const t = new Date(p.inizio)
      return t >= inizio && t < fine
    }).length
    const label = i === 0 ? 'Questa' : `${String(inizio.getDate()).padStart(2, '0')}/${String(inizio.getMonth() + 1).padStart(2, '0')}`
    risultato.push({ label, val: count })
  }
  return risultato
}

function oreOccupate(items: PrenRow[]) {
  return Math.round(
    items.reduce((acc, p) =>
      acc + (new Date(p.fine).getTime() - new Date(p.inizio).getTime()) / 3600000, 0)
  )
}

function tipoBreakdown(items: PrenRow[]) {
  return {
    partite:     items.filter(p => !p.allenamento && !p.incontro_id).length,
    allenamenti: items.filter(p => !!p.allenamento).length,
    torneo:      items.filter(p => !!p.incontro_id).length,
  }
}

function topLabel<T extends { label: string; val: number }>(ranking: T[]): string {
  return ranking.reduce((a, b) => b.val > a.val ? b : a, ranking[0])?.label ?? '—'
}

// ── Hooks dati ────────────────────────────────────────────────────────────────

function useStatPren() {
  return useQuery({
    queryKey: ['stat-pren-anno'],
    queryFn: async () => {
      const { data: pren, error } = await supabase
        .from('prenotazioni')
        .select('id, inizio, fine, campo_id, allenamento, incontro_id')
        .gte('inizio', inizioAnno())
      if (error) throw error
      const lista = (pren ?? []) as PrenRow[]

      const campoIds = [...new Set(lista.map(p => p.campo_id).filter(Boolean))]
      const campiById = new Map<string, string>()
      const campiSport = new Map<string, string>()
      if (campoIds.length) {
        const { data: campi } = await supabase.from('campi').select('id, nome, sport').in('id', campoIds)
        for (const c of (campi ?? []) as { id: unknown; nome: string; sport: string }[]) {
          campiById.set(String(c.id), c.nome)
          campiSport.set(String(c.id), c.sport)
        }
      }

      const bySport = (items: PrenRow[], sport: string) =>
        items.filter(p => campiSport.get(String(p.campo_id)) === sport)

      const meseStr = inizioMese()
      const mesePrecStr = inizioMesePrecedente()
      const settimanaStr = inizioSettimana()
      const settimanaPrecStr = inizioSettimanaPrecedente()
      const mese     = lista.filter(p => p.inizio >= meseStr)
      const mesePred = lista.filter(p => p.inizio >= mesePrecStr && p.inizio < meseStr)
      const settimana = lista.filter(p => p.inizio >= settimanaStr)
      const settimanaPrec = lista.filter(p => p.inizio >= settimanaPrecStr && p.inizio < settimanaStr)

      // Per-sport (anno e mese)
      const padelAnno   = bySport(lista, 'padel')
      const calcioAnno  = bySport(lista, 'calcio')
      const mesePadel   = bySport(mese, 'padel')
      const meseCalcio  = bySport(mese, 'calcio')

      // Andamento mensile (per modale)
      const perMese = MESI.map((_, i) => ({ label: MESI[i], count: 0, ore: 0 }))
      for (const p of lista) {
        const m = new Date(p.inizio).getMonth()
        perMese[m].count++
        perMese[m].ore += (new Date(p.fine).getTime() - new Date(p.inizio).getTime()) / 3600000
      }

      // Campi top (mese)
      const campoCount = new Map<string, number>()
      for (const p of mese) {
        const k = String(p.campo_id)
        campoCount.set(k, (campoCount.get(k) ?? 0) + 1)
      }
      const campiRanking = [...campoCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => ({ nome: campiById.get(id) ?? 'Campo ' + id, count: n }))

      // Andamento settimanale (per modale)
      const perSettimana = settimanaTrend(lista)

      // Ranking fasce e giorni
      const oraRanking        = fasciaRanking(mese)
      const padelOraRanking   = fasciaRanking(mesePadel)
      const calcioOraRanking  = fasciaRanking(meseCalcio)
      const padelDowRanking   = dowRanking(mesePadel)
      const calcioDowRanking  = dowRanking(meseCalcio)

      // Tipo breakdown
      const tipoTotale = tipoBreakdown(mese)
      const tipoPadel  = tipoBreakdown(mesePadel)
      const tipoCalcio = tipoBreakdown(meseCalcio)

      return {
        // Riepilogo generale
        settimanaCount: settimana.length,
        settimanaPrecCount: settimanaPrec.length,
        perSettimana,
        meseCount: mese.length,
        mesePrecCount: mesePred.length,
        oreAnno: oreOccupate(lista),
        tipoTotale,
        fasciaTop: oraRanking[0]?.label ?? '—',
        oraRanking,
        campoTop: campiRanking[0]?.nome ?? '—',
        campiRanking,
        perMese,
        // Padel
        mesePadelCount:  mesePadel.length,
        orePadel:        oreOccupate(padelAnno),
        tipoPadel,
        padelFasciaTop:  padelOraRanking[0]?.label ?? '—',
        padelGiornoTop:  topLabel(padelDowRanking),
        padelOraRanking,
        padelDowRanking,
        // Calcio
        meseCalcioCount: meseCalcio.length,
        oreCalcio:       oreOccupate(calcioAnno),
        tipoCalcio,
        calcioFasciaTop: calcioOraRanking[0]?.label ?? '—',
        calcioGiornoTop: topLabel(calcioDowRanking),
        calcioOraRanking,
        calcioDowRanking,
      }
    },
  })
}

function useStatGioc() {
  return useQuery({
    queryKey: ['stat-gioc'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stat_giocatori')
      if (error) throw error
      const r = data as {
        totale: number
        nuoviMese: number
        attiviUltimi30: number
        attiviUltimi7: number
        padel: number
        calcio: number
        entrambi: number
        staff: number
        adminCount: number
        collaboratori: number
        istruttori: number
        giocatori: number
      }
      return {
        totale:         Number(r.totale),
        nuoviMese:      Number(r.nuoviMese),
        attiviUltimi30: Number(r.attiviUltimi30),
        attiviUltimi7:  Number(r.attiviUltimi7),
        padel:          Number(r.padel),
        calcio:         Number(r.calcio),
        entrambi:       Number(r.entrambi),
        staff:          Number(r.staff),
        adminCount:     Number(r.adminCount),
        collaboratori:  Number(r.collaboratori),
        istruttori:     Number(r.istruttori),
        giocatori:      Number(r.giocatori),
      }
    },
  })
}

// ── Componenti UI ─────────────────────────────────────────────────────────────

const COLORI: Record<string, string> = {
  teal:   '#0d9488',
  indigo: '#4f46e5',
  amber:  '#d97706',
  verde:  '#16a34a',
  sky:    '#0284c7',
  rose:   '#e11d48',
}

function KpiCard({ n, label, color, delta, deltaLabel = 'mese scorso', onClick }: {
  n: number | string; label: string; color: string; delta?: number | null; deltaLabel?: string; onClick?: () => void
}) {
  return (
    <button type="button" className={'stat-kpi' + (onClick ? ' click' : '')} onClick={onClick}>
      <div className="stat-kpi-bar" style={{ background: COLORI[color] ?? COLORI.indigo }} />
      <div className="stat-kpi-n">{n}</div>
      <div className="stat-kpi-lbl">{label}</div>
      {delta != null && (
        <div className={'stat-kpi-delta ' + (delta >= 0 ? 'up' : 'down')}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs {deltaLabel}
        </div>
      )}
      {onClick && <span className="stat-kpi-arr">›</span>}
    </button>
  )
}

function Combo({ label, items, color, onClick }: {
  label: string; items: { n: number; label: string }[]; color: string; onClick?: () => void
}) {
  return (
    <button type="button" className={'stat-combo' + (onClick ? ' click' : '')} onClick={onClick}>
      <div className="stat-combo-bar" style={{ background: COLORI[color] ?? COLORI.teal }} />
      <div className="stat-combo-top">
        <span className="stat-combo-lbl">{label}</span>
        {onClick && <span className="stat-combo-arr">›</span>}
      </div>
      <div className="stat-combo-items">
        {items.map((it, i) => (
          <div key={i} className="stat-combo-item">
            <div className="stat-combo-n">{it.n}</div>
            <div className="stat-combo-sublbl">{it.label}</div>
          </div>
        ))}
      </div>
    </button>
  )
}

// ── Icone sezione ─────────────────────────────────────────────────────────────

const SVG = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const ICO_RIEPILOGO = <SVG><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></SVG>
const ICO_PADEL     = <SVG><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></SVG>
const ICO_CALCIO    = <SVG><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></SVG>
const ICO_GIOCATORI = <SVG><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SVG>

// ── Componente principale ─────────────────────────────────────────────────────

export default function StatistichePage() {
  const [modale, setModale] = useState<string | null>(null)
  const pren = useStatPren()
  const gioc = useStatGioc()

  if (pren.isLoading || gioc.isLoading) {
    return (
      <div className="stat-loading">
        <div className="stat-loading-spinner" />
        Caricamento statistiche…
      </div>
    )
  }
  if (pren.error) return <p className="sub">{messaggioErrore(pren.error)}</p>
  if (gioc.error) return <p className="sub">{messaggioErrore(gioc.error)}</p>

  const p = pren.data!
  const g = gioc.data!
  const anno = new Date().getFullYear()
  const ora = new Date().toLocaleString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const delta = p.mesePrecCount > 0
    ? Math.round((p.meseCount - p.mesePrecCount) / p.mesePrecCount * 100)
    : null
  const deltaSettimana = p.settimanaPrecCount > 0
    ? Math.round((p.settimanaCount - p.settimanaPrecCount) / p.settimanaPrecCount * 100)
    : null

  return (
    <div className="stat-page">
      <p className="stat-ts">Aggiornato {ora}</p>

      {/* ── Riepilogo ── */}
      <section className="stat-sez">
        <div className="club-sez-header">
          <span className="club-sez-icona">{ICO_RIEPILOGO}</span>
          <h2 className="club-sez-titolo">Riepilogo</h2>
        </div>

        <div className="stat-row">
          <KpiCard n={p.settimanaCount} label="Prenotazioni settimana" color="teal" delta={deltaSettimana}
            deltaLabel="settimana scorsa" onClick={() => setModale('settimana')} />
          <KpiCard n={p.meseCount} label="Questo mese" color="indigo" delta={delta}
            onClick={() => setModale('mese')} />
          <KpiCard n={p.oreAnno + 'h'} label={'Ore campo ' + anno} color="amber"
            onClick={() => setModale('ore')} />
        </div>
      </section>

      {/* ── Padel ── */}
      <section className="stat-sez">
        <div className="club-sez-header">
          <span className="club-sez-icona">{ICO_PADEL}</span>
          <h2 className="club-sez-titolo">Padel</h2>
        </div>

        <div className="stat-row">
          <KpiCard n={p.mesePadelCount} label="Prenotazioni mese" color="teal"
            onClick={() => setModale('padel-tipo')} />
          <KpiCard n={p.orePadel + 'h'} label={'Ore campo ' + anno} color="teal" />
          <KpiCard n={p.padelFasciaTop} label="Fascia più prenotata" color="amber"
            onClick={() => setModale('padel-fasce')} />
          <KpiCard n={p.padelGiornoTop} label="Giorno più affollato" color="sky"
            onClick={() => setModale('padel-giorni')} />
        </div>
      </section>

      {/* ── Calcio ── */}
      <section className="stat-sez">
        <div className="club-sez-header">
          <span className="club-sez-icona">{ICO_CALCIO}</span>
          <h2 className="club-sez-titolo">Calcio</h2>
        </div>

        <div className="stat-row">
          <KpiCard n={p.meseCalcioCount} label="Prenotazioni mese" color="indigo"
            onClick={() => setModale('calcio-tipo')} />
          <KpiCard n={p.oreCalcio + 'h'} label={'Ore campo ' + anno} color="indigo" />
          <KpiCard n={p.calcioFasciaTop} label="Fascia più prenotata" color="amber"
            onClick={() => setModale('calcio-fasce')} />
          <KpiCard n={p.calcioGiornoTop} label="Giorno più affollato" color="sky"
            onClick={() => setModale('calcio-giorni')} />
        </div>
      </section>

      {/* ── Giocatori ── */}
      <section className="stat-sez">
        <div className="club-sez-header">
          <span className="club-sez-icona">{ICO_GIOCATORI}</span>
          <h2 className="club-sez-titolo">Giocatori</h2>
        </div>

        <div className="stat-row">
          <KpiCard n={g.totale} label="Iscritti" color="indigo" onClick={() => setModale('ruoli')} />
          {g.nuoviMese > 0 && <KpiCard n={g.nuoviMese} label="Nuovi questo mese" color="verde" />}
          <KpiCard n={g.attiviUltimi30} label="Attivi 30 gg" color="sky"
            onClick={() => setModale('attivi')} />
          <KpiCard n={g.attiviUltimi7} label="Attivi 7 gg" color="teal"
            onClick={() => setModale('attivi7')} />
        </div>

        <div className="stat-2col">
          <Combo color="sky" label="Sport preferito" onClick={() => setModale('sport')}
            items={[
              { n: g.padel,    label: 'Padel' },
              { n: g.calcio,   label: 'Calcio' },
              { n: g.entrambi, label: 'Entrambi' },
            ]}
          />
          <KpiCard n={g.staff} label="Admin e collaboratori" color="rose" />
        </div>
      </section>

      {/* ── Modali ── */}
      {modale && (
        <Modale onChiudi={() => setModale(null)}>

          {/* Riepilogo */}
          {modale === 'mese' && (
            <>
              <ModaleTitolo titolo="Prenotazioni questo mese" kpi={String(p.meseCount)} />
              {delta !== null && (
                <p className={'stat-modal-delta ' + (delta >= 0 ? 'up' : 'down')}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% rispetto al mese scorso ({p.mesePrecCount})
                </p>
              )}
              <BarChart titolo="Tipo — mese corrente" dati={[
                { label: 'Partite',      val: p.tipoTotale.partite },
                { label: 'Allenamenti', val: p.tipoTotale.allenamenti },
                { label: 'Torneo',      val: p.tipoTotale.torneo },
              ]} percentuale />
              <BarChart titolo="Andamento annuale" className="mt-5"
                dati={p.perMese.map(m => ({ label: m.label, val: m.count }))} />
            </>
          )}
          {modale === 'ore' && (
            <>
              <ModaleTitolo titolo={'Ore campo occupate — ' + anno} kpi={p.oreAnno + 'h'} />
              <p className="stat-modal-sub">
                Media mensile: {Math.round(p.oreAnno / Math.max(new Date().getMonth() + 1, 1))}h
              </p>
              <BarChart titolo="Ore per mese"
                dati={p.perMese.map(m => ({ label: m.label, val: Math.round(m.ore) }))} suffisso="h" />
            </>
          )}
          {modale === 'settimana' && (
            <>
              <ModaleTitolo titolo="Prenotazioni questa settimana" kpi={String(p.settimanaCount)} />
              {deltaSettimana !== null && (
                <p className={'stat-modal-delta ' + (deltaSettimana >= 0 ? 'up' : 'down')}>
                  {deltaSettimana >= 0 ? '▲' : '▼'} {Math.abs(deltaSettimana)}% rispetto alla settimana scorsa ({p.settimanaPrecCount})
                </p>
              )}
              <BarChart titolo="Andamento settimanale" className="mt-5" dati={p.perSettimana} />
            </>
          )}

          {/* Padel */}
          {modale === 'padel-fasce' && (
            <>
              <ModaleTitolo titolo="🎾 Padel — fasce orarie" kpi={p.padelFasciaTop} kpiLabel="fascia più prenotata" />
              <BarChart titolo="Distribuzione oraria — mese corrente"
                dati={p.padelOraRanking} percentuale />
            </>
          )}
          {modale === 'padel-giorni' && (
            <>
              <ModaleTitolo titolo="🎾 Padel — affollamento per giorno" kpi={p.padelGiornoTop} kpiLabel="giorno di punta" />
              <BarChart dati={p.padelDowRanking} percentuale />
            </>
          )}
          {modale === 'padel-tipo' && (
            <>
              <ModaleTitolo titolo="🎾 Padel — tipo prenotazione" kpi={String(p.mesePadelCount)} kpiLabel="questo mese" />
              <BarChart dati={[
                { label: 'Partite',      val: p.tipoPadel.partite },
                { label: 'Allenamenti', val: p.tipoPadel.allenamenti },
                { label: 'Torneo',      val: p.tipoPadel.torneo },
              ]} percentuale />
            </>
          )}

          {/* Calcio */}
          {modale === 'calcio-fasce' && (
            <>
              <ModaleTitolo titolo="⚽ Calcio — fasce orarie" kpi={p.calcioFasciaTop} kpiLabel="fascia più prenotata" />
              <BarChart titolo="Distribuzione oraria — mese corrente"
                dati={p.calcioOraRanking} percentuale />
            </>
          )}
          {modale === 'calcio-giorni' && (
            <>
              <ModaleTitolo titolo="⚽ Calcio — affollamento per giorno" kpi={p.calcioGiornoTop} kpiLabel="giorno di punta" />
              <BarChart dati={p.calcioDowRanking} percentuale />
            </>
          )}
          {modale === 'calcio-tipo' && (
            <>
              <ModaleTitolo titolo="⚽ Calcio — tipo prenotazione" kpi={String(p.meseCalcioCount)} kpiLabel="questo mese" />
              <BarChart dati={[
                { label: 'Partite',      val: p.tipoCalcio.partite },
                { label: 'Allenamenti', val: p.tipoCalcio.allenamenti },
                { label: 'Torneo',      val: p.tipoCalcio.torneo },
              ]} percentuale />
            </>
          )}

          {/* Giocatori */}
          {modale === 'ruoli' && (
            <>
              <ModaleTitolo titolo="Iscritti per ruolo" kpi={String(g.totale)} kpiLabel="totale iscritti" />
              <BarChart dati={[
                { label: 'Giocatori',     val: g.giocatori },
                { label: 'Collaboratori', val: g.collaboratori },
                { label: 'Istruttori',    val: g.istruttori },
                { label: 'Admin',         val: g.adminCount },
              ]} percentuale />
            </>
          )}
          {modale === 'sport' && (
            <>
              <ModaleTitolo titolo="Distribuzione per sport" kpi={String(g.totale)} kpiLabel="iscritti totali" />
              <BarChart dati={[
                { label: 'Padel',    val: g.padel },
                { label: 'Calcio',   val: g.calcio },
                { label: 'Entrambi', val: g.entrambi },
              ]} percentuale />
            </>
          )}
          {modale === 'attivi7' && (
            <>
              <ModaleTitolo titolo="Giocatori attivi — 7 giorni"
                kpi={String(g.attiviUltimi7)}
                kpiLabel={'su ' + g.totale + ' iscritti (' + (g.totale > 0 ? Math.round(g.attiviUltimi7 / g.totale * 100) : 0) + '%)'} />
              <p className="stat-modal-sub">Almeno una prenotazione negli ultimi 7 giorni</p>
              <ProgressBar valore={g.attiviUltimi7} massimo={g.totale} />
            </>
          )}
          {modale === 'attivi' && (
            <>
              <ModaleTitolo titolo="Giocatori attivi — 30 giorni"
                kpi={String(g.attiviUltimi30)}
                kpiLabel={'su ' + g.totale + ' iscritti (' + (g.totale > 0 ? Math.round(g.attiviUltimi30 / g.totale * 100) : 0) + '%)'} />
              <p className="stat-modal-sub">Almeno una prenotazione negli ultimi 30 giorni</p>
              <ProgressBar valore={g.attiviUltimi30} massimo={g.totale} />
            </>
          )}

        </Modale>
      )}
    </div>
  )
}

// ── Sub-componenti ────────────────────────────────────────────────────────────

function Modale({ children, onChiudi }: { children: React.ReactNode; onChiudi: () => void }) {
  return (
    <div className="stat-overlay" onClick={onChiudi}>
      <div className="stat-modale" onClick={e => e.stopPropagation()}>
        <button className="stat-modale-x" onClick={onChiudi} aria-label="Chiudi">×</button>
        {children}
      </div>
    </div>
  )
}

function ModaleTitolo({ titolo, kpi, kpiLabel }: { titolo: string; kpi: string; kpiLabel?: string }) {
  return (
    <div className="stat-modal-head">
      <div className="stat-modal-titolo">{titolo}</div>
      <div className="stat-modal-kpi">{kpi}</div>
      {kpiLabel && <div className="stat-modal-sub">{kpiLabel}</div>}
    </div>
  )
}

function BarChart({ dati, titolo, suffisso = '', percentuale = false, className = '' }: {
  dati: { label: string; val: number }[]
  titolo?: string
  suffisso?: string
  percentuale?: boolean
  className?: string
}) {
  const massimo = Math.max(...dati.map(d => d.val), 1)
  const totale = dati.reduce((s, d) => s + d.val, 0)
  return (
    <div className={'stat-chart' + (className ? ' ' + className : '')}>
      {titolo && <div className="stat-chart-titolo">{titolo}</div>}
      {dati.map((d, i) => {
        const largh = Math.round(d.val / massimo * 100)
        const perc = totale > 0 ? Math.round(d.val / totale * 100) : 0
        return (
          <div key={i} className="stat-chart-riga">
            <div className="stat-chart-lbl">{d.label}</div>
            <div className="stat-chart-track">
              <div className="stat-chart-fill" style={{ width: largh + '%' }} />
            </div>
            <div className="stat-chart-val">
              {d.val}{suffisso}
              {percentuale && totale > 0 && <span className="stat-chart-perc"> {perc}%</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ valore, massimo }: { valore: number; massimo: number }) {
  const perc = massimo > 0 ? Math.round(valore / massimo * 100) : 0
  return (
    <div className="stat-progress">
      <div className="stat-progress-track">
        <div className="stat-progress-fill" style={{ width: perc + '%' }} />
      </div>
      <div className="stat-progress-num">{perc}%</div>
    </div>
  )
}
