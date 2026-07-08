import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useUIMode } from "@/contexts/UIModeContext";
import { useAddTransaction } from "@/hooks/useFinanceData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { localDb } from "@/integrations/local_db/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SOURCES = [
  { value: "UPI", label: "UPI" },
  { value: "CC", label: "Credit Card" },
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank Transfer" },
] as const;

const owedSchema = z.object({
  person: z.string().trim().min(1, "Name is required").max(100)
    .refine(val => /^[a-zA-Z\s]+$/.test(val), {
      message: "Name can only contain letters and spaces",
    }),
  amount: z.coerce.number().positive("Amount must be positive"),
  source: z.string().min(1, "Pick a payment method"),
  isLent: z.boolean(),
});

type OwedFormValues = z.infer<typeof owedSchema>;

interface AddOwedFormProps {
  triggerClassName?: string;
  showIconOnly?: boolean;
  buttonText?: string;
}

const AddOwedForm = ({
  triggerClassName,
  showIconOnly = false,
  buttonText = "Owed to You",
}: AddOwedFormProps = {}) => {
  const [open, setOpen] = useState(false);
  const [isCustomName, setIsCustomName] = useState(false);
  const { user } = useAuth();
  const { mode } = useUIMode();
  const isEasy = mode === "easy";
  const addTx = useAddTransaction();
  const queryClient = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ["owed-people", user?.id],
    queryFn: async () => {
      const { data, error } = await localDb
        .from("transactions")
        .select("vendor, amount")
        .eq("user_id", user!.id)
        .eq("category", "Owed to You");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const lentPeople = Array.from(
    new Set(
      transactions
        ?.filter((tx) => tx.amount < 0)
        .map((tx) => tx.vendor) || []
    )
  ).sort();

  const form = useForm<OwedFormValues>({
    resolver: zodResolver(owedSchema),
    defaultValues: {
      person: "",
      amount: "" as unknown as number,
      source: "UPI",
      isLent: true,
    },
  });

  const isLent = useWatch({ control: form.control, name: "isLent" });

  const onSubmit = async (values: OwedFormValues) => {
    if (!user) return;
    try {
      await addTx.mutateAsync({
        user_id: user.id,
        vendor: values.person,
        amount: values.isLent ? -Math.abs(values.amount) : Math.abs(values.amount),
        category: "Owed to You",
        source: values.source,
      });
      queryClient.invalidateQueries({ queryKey: ["owed-people", user.id] });
      toast.success(values.isLent ? "Lent transaction logged!" : "Repayment transaction logged!");
      form.reset();
      setIsCustomName(false);
      setOpen(false);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      console.error("Owed logging error:", error);
      const errorMessage = errorObj?.message || "Failed to log owed transaction";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={triggerClassName || "flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"}
        >
          <Coins className={showIconOnly ? "h-5 w-5" : (isEasy ? "h-5 w-5" : "h-4 w-4")} />
          {!showIconOnly && <span>{buttonText}</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`font-display ${isEasy ? "text-xl" : "text-lg"}`}>
            {isLent
              ? (isEasy ? "Record Money Lent" : "Lend Money")
              : (isEasy ? "Record Repayment Received" : "Receive Repayment")}
          </DialogTitle>
          <DialogDescription>
            {isLent ? "Track money you lent to someone." : "Track money paid back to you."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Lent / Repaid toggle — two-sided labels */}
            <FormField
              control={form.control}
              name="isLent"
              render={({ field }) => (
                <FormItem className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange(true);
                        form.setValue("person", "");
                        setIsCustomName(false);
                      }}
                      className={`flex items-center gap-1.5 font-semibold transition-colors ${
                        field.value
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>🤝</span>
                      <span className={isEasy ? "text-base" : "text-sm"}>Lent</span>
                    </button>
                    <FormControl>
                      <Switch
                        checked={!field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(!checked);
                          form.setValue("person", "");
                          setIsCustomName(false);
                        }}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange(false);
                        form.setValue("person", "");
                        setIsCustomName(false);
                      }}
                      className={`flex items-center gap-1.5 font-semibold transition-colors ${
                        !field.value
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>💰</span>
                      <span className={isEasy ? "text-base" : "text-sm"}>Repaid me</span>
                    </button>
                  </div>
                </FormItem>
              )}
            />

            {/* Person Name */}
            <FormField
              control={form.control}
              name="person"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-1">
                    <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                      {isEasy ? "Who?" : "Person Name"}
                    </FormLabel>
                    {isLent && lentPeople.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomName(!isCustomName);
                          field.onChange("");
                        }}
                        className="text-xs text-primary hover:underline font-medium focus:outline-none"
                      >
                        {isCustomName ? "Select from list" : "Type a new name"}
                      </button>
                    )}
                  </div>
                  <FormControl>
                    {isLent && (isCustomName || lentPeople.length === 0) ? (
                      <Input
                        placeholder="e.g. Rahul, Priya"
                        {...field}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          field.onChange(cleaned);
                        }}
                        className={isEasy ? "text-lg h-12" : ""}
                      />
                    ) : (
                      <Select
                        onValueChange={(val) => {
                          if (val === "__new__") {
                            setIsCustomName(true);
                            field.onChange("");
                          } else {
                            field.onChange(val);
                          }
                        }}
                        value={field.value}
                      >
                        <SelectTrigger className={isEasy ? "text-lg h-12" : ""} disabled={lentPeople.length === 0}>
                          <SelectValue placeholder={lentPeople.length === 0 ? "No debtors available" : "Select a person"} />
                        </SelectTrigger>
                        <SelectContent>
                          {lentPeople.map((person) => (
                            <SelectItem key={person} value={person} className={isEasy ? "text-base" : ""}>
                              {person}
                            </SelectItem>
                          ))}
                          {isLent && lentPeople.length > 0 && (
                            <SelectItem value="__new__" className={`text-primary font-medium ${isEasy ? "text-base" : ""}`}>
                              + Add New Person...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isEasy ? "How much?" : "Amount (₹)"}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="500" {...field} className={isEasy ? "text-lg h-12" : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isLent
                      ? (isEasy ? "Paid using" : "Paid via")
                      : (isEasy ? "Received in" : "Received via")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={isEasy ? "text-lg h-12" : ""}>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOURCES.map((src) => (
                        <SelectItem key={src.value} value={src.value} className={isEasy ? "text-base" : ""}>
                          {src.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className={`w-full ${isEasy ? "h-12 text-lg" : ""} ${
                isLent
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "bg-success hover:bg-success/90 text-success-foreground"
              }`}
              disabled={addTx.isPending}
            >
              {addTx.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLent
                ? (isEasy ? "Save Lent Record" : "Log Lent Money")
                : (isEasy ? "Save Repayment Record" : "Log Repayment")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddOwedForm;
