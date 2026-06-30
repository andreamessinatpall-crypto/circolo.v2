// Testi delle policy legali. Sostituisci i segnaposto tra [parentesi] con i
// dati reali del circolo prima del go-live.

export function PrivacyContent() {
  return (
    <div className="spazio-legale">
      <p className="avviso-legale">
        Aggiorna i dati tra [parentesi] con le informazioni reali del circolo prima del go-live.
      </p>

      <h3>1. Titolare del trattamento</h3>
      <p>
        Il Titolare del trattamento dei dati personali è <strong>[Nome del Circolo]</strong>,
        con sede in [Via, CAP, Città], P.IVA [XXXXXXXX], email:{' '}
        <strong>[privacy@circolo.it]</strong>.
      </p>

      <h3>2. Dati trattati e finalità</h3>
      <p>
        Trattiamo i seguenti dati personali per le finalità indicate:
      </p>
      <ul>
        <li>
          <strong>Dati anagrafici</strong> (nome, cognome, data di nascita, genere): gestione
          del rapporto associativo e verifica dei requisiti di iscrizione.
        </li>
        <li>
          <strong>Dati di contatto</strong> (email, telefono): comunicazioni relative alle
          prenotazioni, ai tornei e alle attività del circolo.
        </li>
        <li>
          <strong>Dati di utilizzo</strong> (prenotazioni, presenze, punteggi): erogazione
          dei servizi di prenotazione campi, gestione tornei e sistema premi.
        </li>
        <li>
          <strong>Credenziali di accesso</strong>: autenticazione alla piattaforma.
        </li>
      </ul>

      <h3>3. Base giuridica</h3>
      <p>
        Il trattamento è basato su: (a) esecuzione del contratto associativo (art. 6 c. 1
        lett. b GDPR); (b) consenso dell'interessato (art. 6 c. 1 lett. a GDPR) per la
        pubblicazione in classifica.
      </p>

      <h3>4. Destinatari dei dati</h3>
      <p>
        I dati sono trattati dal personale del circolo autorizzato. Per l'erogazione dei
        servizi informatici, i dati sono trattati da <strong>Supabase Inc.</strong> (USA),
        fornitore dell'infrastruttura cloud, designato Responsabile del trattamento ai sensi
        dell'art. 28 GDPR, con trasferimento verso paesi terzi garantito da Clausole
        Contrattuali Standard approvate dalla Commissione Europea.
      </p>

      <h3>5. Conservazione dei dati</h3>
      <p>
        I dati sono conservati per tutta la durata del rapporto associativo e per i 10 anni
        successivi alla cessazione, salvo obblighi di legge più lunghi. Le credenziali di
        accesso sono cancellate entro 30 giorni dalla richiesta di cancellazione account.
      </p>

      <h3>6. Diritti dell'interessato</h3>
      <p>
        Hai il diritto di: accedere ai tuoi dati (art. 15), rettificarli (art. 16),
        cancellarli (art. 17), limitarne il trattamento (art. 18), riceverli in formato
        portabile (art. 20), opporti al trattamento (art. 21). Puoi esercitare questi diritti
        scrivendo a <strong>[privacy@circolo.it]</strong>.
      </p>

      <h3>7. Diritto di reclamo</h3>
      <p>
        Puoi proporre reclamo al <strong>Garante per la protezione dei dati personali</strong>{' '}
        (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
          www.garanteprivacy.it
        </a>).
      </p>

      <p className="data-aggiornamento">Ultimo aggiornamento: [data]</p>
    </div>
  )
}

