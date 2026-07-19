import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

export function useTransactions(itemTypeFilter?: "gold" | "silver") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transactions", itemTypeFilter],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("date", { ascending: true });
      if (itemTypeFilter) {
        q = q.eq("item_type", itemTypeFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (tx: Omit<TablesInsert<"transactions">, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("transactions").insert({ ...tx, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction added successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, completed_date }: { id: string; status: string; completed_date?: string | null }) => {
      const date = status === "completed" ? (completed_date || new Date().toISOString().split("T")[0]) : null;
      const { error } = await supabase.from("transactions").update({ status, completed_date: date }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { ...query, addTransaction, deleteTransaction, updateStatus };
}
