import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb } from "@/integrations/local_db/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/local_db/types";
import { fetchProfile, fetchTransactions, fetchSubscriptions, fetchMonthlyStats } from "./financeFetchers";

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: Partial<Tables<"profiles">>) => {
      const { data, error } = await localDb
        .from("profiles")
        .update(updates)
        .eq("id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
};



export const useTransactions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: () => fetchTransactions(user!.id),
    enabled: !!user,
  });
};

export const useAddTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: TablesInsert<"transactions">) => {
      const { data, error } = await localDb.from("transactions").insert(tx).select().single();
      if (error) {
        console.error("DB transaction error:", error);
        throw new Error(error.message || "Failed to add transaction");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });
};



export const useSubscriptions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: () => fetchSubscriptions(user!.id),
    enabled: !!user,
  });
};

export const useAddSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sub: TablesInsert<"subscriptions">) => {
      const { data, error } = await localDb.from("subscriptions").insert(sub).select().single();
      if (error) {
        console.error("DB subscription error:", error);
        throw new Error(error.message || "Failed to add subscription");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tables<"subscriptions">> }) => {
      const { data, error } = await localDb
        .from("subscriptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
    },
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await localDb.from("subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
    },
    onError: (error: unknown) => {
      console.error("Delete subscription error:", error);
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await localDb.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
    },
    onError: (error: unknown) => {
      console.error("Delete transaction error:", error);
    },
  });
};



export const useMonthlyStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["monthly-stats", user?.id],
    queryFn: () => fetchMonthlyStats(user!.id),
    enabled: !!user,
  });
};