export function CookieContent() {
  return (
    <div className="spazio-legale">
      <p className="avviso-legale">
        Aggiorna i dati tra [parentesi] con le informazioni reali del circolo prima del go-live.
      </p>

      <h3>Cookie tecnici (necessari)</h3>
      <p>
        Questa piattaforma utilizza esclusivamente cookie tecnici strettamente necessari al
        funzionamento del servizio. Non vengono utilizzati cookie di profilazione o di
        tracciamento a fini pubblicitari.
      </p>
      <table className="tabella-cookie">
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Finalità</th>
            <th>Durata</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-*-auth-token</code></td>
            <td>Sessione di autenticazione (Supabase)</td>
            <td>Sessione / 1 anno</td>
          </tr>
          <tr>
            <td><code>circolo-cookie-ok</code></td>
            <td>Memorizza il consenso al presente banner</td>
            <td>1 anno (localStorage)</td>
          </tr>
        </tbody>
      </table>

      <h3>Cookie di terze parti</h3>
      <p>
        Non sono presenti cookie di terze parti a fini analitici o pubblicitari. Se in futuro
        venissero introdotti, questa policy verrà aggiornata e il consenso verrà richiesto
        nuovamente.
      </p>

      <h3>Gestione del consenso</h3>
      <p>
        I cookie tecnici non richiedono consenso ai sensi dell'art. 122 del Codice Privacy
        e del Provvedimento del Garante dell'8 maggio 2014. Puoi disabilitarli dalle
        impostazioni del tuo browser, ma questo potrebbe impedire il corretto funzionamento
        della piattaforma.
      </p>

      <p className="data-aggiornamento">Ultimo aggiornamento: [data]</p>
    </div>
  )
}

export function TerminiContent() {
  return (
    <div className="spazio-legale">
      <p className="avviso-legale">
        Aggiorna i dati tra [parentesi] con le informazioni reali del circolo prima del go-live.
      </p>

      <h3>1. Il servizio</h3>
      <p>
        La piattaforma <strong>[Nome del Circolo]</strong> consente ai soci di prenotare
        campi da gioco, iscriversi a tornei, consultare classifiche e gestire il proprio
        profilo. L'accesso è riservato ai soci regolarmente iscritti e approvati dalla
        segreteria.
      </p>

      <h3>2. Requisiti di iscrizione</h3>
      <p>
        Per utilizzare la piattaforma è necessario: (a) avere almeno 14 anni; (b) fornire
        dati reali e accurati; (c) mantenere riservate le proprie credenziali di accesso.
        Sei responsabile di tutte le attività effettuate con il tuo account.
      </p>

      <h3>3. Prenotazioni</h3>
      <p>
        Le prenotazioni effettuate tramite la piattaforma sono vincolanti. La cancellazione
        deve avvenire entro i tempi stabiliti dal regolamento del circolo. Prenotazioni
        ripetutamente non rispettate possono comportare la sospensione dell'account.
      </p>

      <h3>4. Punteggi, livelli e premi</h3>
      <p>
        Il sistema di punti, livelli e premi è regolato discrezionalmente dal circolo, che
        si riserva di modificarne le regole in qualsiasi momento con comunicazione ai soci.
      </p>

      <h3>5. Comportamento corretto</h3>
      <p>
        È vietato: inserire dati falsi, violare la privacy di altri soci, tentare di accedere
        ad aree riservate, usare la piattaforma per finalità diverse da quelle associative.
      </p>

      <h3>6. Sospensione e cancellazione</h3>
      <p>
        Il circolo si riserva di sospendere o cancellare l'account di un socio in caso di
        violazione dei presenti Termini o del regolamento associativo, previo avviso scritto
        salvo casi di urgenza.
      </p>

      <h3>7. Limitazione di responsabilità</h3>
      <p>
        Il circolo non è responsabile per disservizi dovuti a manutenzione, forza maggiore o
        malfunzionamenti dei servizi di terze parti (es. infrastruttura cloud). La
        piattaforma è fornita "così com'è".
      </p>

      <h3>8. Legge applicabile e foro competente</h3>
      <p>
        I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è
        competente il Foro di <strong>[Città]</strong>.
      </p>

      <p className="data-aggiornamento">Ultimo aggiornamento: [data]</p>
    </div>
  )
}
