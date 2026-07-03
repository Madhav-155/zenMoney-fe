import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useUIMode } from "@/contexts/UIModeContext";
import { useAddTransaction } from "@/hooks/useFinanceData";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = [
  "Food & Drink",
  "Shopping",
  "Transport",
  "Entertainment",
  "Bills & Utilities",
  "Health",
  "Education",
  "Subscriptions",
  "Other",
] as const;

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Refund",
  "Gift",
  "Other",
] as const;

const SOURCES = [
  { value: "UPI", label: "UPI" },
  { value: "CC", label: "Credit Card" },
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank Transfer" },
] as const;

const txSchema = z.object({
  vendor: z.string().trim().min(1, "Required").max(100)
    .refine(val => /^[a-zA-Z\s]+$/.test(val), {
      message: "Vendor name can only contain letters and spaces",
    }),
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().min(1, "Pick a category"),
  remark: z.string().trim().optional(),
  source: z.string().min(1, "Pick a source"),
  isExpense: z.boolean(),
}).refine((data) => {
  if (data.category === "Other" && (!data.remark || data.remark.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Please specify custom category name",
  path: ["remark"],
});

type TxFormValues = z.infer<typeof txSchema>;

interface AddTransactionFormProps {
  triggerClassName?: string;
  showIconOnly?: boolean;
  buttonText?: string;
}

const AddTransactionForm = ({
  triggerClassName,
  showIconOnly = false,
  buttonText = "Add",
}: AddTransactionFormProps = {}) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { mode } = useUIMode();
  const isEasy = mode === "easy";
  const addTx = useAddTransaction();

  const form = useForm<TxFormValues>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      vendor: "",
      amount: "" as unknown as number,
      category: "",
      remark: "",
      source: "UPI",
      isExpense: true,
    },
  });

  const isExpense = useWatch({ control: form.control, name: "isExpense" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });
  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const onSubmit = async (values: TxFormValues) => {
    if (!user) return;
    try {
      await addTx.mutateAsync({
        user_id: user.id,
        vendor: values.vendor,
        amount: values.isExpense ? -Math.abs(values.amount) : Math.abs(values.amount),
        category: values.category === "Other" && values.remark ? values.remark : values.category,
        source: values.source,
      });
      toast.success("Transaction added!");
      form.reset();
      setOpen(false);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      console.error("Transaction error:", error);
      const errorMessage = errorObj?.message || "Failed to add transaction";
      toast.error(errorMessage);
    }
  };

  // Reset category when switching expense/income
  const handleTypeToggle = (isIncome: boolean) => {
    form.setValue("isExpense", !isIncome);
    form.setValue("category", "");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={triggerClassName || "flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"}
        >
          <Plus className={showIconOnly ? "h-5 w-5" : (isEasy ? "h-5 w-5" : "h-4 w-4")} />
          {!showIconOnly && <span>{buttonText}</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`font-display ${isEasy ? "text-xl" : "text-lg"}`}>
            {isExpense
              ? (isEasy ? "Add an Expense" : "New Expense")
              : (isEasy ? "Add Income" : "New Income")}
          </DialogTitle>
          <DialogDescription>
            {isExpense ? "Record money you spent." : "Record money you received."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Expense / Income toggle */}
            <FormField
              control={form.control}
              name="isExpense"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {field.value ? "💸 Expense" : "💰 Income"}
                  </FormLabel>
                  <FormControl>
                    <Switch checked={!field.value} onCheckedChange={handleTypeToggle} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Vendor */}
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isExpense
                      ? (isEasy ? "Who did you pay?" : "Vendor")
                      : (isEasy ? "Who paid you?" : "Source name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isExpense ? "e.g. Swiggy, Amazon" : "e.g. Company, Client"}
                      {...field}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                        field.onChange(cleaned);
                      }}
                      className={isEasy ? "text-lg h-12" : ""}
                    />
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

            {/* Category — changes based on expense/income */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={isEasy ? "text-lg h-12" : ""}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className={isEasy ? "text-base" : ""}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategory === "Other" && (
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                      {isEasy ? "Specify Category Name" : "Remark / Custom Category"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Repair, Gift, Taxes"
                        {...field}
                        className={isEasy ? "text-lg h-12" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isExpense
                      ? (isEasy ? "Paid with" : "Source")
                      : (isEasy ? "Received via" : "Method")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={isEasy ? "text-lg h-12" : ""}>
                        <SelectValue placeholder="Select source" />
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

            <Button type="submit" className={`w-full ${isEasy ? "h-12 text-lg" : ""}`} disabled={addTx.isPending}>
              {addTx.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isExpense
                ? (isEasy ? "Save Expense" : "Add Expense")
                : (isEasy ? "Save Income" : "Add Income")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionForm;
