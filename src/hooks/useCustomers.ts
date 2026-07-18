import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;

export function useCustomers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user,
  });

  const addCustomer = useMutation({
    mutationFn: async (c: Omit<TablesInsert<"customers">, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...c, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase.from("customers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { ...query, addCustomer, updateCustomer };
}

export function useCustomer(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Customer | null;
    },
    enabled: !!user && !!id,
  });
}
