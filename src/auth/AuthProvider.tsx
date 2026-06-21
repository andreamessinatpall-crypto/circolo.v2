import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { titleCase } from '@/lib/formato'
import { AuthContext, type MessaggioBlocco, type StatoAuth } from './contesto'
import type { Socio, SportPreferito } from './tipi'

const SPORT_VALIDI: SportPreferito[] = ['padel', 'calcio', 'entrambi']

// Al primo accesso dopo la conferma email, il socio auto-registrato non ha
// ancora una riga nella tabella "soci": la creiamo ora, in attesa di
// approvazione dalla segreteria (attivo: false). Stessa logica della v1.
async function creaSchedaSocio(
  user: User,
): Promise<{ socio: Socio } | { errore: MessaggioBlocco }> {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>
  const sport = SPORT_VALIDI.includes(m.sport_preferito as SportPreferito)
    ? (m.sport_preferito as SportPreferito)
    : 'entrambi'

  const { data, error } = await supabase
    .from('soci')
    .insert({
      id: user.id,
      nome: String(m.nome ?? '').trim(),
      cognome: String(m.cognome ?? '').trim(),
      email: user.email,
      telefono: (m.telefono as string) ?? null,
      data_nascita: (m.data_nascita as string) ?? null,
      genere: (m.genere as string) ?? null,
      sport_preferito: sport,
      attivo: false,
      is_admin: false,
    })
    .select()
    .single()

  if (error) {
    return {
      errore: {
        titolo: 'Registrazione non completata',
        testo:
          'Non è stato possibile completare la registrazione: ' +
          error.message +
          '. Contatta la segreteria.',
      },
    }
  }
  return { socio: data as Socio }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<StatoAuth>('caricamento')
  const [utente, setUtente] = useState<User | null>(null)
  const [profilo, setProfilo] = useState<Socio | null>(null)
  const [blocco, setBlocco] = useState<MessaggioBlocco | null>(null)

  // Legge la sessione corrente e decide in quale dei quattro stati siamo.
  const caricaProfilo = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user ?? null
    setUtente(user)

    if (!user) {
      setProfilo(null)
      setBlocco(null)
      setStato('anonimo')
      return
    }

    let { data: socio } = await supabase
      .from('soci')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // socio auto-registrato al primo accesso: creiamo ora la sua scheda
    if (!socio && user.user_metadata?.auto_registrazione) {
      const esito = await creaSchedaSocio(user)
      if ('errore' in esito) {
        setProfilo(null)
        setBlocco(esito.errore)
        setStato('bloccato')
        return
      }
      socio = esito.socio
    }

    if (!socio) {
      setProfilo(null)
      setBlocco({
        titolo: 'Account non abilitato',
        testo:
          'Il tuo accesso esiste ma non risulta associato a un giocatore del circolo. Contatta la segreteria.',
      })
      setStato('bloccato')
      return
    }

    if (!socio.attivo) {
      setProfilo(null)
      setBlocco({
        titolo: 'Registrazione in attesa',
        testo:
          'La tua registrazione è stata ricevuta ed è in attesa di approvazione dalla segreteria. Appena ti approvano potrai accedere e prenotare.',
      })
      setStato('bloccato')
      return
    }

    // Nome e cognome sempre con l'iniziale maiuscola (come nella v1).
    const socioPulito = {
      ...(socio as Socio),
      nome: titleCase((socio as Socio).nome),
      cognome: titleCase((socio as Socio).cognome),
    }
    setProfilo(socioPulito)
    setBlocco(null)
    setStato('attivo')
  }, [])

  useEffect(() => {
    // Mi iscrivo ai cambiamenti di autenticazione. Supabase emette subito
    // l'evento "INITIAL_SESSION" appena ci si iscrive, quindi questo copre
    // anche il controllo iniziale all'avvio (login, logout, refresh del token).
    // Il setTimeout evita un blocco noto chiamando Supabase dentro il callback.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        caricaProfilo()
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [caricaProfilo])

  const esci = useCallback(async () => {
    await supabase.auth.signOut()
    // onAuthStateChange rileverà il logout e riporterà lo stato ad "anonimo"
  }, [])

  return (
    <AuthContext.Provider
      value={{ stato, utente, profilo, blocco, ricaricaProfilo: caricaProfilo, esci }}
    >
      {children}
    </AuthContext.Provider>
  )
}
