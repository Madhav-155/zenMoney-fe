import { useEffect, useState, Suspense, lazy } from "react";
import { useUIMode } from "@/contexts/UIModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useProfile, useTransactions, useSubscriptions, useMonthlyStats, useUpdateProfile, useUpdateSubscription, useAddTransaction, useDeleteSubscription, useDeleteTransaction } from "@/hooks/useFinanceData";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown, TrendingUp, CreditCard, ShoppingCart,
  Coffee, Utensils, Car, Wifi, AlertTriangle, Package,
  Zap, Heart, BookOpen, Film, Briefcase, Gift, RotateCcw, Mail,
  Code, PiggyBank, HelpCircle, Coins, Check, Loader2, ArrowLeft, Trash2,
  CalendarOff, Handshake, PackageOpen, Menu, Plus,
  type LucideIcon
} from "lucide-react";
const SmartTransactionInput = lazy(() => import("@/components/SmartTransactionInput"));
const AddTransactionForm = lazy(() => import("@/components/AddTransactionForm"));
const AddSubscriptionForm = lazy(() => import("@/components/AddSubscriptionForm"));
const AddOwedForm = lazy(() => import("@/components/AddOwedForm"));
import { StatsRowSkeleton, BudgetCardSkeleton, WidgetErrorCard } from "@/components/DashboardSkeletons";
import BudgetDisplay from "@/components/BudgetDisplay";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localDb } from "@/integrations/local_db/client";
import { differenceInDays, format, formatDistanceToNowStrict, addMonths, isBefore, parseISO, startOfDay, endOfMonth } from "date-fns";

const categoryIcons: Record<string, LucideIcon> = {
  // Expenses
  "Food & Drink": Coffee,
  "Shopping": ShoppingCart,
  "Transport": Car,
  "Entertainment": Film,
  "Bills & Utilities": Zap,
  "Health": Heart,
  "Education": BookOpen,
  "Subscriptions": Wifi,
  "Other": HelpCircle,
  // Income
  "Salary": Briefcase,
  "Freelance": Code,
  "Investment": PiggyBank,
  "Refund": RotateCcw,
  "Gift": Gift,
  "Owed to You": Coins,
  // Fallback
  "Income": TrendingUp,
  "Expenses": TrendingDown,
};

const getNextBillingDateForDisplay = (billingDateStr: string): Date => {
  let billingDate = parseISO(billingDateStr);
  const today = startOfDay(new Date());
  
  // Keep adding 1 month if the billing date is strictly in the past
  while (isBefore(startOfDay(billingDate), today)) {
    billingDate = addMonths(billingDate, 1);
  }
  
  return billingDate;
};

const isPaidForCurrentMonth = (billingDateStr: string): boolean => {
  const billingDate = parseISO(billingDateStr);
  const now = new Date();
  const currentMonthEnd = endOfMonth(now);
  return startOfDay(billingDate) > startOfDay(currentMonthEnd);
};

