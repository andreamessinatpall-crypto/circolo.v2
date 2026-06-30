import type { ReactNode } from 'react'

export type Ruolo = 'admin' | 'collaboratore' | 'istruttore'

const CFG: Record<Ruolo, { colore: string; sfondo: string; titolo: string }> = {
  admin:         { colore: '#c8972e', sfondo: '#fdf9ee', titolo: 'Admin' },
  collaboratore: { colore: '#c8a83a', sfondo: '#fffce6', titolo: 'Collaboratore' },
  istruttore:    { colore: '#be5436', sfondo: '#fff3ef', titolo: 'Istruttore' },
}

// Scudo + spunta → Admin
function IcoScudo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

// Medaglia → Collaboratore
function IcoMedaglia({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

// Libro aperto → Istruttore
function IcoLibro({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

// Persona generica per soci senza ruolo speciale
function IcoPersona({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function icona(ruolo: Ruolo, size: number): ReactNode {
  if (ruolo === 'admin') return <IcoScudo size={size} />
  if (ruolo === 'collaboratore') return <IcoMedaglia size={size} />
  return <IcoLibro size={size} />
}

// ── Gradient helpers (stessa logica di MedagliaLv) ──────────
function hexLighten(hex: string, t: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgb(${Math.round(r + (255 - r) * t)},${Math.round(g + (255 - g) * t)},${Math.round(b + (255 - b) * t)})`
}

function hexDarken(hex: string, t: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgb(${Math.round(r * (1 - t))},${Math.round(g * (1 - t))},${Math.round(b * (1 - t))})`
}

// Cerchio metallizzato con icona ruolo — stessa estetica di MedagliaLv.
export function MedagliaRuolo({ ruolo, size = 44 }: { ruolo: Ruolo; size?: number }) {
  const c = CFG[ruolo].colore
  const hi  = hexLighten(c, 0.36)
  const mid = hexLighten(c, 0.08)
  const sh1 = hexDarken(c, 0.20)
  const sh2 = hexDarken(c, 0.42)
  const ring = hexDarken(c, 0.10)
  const icoSize = Math.round(size * 0.50)
  return (
    <div
      title={CFG[ruolo].titolo}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(145deg, ${hi} 0%, ${mid} 44%, ${sh1} 56%, ${sh2} 100%)`,
        boxShadow: `0 0 0 1.5px ${ring}, inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 5px rgba(0,0,0,0.28)`,
        color: 'rgba(255,255,255,0.95)',
      }}
    >
      {icona(ruolo, icoSize)}
    </div>
  )
}

// Piccolo badge-icona rettangolare per uso legacy (mantenuto per retrocompatibilità).
export function RuoloBadgeTag({ ruolo }: { ruolo: Ruolo }) {
  const c = CFG[ruolo]
  return (
    <span
      className="flex items-center rounded-lg border p-1.5"
      style={{ borderColor: c.colore + 'aa', color: c.colore }}
      title={c.titolo}
    >
      {icona(ruolo, 16)}
    </span>
  )
}

// Avatar circolare per la lista amici: mostra ruolo o persona generica.
export function RuoloAvatar({ ruolo, size = 32 }: { ruolo: Ruolo | null; size?: number }) {
  if (!ruolo) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border"
        style={{ width: size, height: size, borderColor: '#d1d5db', color: '#9ca3af', background: '#f9fafb' }}
      >
        <IcoPersona size={Math.round(size * 0.55)} />
      </span>
    )
  }
  const c = CFG[ruolo]
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-2"
      style={{ width: size, height: size, background: c.sfondo, borderColor: c.colore, color: c.colore }}
    >
      {icona(ruolo, Math.round(size * 0.55))}
    </span>
  )
}
