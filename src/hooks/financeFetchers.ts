import { localDb } from "@/integrations/local_db/client";

export const fetchProfile = async (userId: string) => {
  const { data, error } = await localDb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
};

export const fetchTransactions = async (userId: string) => {
  const { data, error } = await localDb
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
};

export const fetchSubscriptions = async (userId: string) => {
  const { data, error } = await localDb
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("next_billing_date", { ascending: true });
  if (error) throw error;
  return data;
};

export const fetchMonthlyStats = async (userId: string) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: txData, error: txError } = await localDb
    .from("transactions")
    .select("amount, category")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());
  if (txError) throw txError;

  const { data: subData, error: subError } = await localDb
    .from("subscriptions")
    .select("cost, next_billing_date")
    .eq("user_id", userId);
  if (subError) throw subError;

  const todayStr = new Date().toISOString().split("T")[0];
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  const passedSubsCost = subData
    ? subData
        .filter((sub) => sub.next_billing_date >= startOfMonthStr && sub.next_billing_date <= todayStr)
        .reduce((sum, sub) => sum + Number(sub.cost), 0)
  const income = txData
    .filter((t) => Number(t.amount) > 0 && t.category !== "Owed to You")
    .reduce((s, t) => s + Number(t.amount), 0);

  const expenses = txData
    .filter((t) => Number(t.amount) < 0 || (Number(t.amount) > 0 && t.category === "Owed to You"))
    .reduce((s, t) => {
      const amt = Number(t.amount);
      if (amt < 0) return s + Math.abs(amt); // Lending or normal expense adds to spent
      if (amt > 0 && t.category === "Owed to You") return s - amt; // Repayment reduces spent
      return s;
    }, 0) + passedSubsCost;
  return { income, expenses };
};
