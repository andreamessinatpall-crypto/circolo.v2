import { useEffect } from 'react'

// Blocca lo scroll del contenuto sotto un modale/scheda a schermo intero,
// da richiamare in ogni componente overlay (fixed inset-0). Il parametro
// serve ai casi in cui l'overlay è renderizzato condizionalmente dentro
// un componente più grande che resta sempre montato.
export function useBloccaScrollBody(attivo = true) {
  useEffect(() => {
    if (!attivo) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [attivo])
}
