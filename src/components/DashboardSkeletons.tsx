import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetErrorCardProps {
  title: string;
  error?: Error | null;
  onRetry: () => void;
  isEasy?: boolean;
}

export const WidgetErrorCard: React.FC<WidgetErrorCardProps> = ({
  title,
  error,
  onRetry,
  isEasy = false,
}) => {
  const errorMessage = error?.message || "Failed to load data. Please check your connection.";
  const cardClass = isEasy
    ? "rounded-xl border-2 border-destructive bg-card p-6"
    : "rounded-xl border border-destructive/20 bg-destructive/5 p-6 backdrop-blur-md";

  return (
    <div className={`${cardClass} flex flex-col items-center justify-center text-center space-y-4 min-h-[180px]`}>
      <div className="rounded-full bg-destructive/10 p-3 text-destructive animate-bounce">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h3 className={`font-display font-semibold ${isEasy ? "text-lg" : "text-sm text-foreground"}`}>
          {title} Error
        </h3>
        <p className={`text-muted-foreground mt-1 max-w-md ${isEasy ? "text-base" : "text-xs"}`}>
          {errorMessage}
        </p>
      </div>
      <Button
        onClick={onRetry}
        variant="outline"
        size="sm"
        className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
};

export const StatsRowSkeleton = ({ isEasy = false }: { isEasy?: boolean }) => {
  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${cardClass} animate-pulse space-y-3`}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-muted" />
          </div>
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-5 w-24 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
};

export const BudgetCardSkeleton = ({ isEasy = false }: { isEasy?: boolean }) => {
  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  return (
    <div className={`${cardClass} mb-6 animate-pulse space-y-6`}>
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-3.5 w-48 bg-muted rounded" />
        </div>
        <div className="h-8 w-16 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="h-4 w-12 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
          <div className="h-3 w-full bg-muted rounded-full" />
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
          <div className="h-16 w-full bg-muted rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-border pt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-5 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TransactionsSkeleton = ({ isEasy = false }: { isEasy?: boolean }) => {
  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  return (
    <div className={`${cardClass} lg:col-span-2 animate-pulse space-y-6`}>
      <div className="flex justify-between items-center">
        <div className="h-5 w-44 bg-muted rounded" />
      </div>
      <div className="h-12 w-full bg-muted rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border-b border-border/20 last:border-0">
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
    </div>
  );
};

export const SubscriptionsSkeleton = ({ isEasy = false }: { isEasy?: boolean }) => {
  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  return (
    <div className={`${cardClass} animate-pulse space-y-6`}>
      <div className="h-5 w-28 bg-muted rounded" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="space-y-1">
                <div className="h-4 w-12 bg-muted rounded ml-auto" />
              </div>
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReportSettingsSkeleton = ({ isEasy = false }: { isEasy?: boolean }) => {
  const cardClass = isEasy
    ? "rounded-xl border-2 border-border bg-card p-6"
    : "glass rounded-xl p-6";

  return (
    <div className={`${cardClass} animate-pulse space-y-6`}>
      <div className="h-5 w-32 bg-muted rounded" />
      <div className="space-y-4">
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
    </div>
  );
};
