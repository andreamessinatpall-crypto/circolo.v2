-- Fase 6bis (rifinitura): genere per componente di squadra, per l'Americano
-- Misto. Permette di correggere/impostare il genere di un giocatore per un
-- singolo torneo (utile per gli ospiti non registrati, che non hanno un
-- profilo con genere) senza toccare il profilo del socio.
-- NULL = usa il genere del profilo (se il componente è un socio registrato).

alter table public.squadra_componenti
  add column if not exists genere text
  constraint squadra_componenti_genere_check check (genere in ('M', 'F', 'altro'));
