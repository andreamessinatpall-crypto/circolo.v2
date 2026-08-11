import { createContext } from 'react'
import type { Circolo, RuoloCircolo } from '@/features/piattaforma/tipi'

export interface CircoloContextValue {
  circolo: Circolo
  ruolo: RuoloCircolo
  puoDareLezioni: boolean
}

export const CircoloContext = createContext<CircoloContextValue | null>(null)
