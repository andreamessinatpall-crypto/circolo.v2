import { distanzaKm } from '@/lib/distanza'
import type { Circolo } from '@/features/piattaforma/tipi'
import type { MioCircolo } from './datiCircoloSocio'

export interface CircoloCarosello {
  circolo: Circolo
  isMembro: boolean
  ultimoAccesso: string | null
  distanzaKm: number | null
}

// Unisce "i miei circoli" (iscritto) e "da scoprire" (non iscritto) in
// un'unica lista per il carosello, calcolando la distanza dalla posizione
// del socio quando sia lui che il circolo hanno coordinate note.
export function costruisciCarosello(
  mieiCircoli: MioCircolo[],
  daScoprire: Circolo[],
  posizione: { lat: number; lon: number } | null,
): CircoloCarosello[] {
  function distanza(c: Circolo): number | null {
    if (!posizione || c.latitudine == null || c.longitudine == null) return null
    return distanzaKm(posizione, { lat: c.latitudine, lon: c.longitudine })
  }
  return [
    ...mieiCircoli.map((m) => ({
      circolo: m.circolo,
      isMembro: true,
      ultimoAccesso: m.ultimo_accesso,
      distanzaKm: distanza(m.circolo),
    })),
    ...daScoprire.map((c) => ({
      circolo: c,
      isMembro: false,
      ultimoAccesso: null,
      distanzaKm: distanza(c),
    })),
  ]
}

// Ordina il carosello: prima l'ultimo circolo visitato dal socio (se ne ha
// uno), poi il resto per distanza crescente (i circoli senza coordinate note
// vanno in fondo, ordinati per nome).
export function ordinaCarosello(items: CircoloCarosello[]): CircoloCarosello[] {
  let indiceUltimo = -1
  let tempoUltimo = -Infinity
  items.forEach((it, i) => {
    if (!it.ultimoAccesso) return
    const t = new Date(it.ultimoAccesso).getTime()
    if (t > tempoUltimo) {
      tempoUltimo = t
      indiceUltimo = i
    }
  })

  const resto = items.filter((_, i) => i !== indiceUltimo)
  resto.sort((a, b) => {
    if (a.distanzaKm == null && b.distanzaKm == null) return a.circolo.nome.localeCompare(b.circolo.nome)
    if (a.distanzaKm == null) return 1
    if (b.distanzaKm == null) return -1
    return a.distanzaKm - b.distanzaKm
  })

  if (indiceUltimo === -1) return resto
  return [items[indiceUltimo], ...resto]
}
