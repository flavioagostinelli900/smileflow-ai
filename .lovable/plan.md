# Sistema Ruoli e Permessi DentAI

Implemento un sistema completo di ruoli con 3 livelli, pannello Super Admin, restrizioni UI per gli account studio e audit log delle modifiche.

---

## 1. Database (migrazione)

Nuovi oggetti seguendo il pattern raccomandato (ruoli su tabella separata, no recursione RLS):

**Enum `app_role`**: `super_admin`, `authorized_admin`, `studio`

**Tabella `user_roles`**
- `id`, `user_id` (uuid → auth.users), `role` (app_role), `studio_id` (uuid nullable, per scoping admin autorizzati), `created_at`
- Unique (user_id, role, studio_id)

**Tabella `studios`** (account studio)
- `id`, `name`, `email`, `owner_user_id`, `plan` (`free|pro|business`), `status` (`active|suspended`), `created_at`
- Collega `studio_settings.studio_id`, `clients.studio_id`, ecc. — per ora aggiungo solo la tabella e un default `studio_id` in `studio_settings` per non rompere i dati esistenti

**Tabella `admin_authorizations`**
- `admin_user_id` (uuid), `studio_id` (uuid), `granted_by` (uuid), `created_at`

**Tabella `audit_log`**
- `id`, `user_id`, `studio_id`, `action`, `entity`, `entity_id`, `before` (jsonb), `after` (jsonb), `created_at`

**Funzioni SECURITY DEFINER**
- `has_role(_user_id, _role)` → boolean
- `is_super_admin(_user_id)` → boolean
- `can_manage_studio(_user_id, _studio_id)` → boolean (super admin OR authorized for that studio OR owner)

**RLS** su tutte le nuove tabelle usando le funzioni sopra. Aggiorno le policy delle tabelle esistenti di configurazione (studio_settings, followup_sequences, upsell_rules, loyalty_rewards, operators) per consentire UPDATE/INSERT/DELETE solo a chi `can_manage_studio`. SELECT resta a `authenticated`.

**Trigger** generico per scrivere su `audit_log` su update/delete delle tabelle protette.

**Seed**: il primo utente registrato (o un email specifica) viene marcato `super_admin`. Espongo anche un'azione manuale via SQL per promuovere.

---

## 2. Frontend — hook permessi

`src/lib/usePermissions.ts`
- Carica `user_roles` per l'utente corrente
- Espone: `isSuperAdmin`, `isAuthorizedAdmin`, `isStudio`, `canManage(studioId?)`, `currentStudioId`, `impersonatedStudioId` (per "Gestisci" del super admin, salvato in `localStorage`)

Wrapper `<RequireManage>` e `<ReadOnlyBanner />`:
- Banner: sfondo `bg-primary/5`, bordo `border-primary/20`, icona Shield, testo "Queste impostazioni sono gestite dal team DentAI per garantire le massime performance del tuo sistema."

---

## 3. Aggiornamenti pagine esistenti

Ovunque, condizionare i pulsanti "+ Nuovo …" e i form con `canManage`:
- `clients.tsx`: nascondi "+ Nuovo" e "Importa database"
- `followup.tsx`: nascondi "+ Nuovo workflow", form readonly
- `operators.tsx`: nascondi "+ Nuovo operatore"
- `loyalty.tsx`: nascondi "+ Nuovo premio"
- `settings.tsx`: tutti i campi `disabled`, pulsanti Salva nascosti, banner in alto su ogni Tab
- `upsell.tsx`: toggle regole disabilitati
- `reminders.tsx`: solo visualizzazione (già lo è)

Non mostro messaggi di errore: i controlli sono semplicemente assenti o disabilitati.

---

## 4. Pannello Super Admin `/admin`

Nuova route `src/routes/admin.tsx` (visibile solo a `isSuperAdmin || isAuthorizedAdmin`, redirect altrimenti):
- Tabella studi con: Nome, Email, Data registrazione, Stato badge, Piano badge
- Azioni per riga:
  - **Gestisci** → setta `impersonatedStudioId` in localStorage e naviga a `/` — l'header mostra una barra "Stai gestendo: {studio}" con "Esci"
  - **Sospendi / Riattiva** → toggle `studios.status`
  - **Autorizza admin** → dialog: input email utente esistente → crea `admin_authorizations`
- Sezione separata "Audit log" con ultime 50 modifiche (chi, quando, cosa)

Voce "Admin" nella sidebar di `AppLayout`, visibile solo ai ruoli admin.

---

## 5. Sicurezza

- Ruolo assegnato a creazione account (default `studio`); cambio solo via funzione SECURITY DEFINER richiamabile dal pannello (verifica ruolo del chiamante)
- RLS impedisce update di `user_roles` da parte dello studio
- Audit log via trigger DB → garantito anche se l'UI viene aggirata

---

## File principali

**Nuovi**
- `supabase/migrations/<ts>_roles_system.sql`
- `src/lib/usePermissions.ts`
- `src/components/ReadOnlyBanner.tsx`
- `src/components/ImpersonationBar.tsx`
- `src/routes/admin.tsx`

**Modificati**
- `src/components/AppLayout.tsx` (voce Admin + ImpersonationBar)
- `src/routes/{clients,followup,operators,loyalty,settings,upsell}.tsx` (gating UI + banner)
- `src/lib/api.ts` (nuovi tipi e query studios/audit)

---

## Note

- Per non rompere i dati esistenti, `studio_id` sulle tabelle esistenti viene aggiunto come nullable con default a uno studio "Default" creato in migrazione; la promozione ad ambiente multi-tenant completo è rimandata.
- L'invio di nuovi inviti/account è fuori scope per questa iterazione: il Super Admin assegna ruoli a utenti che si sono già registrati via login esistente.
- Confermi che il Super Admin sia l'utente attualmente loggato (la prima email registrata) o vuoi indicarmi un'email specifica da promuovere?
