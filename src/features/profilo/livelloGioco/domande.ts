// Questionario "Livello di gioco" (Fase 3bis): logica pura, senza I/O.
// Solo padel (il calcio è escluso). 4 macro-aree — tecnica, tattica/
// posizionamento, atletica, attitudine mentale — una domanda ciascuna, scala
// Likert 1-5 dove ogni valore corrisponde a una situazione reale. Il livello
// finale è la MEDIA delle risposte (1-5), tradotta in categoria tramite
// soglie fisse.
//
// Non ha nulla a che fare con livelliPunti.ts (progressione punti/fedeltà
// del club): qui misuriamo solo la bravura dichiarata nello sport.

export type Livello = 'principiante' | 'intermedio' | 'avanzato'
export type Area = 'tecnica' | 'tattica' | 'atletica' | 'mentale'

export interface OpzioneDomanda {
  punti: number // 1-5, scala Likert
  testo: string
}

export interface Domanda {
  id: string
  area: Area
  testo: string
  opzioni: OpzioneDomanda[]
}

export const ETICHETTE_LIVELLO: Record<Livello, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
}

export const ETICHETTE_AREA: Record<Area, string> = {
  tecnica: 'Tecnica',
  tattica: 'Tattica e posizionamento',
  atletica: 'Atletica',
  mentale: 'Attitudine mentale',
}

export const DOMANDE_PADEL: Domanda[] = [
  {
    id: 'tecnica',
    area: 'tecnica',
    testo: 'Come descriveresti il tuo controllo dei colpi (dritto, rovescio, volée)?',
    opzioni: [
      { punti: 1, testo: "Faccio fatica a mandare la palla dall'altra parte con continuità" },
      { punti: 2, testo: 'Gestisco scambi semplici ma sbaglio spesso sotto pressione' },
      { punti: 3, testo: 'Scambi regolari, comincio a usare qualche colpo specifico (bandeja, vibora)' },
      { punti: 4, testo: 'Buon controllo su quasi tutti i colpi, inclusi quelli di attacco' },
      { punti: 5, testo: 'Controllo totale: vario ritmo, effetto e direzione a comando' },
    ],
  },
  {
    id: 'tattica',
    area: 'tattica',
    testo: 'Come valuti il tuo posizionamento e la lettura del gioco in coppia?',
    opzioni: [
      { punti: 1, testo: 'Non so ancora dove posizionarmi, seguo la palla' },
      { punti: 2, testo: 'Capisco la posizione base ma sbaglio spesso i movimenti con il compagno' },
      { punti: 3, testo: 'Buona intesa in coppia, gioco per lo più corretto a rete e a fondo campo' },
      { punti: 4, testo: 'Leggo bene il gioco, anticipo le giocate avversarie' },
      { punti: 5, testo: 'Gestisco la strategia del punto, scelgo quando accelerare o temporeggiare' },
    ],
  },
  {
    id: 'atletica',
    area: 'atletica',
    testo: 'Come valuti la tua condizione atletica in campo (spostamenti, resistenza)?',
    opzioni: [
      { punti: 1, testo: 'Mi stanco rapidamente, faccio fatica a raggiungere le palle laterali' },
      { punti: 2, testo: 'Reggo scambi brevi ma la qualità dei movimenti cala col tempo' },
      { punti: 3, testo: 'Buona resistenza per un match intero a ritmo medio' },
      { punti: 4, testo: 'Ottimi spostamenti, reggo bene anche ritmi alti prolungati' },
      { punti: 5, testo: 'Condizione atletica competitiva, ritmo alto costante per tutta la partita' },
    ],
  },
  {
    id: 'mentale',
    area: 'mentale',
    testo: 'Come gestisci la pressione nei momenti importanti della partita?',
    opzioni: [
      { punti: 1, testo: 'Mi innervosisco facilmente e perdo lucidità' },
      { punti: 2, testo: 'Sento la pressione ma riesco a giocare quasi normalmente' },
      { punti: 3, testo: 'Mantengo la calma nella maggior parte delle situazioni' },
      { punti: 4, testo: 'Gioco bene sotto pressione, mi concentro sui punti chiave' },
      { punti: 5, testo: 'La pressione mi motiva, rendo al meglio nei momenti decisivi' },
    ],
  },
]

// risposte[i] = indice dell'opzione scelta per DOMANDE_PADEL[i] (0-4).
export function calcolaMedia(risposte: number[]): number {
  if (DOMANDE_PADEL.length === 0) return 0
  const somma = DOMANDE_PADEL.reduce((tot, d, i) => tot + (d.opzioni[risposte[i]]?.punti ?? 0), 0)
  return somma / DOMANDE_PADEL.length
}

// Soglie fisse sulla media 1-5: <2.5 principiante, <4 intermedio, >=4 avanzato.
export function livelloDaMedia(media: number): Livello {
  if (media < 2.5) return 'principiante'
  if (media < 4) return 'intermedio'
  return 'avanzato'
}
