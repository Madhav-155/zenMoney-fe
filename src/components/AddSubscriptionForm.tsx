import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useUIMode } from "@/contexts/UIModeContext";
import { useAddSubscription } from "@/hooks/useFinanceData";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const subSchema = z.object({
  serviceName: z.string().trim().min(1, "Required").max(100)
    .refine(val => /^[a-zA-Z\s]+$/.test(val), {
      message: "Service name can only contain letters and spaces",
    }),
  cost: z.coerce.number().positive("Cost must be positive"),
  nextBillingDate: z.string().min(1, "Pick a billing date"),
  trialEndDate: z.string().optional(),
});

type SubFormValues = z.infer<typeof subSchema>;

interface AddSubscriptionFormProps {
  triggerClassName?: string;
  showIconOnly?: boolean;
  buttonText?: string;
}

const AddSubscriptionForm = ({
  triggerClassName,
  showIconOnly = false,
  buttonText = "Add Subscription",
}: AddSubscriptionFormProps = {}) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { mode } = useUIMode();
  const isEasy = mode === "easy";
  const addSub = useAddSubscription();

  const form = useForm<SubFormValues>({
    resolver: zodResolver(subSchema),
    defaultValues: {
      serviceName: "",
      cost: "" as unknown as number,
      nextBillingDate: new Date().toISOString().split("T")[0],
      trialEndDate: "",
    },
  });

  const onSubmit = async (values: SubFormValues) => {
    if (!user) return;
    try {
      await addSub.mutateAsync({
        user_id: user.id,
        service_name: values.serviceName,
        cost: values.cost,
        next_billing_date: values.nextBillingDate,
        trial_end_date: values.trialEndDate || null,
      });
      toast.success("Subscription added! 🔔");
      form.reset({
        serviceName: "",
        cost: "" as unknown as number,
        nextBillingDate: new Date().toISOString().split("T")[0],
        trialEndDate: "",
      });
      setOpen(false);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      console.error("Subscription error:", error);
      const errorMessage = errorObj?.message || "Failed to add subscription";
      toast.error(errorMessage);
    }
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
            {isEasy ? "Add a Subscription" : "New Subscription"}
          </DialogTitle>
          <DialogDescription>
            {isEasy ? "Record recurring bills and service payments." : "Record your recurring service plans."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Service Name */}
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isEasy ? "Service Name" : "Service / Plan Name"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Netflix, Spotify, Gym"
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

            {/* Cost */}
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isEasy ? "Cost per billing cycle" : "Billing Cost (₹)"}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="199" {...field} className={isEasy ? "text-lg h-12" : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Next Billing Date */}
            <FormField
              control={form.control}
              name="nextBillingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isEasy ? "Next billing date" : "Next Billing Date"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className={isEasy ? "text-lg h-12" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trial End Date (Optional) */}
            <FormField
              control={form.control}
              name="trialEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isEasy ? "text-base" : "text-sm"}>
                    {isEasy ? "Trial end date (Optional)" : "Trial End Date (Optional)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className={isEasy ? "text-lg h-12" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className={`w-full ${isEasy ? "h-12 text-lg" : ""} bg-accent hover:bg-accent/90 text-accent-foreground`}
              disabled={addSub.isPending}
            >
              {addSub.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEasy ? "Save Subscription" : "Add Subscription"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubscriptionForm;
