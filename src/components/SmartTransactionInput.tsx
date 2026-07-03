import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUIMode } from "@/contexts/UIModeContext";
import { useAddTransaction } from "@/hooks/useFinanceData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { categorizWithLLM, categorizeWithKeywords } from "@/utils/llmCategorizer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Refund",
  "Gift",
  "Other",
];

const EXPENSE_KEYWORDS: Record<string, string> = {
  // Food & Drink
  "food": "Food & Drink",
  "kitchen": "Food & Drink",
  "groceries": "Food & Drink",
  "grocery": "Food & Drink",
  "dmart": "Food & Drink",
  "bigbasket": "Food & Drink",
  "blinkit": "Food & Drink",
  "milk": "Food & Drink",
  "bread": "Food & Drink",
  "eat": "Food & Drink",
  "drink": "Food & Drink",
  "coffee": "Food & Drink",
  "ice cream": "Food & Drink",
  "icecream": "Food & Drink",
  "lunch": "Food & Drink",
  "dinner": "Food & Drink",
  "breakfast": "Food & Drink",
  "snack": "Food & Drink",
  "bakery": "Food & Drink",
  // Shopping
  "shopping": "Shopping",
  "shop": "Shopping",
  "amazon": "Shopping",
  "flipkart": "Shopping",
  "myntra": "Shopping",
  "buy": "Shopping",
  "purchased": "Shopping",
  "clothes": "Shopping",
  "dress": "Shopping",
  "shirt": "Shopping",
  "pants": "Shopping",
  "shoes": "Shopping",
  "store": "Shopping",
  "mall": "Shopping",
  // Transport
  "transport": "Transport",
  "taxi": "Transport",
  "uber": "Transport",
  "ola": "Transport",
  "auto": "Transport",
  "fuel": "Transport",
  "petrol": "Transport",
  "gas": "Transport",
  "parking": "Transport",
  "toll": "Transport",
  "metro": "Transport",
  "travel": "Transport",
  // Entertainment
  "movie": "Entertainment",
  "entertainment": "Entertainment",
  "game": "Entertainment",
  "gaming": "Entertainment",
  "ticket": "Entertainment",
  "concert": "Entertainment",
  "show": "Entertainment",
  "cinema": "Entertainment",
  "fun": "Entertainment",
  // Bills & Utilities
  "bills": "Bills & Utilities",
  "electricity": "Bills & Utilities",
  "water": "Bills & Utilities",
  "internet": "Bills & Utilities",
  "phone": "Bills & Utilities",
  "broadband": "Bills & Utilities",
  "postpaid": "Bills & Utilities",
  "utility": "Bills & Utilities",
  // Health
  "doctor": "Health",
  "medicine": "Health",
  "hospital": "Health",
  "medical": "Health",
  "health": "Health",
  "gym": "Health",
  "fitness": "Health",
  "clinic": "Health",
  "pharmacy": "Health",
  "tablet": "Health",
  // Education
  "education": "Education",
  "course": "Education",
  "book": "Education",
  "tuition": "Education",
  "school": "Education",
  "college": "Education",
  "learning": "Education",
  "study": "Education",
  // Subscriptions
  "subscription": "Subscriptions",
  "netflix": "Subscriptions",
  "spotify": "Subscriptions",
  "prime": "Subscriptions",
  "yt": "Subscriptions",
  "youtube": "Subscriptions",
  "hulu": "Subscriptions",
  "app": "Subscriptions",
};

const INCOME_KEYWORDS: Record<string, string> = {
  "salary": "Salary",
  "paid": "Salary",
  "freelance": "Freelance",
  "project": "Freelance",
  "investment": "Investment",
  "bonus": "Salary",
  "refund": "Refund",
  "return": "Refund",
  "gift": "Gift",
  "received": "Gift",
};

interface ParsedTransaction {
  amount: number;
  vendor: string;
  category: string;
  source: string;
  confidence: number;
  isLLM: boolean;
}