const Dashboard = () => {
  const { mode } = useUIMode();
  const { user } = useAuth();
  const isEasy = mode === "easy";

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorObj,
    refetch: refetchProfile
  } = useProfile();
  const updateProfile = useUpdateProfile();
  const [isSendingTestReport, setIsSendingTestReport] = useState(false);
  const [isUpdatingReports, setIsUpdatingReports] = useState(false);
  const [isPayingSubId, setIsPayingSubId] = useState<string | null>(null);
  const [selectedSubName, setSelectedSubName] = useState<string | null>(null);
  const [isDeletingSubId, setIsDeletingSubId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.endsWith("/income")
    ? "income"
    : location.pathname.endsWith("/expenses")
    ? "expenses"
    : location.pathname.endsWith("/subscriptions")
    ? "subscriptions"
    : location.pathname.endsWith("/owed")
    ? "owed"
    : "overview";

  const setActiveTab = (tab: "overview" | "income" | "expenses" | "subscriptions" | "owed") => {
    if (tab === "overview") {
      navigate("/dashboard");
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };
  const {
    data: transactions,
    isLoading: txLoading,
    isError: txError,
    error: txErrorObj,
    refetch: refetchTransactions
  } = useTransactions();
  const {
    data: subscriptions,
    isLoading: subsLoading,
    isError: subsError,
    error: subsErrorObj,
    refetch: refetchSubscriptions
  } = useSubscriptions();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
    refetch: refetchStats
  } = useMonthlyStats();

  const updateSubscription = useUpdateSubscription();
  const addTransaction = useAddTransaction();
  const deleteSubscription = useDeleteSubscription();
  const deleteTransaction = useDeleteTransaction();
  const [isDeletingTxId, setIsDeletingTxId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [incomeFromDate, setIncomeFromDate] = useState<string>("");
  const [incomeToDate, setIncomeToDate] = useState<string>("");
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

  const handleDeleteTransaction = async (txId: string) => {
    setIsDeletingTxId(txId);
    try {
      await deleteTransaction.mutateAsync(txId);
      toast.success("Transaction deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete transaction");
    } finally {
      setIsDeletingTxId(null);
    }
  };

  const handleMarkAsPaid = async (debtorName: string, amount: number) => {
    if (!user) return;
    setIsMarkingPaid(debtorName);
    try {
      await addTransaction.mutateAsync({
        user_id: user.id,
        vendor: debtorName,
        amount: Math.abs(amount), // Positive amount for repayment
        category: "Owed to You",
        source: "Cash",
      });
      toast.success(`${debtorName} marked as paid!`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark as paid");
    } finally {
      setIsMarkingPaid(null);
    }
  };

  const spent = stats?.expenses ?? 0;
  const income = stats?.income ?? 0;
  const now = new Date();
  const reportsEnabled = profile?.reports_enabled ?? true;

  const rawName = profile?.display_name || user?.user_metadata?.display_name || user?.email;
  const firstName = rawName ? rawName.split("@")[0].split(" ")[0] : "";
  const capitalizedName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "";

  useEffect(() => {
    if (!profile) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (profile.report_timezone === timezone) return;
    if (updateProfile.isPending) return;
    updateProfile.mutate({ report_timezone: timezone });
  }, [profile, updateProfile]);

  const handleToggleReports = async (checked: boolean) => {
    if (!profile) return;
    setIsUpdatingReports(true);
    try {
      await updateProfile.mutateAsync({ reports_enabled: checked });
      toast.success(`Email reports ${checked ? "enabled" : "disabled"}.`);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      toast.error(errorObj?.message || "Failed to update report settings");
    } finally {
      setIsUpdatingReports(false);
    }
  };

  const handleSendTestReport = async () => {
    if (!user) return;
    setIsSendingTestReport(true);
    try {
      const { data, error } = await localDb.functions.invoke("send-reports", {
        body: {
          test: true,
          userId: user.id,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.ok) {
        toast.success("Test report sent to your email.");
      } else {
        toast.success("Test report queued.");
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      toast.error(errorObj?.message || "Failed to send test report");
    } finally {
      setIsSendingTestReport(false);
    }
  };

  const handleMarkSubscriptionPaid = async (sub: any) => {
    if (!user) return;
    setIsPayingSubId(sub.id);
    try {
      await addTransaction.mutateAsync({
        user_id: user.id,
        vendor: sub.service_name,
        amount: -Math.abs(sub.cost),
        category: "Subscriptions",
        source: "Bank",
      });

      const currentBillingDate = parseISO(sub.next_billing_date);
      const nextBillingDate = addMonths(currentBillingDate, 1);
      const nextBillingDateStr = format(nextBillingDate, "yyyy-MM-dd");

      await updateSubscription.mutateAsync({
        id: sub.id,
        updates: {
          next_billing_date: nextBillingDateStr,
        },
      });

      toast.success(`${sub.service_name} payment logged! 🔔`);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      console.error("Paid subscription error:", error);
      toast.error(errorObj?.message || "Failed to log subscription payment");
    } finally {
      setIsPayingSubId(null);
    }
  };

  const handleDeleteSubscription = async (subId: string, subName: string) => {
    setIsDeletingSubId(subId);
    try {
      await deleteSubscription.mutateAsync(subId);
      toast.success(`${subName} deleted.`);
      if (selectedSubName?.toLowerCase() === subName.toLowerCase()) {
        setSelectedSubName(null);
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      toast.error(errorObj?.message || "Failed to delete subscription");
    } finally {
      setIsDeletingSubId(null);
    }
  };

  const subTotal = subscriptions?.reduce((s, sub) => s + Number(sub.cost), 0) ?? 0;

  const owedTransactions = transactions?.filter(t => t.category === "Owed to You") ?? [];
  const netOwed = owedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalOwed = netOwed < 0 ? Math.abs(netOwed) : 0;

  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className={`font-display font-bold ${isEasy ? "text-3xl" : "text-2xl"}`}>
            {capitalizedName ? `Hey there, ${capitalizedName} 👋` : "Hey there 👋"}
          </h1>
          <p className={`text-muted-foreground ${isEasy ? "text-lg" : "text-sm"}`}>
            {isEasy ? "Here's a clear picture of your finances this month." : `Here's your financial vibe for ${format(now, "MMMM")}`}
          </p>
        </motion.div>

        {/* Top Right Mobile Menu / Desktop Profile Avatar Swap */}
        <div className="flex shrink-0">
          {/* Mobile Hamburger menu */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-menu"))}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full bg-muted/65 hover:bg-muted/80 text-foreground transition-all cursor-pointer border border-border/50"
            aria-label="Toggle navigation menu"
          >
            <Plus className="h-6 w-6" />
          </button>

          {/* Desktop Profile Avatar */}
          <Link to="/profile" className="hidden md:flex shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary text-lg font-bold text-primary-foreground shadow-md ring-2 ring-primary/20 cursor-pointer"
            >
              {capitalizedName ? capitalizedName[0].toUpperCase() : "U"}
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Budget Display */}
      {statsError || profileError ? (
        <div className="mb-6">
          <WidgetErrorCard 
            title="Budget" 
            error={statsErrorObj || profileErrorObj} 
            onRetry={() => {
              refetchStats();
              refetchProfile();
            }} 
            isEasy={isEasy} 
          />
        </div>
      ) : statsLoading || profileLoading ? (
        <BudgetCardSkeleton isEasy={isEasy} />
      ) : (
        <BudgetDisplay spent={spent} income={income} />
      )}

      {/* Stats Row */}
      {statsError || subsError ? (
        <div className="mb-6">
          <WidgetErrorCard 
            title="Stats" 
            error={statsErrorObj || subsErrorObj} 
            onRetry={() => {
              refetchStats();
              refetchSubscriptions();
            }} 
            isEasy={isEasy} 
          />
        </div>
      ) : statsLoading || subsLoading ? (
        <StatsRowSkeleton isEasy={isEasy} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { id: "income", label: isEasy ? "Money In" : "Income", value: `₹${income.toLocaleString()}`, icon: TrendingUp, positive: true, colorClass: "bg-success/10 text-success" },
            { id: "expenses", label: isEasy ? "Money Out" : "Expenses", value: `₹${spent.toLocaleString()}`, icon: TrendingDown, positive: false, colorClass: "bg-destructive/10 text-destructive" },
            { id: "subscriptions", label: "Subscriptions", value: `₹${subTotal.toLocaleString()}/mo`, icon: Wifi, positive: false, colorClass: "bg-accent/10 text-accent" },
            { id: "owed", label: isEasy ? "To Collect" : "Owed to You", value: `₹${totalOwed.toLocaleString()}`, icon: Coins, positive: true, colorClass: "bg-success/10 text-success" },
          ].map((stat, i) => {
            const isActive = activeTab === stat.id;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => setActiveTab(isActive ? "overview" : stat.id)}
                className={`${cardClass} cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? "ring-2 ring-primary bg-primary/5 shadow-md scale-[1.02]" 
                    : "hover:bg-muted/10 hover:border-primary/20 hover:scale-[1.01]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-md p-1.5 ${stat.colorClass}`}>
                    <stat.icon className={`${isEasy ? "h-5 w-5" : "h-4 w-4"} ${stat.colorClass.split(" ")[1]}`} />
                  </div>
                </div>
                <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-xs"}`}>{stat.label}</p>
                <p className={`font-display font-bold ${isEasy ? "text-2xl" : "text-lg"}`}>{stat.value}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Recent Transactions */}
            <div className={`${cardClass} lg:col-span-2`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`font-display font-semibold ${isEasy ? "text-xl" : "text-base"}`}>
                  {isEasy ? "Recent Money Activity" : "Recent Transactions"}
                </h2>
              </div>

              {/* Smart Transaction Input */}
              <div className="mb-6">
                <Suspense fallback={<div className="h-20 animate-pulse bg-muted rounded-lg" />}>
                  <SmartTransactionInput />
                </Suspense>
              </div>
              {txError ? (
                <WidgetErrorCard 
                  title="Transactions" 
                  error={txErrorObj} 
                  onRetry={refetchTransactions} 
                  isEasy={isEasy} 
                />
              ) : txLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-border/10 rounded-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted" />
                        <div className="space-y-2">
                          <div className="h-4 w-28 bg-muted rounded" />
                          <div className="h-3 w-20 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="h-4 w-16 bg-muted rounded ml-auto" />
                        <div className="h-3.5 w-12 bg-muted rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !transactions?.length ? (
                <div className="py-12 text-center space-y-4">
                  <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <div>
                    <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>No transactions yet</p>
                    <p className={`text-muted-foreground mt-1 ${isEasy ? "text-base" : "text-xs"}`}>Add your first one using the bar above ↑</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                  {transactions.slice(0, 10).map((tx) => {
                    const Icon = categoryIcons[tx.category] || Utensils;
                    return (
                      <div key={tx.id} className={`flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50 ${isEasy ? "border border-border" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${tx.amount > 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                            <Icon className={`${isEasy ? "h-5 w-5" : "h-4 w-4"} ${tx.amount > 0 ? "text-success" : "text-destructive"}`} />
                          </div>
                          <div>
                            <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{tx.vendor}</p>
                            <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-xs"}`}>{tx.category} • {tx.source}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-display font-semibold ${isEasy ? "text-lg" : "text-sm"} ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                              {tx.amount > 0 ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString()}
                            </p>
                            <p className={`text-muted-foreground ${isEasy ? "text-sm" : "text-xs"}`}>
                              {formatDistanceToNowStrict(new Date(tx.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            disabled={isDeletingTxId === tx.id}
                            aria-label="Delete transaction"
                          >
                            {isDeletingTxId === tx.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subscriptions */}
            <div className="space-y-6">
              <div className={cardClass}>
                <h2 className={`font-display font-semibold mb-4 ${isEasy ? "text-xl" : "text-base"}`}>
                  {isEasy ? "Upcoming Payments" : "Subscriptions"}
                </h2>
                {subsError ? (
                  <WidgetErrorCard 
                    title="Subscriptions" 
                    error={subsErrorObj} 
                    onRetry={refetchSubscriptions} 
                    isEasy={isEasy} 
                  />
                ) : subsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-3 w-16 bg-muted rounded" />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="h-4 w-12 bg-muted rounded" />
                          <div className="h-8 w-12 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !subscriptions?.length ? (
                  <div className="py-8 text-center space-y-3">
                    <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>No subscriptions tracked</p>
                    <Suspense fallback={null}>
                      <AddSubscriptionForm
                        triggerClassName={`mx-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isEasy ? "bg-accent/15 text-accent hover:bg-accent/25 text-sm" : "bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                        buttonText="Track a Subscription"
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptions.map((sub) => {
                      const displayBillingDate = getNextBillingDateForDisplay(sub.next_billing_date);
                      const daysUntil = differenceInDays(startOfDay(displayBillingDate), startOfDay(now));
                      const paid = isPaidForCurrentMonth(sub.next_billing_date);
                      return (
                        <div key={sub.id} className="flex items-center justify-between gap-3">
                          <div>
                            <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{sub.service_name}</p>
                            <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-xs"}`}>
                              {isEasy ? "Due " : ""}{format(displayBillingDate, "MMM d")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className={`font-display font-semibold ${isEasy ? "text-lg" : "text-sm"}`}>₹{sub.cost}</p>
                              {daysUntil <= 7 && daysUntil >= 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="text-xs font-medium">{daysUntil}d</span>
                                </span>
                              )}
                            </div>
                            <Button
                              onClick={() => handleMarkSubscriptionPaid(sub)}
                              size="sm"
                              variant={paid ? "ghost" : "outline"}
                              className={`font-medium flex items-center gap-1 shrink-0 transition-all ${
                                paid
                                  ? "border border-success/35 bg-success/10 text-success cursor-default pointer-events-none"
                                  : "border-primary/30 text-primary hover:bg-primary/10"
                              } ${
                                isEasy ? "h-10 px-3.5 text-sm border-2" : "h-8 px-2 text-xs"
                              }`}
                              disabled={paid || isPayingSubId === sub.id}
                            >
                              {isPayingSubId === sub.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : paid ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : null}
                              <span>{paid ? "Paid" : "Pay"}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={cardClass}>
                <h2 className={`font-display font-semibold mb-4 ${isEasy ? "text-xl" : "text-base"}`}>
                  {isEasy ? "Email Reports" : "Report Settings"}
                </h2>
                {profileError ? (
                  <WidgetErrorCard 
                    title="Report Settings" 
                    error={profileErrorObj} 
                    onRetry={refetchProfile} 
                    isEasy={isEasy} 
                  />
                ) : profileLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-1/2 bg-muted rounded" />
                      </div>
                      <div className="h-6 w-10 bg-muted rounded-full" />
                    </div>
                    <div className="h-10 w-full bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`font-medium ${isEasy ? "text-base" : "text-sm"}`}>
                          Weekly and monthly email reports
                        </p>
                        <p className={`text-muted-foreground ${isEasy ? "text-sm" : "text-xs"}`}>
                          Get PDF summaries sent to your registered email.
                        </p>
                      </div>
                      <Switch
                        checked={reportsEnabled}
                        onCheckedChange={handleToggleReports}
                        disabled={!profile || isUpdatingReports}
                      />
                    </div>

                    <Button
                      onClick={handleSendTestReport}
                      disabled={!reportsEnabled || isSendingTestReport}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {isSendingTestReport ? (
                        <>
                          <Mail className="h-4 w-4" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send me a test report
                        </>
                      )}
                    </Button>

                    <p className={`text-muted-foreground ${isEasy ? "text-sm" : "text-xs"}`}>
                      Test report uses your current month-to-date transactions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "income" && (() => {
          const incomeTxs = transactions?.filter(t => Number(t.amount) > 0) ?? [];

          const filteredIncome = incomeTxs.filter(t => {
            const txDate = startOfDay(parseISO(t.created_at));
            if (incomeFromDate) {
              const from = startOfDay(parseISO(incomeFromDate));
              if (isBefore(txDate, from)) return false;
            }
            if (incomeToDate) {
              const to = startOfDay(parseISO(incomeToDate));
              if (isBefore(to, txDate)) return false;
            }
            return true;
          });

          const filteredIncomeTotal = filteredIncome.reduce((sum, t) => sum + Number(t.amount), 0);

          return (
            <motion.div
              key="income"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cardClass}
            >
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-border pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTab("overview")}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className={`font-display font-semibold ${isEasy ? "text-2xl" : "text-lg"}`}>
                      Money In (Income)
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end">
                    {/* Date Range Picker inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">From</span>
                        <input
                          type="date"
                          max={incomeToDate || format(new Date(), 'yyyy-MM-dd')}
                          value={incomeFromDate}
                          onChange={(e) => setIncomeFromDate(e.target.value)}
                          className={`bg-muted/50 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-9 font-medium ${
                            isEasy ? "text-sm h-10 px-4" : ""
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">To</span>
                        <input
                          type="date"
                          min={incomeFromDate || undefined}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          value={incomeToDate}
                          onChange={(e) => setIncomeToDate(e.target.value)}
                          className={`bg-muted/50 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-9 font-medium ${
                            isEasy ? "text-sm h-10 px-4" : ""
                          }`}
                        />
                      </div>
                      {(incomeFromDate || incomeToDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setIncomeFromDate(""); setIncomeToDate(""); }}
                          className={`h-9 text-xs px-3 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors ${
                            isEasy ? "h-10 text-sm" : ""
                          }`}
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Income</p>
                      <p className="text-xl font-bold text-success font-display">₹{filteredIncomeTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Two-column layout: Category Breakdown and Income Logs */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Category Income Breakdown (1/3) */}
                  <div className="space-y-4 lg:border-r lg:border-border lg:pr-6">
                    <h3 className="font-semibold text-sm text-muted-foreground">Category Income Breakdown</h3>
                    {(() => {
                      if (!filteredIncome.length) {
                        return <p className="text-xs text-muted-foreground">No income to display category data.</p>;
                      }

                      const categoryBreakdown: Record<string, number> = {};
                      filteredIncome.forEach((tx) => {
                        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + Number(tx.amount);
                      });

                      const sortedBreakdown = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);

                      return (
                        <div className="space-y-4">
                          {sortedBreakdown.map(([cat, amt]) => {
                            const percentage = filteredIncomeTotal > 0 ? (amt / filteredIncomeTotal) * 100 : 0;
                            return (
                              <div key={cat} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium">{cat}</span>
                                  <span className="text-muted-foreground">₹{amt.toLocaleString()} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-success rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Income Logs (2/3) */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">Income Logs</h3>
                    {(() => {
                      if (!filteredIncome.length) {
                        return (
                          <div className="py-10 text-center space-y-3">
                            <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/30" />
                            <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>
                              {incomeFromDate || incomeToDate ? "No income found for this date range" : "No income records logged yet"}
                            </p>
                            {!(incomeFromDate || incomeToDate) && (
                              <Suspense fallback={null}>
                                <AddTransactionForm
                                  triggerClassName={`mx-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    isEasy ? "bg-success/15 text-success hover:bg-success/25 text-sm" : "bg-success/10 text-success hover:bg-success/20"
                                  }`}
                                  buttonText="Log Income"
                                />
                              </Suspense>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                          {filteredIncome.map((tx) => {
                            const Icon = categoryIcons[tx.category] || Utensils;
                            return (
                              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-lg p-2 bg-success/10">
                                    <Icon className="h-5 w-5 text-success" />
                                  </div>
                                  <div>
                                    <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{tx.vendor}</p>
                                    <p className="text-xs text-muted-foreground">{tx.category} • {tx.source}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-display font-semibold text-success text-sm">
                                      +₹{Number(tx.amount).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    disabled={isDeletingTxId === tx.id}
                                    aria-label="Delete transaction"
                                  >
                                    {isDeletingTxId === tx.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {activeTab === "expenses" && (() => {
          const expenseTxs = transactions?.filter(t => t.amount < 0) ?? [];

          const filteredExpenses = expenseTxs.filter(t => {
            const txDate = startOfDay(parseISO(t.created_at));
            
            if (fromDate) {
              const from = startOfDay(parseISO(fromDate));
              if (isBefore(txDate, from)) return false;
            }
            
            if (toDate) {
              const to = startOfDay(parseISO(toDate));
              if (isBefore(to, txDate)) return false;
            }
            
            return true;
          });

          const filteredTotal = filteredExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

          return (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cardClass}
            >
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-border pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTab("overview")}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className={`font-display font-semibold ${isEasy ? "text-2xl" : "text-lg"}`}>
                      Money Out (Expenses)
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end">
                    {/* Date Range Picker inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">From</span>
                        <input
                          type="date"
                          max={toDate || format(new Date(), 'yyyy-MM-dd')}
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className={`bg-muted/50 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-9 font-medium dark:color-scheme-dark ${
                            isEasy ? "text-sm h-10 px-4" : ""
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">To</span>
                        <input
                          type="date"
                          min={fromDate || undefined}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className={`bg-muted/50 border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-9 font-medium dark:color-scheme-dark ${
                            isEasy ? "text-sm h-10 px-4" : ""
                          }`}
                        />
                      </div>
                      {(fromDate || toDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFromDate("");
                            setToDate("");
                          }}
                          className={`h-9 text-xs px-3 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors ${
                            isEasy ? "h-10 text-sm" : ""
                          }`}
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Expenses</p>
                      <p className="text-xl font-bold text-destructive font-display">₹{filteredTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Category Breakdown (1/3) */}
                  <div className="space-y-4 lg:border-r lg:border-border lg:pr-6">
                    <h3 className="font-semibold text-sm text-muted-foreground">Category Spending Breakdown</h3>
                    {(() => {
                      if (!filteredExpenses.length) {
                        return <p className="text-xs text-muted-foreground">No expenses to display category data.</p>;
                      }

                      const categoryBreakdown: Record<string, number> = {};
                      filteredExpenses.forEach((tx) => {
                        categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + Math.abs(tx.amount);
                      });

                      const sortedBreakdown = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);

                      return (
                        <div className="space-y-4">
                          {sortedBreakdown.map(([cat, amt]) => {
                            const percentage = filteredTotal > 0 ? (amt / filteredTotal) * 100 : 0;
                            return (
                              <div key={cat} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium">{cat}</span>
                                  <span className="text-muted-foreground">₹{amt.toLocaleString()} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-destructive rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Transaction History (2/3) */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground font-display">Expense Logs</h3>
                    {(() => {
                      if (!filteredExpenses.length) {
                        return (
                          <div className="py-10 text-center space-y-3">
                            <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/30" />
                            <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>
                              {fromDate || toDate ? "No expenses found for this date range" : "No expenses logged yet"}
                            </p>
                            {!(fromDate || toDate) && (
                              <Suspense fallback={null}>
                                <AddTransactionForm
                                  triggerClassName={`mx-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    isEasy ? "bg-destructive/15 text-destructive hover:bg-destructive/25 text-sm" : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                  }`}
                                  buttonText="Add an Expense"
                                />
                              </Suspense>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                          {filteredExpenses.map((tx) => {
                            const Icon = categoryIcons[tx.category] || Utensils;
                            return (
                              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-lg p-2 bg-destructive/10">
                                    <Icon className="h-5 w-5 text-destructive" />
                                  </div>
                                  <div>
                                    <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{tx.vendor}</p>
                                    <p className="text-xs text-muted-foreground">{tx.category} • {tx.source}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-display font-semibold text-destructive text-sm">
                                      -₹{Math.abs(tx.amount).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(tx.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    disabled={isDeletingTxId === tx.id}
                                    aria-label="Delete transaction"
                                  >
                                    {isDeletingTxId === tx.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {activeTab === "subscriptions" && (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cardClass}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setActiveTab("overview")}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h2 className={`font-display font-semibold ${isEasy ? "text-2xl" : "text-lg"}`}>
                    Subscriptions & Billing
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Monthly Total</p>
                  <p className="text-xl font-bold text-destructive font-display">₹{subTotal.toLocaleString()}/mo</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Active Subscriptions */}
                <div className="space-y-4 lg:border-r lg:border-border lg:pr-6">
                  <h3 className="font-semibold text-sm text-muted-foreground">Active Subscriptions</h3>
                  {!subscriptions?.length ? (
                    <div className="py-10 text-center space-y-3">
                      <CalendarOff className="mx-auto h-10 w-10 text-muted-foreground/30" />
                      <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>No subscriptions logged</p>
                      <Suspense fallback={null}>
                        <AddSubscriptionForm
                          triggerClassName={`mx-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isEasy ? "bg-accent/15 text-accent hover:bg-accent/25 text-sm" : "bg-accent/10 text-accent hover:bg-accent/20"
                          }`}
                          buttonText="Track a Subscription"
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subscriptions.map((sub) => {
                        const displayBillingDate = getNextBillingDateForDisplay(sub.next_billing_date);
                        const daysUntil = differenceInDays(startOfDay(displayBillingDate), startOfDay(now));
                        const paid = isPaidForCurrentMonth(sub.next_billing_date);
                        const isSelected = selectedSubName?.toLowerCase() === sub.service_name.toLowerCase();
                        return (
                          <div
                            key={sub.id}
                            onClick={() => setSelectedSubName(isSelected ? null : sub.service_name)}
                            className={`flex items-center justify-between gap-3 border rounded-lg p-3 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary ring-1 ring-primary bg-primary/5 shadow-sm"
                                : "border-border hover:bg-muted/30"
                            }`}
                          >
                            <div>
                              <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{sub.service_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Due {format(displayBillingDate, "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="font-display font-semibold text-sm">₹{sub.cost}</p>
                                {daysUntil <= 7 && daysUntil >= 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span className="text-xs font-medium">{daysUntil}d</span>
                                  </span>
                                )}
                              </div>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkSubscriptionPaid(sub);
                                }}
                                size="sm"
                                variant={paid ? "ghost" : "outline"}
                                className={`font-medium flex items-center gap-1 shrink-0 transition-all ${
                                  paid
                                    ? "border border-success/35 bg-success/10 text-success cursor-default pointer-events-none"
                                    : "border-primary/30 text-primary hover:bg-primary/10"
                                } ${
                                  isEasy ? "h-10 px-3.5 text-sm border-2" : "h-8 px-2 text-xs"
                                }`}
                                disabled={paid || isPayingSubId === sub.id}
                              >
                                {isPayingSubId === sub.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : paid ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : null}
                                <span>{paid ? "Paid" : "Pay"}</span>
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubscription(sub.id, sub.service_name);
                                }}
                                size="sm"
                                variant="ghost"
                                className={`text-destructive hover:bg-destructive/10 hover:text-destructive ${isEasy ? "h-10 w-10" : "h-8 w-8"} p-0 shrink-0`}
                                disabled={isDeletingSubId === sub.id}
                              >
                                {isDeletingSubId === sub.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Subscription Payment History */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    {selectedSubName ? `${selectedSubName} History` : "Select a Subscription"}
                  </h3>
                  {selectedSubName ? (
                    (() => {
                      const selectedSubHist = transactions?.filter(
                        (t) =>
                          t.category === "Subscriptions" &&
                          t.vendor.toLowerCase() === selectedSubName.toLowerCase()
                      ) ?? [];
                      
                      const totalPaidForSub = selectedSubHist.reduce((sum, t) => sum + Math.abs(t.amount), 0);

                      if (!selectedSubHist.length) {
                        return (
                          <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm space-y-2">
                            <p>No billing history recorded for {selectedSubName}.</p>
                            <p className="text-xs text-muted-foreground/75">
                              Click "Pay" to log your first payment.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="p-3 bg-muted/40 rounded-lg text-xs flex justify-between items-center">
                            <span className="text-muted-foreground">Total Paid History:</span>
                            <span className="font-semibold font-display text-sm">₹{totalPaidForSub.toLocaleString()}</span>
                          </div>
                          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                            {selectedSubHist.map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="rounded-lg p-2 bg-destructive/10">
                                    <Wifi className="h-5 w-5 text-destructive" />
                                  </div>
                                  <div>
                                    <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{tx.vendor}</p>
                                    <p className="text-xs text-muted-foreground">{tx.source}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-display font-semibold text-destructive text-sm">
                                    -₹{Math.abs(tx.amount).toLocaleString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(tx.created_at), "MMM d, yyyy")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm h-[200px] flex flex-col justify-center items-center">
                      <p>Click on an active subscription on the left to see all its monthly payments here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "owed" && (
          <motion.div
            key="owed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cardClass}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setActiveTab("overview")}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h2 className={`font-display font-semibold ${isEasy ? "text-2xl" : "text-lg"}`}>
                    To Collect (Owed to You)
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Owed to You</p>
                  <p className="text-xl font-bold text-success font-display">₹{totalOwed.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Outstanding Debts per Person */}
                <div className="space-y-4 lg:border-r lg:border-border lg:pr-6">
                  <h3 className="font-semibold text-sm text-muted-foreground">People Who Owe You</h3>
                  {(() => {
                    const owedTxs = transactions?.filter(t => t.category === "Owed to You") ?? [];
                    const personBalances: Record<string, number> = {};
                    owedTxs.forEach((tx) => {
                      personBalances[tx.vendor] = (personBalances[tx.vendor] || 0) + Number(tx.amount);
                    });
                    
                    const debtors = Object.entries(personBalances)
                      .map(([name, bal]) => ({ name, balance: bal }))
                      .filter(p => p.balance < 0);

                    if (!debtors.length) {
                      return (
                        <div className="py-10 text-center space-y-3">
                          <Handshake className="mx-auto h-10 w-10 text-muted-foreground/30" />
                          <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>Everyone is settled up! 🎉</p>
                          <Suspense fallback={null}>
                            <AddOwedForm
                              triggerClassName={`mx-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                isEasy ? "bg-success/15 text-success hover:bg-success/25 text-sm" : "bg-success/10 text-success hover:bg-success/20"
                              }`}
                              buttonText="Log Lent Money"
                            />
                          </Suspense>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {debtors.map((debtor) => (
                          <div key={debtor.name} className="flex items-center justify-between border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg p-2 bg-success/10">
                                <Coins className="h-5 w-5 text-success" />
                              </div>
                              <span className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{debtor.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-display font-bold text-success text-base">₹{Math.abs(debtor.balance).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Outstanding</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs border-success/30 text-success hover:bg-success/10 hover:text-success transition-colors"
                                onClick={() => handleMarkAsPaid(debtor.name, debtor.balance)}
                                disabled={isMarkingPaid === debtor.name}
                              >
                                {isMarkingPaid === debtor.name ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Paid
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Lending Transaction History */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">Owed Transaction History</h3>
                  {(() => {
                    const owedTxs = transactions?.filter(t => t.category === "Owed to You") ?? [];
                    if (!owedTxs.length) {
                      return <p className="py-8 text-center text-muted-foreground text-sm">No history found.</p>;
                    }
                    return (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {owedTxs.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`rounded-lg p-2 ${tx.amount < 0 ? "bg-destructive/10" : "bg-success/10"}`}>
                                <Coins className={`h-5 w-5 ${tx.amount < 0 ? "text-destructive" : "text-success"}`} />
                              </div>
                              <div>
                                <p className={`font-medium ${isEasy ? "text-lg" : "text-sm"}`}>{tx.vendor}</p>
                                <p className="text-xs text-muted-foreground">
                                  {tx.amount < 0 ? "Lent money" : "Repaid you"} • {tx.source}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`font-display font-semibold text-sm ${tx.amount < 0 ? "text-destructive" : "text-success"}`}>
                                  {tx.amount < 0 ? "-" : "+"}₹{Math.abs(tx.amount).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(tx.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              <Button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                disabled={isDeletingTxId === tx.id}
                                aria-label="Delete transaction"
                              >
                                {isDeletingTxId === tx.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
