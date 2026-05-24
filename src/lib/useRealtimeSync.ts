import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Map each table to the query keys (root segments) that should be invalidated
// when a row changes. Any registered query whose first key segment matches
// will be marked stale and refetched.
const TABLE_KEYS: Record<string, string[]> = {
  clients: ["clients", "client", "client-lite", "client-appts", "client-convs", "conversations", "appts-by-client"],
  operators: ["operators"],
  appointments: ["appts-by-client", "client-appts", "appointments", "dashboard-revenue", "reminders"],
  followup_sequences: ["sequences"],
  studio_settings: ["studio-settings", "settings"],
  studios: ["my-studio", "my-studio-plan", "admin-studios"],
  reminders: ["reminders"],
  patient_blocks: ["patient-blocks"],
  loyalty_rewards: ["rewards"],
  upsell_rules: ["upsell-rules", "upsell-rules-active"],
  upsell_offers: ["upsell-offers"],
  conversations: ["conversations"],
  messages: ["messages", "conversations"],
  missed_calls: ["missed-calls"],
};

/**
 * Subscribes once to all primary tables and invalidates the matching React
 * Query caches whenever a row is inserted, updated, or deleted. This keeps
 * every section of the app in sync in real time without polling.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("global-data-sync");

    for (const table of Object.keys(TABLE_KEYS)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          for (const key of TABLE_KEYS[table]) {
            qc.invalidateQueries({ queryKey: [key] });
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
