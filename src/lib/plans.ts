// Definizioni piani DentAI: Silver / Gold / Platinum.
// Singola fonte di verità per nomi, tariffe messaggi, operatori e setup.

export type PlanId = "silver" | "gold" | "platinum";

export const PLAN_IDS: PlanId[] = ["silver", "gold", "platinum"];

export const PLAN_LABELS: Record<PlanId, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

// Tariffe mensili per fascia messaggi (€/mese).
export const MESSAGE_TIER_PRICES: Record<PlanId, Record<number, number>> = {
  silver: { 1000: 199, 1250: 229, 1500: 259 },
  gold: { 1750: 299, 2000: 329, 2250: 359 },
  platinum: { 2750: 429, 3000: 459, 3250: 499 },
};

export const MESSAGE_TIERS: Record<PlanId, number[]> = {
  silver: [1000, 1250, 1500],
  gold: [1750, 2000, 2250],
  platinum: [2750, 3000, 3250],
};

export const MAX_OPERATORS: Record<PlanId, number> = {
  silver: 2,
  gold: 4,
  platinum: 6,
};

// Costo una-tantum setup pagato per piano.
export const SETUP_FEE: Record<PlanId, number> = {
  silver: 399,
  gold: 499,
  platinum: 599,
};

export function planLabel(plan: string | null | undefined): string {
  if (!plan) return "—";
  const p = plan.toLowerCase();
  if (p in PLAN_LABELS) return PLAN_LABELS[p as PlanId];
  return plan;
}

export function isPlanId(p: string | null | undefined): p is PlanId {
  return !!p && (PLAN_IDS as string[]).includes(p);
}

export function priceForTier(plan: string | null | undefined, tier: number | null | undefined): number | null {
  if (!isPlanId(plan) || !tier) return null;
  return MESSAGE_TIER_PRICES[plan][tier] ?? null;
}

export function minPriceForPlan(plan: PlanId): number {
  return Math.min(...Object.values(MESSAGE_TIER_PRICES[plan]));
}
