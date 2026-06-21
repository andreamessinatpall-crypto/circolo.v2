import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { messaggioErrore } from '@/lib/errori'
import { useCampi, useImpostazioni, usePrenotazioniGiorno } from './datiPrenotazioni'
import { SLOT_MINUTI, dataDa, oraLocale, orariCampo, ymd } from './orari'
import type { Campo, PrenotazioneGiorno, Sport } from './tipi'

export default function GrigliaPrenotazioni({ sport }: { sport: Sport }) {
  const { profilo } = useAuth()
  const qc = useQueryClient()
  const impQuery = useImpostazioni()
  const campiQuery = useCampi()
  const [giorno, setGiorno] = useState(() => ymd(new Date()))
  const prenQuery = usePrenotazioniGiorno(giorno)

  const imp = impQuery.data ?? { giorniAnticipo: 6, maxPadel: 0, maxCalcio: 0 }

  const campiSport = useMemo(
    () =>
      (campiQuery.data ?? [])
        .filter((c) => c.sport === sport)
        .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0)),
    [campiQuery.data, sport],
  )

  const prenota = useMutation({
    mutationFn: async ({ campo, inizio, fine }: { campo: Campo; inizio: Date; fine: Date }) => {
      if (!profilo) throw new Error('Profilo non disponibile')
      // Limite di prenotazioni attive per socio (0 = nessun limite; staff esente).
      const limite = sport === 'padel' ? imp.maxPadel : imp.maxCalcio
      const senzaLimite = profilo.is_admin || profilo.is_allenatore
      if (limite > 0 && !senzaLimite) {
        const idCampiSport = campiSport.map((c) => c.id)
        const { count } = await supabase
          .from('prenotazioni')
          .select('id', { count: 'exact', head: true })
          .eq('socio_id', profilo.id)
          .in('campo_id', idCampiSport)
          .gte('fine', new Date().toISOString())
        if (count != null && count >= limite) throw new Error(`LIMITE:${count}:${limite}`)
      }
      const { error } = await supabase.from('prenotazioni').insert({
        campo_id: campo.id,
        socio_id: profilo.id,
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prenotazioni'] }),
    onError: (e: unknown) => {
      const err = e as { code?: string; message?: string }
      if (err.message?.startsWith('LIMITE:')) {
        const [, c, l] = err.message.split(':')
        window.alert(
          `Hai già ${c} prenotazioni ${sport} attive: il limite è ${l}. Annullane una per prenotare di nuovo.`,
        )
      } else if (err.code === '23505') {
        window.alert('Qualcuno ha appena prenotato questo slot.')
      } else if (err.code === '42501') {
        window.alert(
          `Prenotazione non consentita: si può prenotare solo entro ${imp.giorniAnticipo} giorni e per orari futuri.`,
        )
      } else {
        window.alert('Prenotazione non riuscita: ' + (err.message ?? ''))
      }
      qc.invalidateQueries({ queryKey: ['prenotazioni'] })
    },
  })

  const annulla = useMutation({
    mutationFn: async (id: number | string) => {
      const { error } = await supabase.from('prenotazioni').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prenotazioni'] }),
    onError: (e: unknown) =>
      window.alert('Annullamento non riuscito: ' + messaggioErrore(e)),
  })

  function chiediAnnulla(p: PrenotazioneGiorno, campo: Campo, inizio: Date, diChi?: string) {
    const quando =
      inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) +
      ' alle ' +
      oraLocale(inizio)
    const domanda = diChi
      ? `Annullare la prenotazione di ${diChi} su ${campo.nome} (${quando})?`
      : `Annullare la tua prenotazione su ${campo.nome} (${quando})?`
    if (window.confirm(domanda)) annulla.mutate(p.id)
  }

  if (!profilo) return null
  if (campiQuery.isLoading) return <p className="sub">Caricamento…</p>
  if (campiQuery.error) {
    return (
      <div className="card text-ink-2">
        Impossibile caricare i campi: {messaggioErrore(campiQuery.error)} — Hai eseguito lo
        script <code className="rounded bg-verde-50 px-1">tappa2.sql</code> su Supabase?
      </div>
    )
  }

  const adesso = new Date()
  const giorni = Array.from({ length: imp.giorniAnticipo + 1 }, (_, i) => {
    const g = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + i)
    return {
      chiave: ymd(g),
      label:
        i === 0
          ? 'Oggi'
          : g.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
    }
  })

  return (
    <div>
      <div className="giorni">
        {giorni.map((g) => (
          <button
            key={g.chiave}
            type="button"
            className={'giorno-btn' + (g.chiave === giorno ? ' attivo' : '')}
            onClick={() => setGiorno(g.chiave)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {prenQuery.error && (
        <div className="card text-ink-2">
          Impossibile caricare le prenotazioni: {messaggioErrore(prenQuery.error)}
        </div>
      )}

      {campiSport.length === 0 && (
        <p className="sub">Nessun campo {sport} configurato.</p>
      )}

      {campiSport.map((campo) => (
        <CampoGriglia
          key={campo.id}
          campo={campo}
          giorno={giorno}
          adesso={adesso}
          prenotazioni={(prenQuery.data ?? []).filter(
            (p) => String(p.campo_id) === String(campo.id),
          )}
          isAdmin={!!profilo.is_admin}
          mioId={profilo.id}
          onPrenota={(inizio, fine) => prenota.mutate({ campo, inizio, fine })}
          onAnnulla={chiediAnnulla}
        />
      ))}
    </div>
  )
}

function CampoGriglia({
  campo,
  giorno,
  adesso,
  prenotazioni,
  isAdmin,
  mioId,
  onPrenota,
  onAnnulla,
}: {
  campo: Campo
  giorno: string
  adesso: Date
  prenotazioni: PrenotazioneGiorno[]
  isAdmin: boolean
  mioId: string
  onPrenota: (inizio: Date, fine: Date) => void
  onAnnulla: (p: PrenotazioneGiorno, campo: Campo, inizio: Date, diChi?: string) => void
}) {
  const perSlot = new Map<number, PrenotazioneGiorno>()
  for (const p of prenotazioni) perSlot.set(new Date(p.inizio).getTime(), p)

  const fuoriServizio = campo.in_servizio === false

  return (
    <div className="campo-blocco">
      <div className="campo-titolo">
        {campo.nome}
        {fuoriServizio && <span className="pill off">Fuori servizio</span>}
      </div>

      {fuoriServizio ? (
        <p className="sub">
          {campo.nota_servizio
            ? 'Campo momentaneamente non prenotabile: ' + campo.nota_servizio
            : 'Campo momentaneamente non prenotabile.'}
        </p>
      ) : (
        <div className="slot-griglia">
          {orariCampo(campo).map((ora) => {
            const inizio = dataDa(giorno, ora)
            const fine = new Date(inizio.getTime() + SLOT_MINUTI * 60000)
            const p = perSlot.get(inizio.getTime())
            const passato = inizio <= adesso
            const mio = p ? p.socio_id === mioId : false

            let classe = 'slot'
            let chi: string
            let disabilitato = false
            let onClick: (() => void) | undefined

            if (passato) {
              if (p) {
                classe += ' occupato'
                chi = isAdmin ? p.etichetta ?? 'Prenotato' : mio ? 'Tua' : 'Prenotato'
              } else {
                classe += ' passato'
                chi = '—'
              }
              disabilitato = true
            } else if (!p) {
              classe += ' libero'
              chi = 'Libero'
              onClick = () => onPrenota(inizio, fine)
            } else if (mio) {
              classe += ' mio'
              chi = 'Tua · tocca per annullare'
              onClick = () => onAnnulla(p, campo, inizio)
            } else {
              classe += ' occupato'
              if (isAdmin) {
                classe += ' annullabile'
                chi = p.etichetta ?? 'Prenotato'
                onClick = () => onAnnulla(p, campo, inizio, p.etichetta ?? undefined)
              } else {
                chi = 'Prenotato'
                disabilitato = true
              }
            }

            return (
              <button
                key={ora}
                type="button"
                className={classe}
                disabled={disabilitato}
                onClick={onClick}
              >
                <span>
                  {ora}–{oraLocale(fine)}
                </span>
                <span className="chi">{chi}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
