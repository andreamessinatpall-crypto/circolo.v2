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
function giorni30Fa(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
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
type SocioRow = {
  id: string
  attivo: boolean
  sport_preferito: string
  is_admin: boolean
  is_allenatore: boolean | null
  e_allenatore: boolean | null
  created_at?: string | null
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
      if (campoIds.length) {
        const { data: campi } = await supabase.from('campi').select('id, nome').in('id', campoIds)
        for (const c of campi ?? []) campiById.set(String(c.id), c.nome)
      }

      const meseStr = inizioMese()
      const mesePrecStr = inizioMesePrecedente()
      const settimanaStr = inizioSettimana()
      const mese = lista.filter(p => p.inizio >= meseStr)
      const mesePred = lista.filter(p => p.inizio >= mesePrecStr && p.inizio < meseStr)
      const settimana = lista.filter(p => p.inizio >= settimanaStr)

      const meseIds = mese.map(p => p.id)
      let confermati = 0, totaliPart = 0
      if (meseIds.length) {
        const { data: parts } = await supabase
          .from('partecipanti_amichevole').select('confermato').in('prenotazione_id', meseIds)
        totaliPart = (parts ?? []).length
        confermati = (parts ?? []).filter(p => p.confermato).length
      }

      const perMese = MESI.map((_, i) => ({ label: MESI[i], count: 0, ore: 0 }))
      for (const p of lista) {
        const m = new Date(p.inizio).getMonth()
        perMese[m].count++
        perMese[m].ore += (new Date(p.fine).getTime() - new Date(p.inizio).getTime()) / 3600000
      }

      const perDow = new Array(7).fill(0)
      for (const p of mese) perDow[new Date(p.inizio).getDay()]++
      const dowOrd = DOW_ORD.map(i => ({ label: DOW[i], count: perDow[i] }))

      const campoCount = new Map<string, number>()
      for (const p of mese) {
        const k = String(p.campo_id)
        campoCount.set(k, (campoCount.get(k) ?? 0) + 1)
      }
      const campiRanking = [...campoCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => ({ nome: campiById.get(id) ?? 'Campo ' + id, count: n }))

      const giornoTop = dowOrd.reduce((a, b) => b.count > a.count ? b : a, dowOrd[0])
      const oreAnno = lista.reduce(
        (acc, p) => acc + (new Date(p.fine).getTime() - new Date(p.inizio).getTime()) / 3600000, 0)
      const allenamenti = mese.filter(p => p.allenamento).length
      const torneoCount = mese.filter(p => p.incontro_id).length

      return {
        settimanaCount: settimana.length,
        meseCount: mese.length,
        mesePrecCount: mesePred.length,
        oreAnno: Math.round(oreAnno),
        allenamenti,
        torneoCount,
        partite: mese.length - allenamenti - torneoCount,
        campoTop: campiRanking[0]?.nome ?? '—',
        giornoTop: giornoTop?.label ?? '—',
        percConferma: totaliPart > 0 ? Math.round(confermati / totaliPart * 100) : null,
        confermati,
        totaliPart,
        perMese,
        dowOrd,
        campiRanking,
      }
    },
  })
}

