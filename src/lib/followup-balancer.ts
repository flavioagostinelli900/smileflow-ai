// Bilanciamento automatico messaggi follow-up DentAI.
// Calcoli puri (browser-safe) basati su piano + counters.

import { MESSAGE_TIERS, type PlanId } from "@/lib/plans";

// Minimi garantiti riattivazioni mensili per piano.
export const MIN_REACTIVATIONS: Record<PlanId, { min: number; max: number }> = {
  silver: { min: 4, max: 5 },
  gold: { min: 8, max: 10 },
  platinum: { min: 15, max: 20 },
};

// Inattività in mesi → categoria paziente.
export type InactiveCategory = "urgent" | "normal" | "new";
export function categorizeInactive(lastVisitISO: string | null | undefined): InactiveCategory | null {
  if (!lastVisitISO) return "urgent";
  const months = (Date.now() - new Date(lastVisitISO).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months > 12) return "urgent";
  if (months >= 6) return "normal";
  if (months >= 3) return "new";
  return null;
}

export type MessageBudget = {
  total: number;
  reminders: number;       // appuntamenti × 3 (24h + 2h + post)
  upsell: number;          // upsell stimati (10% appuntamenti)
  chat: number;            // chat in entrata = appuntamenti × 1.5
  followupAvailable: number;
};

export function computeMessageBudget(args: {
  plan: PlanId;
  messageTier: number | null | undefined;
  monthlyAppointments: number;
  upsellEstimate?: number;
}): MessageBudget {
  const total = args.messageTier ?? MESSAGE_TIERS[args.plan][0];
  const reminders = args.monthlyAppointments * 3;
  const upsell = args.upsellEstimate ?? Math.round(args.monthlyAppointments * 0.1);
  const chat = Math.round(args.monthlyAppointments * 1.5);
  const used = reminders + upsell + chat;
  return {
    total,
    reminders,
    upsell,
    chat,
    followupAvailable: Math.max(0, total - used),
  };
}

// Distribuzione contatti del mese in base alle categorie.
export type ContactPlan = {
  urgentToContact: number;
  normalMonthly: number;
  newInactive: number;
  totalPlanned: number;
};
export function planMonthlyContacts(args: {
  urgentCount: number;
  normalCount: number;
  newInactiveCount: number;
  monthlyCapacity: number; // pazienti gestibili nel mese (msg follow-up / 3 cicli)
}): ContactPlan {
  const urgentToContact = Math.min(args.urgentCount, args.monthlyCapacity);
  let remaining = args.monthlyCapacity - urgentToContact;
  const normalMonthly = Math.min(Math.ceil(args.normalCount / 6), remaining);
  remaining -= normalMonthly;
  const newInactive = Math.min(args.newInactiveCount, remaining);
  return {
    urgentToContact,
    normalMonthly,
    newInactive,
    totalPlanned: urgentToContact + normalMonthly + newInactive,
  };
}

// Stato di salute riattivazioni vs minimo garantito.
export type SystemHealth = "on_track" | "at_risk" | "below_target";
export function reactivationHealth(
  obtained: number,
  plan: PlanId,
  weeksUnderTarget: number,
): SystemHealth {
  const { min } = MIN_REACTIVATIONS[plan];
  if (obtained >= min) return "on_track";
  if (weeksUnderTarget >= 2) return "below_target";
  return "at_risk";
}
