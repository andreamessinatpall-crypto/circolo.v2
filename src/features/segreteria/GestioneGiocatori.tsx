import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { titleCase, iniziali } from '@/lib/formato'
import { classiErrore, classiInput, classiOk } from '@/components/stili'
import { messaggioErrore } from '@/lib/errori'
import { costruisciCsv, scaricaCsv } from '@/lib/csv'
import { useModalitaPremi } from '@/features/premi/datiPremi'
import { LIVELLI_PUNTI_DEFAULT, livelloDaPunti } from '@/features/profilo/livelliPunti'
import Avatar from '@/components/Avatar'
import { useSoci, useAttivitaSoci, fetchStoricoSocio, type SocioAdmin, type AttivitaSocio } from './datiSoci'
import DettaglioGiocatore from './DettaglioGiocatore'
import { SportIcona, IconaPadel, IconaCalcio } from '@/components/IconeSport'

type Ordine = 'ultima_desc' | 'ultima_asc' | 'cognome'

const COLONNE_NASCOSTE_STORICO = ['socio_id', 'chiave', 'quando']

// Storico movimenti di TUTTI i giocatori in un solo CSV (una riga di
// intestazione "Giocatore" in più rispetto all'export per singolo socio di
// DettaglioGiocatore.tsx): stessa RPC storico_movimenti, chiamata a blocchi
// per non sparare centinaia di richieste in parallelo su un circolo grande.
const BLOCCO_EXPORT = 6

async function scaricaStoricoTutti(soci: SocioAdmin[]): Promise<{ vuoto: boolean }> {
  const righe: Record<string, unknown>[] = []
  for (let i = 0; i < soci.length; i += BLOCCO_EXPORT) {
    const blocco = soci.slice(i, i + BLOCCO_EXPORT)
    const esiti = await Promise.all(blocco.map((s) => fetchStoricoSocio(s.id)))
    esiti.forEach((esito, idx) => {
      if (!esito.ok) return
      const nomeGiocatore = titleCase(`${blocco[idx].cognome} ${blocco[idx].nome}`)
      for (const riga of esito.righe) righe.push({ Giocatore: nomeGiocatore, ...riga })
    })
  }
  if (righe.length === 0) return { vuoto: true }
  scaricaCsv('storico_giocatori.csv', costruisciCsv(righe, COLONNE_NASCOSTE_STORICO))
  return { vuoto: false }
}

function isCancellato(s: SocioAdmin): boolean {
  return (s.email ?? '').endsWith('@cancellato.invalid')
}

function isStaff(s: SocioAdmin): boolean {
  return !!(s.is_admin || s.is_allenatore || s.e_allenatore)
}

