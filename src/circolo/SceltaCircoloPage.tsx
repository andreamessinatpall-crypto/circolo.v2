import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import { classiErrore } from '@/components/stili'
import { formattaDistanza } from '@/lib/distanza'
import AuthHero from '@/pages/AuthHero'
import { iscrivitiCircolo, useCircoliDaScoprire, useMieCircoli } from './datiCircoloSocio'
import { costruisciCarosello, ordinaCarosello, type CircoloCarosello } from './carosello'
import { useGeolocalizzazione } from './useGeolocalizzazione'
import type { Circolo } from '@/features/piattaforma/tipi'

// Schermata di scelta circolo: mostrata dopo OGNI login (vedi RedirezioneCircolo
// in App.tsx), a carosello — una card per volta, swipeabile. Ordine: prima
// l'ultimo circolo visitato dal socio (se ne ha uno), poi i circoli più
// vicini alla sua posizione geografica (miei + da scoprire insieme, stile
// Playtomic — non solo quelli già iscritti).
export default function SceltaCircoloPage() {
  const { profilo, esci } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [errore, setErrore] = useState('')

  const { data: mieiCircoli, isLoading: caricoMiei } = useMieCircoli(profilo?.id)
  const idGiaMembro = (mieiCircoli ?? []).map((m) => m.circolo.id)
  const { data: daScoprire, isLoading: caricoScoprire } = useCircoliDaScoprire(idGiaMembro)
  const { stato: statoPosizione, posizione } = useGeolocalizzazione()

  const iscriviti = useMutation({
    mutationFn: async (circolo: Circolo) => {
      if (!profilo) throw new Error("Devi effettuare l'accesso.")
      const esito = await iscrivitiCircolo(circolo.id, profilo.id)
      if (!esito.ok) throw new Error(esito.messaggio)
      return circolo
    },
    onSuccess: (circolo) => {
      qc.invalidateQueries({ queryKey: ['miei-circoli'] })
      navigate(`/c/${circolo.slug}`)
    },
    onError: (e: Error) => setErrore(e.message),
  })

  const caricamento = caricoMiei || caricoScoprire
  const items = caricamento
    ? []
    : ordinaCarosello(costruisciCarosello(mieiCircoli ?? [], daScoprire ?? [], posizione))

  return (
    <div className="auth-page flex min-h-[100dvh] flex-col items-center px-4 py-5">
      <div className="flex w-full max-w-[480px] flex-1 flex-col justify-center">
        <AuthHero />

        <div className="card auth-card">
          <h1 className="mb-1 text-center text-2xl">Scegli il tuo circolo</h1>
          <p className="sub mb-1 text-center">
            {statoPosizione === 'in-corso'
              ? 'Ricerca della tua posizione…'
              : statoPosizione === 'concessa'
                ? 'Ordinati per vicinanza a te.'
                : 'Attiva la posizione dal browser per vederli ordinati per vicinanza.'}
          </p>

          {caricamento ? (
            <p className="mt-4 text-center text-ink-2">Caricamento…</p>
          ) : items.length === 0 ? (
            <p className="sub mt-4 mb-2 text-center">Nessun circolo disponibile al momento.</p>
          ) : (
            <div className="mt-3">
              <CircoliCarosello
                items={items}
                iscrivoInCorso={iscriviti.isPending}
                onEntra={(c) => navigate(`/c/${c.slug}`)}
                onIscriviti={(c) => {
                  setErrore('')
                  iscriviti.mutate(c)
                }}
              />
            </div>
          )}

          {errore && <p className={`mt-2 ${classiErrore}`}>{errore}</p>}

          <button type="button" className="btn btn-secondario btn-block mt-5" onClick={() => esci()}>
            Esci
          </button>
        </div>
      </div>
    </div>
  )
}

function CircoliCarosello({
  items,
  iscrivoInCorso,
  onEntra,
  onIscriviti,
}: {
  items: CircoloCarosello[]
  iscrivoInCorso: boolean
  onEntra: (c: Circolo) => void
  onIscriviti: (c: Circolo) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [indice, setIndice] = useState(0)
  // Indice "di intenzione": aggiornato subito al click, non solo a scroll
  // animazione conclusa — due click veloci sulla freccia (più veloci dei
  // ~300ms dello scroll smooth) leggerebbero altrimenti entrambi lo stesso
  // scrollLeft ancora in transizione e calcolerebbero lo stesso target
  // invece di avanzare di 2 (bug reale riscontrato testando il doppio
  // click rapido). Lo scroll successivo riparte da dove si trova, il
  // browser gestisce il retarget in corsa senza scatti.
  const indiceIntenzione = useRef(0)

  function aggiornaIndice() {
    const el = ref.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    indiceIntenzione.current = i
    setIndice(i)
  }

  function vaiA(delta: -1 | 1) {
    const el = ref.current
    if (!el || el.clientWidth === 0) return
    const target = Math.max(0, Math.min(items.length - 1, indiceIntenzione.current + delta))
    indiceIntenzione.current = target
    setIndice(target)
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="carosello-frecce">
      <div className="circolo-carosello" ref={ref} onScroll={aggiornaIndice}>
        {items.map((item) => (
          <CircoloCard
            key={item.circolo.id}
            item={item}
            disabled={iscrivoInCorso}
            onEntra={onEntra}
            onIscriviti={onIscriviti}
          />
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button
            type="button"
            className="carosello-freccia carosello-freccia-sx"
            onClick={() => vaiA(-1)}
            disabled={indice === 0}
            aria-label="Circolo precedente"
          >
            ‹
          </button>
          <button
            type="button"
            className="carosello-freccia carosello-freccia-dx"
            onClick={() => vaiA(1)}
            disabled={indice >= items.length - 1}
            aria-label="Circolo successivo"
          >
            ›
          </button>
          <div className="circolo-carosello-dots">
            {items.map((item, i) => (
              <span
                key={item.circolo.id}
                className={'circolo-carosello-dot' + (i === indice ? ' attivo' : '')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CircoloCard({
  item,
  disabled,
  onEntra,
  onIscriviti,
}: {
  item: CircoloCarosello
  disabled: boolean
  onEntra: (c: Circolo) => void
  onIscriviti: (c: Circolo) => void
}) {
  const { circolo, isMembro, ultimoAccesso, distanzaKm } = item
  return (
    <div className="circolo-card">
      <div className="circolo-card-banner" style={{ background: circolo.colore_primario ?? 'var(--v700)' }}>
        <div className="circolo-card-logo">
          {circolo.logo_url ? (
            <img src={circolo.logo_url} alt="" />
          ) : (
            circolo.nome.charAt(0).toUpperCase()
          )}
        </div>
        <h2 className="circolo-card-nome">{circolo.nome}</h2>
      </div>
      <div className="circolo-card-body">
        {ultimoAccesso && <span className="circolo-card-badge">Ultimo circolo</span>}
        {(circolo.indirizzo || distanzaKm != null) && (
          <p className="circolo-card-meta">
            📍 {circolo.indirizzo ?? 'Distanza stimata'}
            {distanzaKm != null ? ` · ${formattaDistanza(distanzaKm)}` : ''}
          </p>
        )}
        <button
          type="button"
          className="btn btn-block mt-1"
          disabled={disabled}
          onClick={() => (isMembro ? onEntra(circolo) : onIscriviti(circolo))}
        >
          {isMembro ? 'Entra' : 'Iscriviti ed entra'}
        </button>
      </div>
    </div>
  )
}
