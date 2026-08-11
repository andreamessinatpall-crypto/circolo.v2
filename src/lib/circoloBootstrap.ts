// ID e slug fissi del circolo di bootstrap "Circoly Club" (vedi
// supabase/migrations/mt01-circoli-multi-tenant.sql). Usati come DEFAULT/
// trigger lato DB e come destinazione dei redirect per i percorsi "legacy"
// senza /c/:slug (vedi src/App.tsx) finché la Fase 6 non introduce la
// selezione multi-circolo lato socio.
export const CIRCOLO_BOOTSTRAP_ID = '00000000-0000-0000-0000-000000000001'
export const CIRCOLO_BOOTSTRAP_SLUG = 'circoly-club'
