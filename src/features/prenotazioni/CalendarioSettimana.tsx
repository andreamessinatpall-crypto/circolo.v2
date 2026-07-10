import { useState } from 'react'
import { IconaMeteo } from '@/components/IconeMeteo'
import type { PrevisioneGiorno } from '@/hooks/useMeteo'
import { ymd } from './orari'

// Fascia settimanale di giorni selezionabili (finestra scorrevole di 7 alla volta),
// estratta da GrigliaPrenotazioni.tsx per essere riusata anche nel flusso guidato
// del giocatore (PrenotaWizard.tsx).
export default function CalendarioSettimana({
  giorno,
  onGiorno,
  giorniAnticipo,
  meteo,
}: {
  giorno: string
  onGiorno: (g: string) => void
  giorniAnticipo: number
  meteo?: Map<string, PrevisioneGiorno>
}) {
  const [offset, setOffset] = useState(0)
  const adesso = new Date()
  const DOW_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const giorni = Array.from({ length: giorniAnticipo + 1 }, (_, i) => {
    const g = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + i)
    return {
      chiave: ymd(g),
      dow: DOW_IT[g.getDay()],
      num: g.getDate(),
      isOggi: i === 0,
    }
  })

  const WINDOW = 7
  const visibili = giorni.slice(offset, offset + WINDOW)
  const puoSx = offset > 0
  const puoDx = offset + WINDOW < giorni.length

  function navSx() { setOffset((o) => Math.max(0, o - WINDOW)) }
  function navDx() { setOffset((o) => Math.min(giorni.length - WINDOW, o + WINDOW)) }
  function tornaOggi() { setOffset(0); onGiorno(ymd(new Date())) }

  const primoVis = new Date(visibili[0].chiave + 'T12:00:00')
  const ultimoVis = new Date(visibili[visibili.length - 1].chiave + 'T12:00:00')
  const meseLabel =
    primoVis.getMonth() === ultimoVis.getMonth()
      ? primoVis.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      : `${primoVis.toLocaleDateString('it-IT', { month: 'short' })} – ${ultimoVis.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`

  return (
    <div className="cal-sett">
      <div className="cal-sett-head">
        <div className="cal-sett-mese">{meseLabel}</div>
        <div className="cal-sett-nav">
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0"
            onClick={navSx}
            disabled={!puoSx}
            aria-label="Settimana precedente"
          >‹</button>
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0"
            onClick={tornaOggi}
          >Oggi</button>
          <button
            type="button"
            className="btn btn-secondario btn-mini !mt-0"
            onClick={navDx}
            disabled={!puoDx}
            aria-label="Settimana successiva"
          >›</button>
        </div>
      </div>
      <div className="cal-sett-griglia">
        {visibili.map((g) => {
          const previsione = meteo?.get(g.chiave)
          return (
            <button
              key={g.chiave}
              type="button"
              className={'cal-giorno cal-giorno-compatto' + (g.isOggi ? ' oggi' : '') + (g.chiave === giorno ? ' sel' : '')}
              onClick={() => onGiorno(g.chiave)}
            >
              <span className="cal-giorno-dow">{g.dow}</span>
              <span className="cal-giorno-num">{g.num}</span>
              {previsione && (
                <span className="cal-giorno-meteo">
                  <IconaMeteo codice={previsione.weathercode} size={13} />
                  {Math.round(previsione.tempMax)}°
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
