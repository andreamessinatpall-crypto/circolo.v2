import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/useAuth'
import { classiErrore } from '@/components/stili'

type Fase = 'idle' | 'conferma'

export default function CancellaAccount() {
  const { profilo, esci } = useAuth()
  const [fase, setFase] = useState<Fase>('idle')
  const [errore, setErrore] = useState('')

  const richiedi = useMutation({
    mutationFn: async () => {
      if (!profilo) throw new Error('Profilo non disponibile')
      const { error } = await supabase
        .from('soci')
        .update({
          richiesta_cancellazione: new Date().toISOString(),
          mostra_in_classifica: false,
        })
        .eq('id', profilo.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await esci()
    },
    onError: (e: Error) => setErrore('Operazione non riuscita: ' + e.message),
  })

  return (
    <>
      {/* Separatore zona pericolo */}
      <div className="zona-pericolo-header">
        <span className="zona-pericolo-linea" aria-hidden="true" />
        <span className="zona-pericolo-etichetta">Zona pericolo</span>
        <span className="zona-pericolo-linea" aria-hidden="true" />
      </div>

      <div className="card zona-pericolo-card">
        <h3 className="zona-pericolo-titolo">Cancella account</h3>
        <p className="zona-pericolo-testo">
          Invia una richiesta di cancellazione alla segreteria. I tuoi dati personali
          verranno anonimizzati dalla segreteria entro 30 giorni (art. 17 GDPR). I
          record storici anonimi (prenotazioni, movimenti punti) restano per obblighi
          contabili.
        </p>

        {fase === 'idle' && (
          <button
            type="button"
            className="btn btn-pericolo"
            onClick={() => { setFase('conferma'); setErrore('') }}
          >
            Richiedi cancellazione account
          </button>
        )}

        {fase === 'conferma' && (
          <div className="zona-pericolo-conferma">
            <p className="zona-pericolo-avviso">
              Dopo la conferma verrai disconnesso. La cancellazione è irreversibile:
              non potrai più accedere con questo account.
            </p>
            {errore && <p className={`mb-3 ${classiErrore}`}>{errore}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondario"
                onClick={() => setFase('idle')}
                disabled={richiedi.isPending}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn btn-pericolo"
                onClick={() => richiedi.mutate()}
                disabled={richiedi.isPending}
              >
                {richiedi.isPending ? 'Invio in corso…' : 'Confermo, cancella il mio account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
