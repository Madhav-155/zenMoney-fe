import { useState } from "react";
import { useUIMode } from "@/contexts/UIModeContext";
import { useProfile, useUpdateProfile } from "@/hooks/useFinanceData";
import { motion } from "framer-motion";
import { Calendar, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { differenceInCalendarDays, endOfMonth } from "date-fns";

interface BudgetDisplayProps {
  spent: number;
  income: number;
}

const BudgetDisplay = ({ spent, income }: BudgetDisplayProps) => {
  const { mode } = useUIMode();
  const isEasy = mode === "easy";
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(
    profile?.monthly_budget?.toString() || "30000"
  );

  const totalBudget = profile?.monthly_budget ?? 30000;
  const remaining = totalBudget - spent;
  const now = new Date();
  const daysLeftRaw = differenceInCalendarDays(endOfMonth(now), now);
  const daysLeft = Math.max(0, daysLeftRaw + 1);
  const budgetPercent = Math.max(0, Math.min(100, (remaining / totalBudget) * 100));
  const dailyLimit = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const percentageUsed = Math.round((spent / totalBudget) * 100);

  const handleSaveBudget = async () => {
    const budgetValue = parseInt(newBudget);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        monthly_budget: budgetValue,
      });
      toast.success("Budget updated!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update budget");
    }
  };

  const handleCancel = () => {
    setNewBudget(profile?.monthly_budget?.toString() || "30000");
    setIsEditing(false);
  };

  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  const getStatusColor = () => {
    if (percentageUsed >= 90) return "text-destructive";
    if (percentageUsed >= 70) return "text-accent";
    return "text-success";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`${cardClass} mb-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className={`font-display font-semibold ${
              isEasy ? "text-2xl" : "text-lg"
            }`}
          >
            {isEasy ? "💰 Your Monthly Budget" : "Monthly Budget"}
          </h2>
          <p className={`text-muted-foreground ${isEasy ? "text-base" : "text-sm"}`}>
            Track your spending pace
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            {isEasy ? "Change" : "Edit"}
          </Button>
        )}
      </div>

      {/* Main Budget Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Spending Section */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-muted-foreground ${
                isEasy ? "text-base" : "text-sm"
              }`}
            >
              {isEasy ? "Money Spent" : "Spent"}
            </span>
            <span
              className={`font-display font-bold ${
                isEasy ? "text-2xl" : "text-lg"
              } ${getStatusColor()}`}
            >
              ₹{spent.toLocaleString()}
            </span>
          </div>

          {/* Progress bar with always-visible track */}
          <div className="relative h-3 w-full rounded-full overflow-hidden bg-muted/60 border border-border/30">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentageUsed >= 90
                  ? "bg-destructive"
                  : percentageUsed >= 70
                  ? "bg-accent"
                  : "bg-success"
              }`}
              style={{ width: `${Math.max(percentageUsed, percentageUsed > 0 ? 2 : 0)}%` }}
            />
          </div>


          <div className="flex justify-between items-center">
            <span className={`text-muted-foreground ${isEasy ? "text-sm" : "text-xs"}`}>
              {percentageUsed}% of budget
            </span>
            <span
              className={`font-semibold text-sm px-2 py-1 rounded-full ${
                percentageUsed >= 90
                  ? "bg-destructive/10 text-destructive"
                  : percentageUsed >= 70
                  ? "bg-accent/10 text-accent"
                  : "bg-success/10 text-success"
              }`}
            >
              {percentageUsed >= 90 ? "⚠️ Caution" : percentageUsed >= 70 ? "📊 Careful" : "✅ Good"}
            </span>
          </div>
        </div>

        {/* Money Left Section */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-muted-foreground ${
                isEasy ? "text-base" : "text-sm"
              }`}
            >
              {isEasy ? "Money Left" : "Remaining"}
            </span>
            <span
              className={`font-display font-bold ${
                isEasy ? "text-2xl" : "text-lg"
              } text-primary`}
            >
              ₹{remaining.toLocaleString()}
            </span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-muted-foreground text-sm`}>
                <Calendar className="h-4 w-4 inline mr-2" />
                Days remaining this month
              </span>
              <span className={`font-semibold ${isEasy ? "text-base" : "text-sm"}`}>
                {daysLeft} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-muted-foreground text-sm`}>
                Safe daily limit
              </span>
              <span className={`font-display font-bold ${isEasy ? "text-lg" : "text-base"}`}>
                ₹{dailyLimit.toLocaleString()}/day
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6 border-t border-border pt-6">
        <div className="text-center">
          <p className={`text-muted-foreground text-sm mb-1`}>Total Budget</p>
          <p className={`font-display font-bold ${isEasy ? "text-xl" : "text-lg"}`}>
            ₹{totalBudget.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className={`text-muted-foreground text-sm mb-1`}>Used</p>
          <p className={`font-display font-bold text-destructive ${isEasy ? "text-xl" : "text-lg"}`}>
            {percentageUsed}%
          </p>
        </div>
        <div className="text-center">
          <p className={`text-muted-foreground text-sm mb-1`}>Remaining</p>
          <p className={`font-display font-bold text-primary ${isEasy ? "text-xl" : "text-lg"}`}>
            {100 - percentageUsed}%
          </p>
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border pt-6 space-y-4 bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg"
        >
          <div>
            <label
              className={`block text-muted-foreground mb-2 ${
                isEasy ? "text-base" : "text-sm"
              }`}
            >
              Set your monthly budget limit (₹)
            </label>
            <Input
              type="number"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="30000"
              className={isEasy ? "h-12 text-lg" : ""}
            />
            <p className={`text-muted-foreground mt-2 ${isEasy ? "text-base" : "text-xs"}`}>
              Your daily limit will be ₹{Math.round(parseInt(newBudget) / 30).toLocaleString()} based on 30 days
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveBudget}
              disabled={updateProfile.isPending}
              className="flex-1 gap-2 bg-success hover:bg-success/90"
              size={isEasy ? "lg" : "sm"}
            >
              <Check className="h-4 w-4" />
              {isEasy ? "Save Budget" : "Save"}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={updateProfile.isPending}
              variant="outline"
              className="flex-1 gap-2"
              size={isEasy ? "lg" : "sm"}
            >
              <X className="h-4 w-4" />
              {isEasy ? "Cancel" : "Cancel"}
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BudgetDisplay;
