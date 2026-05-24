import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type RevenueBreakdownRow = {
  visit_type: string;
  appointments: number;
  full_price: number;
  effective_price: number;
  discount_percent: number;
  subtotal: number;
  variable: boolean;
};

export type RevenueResult = {
  total: number;
  totalDiscount: number;
  appointmentCount: number;
  variableCount: number;
  breakdown: RevenueBreakdownRow[];
};

/**
 * Compute AI-generated revenue from completed appointments in date range.
 * Applies upsell discounts when present on the appointment.
 */
export const getDashboardRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RangeSchema.parse(d))
  .handler(async ({ data, context }): Promise<RevenueResult> => {
    const { supabase } = context;

    const [{ data: settings }, { data: appts }, { data: upsells }] = await Promise.all([
      supabase.from("studio_settings").select("visit_types").limit(1).maybeSingle(),
      supabase
        .from("appointments")
        .select("id, visit_type, status, source, starts_at")
        .eq("source", "ai_chat")
        .gte("starts_at", data.from)
        .lte("starts_at", data.to),
      supabase
        .from("upsell_offers")
        .select("appointment_id, discount_percent, status"),
    ]);

    const visitTypes = ((settings?.visit_types ?? []) as Array<{ name: string; avg_price?: number }>);
    const priceMap = new Map<string, number>();
    for (const v of visitTypes) priceMap.set(v.name, Number(v.avg_price ?? 0));

    const upsellMap = new Map<string, number>();
    for (const u of (upsells ?? []) as Array<{ appointment_id: string | null; discount_percent: number | null }>) {
      if (u.appointment_id && u.discount_percent) {
        upsellMap.set(u.appointment_id, Number(u.discount_percent));
      }
    }

    // Group by visit_type
    const groups = new Map<string, { count: number; fullSum: number; effSum: number; discSum: number; variable: boolean; weightedDiscount: number }>();

    for (const a of (appts ?? []) as Array<{ id: string; visit_type: string }>) {
      const fullPrice = priceMap.get(a.visit_type) ?? 0;
      const variable = fullPrice === 0;
      const disc = upsellMap.get(a.id) ?? 0;
      const effective = variable ? 0 : fullPrice * (1 - disc / 100);
      const discountAmount = variable ? 0 : fullPrice - effective;

      const g = groups.get(a.visit_type) ?? { count: 0, fullSum: 0, effSum: 0, discSum: 0, variable, weightedDiscount: 0 };
      g.count += 1;
      g.fullSum += fullPrice;
      g.effSum += effective;
      g.discSum += discountAmount;
      g.weightedDiscount += disc;
      g.variable = variable;
      groups.set(a.visit_type, g);
    }

    const breakdown: RevenueBreakdownRow[] = [];
    let total = 0;
    let totalDiscount = 0;
    let variableCount = 0;
    for (const [name, g] of groups.entries()) {
      const avgDiscount = g.count > 0 ? g.weightedDiscount / g.count : 0;
      const unitFull = g.count > 0 ? g.fullSum / g.count : 0;
      const unitEff = g.count > 0 ? g.effSum / g.count : 0;
      breakdown.push({
        visit_type: name,
        appointments: g.count,
        full_price: Math.round(unitFull * 100) / 100,
        effective_price: Math.round(unitEff * 100) / 100,
        discount_percent: Math.round(avgDiscount * 10) / 10,
        subtotal: Math.round(g.effSum * 100) / 100,
        variable: g.variable,
      });
      if (g.variable) variableCount += g.count;
      else {
        total += g.effSum;
        totalDiscount += g.discSum;
      }
    }

    breakdown.sort((a, b) => b.subtotal - a.subtotal);

    return {
      total: Math.round(total * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      appointmentCount: (appts ?? []).length,
      variableCount,
      breakdown,
    };
  });
