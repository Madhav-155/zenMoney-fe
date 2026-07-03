import React, { createContext, useContext, useEffect, useState } from "react";
import { localDb } from "@/integrations/local_db/client";
import { useQueryClient } from "@tanstack/react-query";
import { fetchProfile, fetchTransactions, fetchSubscriptions, fetchMonthlyStats } from "@/hooks/financeFetchers";

// Inline types replacing @supabase/supabase-js imports
interface Session { access_token: string; user: User; }
interface User { id: string; email?: string; created_at?: string; user_metadata?: Record<string, any>; }

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const prefetchDashboardData = (queryClient: any, userId: string) => {
  console.log("AuthProvider: Prefetching dashboard data for user:", userId);
  queryClient.prefetchQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId),
  });
  queryClient.prefetchQuery({
    queryKey: ["transactions", userId],
    queryFn: () => fetchTransactions(userId),
  });
  queryClient.prefetchQuery({
    queryKey: ["subscriptions", userId],
    queryFn: () => fetchSubscriptions(userId),
  });
  queryClient.prefetchQuery({
    queryKey: ["monthly-stats", userId],
    queryFn: () => fetchMonthlyStats(userId),
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("AuthProvider: Initializing...");
    
    try {
      const { data: { subscription } } = localDb.auth.onAuthStateChange((_event, session) => {
        console.log("Auth state changed:", _event);
        setSession(session);
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setLoading(false);
        if (nextUser) {
          prefetchDashboardData(queryClient, nextUser.id);
        }
      });

      localDb.auth.getSession().then(({ data: { session } }) => {
        console.log("Got session:", session ? "✓" : "✗");
        setSession(session);
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setLoading(false);
        if (nextUser) {
          prefetchDashboardData(queryClient, nextUser.id);
        }
      }).catch((err) => {
        console.error("Error getting session:", err);
        setError(err?.message || "Failed to get session");
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      console.error("AuthProvider error:", err);
      setError((err as Error)?.message || "Auth initialization failed");
      setLoading(false);
    }
  }, [queryClient]);

  const signOut = async () => {
    await localDb.auth.signOut();
  };

  if (error) {
    return (
      <div style={{ color: "red", padding: "20px", fontSize: "14px" }}>
        <h2>Auth Error</h2>
        <p>{error}</p>
        <p>Check browser console (F12) for details</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