export const extractSourceFallback = (text: string): string => {
  const lower = text.toLowerCase();
  if (/\b(upi|gpay|google\s*pay|paytm|phonepe|bhim)\b/.test(lower)) {
    return "UPI";
  }
  if (/\b(cc|card|credit\s*card|creditcard|debit\s*card|debitcard|visa|mastercard|amex)\b/.test(lower)) {
    return "CC";
  }
  if (/\b(bank|transfer|neft|imps|rtgs|account|wire)\b/.test(lower)) {
    return "Bank";
  }
  if (/\b(cash|in\s*hand|wallet)\b/.test(lower)) {
    return "Cash";
  }
  return "Cash";
};

const parseSmartInput = async (
  text: string,
  isExpense: boolean
): Promise<ParsedTransaction | null> => {
  if (!text.trim()) return null;

  // Try LLM first
  const llmResult = await categorizWithLLM(text, isExpense);

  let amount: number | null = null;
  let vendor: string | null = null;
  let category = "Other";
  let source = "Cash";
  let isLLM = false;
  let confidence = 0.5;

  if (llmResult) {
    amount = llmResult.amount;
    vendor = llmResult.vendor;
    category = llmResult.category ?? "Other";
    source = llmResult.source ?? "Cash";
    isLLM = true;
    confidence = llmResult.confidence;
  }

  // Local fallback if LLM is absent or failed to parse amount
  if (!amount) {
    const amountMatch = text.match(/(?:₹|rs\.?|rupees?)?[\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, "")) : null;
  }

  if (!amount) {
    toast.error("Could not find amount. Try: 'Spent 500 on food'");
    return null;
  }

  // Local fallback if LLM is absent or failed to parse vendor
  if (!vendor) {
    let tempVendor = "Transaction";
    const locationMatch = text.match(/(?:in|at|from)\s+([a-zA-Z]+)/i);
    if (locationMatch) {
      tempVendor = locationMatch[1];
    } else {
      const forMatch = text.match(/(?:for|on)\s+([a-zA-Z\s]+?)(?:\s+\d+|in|at|from|$)/i);
      if (forMatch) {
        tempVendor = forMatch[1].split(/\s+/).slice(-2).join(" ");
      } else {
        const itemMatch = text.match(/(?:spent|paid|got|bought|buy)\s+(?:on\s+)?([a-zA-Z\s]+?)(?:\s+for\s+\d+|$)/i);
        if (itemMatch) {
          tempVendor = itemMatch[1].trim();
        } else {
          const words = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
          if (words.length > 0) {
            tempVendor = words[0];
          }
        }
      }
    }

    tempVendor = tempVendor
      .replace(/^(spent|paid|got|buy|bought|i|for|on|at|in|from)/i, "")
      .trim();

    if (!tempVendor || tempVendor.length < 2) {
      tempVendor = "Other";
    }

    vendor = tempVendor
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // Local fallback if LLM is absent or failed to parse category
  if (!llmResult || !llmResult.category) {
    const keywords = isExpense ? EXPENSE_KEYWORDS : INCOME_KEYWORDS;
    const keywordResult = categorizeWithKeywords(text, isExpense, keywords);
    category = keywordResult.category;
    confidence = keywordResult.confidence;
  }

  // Local fallback if LLM is absent or failed to parse source
  if (!llmResult || !llmResult.source) {
    source = extractSourceFallback(text);
  }

  // Ensure vendor has only letters and spaces, and is not empty
  let cleanVendor = (vendor || "").replace(/[^a-zA-Z\s]/g, "").trim();
  if (!cleanVendor) {
    cleanVendor = "Other";
  }

  return {
    amount,
    vendor: cleanVendor,
    category,
    source,
    confidence,
    isLLM,
  };
};

const SmartTransactionInput = () => {
  const { user } = useAuth();
  const { mode } = useUIMode();
  const isEasy = mode === "easy";
  const [input, setInput] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const addTx = useAddTransaction();
  const [showParsed, setShowParsed] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    setIsParsing(true);
    try {
      const parsed = await parseSmartInput(input, isExpense);
      if (parsed) {
        setParsedData(parsed);
        setShowParsed(true);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleCategoryChange = (val: string) => {
    if (parsedData) {
      setParsedData({ ...parsedData, category: val });
    }
  };

  const handleSourceChange = (val: string) => {
    if (parsedData) {
      setParsedData({ ...parsedData, source: val });
    }
  };

  const handleAddTransaction = async () => {
    if (!user || !parsedData) return;

    const trimmedVendor = parsedData.vendor.trim();
    if (!trimmedVendor) {
      toast.error("Vendor name cannot be empty");
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(trimmedVendor)) {
      toast.error("Vendor name can only contain letters and spaces");
      return;
    }

    try {
      await addTx.mutateAsync({
        user_id: user.id,
        vendor: trimmedVendor,
        amount: isExpense ? -parsedData.amount : parsedData.amount,
        category: parsedData.category,
        source: parsedData.source, // Uses parsed and potentially modified source
      });
      toast.success("Transaction added! ✨");
      setInput("");
      setShowParsed(false);
      setParsedData(null);
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      console.error("Transaction error:", error);
      const errorMessage = errorObj?.message || "Failed to add transaction";
      toast.error(errorMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showParsed && !isParsing) {
      handleParse();
    }
  };

  return (
    <div className={`rounded-lg border border-border p-4 space-y-4 ${
      isEasy ? "bg-card" : "bg-muted/30"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className={`h-5 w-5 text-primary`} />
          <h3 className={`font-display font-semibold ${isEasy ? "text-lg" : "text-base"}`}>
            Smart Entry
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium text-muted-foreground`}>
            {isExpense ? "💸 Expense" : "💰 Income"}
          </span>
          <Switch 
            checked={!isExpense} 
            onCheckedChange={(checked) => setIsExpense(!checked)}
          />
        </div>
      </div>

      {!showParsed ? (
        <div className="space-y-2">
          <p className={`text-xs text-muted-foreground`}>
            Try: "Spent 500 on coffee" or "Got 5000 freelance project"
          </p>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isExpense
                  ? "Spent 500 on coffee..."
                  : "Got 5000 from freelance..."
              }
              className={isEasy ? "h-12 text-base" : ""}
              disabled={isParsing}
            />
            <Button
              onClick={handleParse}
              disabled={!input.trim() || isParsing}
              size={isEasy ? "lg" : "sm"}
              className="gap-2"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEasy ? "Analyzing..." : "..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Parse
                </>
              )}
            </Button>
          </div>
        </div>
      ) : parsedData ? (
        <div className="space-y-3 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Vendor:</span>
              <div className="flex items-center gap-2">
                <Input
                  value={parsedData.vendor}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                    setParsedData({ ...parsedData, vendor: cleaned });
                  }}
                  className="w-[180px] h-8 text-xs font-semibold"
                />
                {parsedData.isLLM && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    AI
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Category:</span>
              <Select value={parsedData.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Source:</span>
              <Select value={parsedData.source} onValueChange={handleSourceChange}>
                <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {["UPI", "CC", "Cash", "Bank"].map((src) => (
                    <SelectItem key={src} value={src} className="text-xs">
                      {src === "CC" ? "Credit Card" : src === "Bank" ? "Bank Transfer" : src}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Amount:</span>
              <span className={`font-semibold ${isExpense ? "text-destructive" : "text-success"}`}>
                {isExpense ? "-" : "+"}₹{parsedData.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Confidence:</span>
              <span className={`font-semibold text-xs ${
                parsedData.confidence > 0.8 ? "text-success" : "text-accent"
              }`}>
                {Math.round(parsedData.confidence * 100)}%
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAddTransaction}
              disabled={addTx.isPending}
              className={`flex-1 ${
                isExpense
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-success hover:bg-success/90"
              } text-white`}
              size={isEasy ? "lg" : "sm"}
            >
              {addTx.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {isExpense ? "Expense" : "Income"}
            </Button>
            <Button
              onClick={() => {
                setShowParsed(false);
                setParsedData(null);
              }}
              variant="outline"
              size={isEasy ? "lg" : "sm"}
            >
              Back
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SmartTransactionInput;
