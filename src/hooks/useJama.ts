import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Jama = Tables<"jama_payments">;

/**
 * Per-transaction jama data + mutations.
 *
 * Pass `{ enabled: false }` when the caller already has the full jama set from
 * `useAllJama()` — that avoids an N+1 request storm (one query per loan card)
 * on customer profiles with many loans.
 */
export function useJama(transactionId?: string, options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["jama", transactionId],
    queryFn: async () => {
      let q = supabase.from("jama_payments").select("*").order("paid_date", { ascending: true });
      if (transactionId) q = q.eq("transaction_id", transactionId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Jama[];
    },
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 60_000,
  });

  const addJama = useMutation({
    mutationFn: async (j: Omit<TablesInsert<"jama_payments">, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("jama_payments").insert({ ...j, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jama"] });
      toast.success("Jama recorded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteJama = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jama_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jama"] });
      toast.success("Jama removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { ...query, addJama, deleteJama };
}

export function useAllJama() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["jama", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jama_payments")
        .select("id, transaction_id, user_id, paid_date, amount, notes, created_at")
        .order("paid_date", { ascending: true });
      if (error) throw error;
      return data as Jama[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
