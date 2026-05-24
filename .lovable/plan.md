## Piano: 4 modifiche su admin / studio / operatori

### 1. Nuovo studio parte vuoto
- Verifica `src/lib/studios.functions.ts` (`createStudioAccount`) e flusso "crea studio" in `src/routes/admin.tsx`: assicurati che NON vengano inseriti operatori/clienti/appuntamenti/follow-up/upsell/loyalty/missed_calls di esempio.
- Rimuovi eventuali seed hardcoded ancora presenti in route (`bookings`, `loyalty`, `missed-calls`, `followup`, `upsell`, `index`) — già in buona parte fatto nelle iterazioni precedenti, ma faccio un giro di pulizia mirato.
- I "premi fedeltà presenti" e "workflow follow-up presenti" sono template globali condivisi: lasciati come sono, ma con contatori a 0 per lo studio nuovo (già il caso, perché i conteggi vengono dai dati reali).

### 2. Admin nascosto agli studi
- `src/components/AppLayout.tsx` (sidebar + menu mobile): nasconde la voce "Admin" se `!isSuperAdmin && !isAuthorizedAdmin`.
- `src/routes/admin.tsx`: aggiungi `beforeLoad`/guard nel componente che fa `redirect({ to: "/" })` per utenti studio.

### 3. Cambio piano in tempo reale
- Già coperto da `useRealtimeSync` su tabella `studios` → `my-studio-plan`, `admin-studios` invalidati. Verifico che `useStudio()` invalidi correttamente.
- In `src/routes/admin.tsx` durante il cambio piano:
  - Conta operatori attivi (`online=true` o totali?) → confronto con `MAX_OPERATORS[newPlan]`.
  - Se eccesso: dialog di conferma "Lo studio ha X operatori ma il piano prevede max Y. Procedere?".
  - Su conferma: disabilita gli ultimi N operatori (`online=false`, oppure aggiungo flag `disabled`?). Uso `online=false` ordinati per `created_at DESC`.
- In `src/routes/operators.tsx`: blocca creazione se `operators.length >= maxOperators` con toast upgrade.
- Notifica in-app allo studio: inserisco riga in una nuova tabella `notifications` … TROPPO grosso. Alternativa: uso `sonner` toast quando lo studio rileva via realtime che il proprio `studios.plan` è cambiato. Semplice: hook `usePlanChangeNotification` che memorizza l'ultimo plan visto in `localStorage` e mostra toast quando cambia.

### 4. Stato online/offline operatori
- Campo `operators.online` già esiste ✅.
- In `src/routes/operators.tsx`: aggiungi `Switch` su ogni card con badge 🟢/🔴, mutation `update online`.
- In `src/routes/bookings.tsx`: filtra/marca gli operatori `online=false` come "Non disponibile" (slot non selezionabili visivamente).
- In `src/routes/api/chat.ts`: filtra `operators` per `online=true` quando propone slot.
- Dashboard `src/routes/index.tsx`: aggiungi widget "Operatori attivi oggi: X/Y".
- **Storico stato**: nuova tabella `operator_status_history` (operator_id, online, changed_at, changed_by). Trigger AFTER UPDATE su `operators` per registrare i cambi.

### Migration richieste
- `operator_status_history` + trigger.

Procedo con l'implementazione?