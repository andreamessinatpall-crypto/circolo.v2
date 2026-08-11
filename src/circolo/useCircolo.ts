import { useContext } from 'react'
import { CircoloContext } from './CircoloContext'

// Il circolo corrente, risolto dallo slug nell'URL (/c/:slug/...). Va usato
// solo da componenti dentro <CircoloProvider> (cioè dentro AppShell).
export function useCircolo() {
  const ctx = useContext(CircoloContext)
  if (!ctx) throw new Error('useCircolo() dev\'essere usato dentro <CircoloProvider>.')
  return ctx.circolo
}
