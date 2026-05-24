import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import {
  PLAN_IDS, PLAN_LABELS, MAX_OPERATORS, MESSAGE_TIERS, type PlanId,
} from "@/lib/plans";

export type StudioInfo = {
  studio: { id: string; plan: PlanId; message_tier: number; status: string } | null;
  plan: PlanId;
  planLabel: string;
  maxOperators: number;
  loading: boolean;
};

/**
 * Returns the current user's studio plan and derived limits.
 * Falls back to "silver" defaults when no studio is linked yet (e.g. staff/admin).
 */
export function useStudio(): StudioInfo {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-studio-plan", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("studios")
        .select("id, plan, message_tier, status")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const plan: PlanId = (data?.plan && (PLAN_IDS as string[]).includes(data.plan)
    ? data.plan
    : "silver") as PlanId;

  return {
    studio: data
      ? {
          id: data.id,
          plan,
          message_tier: data.message_tier ?? MESSAGE_TIERS[plan][0],
          status: data.status,
        }
      : null,
    plan,
    planLabel: PLAN_LABELS[plan],
    maxOperators: MAX_OPERATORS[plan],
    loading: isLoading,
  };
}
