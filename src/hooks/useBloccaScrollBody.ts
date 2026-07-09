import { useEffect } from 'react'

// Blocca lo scroll del contenuto sotto un modale/scheda a schermo intero,
// da richiamare in ogni componente overlay (fixed inset-0). Il parametro
// serve ai casi in cui l'overlay è renderizzato condizionalmente dentro
// un componente più grande che resta sempre montato.
//
// Dentro il menu account (MenuUtente) lo scroll non è sul body ma su
// .account-schermo, che è position:fixed con overflow-y proprio — bloccare
// solo il body lì non basta, va bloccato anche lui se presente nel DOM.
export function useBloccaScrollBody(attivo = true) {
  useEffect(() => {
    if (!attivo) return
    document.body.style.overflow = 'hidden'
    const schermoAccount = document.querySelector<HTMLElement>('.account-schermo')
    if (schermoAccount) schermoAccount.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (schermoAccount) schermoAccount.style.overflow = ''
    }
  }, [attivo])
}