function useStatGioc() {
  return useQuery({
    queryKey: ['stat-gioc'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soci')
        .select('id, attivo, sport_preferito, is_admin, is_allenatore, e_allenatore, created_at')
      if (error) throw error
      const soci = (data ?? []) as SocioRow[]

      const { data: prenR } = await supabase.from('prenotazioni').select('id').gte('inizio', giorni30Fa())
      const prenIds = (prenR ?? []).map(p => p.id)
      const attiviIds = new Set<string>()
      if (prenIds.length) {
        const { data: parts } = await supabase
          .from('partecipanti_amichevole').select('socio_id').in('prenotazione_id', prenIds)
        for (const p of parts ?? []) if (p.socio_id) attiviIds.add(p.socio_id)
      }

      const attivi = soci.filter(s => s.attivo)
      const daInizioMese = inizioMese()

      // Breakdown per ruolo
      const adminCount     = attivi.filter(s => s.is_admin).length
      const collaboratori  = attivi.filter(s => !!s.is_allenatore && !s.is_admin).length
      const istruttori     = attivi.filter(s => !!s.e_allenatore && !s.is_allenatore && !s.is_admin).length
      const giocatori      = attivi.length - adminCount - collaboratori - istruttori

      return {
        totale: attivi.length,
        nuoviMese: attivi.filter(s => s.created_at && s.created_at >= daInizioMese).length,
        attiviUltimi30: attivi.filter(s => attiviIds.has(s.id)).length,
        padel:   attivi.filter(s => s.sport_preferito === 'padel').length,
        calcio:  attivi.filter(s => s.sport_preferito === 'calcio').length,
        entrambi: attivi.filter(s => !s.sport_preferito || (s.sport_preferito !== 'padel' && s.sport_preferito !== 'calcio')).length,
        staff: attivi.filter(s => s.is_admin || s.is_allenatore || s.e_allenatore).length,
        giocatori,
        collaboratori,
        istruttori,
        adminCount,
      }
    },
  })
}

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

  return (
    <div className="stat-page">
      {/* ── Header ── */}
      <div className="stat-header">
        <div>
          <div className="stat-header-titolo">Dashboard</div>
          <div className="stat-header-sub">Aggiornato {ora}</div>
        </div>
      </div>

      {/* ── Hero KPI ── */}
      <div className="stat-hero">
        <HeroCard valore={String(p.settimanaCount)} label="Prenotazioni questa settimana"
          colore="teal" onClick={() => setModale('giorni')} />
        <HeroCard valore={String(p.meseCount)} label="Prenotazioni questo mese"
          colore="indigo" delta={delta} onClick={() => setModale('mese')} />
        <HeroCard valore={p.oreAnno + 'h'} label={'Ore campo occupate ' + anno}
          colore="amber" onClick={() => setModale('ore')} />
      </div>

      {/* ── Prenotazioni ── */}
      <div className="stat-sezione">
        <div className="stat-sezione-header">
          <span className="stat-dot teal" />
          Prenotazioni — mese corrente
        </div>
        <div className="stat-griglia">
          {/* Card raggruppata: Tipo prenotazione */}
          <ComboCard
            accent="teal"
            lbl="Tipo prenotazione"
            items={[
              { n: p.partite,     label: 'Partite' },
              { n: p.allenamenti, label: 'Allenamenti' },
              { n: p.torneoCount, label: 'Torneo' },
            ]}
            onClick={() => setModale('composizione')}
          />
          {p.percConferma !== null && (
            <Card2 accent="rose" val={p.percConferma + '%'} lbl="Presenze confermate" onClick={() => setModale('presenze')} />
          )}
          <Card2 accent="amber" val={p.campoTop} lbl="Campo più usato" piccolo onClick={() => setModale('campi')} />
          <Card2 accent="sky"   val={p.giornoTop} lbl="Giorno più affollato"     onClick={() => setModale('giorni')} />
        </div>
      </div>

      {/* ── Giocatori ── */}
      <div className="stat-sezione">
        <div className="stat-sezione-header">
          <span className="stat-dot purple" />
          Giocatori
        </div>
        <div className="stat-griglia">
          {/* Totale iscritti → breakdown per ruolo */}
          <Card2 accent="indigo" val={String(g.totale)} lbl="Totale iscritti" onClick={() => setModale('ruoli')} />
          {g.nuoviMese > 0 && <Card2 accent="verde" val={String(g.nuoviMese)} lbl="Nuovi questo mese" />}
          <Card2 accent="teal" val={String(g.attiviUltimi30)} lbl="Attivi ultimi 30 gg" onClick={() => setModale('attivi')} />
          {/* Card raggruppata: Sport */}
          <ComboCard
            accent="sky"
            lbl="Sport preferito"
            items={[
              { n: g.padel,    label: 'Padel' },
              { n: g.calcio,   label: 'Calcio' },
              { n: g.entrambi, label: 'Entrambi' },
            ]}
            onClick={() => setModale('sport')}
          />
          <Card2 accent="rose" val={String(g.staff)} lbl="Admin e collaboratori" />
        </div>
      </div>

      {/* ── Modali ── */}
      {modale && (
        <Modale onChiudi={() => setModale(null)}>
          {modale === 'mese' && (
            <>
              <ModaleTitolo titolo="Prenotazioni questo mese" kpi={String(p.meseCount)} />
              {delta !== null && (
                <p className={'stat-modal-delta ' + (delta >= 0 ? 'up' : 'down')}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% rispetto al mese scorso ({p.mesePrecCount})
                </p>
              )}
              <BarChart titolo="Andamento annuale — prenotazioni per mese"
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
          {modale === 'giorni' && (
            <>
              <ModaleTitolo titolo="Affollamento per giorno" kpi={p.giornoTop} kpiLabel="giorno di punta" />
              <p className="stat-modal-sub">Prenotazioni nel mese corrente per giorno della settimana</p>
              <BarChart dati={p.dowOrd.map(d => ({ label: d.label, val: d.count }))} percentuale />
            </>
          )}
          {modale === 'campi' && (
            <>
              <ModaleTitolo titolo="Utilizzo per campo" kpi={p.campoTop} kpiLabel="campo più usato" />
              <BarChart titolo="Prenotazioni per campo — mese corrente"
                dati={p.campiRanking.map(c => ({ label: c.nome, val: c.count }))} percentuale />
            </>
          )}
          {modale === 'composizione' && (
            <>
              <ModaleTitolo titolo="Composizione prenotazioni" kpi={String(p.meseCount)} kpiLabel="questo mese" />
              <BarChart dati={[
                { label: 'Partite',      val: p.partite },
                { label: 'Allenamenti', val: p.allenamenti },
                { label: 'Torneo',      val: p.torneoCount },
              ]} percentuale />
            </>
          )}
          {modale === 'presenze' && (
            <>
              <ModaleTitolo titolo="Presenze confermate" kpi={(p.percConferma ?? 0) + '%'}
                kpiLabel={p.confermati + ' su ' + p.totaliPart + ' questo mese'} />
              <ProgressBar valore={p.confermati} massimo={p.totaliPart} />
            </>
          )}
          {modale === 'ruoli' && (
            <>
              <ModaleTitolo titolo="Iscritti per ruolo" kpi={String(g.totale)} kpiLabel="totale iscritti" />
              <BarChart dati={[
                { label: 'Giocatori',    val: g.giocatori },
                { label: 'Collaboratori', val: g.collaboratori },
                { label: 'Istruttori',   val: g.istruttori },
                { label: 'Admin',        val: g.adminCount },
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
          {modale === 'attivi' && (
            <>
              <ModaleTitolo titolo="Giocatori attivi"
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

// ── Componenti UI ─────────────────────────────────────────────────────────────

function HeroCard({ valore, label, colore, delta, onClick }: {
  valore: string; label: string; colore: string; delta?: number | null; onClick?: () => void
}) {
  return (
    <button type="button" className={'stat-hero-card ' + colore} onClick={onClick}>
      <div className="stat-hero-val">{valore}</div>
      <div className="stat-hero-lbl">{label}</div>
      {delta != null && (
        <div className={'stat-hero-delta ' + (delta >= 0 ? 'up' : 'down')}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs mese scorso
        </div>
      )}
      <div className="stat-hero-caret">›</div>
    </button>
  )
}

function Card2({ accent, val, lbl, piccolo, onClick }: {
  accent: string; val: string; lbl: string; piccolo?: boolean; onClick?: () => void
}) {
  return (
    <button type="button" className={'stat-card2 ' + accent + (onClick ? ' click' : '')} onClick={onClick}>
      <div className={'stat-card2-val' + (piccolo ? ' s' : '')}>{val}</div>
      <div className="stat-card2-lbl">{lbl}</div>
      {onClick && <span className="stat-card2-arr">›</span>}
    </button>
  )
}

function ComboCard({ accent, lbl, items, onClick }: {
  accent: string
  lbl: string
  items: { n: number; label: string }[]
  onClick?: () => void
}) {
  return (
    <button type="button" className={'stat-card2 stat-combo ' + accent + (onClick ? ' click' : '')} onClick={onClick}>
      <div className="stat-combo-header">
        <span className="stat-card2-lbl">{lbl}</span>
        {onClick && <span className="stat-combo-arr">›</span>}
      </div>
      <div className="stat-combo-row">
        {items.map((it, i) => (
          <div key={i} className="stat-combo-slot">
            <div className="stat-combo-slot-n">{it.n}</div>
            <div className="stat-combo-slot-lbl">{it.label}</div>
          </div>
        ))}
      </div>
    </button>
  )
}

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

function BarChart({ dati, titolo, suffisso = '', percentuale = false }: {
  dati: { label: string; val: number }[]
  titolo?: string
  suffisso?: string
  percentuale?: boolean
}) {
  const massimo = Math.max(...dati.map(d => d.val), 1)
  const totale = dati.reduce((s, d) => s + d.val, 0)
  return (
    <div className="stat-chart">
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
