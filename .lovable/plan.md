## Piano implementazione: AI conversazionale famiglie + prezzi visite

Implementazione completa in più step. Database + UI + logica AI.

### 1. Database (migration)
- `clients`: aggiungi `birth_date DATE` + `age_group TEXT` ('adult'|'pediatric'|'unspecified', default 'unspecified')
- `operators`: aggiungi `patient_group TEXT` ('adults'|'children'|'all', default 'all')
- `studio_settings.visit_types` JSONB: estendi struttura ad includere `{name, minutes, ai_booking, suitable_for: 'adults'|'children'|'all', avg_price: number}`
- Trigger su `clients` per calcolare `age_group` da `birth_date` (sotto 18 = pediatric, >=18 = adult)

### 2. Scheda paziente (`src/routes/clients.$clientId.tsx` + lista)
- Form: campo Data di nascita (opzionale)
- Mostra età calcolata + badge tag (Adulto/Pediatrico/Non specificato)
- Lista pazienti: colonna age_group con badge

### 3. Import CSV (`ImportClientsDialog.tsx`)
- Aggiungi mapping colonna "Data di nascita"
- Auto-tag in base a età
- Rimuovi note dopo import (privacy)

### 4. Operatori (`src/routes/operators.tsx`)
- Form: select "Fascia pazienti" (Adulti/Bambini/Tutti)
- Badge visivo nella card (👤/👶/👥)

### 5. Configurazione visite (`src/routes/settings.tsx`)
- Per ogni visit_type aggiungi: "Adatto a" (radio) e "Prezzo medio €" (number, 0 = variabile)
- Nota privacy/variabile sotto il campo prezzo

### 6. AI chat (`src/routes/api/chat.ts`)
- Pre-lookup: cerca cliente per telefono → 0 match / 1 match / N match (famiglia)
- 1 match: saluta per nome, prosegue
- N match: saluta neutro, prima della conferma chiede "Per chi devo prenotare?"
- 0 match: chiede nome+cognome prima della conferma, crea profilo
- Interpretazione risposta: "per me/io" → adulto; nome → cerca famiglia + tag; "figlio/bambino" → pediatrico + chiedi nome; "moglie/marito/madre/padre" → adulto + chiedi nome
- Filtro slot: solo operatori con `patient_group` compatibile
- Aggiorna `age_group` sul profilo quando viene specificato
- Tipo visita filtrato per `suitable_for`

### 7. Calendario (`src/routes/bookings.tsx`)
- Badge fascia accanto al nome operatore (👤/👶/👥)
- Indicatore visivo diverso per appuntamenti pediatrici (bordo/icona)

### 8. Dashboard fatturato (`src/routes/index.tsx`)
- Calcolo "€X.Xk Recuperato" = Σ (prezzo_visita × num_appuntamenti) per appuntamenti con `source = 'ai_chat'` e prezzo > 0
- Per appuntamenti con upsell: applica sconto = prezzo × (1 - discount%)
- Nota sotto: "Stima basata sui prezzi medi configurati..."
- Click apre dialog breakdown: lista per tipo visita (n appuntamenti, prezzo unitario/scontato, subtotale), totale, sconti applicati totali, conteggio variabili esclusi

### 9. Types (`src/lib/api.ts`)
- Aggiorna `Client`, `Operator`, `VisitType` con nuovi campi

### Note tecniche
- Tutti i tag "Adulto/Pediatrico" sono gestiti via colonna `age_group` (non via `tags[]`) per consistenza
- Logica età: calcolo in trigger DB + utility lato client `getAgeGroup(birthDate)`
- Le visite con prezzo 0 sono escluse dal totale ma contate separatamente

Procedo?
