# Circolo Sportivo — v2

Ricostruzione dell'app del circolo (padel & calcio) con uno stack moderno.
Vedi i documenti di pianificazione nella cartella `nuovo-progetto/` del progetto v1.

## Stack

- **Vite + React + TypeScript** (frontend)
- **Tailwind CSS v4** (stile) — design token verde/ottone in `src/index.css`
- **React Router** (navigazione), **TanStack Query** (dati), **React Hook Form + Zod** (form)
- **Supabase** (database, auth, realtime) — client in `src/lib/supabase.ts`

## Comandi

```bash
npm run dev      # avvia in sviluppo su http://localhost:5173
npm run build    # controllo tipi + build di produzione in dist/
npm run preview  # anteprima della build
npm run lint     # controllo qualità del codice
```

## Configurazione

Le credenziali Supabase stanno in `.env.local` (non versionato). Per ricrearlo, copia
`.env.example` in `.env.local` e inserisci URL e chiave anon (Supabase > Project Settings > API).

## Struttura

```
src/
  lib/         client Supabase e (in seguito) tipi del database
  auth/        login, registrazione, profilo utente loggato
  components/  componenti riutilizzabili (ui/ = shadcn)
  features/    una cartella per funzionalità: prenotazioni, amichevoli,
               lezioni, tornei, premi, profilo, segreteria
  hooks/       funzioni riutilizzabili (es. realtime)
  pages/       schermate che assemblano le feature
supabase/
  migrations/  modifiche al database versionate (via Supabase CLI)
```

## Stato

- [x] **Fase 0** — fondamenta (progetto, stack, client Supabase).
- [x] **Fase 1** — autenticazione (login, registrazione, stati account, logout).
- [x] **Fase 2** — guscio app e navigazione a tab (filtri per ruolo e sport).
- [x] **Fase 3** — profilo: riepilogo, dati, amici, classifica, badge.
- [x] **Fase 4** — prenotazioni campi (griglia, prenota/annulla, regole, realtime).
- [x] **Fase 5** — amichevoli (partecipanti) e lezioni (allenamenti). ← *sei qui*
- [ ] Fase 6 — tornei
- [ ] … (vedi `nuovo-progetto/04-roadmap.md`)
