import { useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { titleCase } from '@/lib/formato'
import { classiInput } from '@/components/stili'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from '@/features/profilo/livelliPunti'
import { MedagliaLv } from '@/features/profilo/MedagliaLv'
import { MedagliaRuolo } from '@/features/profilo/ruoloBadge'
import { useSoci, type SocioAdmin } from './datiSoci'
import DettaglioGiocatore from './DettaglioGiocatore'
import { SportIcona } from '@/components/IconeSport'

type Ordine = 'punti' | 'cognome'

function isCancellato(s: SocioAdmin): boolean {
  return (s.email ?? '').endsWith('@cancellato.invalid')
}

function StatItem({ num, label, colore }: { num: string | number; label: string; colore?: string }) {
  return (
    <div className="gioc-stat-item">
      <span className="gioc-stat-num" style={colore ? { color: colore } : undefined}>{num}</span>
      <span className="gioc-stat-lbl">{label}</span>
    </div>
  )
}

function SezHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem 0', marginBottom: '0.5rem',
      borderBottom: '1px solid var(--border)',
      fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em',
      textTransform: 'uppercase', color: 'var(--ink-2)',
    }}>
      {children}
    </div>
  )
}

export default function GestioneGiocatori() {
  const { profilo } = useAuth()
  const { data: soci, isLoading, error } = useSoci()
  const { data: modalitaPremi } = useModalitaPremi()
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState<Ordine>('punti')
  const [selezionatoId, setSelezionatoId] = useState<string | null>(null)
  const [espandiCancellati, setEspandiCancellati] = useState(false)

  if (isLoading) return <p className="text-ink-2">Caricamento giocatori…</p>
  if (error) return <p className="msg-errore">Impossibile caricare i giocatori: {error.message}</p>

  const tutti = soci ?? []

  // Stats (su tutti, non filtrati dalla ricerca)
  const nAttivi      = tutti.filter((s) => s.attivo && !isCancellato(s)).length
  const nInAttesa    = tutti.filter((s) => !s.attivo && !isCancellato(s)).length
  const nBloccati    = tutti.filter((s) => !isCancellato(s) && (s.punti_bloccati || s.crediti_bloccati)).length
  const nDaEliminare = tutti.filter((s) => !!s.richiesta_cancellazione).length
  const nCancellati  = tutti.filter(isCancellato).length
  const nPadel  = tutti.filter((s) => !isCancellato(s) && (s.sport_preferito === 'padel'  || s.sport_preferito === 'entrambi')).length
  const nCalcio = tutti.filter((s) => !isCancellato(s) && (s.sport_preferito === 'calcio' || s.sport_preferito === 'entrambi')).length

  // Ricerca
  const q = cerca.trim().toLowerCase()
  const match = (s: SocioAdmin) =>
    !q ||
    (s.nome ?? '').toLowerCase().includes(q) ||
    (s.cognome ?? '').toLowerCase().includes(q) ||
    (s.email ?? '').toLowerCase().includes(q)

  const perCognome = (a: SocioAdmin, b: SocioAdmin) =>
    (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it')
  const cmp =
    ordine === 'cognome'
      ? perCognome
      : (a: SocioAdmin, b: SocioAdmin) => (b.punti ?? 0) - (a.punti ?? 0) || perCognome(a, b)

  // Tre gruppi separati
  const gruppoInAttesa   = tutti.filter((s) => !s.attivo && !isCancellato(s) && match(s)).sort(perCognome)
  const gruppoAttivi     = tutti.filter((s) => s.attivo && !isCancellato(s) && match(s)).sort(cmp)
  const gruppoCancellati = tutti.filter((s) => isCancellato(s) && match(s)).sort(perCognome)

  // Cancellati: auto-espandi se c'è una ricerca con risultati
  const mostraCancellati = espandiCancellati || (!!q && gruppoCancellati.length > 0)

  const selezionato = tutti.find((s) => s.id === selezionatoId) ?? null

  return (
    <div>
      <div className="eyebrow">Giocatori e punti</div>

      <div className="gioc-stats-strip">
        <StatItem num={nAttivi + nInAttesa} label="Iscritti" />
        <StatItem num={nAttivi} label="Approvati" />
        {nInAttesa > 0 && <StatItem num={nInAttesa} label="In attesa" colore="#92400e" />}
        {nBloccati > 0 && <StatItem num={nBloccati} label="Bloccati" colore="var(--errore)" />}
        {nDaEliminare > 0 && <StatItem num={nDaEliminare} label="Richieste" colore="#b91c1c" />}
        <StatItem num={nPadel}  label="🎾 Padel" />
        <StatItem num={nCalcio} label="⚽ Calcio" />
      </div>

      {/* ── Cerca + ordina ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            className={`${classiInput} w-full sm:flex-1 !mt-0`}
            placeholder="Cerca per nome, cognome o email…"
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
          />
          <select
            className={`${classiInput} !mt-0 !w-auto shrink-0`}
            value={ordine}
            onChange={(e) => setOrdine(e.target.value as Ordine)}
          >
            <option value="punti">Punti ↓</option>
            <option value="cognome">A → Z</option>
          </select>
        </div>
      </div>

      {/* ── Blocco: In attesa di approvazione ──────────── */}
      {gruppoInAttesa.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '0.75rem 0.75rem 0 0',
            padding: '0.6rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#9a3412' }}>
              {gruppoInAttesa.length === 1
                ? '1 giocatore in attesa di approvazione'
                : `${gruppoInAttesa.length} giocatori in attesa di approvazione`}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#c2410c', marginLeft: 'auto' }}>
              Apri la scheda → "Attiva"
            </span>
          </div>
          <div style={{
            border: '1px solid #fed7aa', borderTop: 'none',
            borderRadius: '0 0 0.75rem 0.75rem',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: '1px',
            background: '#fed7aa',
          }}>
            {gruppoInAttesa.map((s) => (
              <RigaSocio
                key={s.id}
                socio={s}
                modalitaPremi={!!modalitaPremi}
                onApri={() => setSelezionatoId(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Banner richieste cancellazione pendenti ─────── */}
      {nDaEliminare > 0 && !q && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {nDaEliminare === 1 ? '1 richiesta' : `${nDaEliminare} richieste`} di cancellazione
          account in attesa (GDPR Art. 17). Apri la scheda per completare.
        </div>
      )}

      {/* ── Giocatori attivi ───────────────────────────── */}
      <div className="card">
        {!q && gruppoAttivi.length > 0 && (
          <SezHeader>
            Giocatori attivi
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              ({gruppoAttivi.length})
            </span>
          </SezHeader>
        )}

        {gruppoAttivi.length === 0 && gruppoInAttesa.length === 0 && !q && (
          <p className="text-ink-2">Nessun giocatore.</p>
        )}
        {gruppoAttivi.length === 0 && q && gruppoInAttesa.length === 0 && gruppoCancellati.length === 0 && (
          <p className="text-ink-2">Nessun giocatore corrisponde alla ricerca.</p>
        )}

        {gruppoAttivi.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {gruppoAttivi.map((s) => (
              <RigaSocio
                key={s.id}
                socio={s}
                modalitaPremi={!!modalitaPremi}
                onApri={() => setSelezionatoId(s.id)}
              />
            ))}
          </div>
        )}

        {/* ── Sezione account cancellati (collassabile) ── */}
        {(nCancellati > 0) && (
          <div style={{ marginTop: gruppoAttivi.length > 0 ? '1.25rem' : 0 }}>
            <button
              type="button"
              onClick={() => setEspandiCancellati(!espandiCancellati)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0',
                borderTop: gruppoAttivi.length > 0 ? '1px solid var(--border)' : 'none',
                background: 'none', border: 'none',
                borderTopColor: 'var(--border)',
                borderTopWidth: gruppoAttivi.length > 0 ? 1 : 0,
                borderTopStyle: 'solid',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--ink-3)',
                fontSize: '0.8rem', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>
                <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
              </svg>
              Account cancellati ({nCancellati})
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                {mostraCancellati ? '▲ Nascondi' : '▼ Mostra'}
              </span>
            </button>

            {mostraCancellati && (
              <div className="flex flex-col gap-1.5 mt-2">
                {gruppoCancellati.length === 0 ? (
                  <p className="text-sm text-ink-3">Nessun risultato.</p>
                ) : (
                  gruppoCancellati.map((s) => (
                    <RigaSocio
                      key={s.id}
                      socio={s}
                      modalitaPremi={!!modalitaPremi}
                      onApri={() => setSelezionatoId(s.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selezionato && (
        <DettaglioGiocatore
          socio={selezionato}
          modalitaPremi={!!modalitaPremi}
          meId={profilo?.id}
          onChiudi={() => setSelezionatoId(null)}
        />
      )}
    </div>
  )
}

function RigaSocio({
  socio,
  modalitaPremi,
  onApri,
}: {
  socio: SocioAdmin
  modalitaPremi: boolean
  onApri: () => void
}) {
  const cancellato = isCancellato(socio)
  const lv = livelloDaPunti(socio.punti ?? 0, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  const hasSport = !cancellato && !!socio.sport_preferito
  const isBloccato = !!(socio.punti_bloccati || socio.crediti_bloccati)
  const haCancellazione = !!socio.richiesta_cancellazione

  const ruoloNome = socio.is_admin
    ? 'Admin'
    : socio.is_allenatore
      ? 'Collaboratore'
      : socio.e_allenatore
        ? 'Istruttore'
        : null
  const ruoloColore = socio.is_admin
    ? '#c8972e'
    : socio.is_allenatore
      ? '#c8a83a'
      : socio.e_allenatore
        ? '#be5436'
        : null

  return (
    <button
      type="button"
      onClick={onApri}
      className={
        'gioc-adm-card' +
        (!socio.attivo && !cancellato ? ' in-attesa' : '') +
        (haCancellazione ? ' cancellazione-richiesta' : '') +
        (cancellato ? ' opacity-50' : '')
      }
    >
      {cancellato
        ? <MedagliaLv punti={0} size={40} />
        : socio.is_admin
          ? <MedagliaRuolo ruolo="admin" size={40} />
          : socio.is_allenatore
            ? <MedagliaRuolo ruolo="collaboratore" size={40} />
            : socio.e_allenatore
              ? <MedagliaRuolo ruolo="istruttore" size={40} />
              : <MedagliaLv punti={socio.punti ?? 0} size={40} />}

      <div className="gioc-adm-body">
        <div className="gioc-adm-nome">
          {titleCase(socio.cognome)} {titleCase(socio.nome)}
          {!cancellato && !socio.attivo && (
            <span className="gioc-att-badge">In attesa</span>
          )}
          {!cancellato && isBloccato && (
            <span className="gioc-bloccato-badge">Bloccato</span>
          )}
          {cancellato && (
            <span className="pill bg-ink-1/10 text-ink-3">Cancellato</span>
          )}
        </div>

        {!cancellato && (
          <div className="gioc-adm-row2">
            <span style={{ color: ruoloColore ?? cfg.colore }}>{ruoloNome ?? cfg.nome}</span>
            <span className="gioc-adm-sep">·</span>
            <span>{socio.punti ?? 0} pt</span>
            {modalitaPremi && (
              <>
                <span className="gioc-adm-sep">·</span>
                <span>{socio.crediti ?? 0} cr</span>
              </>
            )}
            {hasSport && (
              <>
                <span className="gioc-adm-sep">·</span>
                <SportIcona sport={socio.sport_preferito} />
              </>
            )}
          </div>
        )}

        {!cancellato && (socio.email || socio.telefono) && (
          <div className="gioc-adm-row3">
            {[socio.email, socio.telefono].filter(Boolean).join(' · ')}
          </div>
        )}

        {cancellato && (
          <div className="gioc-adm-row3">Account anonimizzato</div>
        )}
      </div>

      <span className="gioc-adm-chevron">›</span>
    </button>
  )
}