function StatItem({ num, label, colore }: { num: string | number; label: React.ReactNode; colore?: string }) {
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

function coloreAttivita(ultima: string | null): string {
  if (!ultima) return '#94a3b8'
  const giorni = Math.floor((Date.now() - new Date(ultima).getTime()) / 86_400_000)
  if (giorni <= 7)  return '#16a34a'
  if (giorni <= 14) return '#d97706'
  if (giorni <= 30) return '#ea580c'
  return '#94a3b8'
}

function tooltipAttivita(ultima: string | null): string {
  if (!ultima) return 'Mai attivo'
  const giorni = Math.floor((Date.now() - new Date(ultima).getTime()) / 86_400_000)
  if (giorni <= 7)  return 'Attivo negli ultimi 7 giorni'
  if (giorni <= 14) return 'Attivo negli ultimi 14 giorni'
  if (giorni <= 30) return 'Attivo nell\'ultimo mese'
  return 'Inattivo da più di un mese'
}

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

export default function GestioneGiocatori() {
  const { profilo } = useAuth()
  const { data: soci, isLoading, error } = useSoci()
  const { data: attivita } = useAttivitaSoci()
  const { data: modalitaPremi } = useModalitaPremi()
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState<Ordine>('ultima_desc')
  const [selezionatoId, setSelezionatoId] = useState<string | null>(null)
  const [espandiSospesi, setEspandiSospesi] = useState(false)
  const [espandiCancellati, setEspandiCancellati] = useState(false)
  const [msgStoricoTutti, setMsgStoricoTutti] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const storicoTutti = useMutation({
    mutationFn: () => scaricaStoricoTutti(soci ?? []),
    onSuccess: (r) =>
      setMsgStoricoTutti(
        r.vuoto
          ? { tipo: 'errore', testo: 'Nessun movimento da scaricare.' }
          : { tipo: 'ok', testo: 'CSV scaricato.' },
      ),
    onError: (e: unknown) =>
      setMsgStoricoTutti({ tipo: 'errore', testo: 'Esportazione non riuscita: ' + messaggioErrore(e) }),
  })

  if (isLoading) return <p className="text-ink-2">Caricamento giocatori…</p>
  if (error) return <p className="msg-errore">Impossibile caricare i giocatori: {error.message}</p>

  const tutti = soci ?? []

  // Stats (su tutti, non filtrati dalla ricerca)
  const nGiocatori   = tutti.filter((s) => s.attivo && !s.sospeso && !isCancellato(s) && !isStaff(s)).length
  const nInAttesa    = tutti.filter((s) => !s.attivo && !isCancellato(s)).length

  const nDaEliminare = tutti.filter((s) => !!s.richiesta_cancellazione).length
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
  const tempoUltima = (s: SocioAdmin) => {
    const iso = attivita?.get(s.id)?.ultima
    return iso ? new Date(iso).getTime() : -Infinity
  }
  const cmp =
    ordine === 'cognome'
      ? perCognome
      : ordine === 'ultima_asc'
        ? (a: SocioAdmin, b: SocioAdmin) => tempoUltima(a) - tempoUltima(b) || perCognome(a, b)
        : (a: SocioAdmin, b: SocioAdmin) => tempoUltima(b) - tempoUltima(a) || perCognome(a, b)

  // Cinque gruppi separati
  const gruppoInAttesa   = tutti.filter((s) => !s.attivo && !isCancellato(s) && match(s)).sort(perCognome)
  const gruppoSospesi    = tutti.filter((s) => !!s.sospeso && !isCancellato(s) && match(s)).sort(perCognome)
  const gruppoStaff      = tutti.filter((s) => s.attivo && !s.sospeso && !isCancellato(s) && isStaff(s) && match(s)).sort(perCognome)
  const gruppoAttivi     = tutti.filter((s) => s.attivo && !s.sospeso && !isCancellato(s) && !isStaff(s) && match(s)).sort(cmp)
  const gruppoCancellati = tutti.filter((s) => isCancellato(s) && match(s)).sort(perCognome)

  const selezionato = tutti.find((s) => s.id === selezionatoId) ?? null

  return (
    <div>
      <div className="eyebrow">Giocatori e punti</div>

      <div className="gioc-stats-strip">
        <StatItem num={tutti.length} label="Iscritti" />
        <StatItem num={nGiocatori} label="Giocatori" />
        {nInAttesa > 0 && <StatItem num={nInAttesa} label="In attesa" colore="#92400e" />}
{nDaEliminare > 0 && <StatItem num={nDaEliminare} label="Richieste" colore="#b91c1c" />}
        <StatItem num={nPadel}  label={<><IconaPadel size={12} /> Padel</>} />
        <StatItem num={nCalcio} label={<><IconaCalcio size={12} /> Calcio</>} />
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
            <option value="ultima_desc">Ultima partita ↓</option>
            <option value="ultima_asc">Ultima partita ↑</option>
            <option value="cognome">A → Z</option>
          </select>
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0 shrink-0"
            disabled={storicoTutti.isPending}
            onClick={() => { setMsgStoricoTutti(null); storicoTutti.mutate() }}
          >
            {storicoTutti.isPending ? 'Preparazione…' : 'Scarica storico di tutti'}
          </button>
        </div>
        {msgStoricoTutti && (
          <p className={`mt-2 text-sm ${msgStoricoTutti.tipo === 'ok' ? classiOk : classiErrore}`}>
            {msgStoricoTutti.testo}
          </p>
        )}
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
                attivita={attivita?.get(s.id) ?? null}
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

        {gruppoAttivi.length === 0 && gruppoInAttesa.length === 0 && gruppoSospesi.length === 0 && gruppoCancellati.length === 0 && !q && (
          <p className="text-ink-2">Nessun giocatore.</p>
        )}
        {gruppoAttivi.length === 0 && q && gruppoInAttesa.length === 0 && gruppoSospesi.length === 0 && gruppoCancellati.length === 0 && (
          <p className="text-ink-2">Nessun giocatore corrisponde alla ricerca.</p>
        )}

        {gruppoAttivi.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {gruppoAttivi.map((s) => (
              <RigaSocio
                key={s.id}
                socio={s}
                modalitaPremi={!!modalitaPremi}
                attivita={attivita?.get(s.id) ?? null}
                onApri={() => setSelezionatoId(s.id)}
                soloLivelloSport
              />
            ))}
          </div>
        )}

        {/* ── Sezione giocatori sospesi (collassabile) ── */}
        {gruppoSospesi.length > 0 && (
          <div style={{ marginTop: gruppoAttivi.length > 0 ? '1.25rem' : 0 }}>
            <button
              type="button"
              onClick={() => setEspandiSospesi(!espandiSospesi)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0',
                borderTop: '1px solid var(--border)',
                background: 'none', border: 'none',
                borderTopColor: 'var(--border)',
                borderTopWidth: 1,
                borderTopStyle: 'solid',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--ink-3)',
                fontSize: '0.8rem', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              Giocatori sospesi ({gruppoSospesi.length})
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                {espandiSospesi ? '▲ Nascondi' : '▼ Mostra'}
              </span>
            </button>

            {espandiSospesi && (
              <div className="flex flex-col gap-1.5 mt-2">
                {gruppoSospesi.map((s) => (
                  <RigaSocio
                    key={s.id}
                    socio={s}
                    modalitaPremi={!!modalitaPremi}
                    attivita={attivita?.get(s.id) ?? null}
                    onApri={() => setSelezionatoId(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sezione account cancellati (collassabile) ── */}
        {gruppoCancellati.length > 0 && (
          <div style={{ marginTop: gruppoAttivi.length > 0 || gruppoSospesi.length > 0 ? '1.25rem' : 0 }}>
            <button
              type="button"
              onClick={() => setEspandiCancellati(!espandiCancellati)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0',
                borderTop: '1px solid var(--border)',
                background: 'none', border: 'none',
                borderTopColor: 'var(--border)',
                borderTopWidth: 1,
                borderTopStyle: 'solid',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--ink-3)',
                fontSize: '0.8rem', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              Account cancellati ({gruppoCancellati.length})
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                {espandiCancellati ? '▲ Nascondi' : '▼ Mostra'}
              </span>
            </button>

            {espandiCancellati && (
              <div className="flex flex-col gap-1.5 mt-2">
                {gruppoCancellati.map((s) => (
                  <RigaSocio
                    key={s.id}
                    socio={s}
                    modalitaPremi={!!modalitaPremi}
                    attivita={attivita?.get(s.id) ?? null}
                    onApri={() => setSelezionatoId(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Staff e collaboratori (in fondo) ──────────── */}
      {gruppoStaff.length > 0 && (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <SezHeader>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Staff e collaboratori
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              ({gruppoStaff.length})
            </span>
          </SezHeader>
          <div className="flex flex-col gap-1.5">
            {gruppoStaff.map((s) => (
              <RigaSocio
                key={s.id}
                socio={s}
                modalitaPremi={!!modalitaPremi}
                attivita={attivita?.get(s.id) ?? null}
                onApri={() => setSelezionatoId(s.id)}
              />
            ))}
          </div>
        </div>
      )}

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
  attivita,
  onApri,
  soloLivelloSport,
}: {
  socio: SocioAdmin
  modalitaPremi: boolean
  attivita: AttivitaSocio | null
  onApri: () => void
  // Nella lista "Giocatori attivi": niente punti/crediti, solo livello e sport.
  soloLivelloSport?: boolean
}) {
  const cancellato = isCancellato(socio)
  const lv = livelloDaPunti(socio.punti ?? 0, LIVELLI_PUNTI_DEFAULT)
  const cfg = LIVELLI_PUNTI_DEFAULT[lv - 1]
  const hasSport = !cancellato && !!socio.sport_preferito
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
      <Avatar
        foto={cancellato ? null : socio.foto_url}
        iniziali={iniziali(socio.nome, socio.cognome)}
        titolo={titleCase(socio.cognome) + ' ' + titleCase(socio.nome)}
        size={40}
      />

      <div className="gioc-adm-body">
        <div className="gioc-adm-nome">
          {titleCase(socio.cognome)} {titleCase(socio.nome)}
          {!cancellato && !socio.attivo && !socio.sospeso && (
            <span className="gioc-att-badge">In attesa</span>
          )}
          {!cancellato && socio.sospeso && (
            <span className="gioc-att-badge" style={{ background: 'rgba(234,88,12,0.1)', color: '#c2410c', borderColor: 'rgba(234,88,12,0.3)' }}>Sospeso</span>
          )}
          {cancellato && (
            <span className="pill bg-ink-1/10 text-ink-3">Cancellato</span>
          )}
        </div>

        {!cancellato && (
          <div className="gioc-adm-row2">
            <span style={{ color: ruoloColore ?? cfg.colore }}>{ruoloNome ?? cfg.nome}</span>
            {!soloLivelloSport && !socio.punti_bloccati && (
              <>
                <span className="gioc-adm-sep">·</span>
                <span>{socio.punti ?? 0} pt</span>
              </>
            )}
            {!soloLivelloSport && modalitaPremi && !socio.crediti_bloccati && (
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

        {!cancellato && (
          <div className="gioc-adm-row3">
            <span
              className="gioc-att-dot"
              style={{ background: coloreAttivita(attivita?.ultima ?? null) }}
              title={tooltipAttivita(attivita?.ultima ?? null)}
            />
            <span>Ultima: {fmtData(attivita?.ultima ?? null)}</span>
            {attivita?.prossima && (
              <>
                <span className="gioc-adm-sep">·</span>
                <span>Prossima: {fmtData(attivita.prossima)}</span>
              </>
            )}
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
