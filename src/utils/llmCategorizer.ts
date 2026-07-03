// Groq API for AI-powered transaction categorization
// Free tier: https://console.groq.com

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

export interface LLMParseResult {
  amount: number | null;
  vendor: string | null;
  category: string | null;
  source: string | null;
  confidence: number;
  isLLM: boolean;
}

export const categorizWithLLM = async (
  text: string,
  isExpense: boolean
): Promise<LLMParseResult | null> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  // If no API key, return null to use fallback
  if (!apiKey) {
    return null;
  }

  try {
    const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const systemPrompt = `You are a transaction parser. Analyze the input transaction text and return a JSON object with the following fields:
  - "amount": number or null (e.g. 500)
  - "vendor": string or null (e.g. "Starbucks")
  - "category": string, choose EXACTLY one category from: ${categories.join(", ")}. If uncertain, use "Other".
  - "source": string, choose EXACTLY one payment source from: UPI, CC, Cash, Bank. If uncertain, use "Cash".

  Return ONLY the raw JSON object and nothing else. No explanation, no markdown codeblocks (no backticks).

  Examples:
  - "spent 500 on coffee at starbucks using cc" -> {"amount":500,"vendor":"Starbucks","category":"Food & Drink","source":"CC"}
  - "got 5000 salary to bank" -> {"amount":5000,"vendor":"Salary","category":"Salary","source":"Bank"}
  - "paid electricity bill 900 via upi" -> {"amount":900,"vendor":"Electricity","category":"Bills & Utilities","source":"UPI"}
  - "spent 1200 on movie ticket" -> {"amount":1200,"vendor":"Movie","category":"Entertainment","source":"Cash"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Transaction: "${text}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.warn("Groq API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    let jsonText = content;
    if (jsonText.includes("```")) {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }
    jsonText = jsonText.trim();

    try {
      const parsed = JSON.parse(jsonText) as {
        amount?: number;
        vendor?: string;
        category?: string;
        source?: string;
      };

      const category = parsed?.category?.trim();
      const source = parsed?.source?.trim();

      // Ensure the category and source are valid enum values
      const validCategory = category && categories.includes(category) ? category : null;
      const validSource = source && ["UPI", "CC", "Cash", "Bank"].includes(source) ? source : null;

      return {
        amount: parsed.amount && typeof parsed.amount === "number" ? parsed.amount : null,
        vendor: parsed.vendor && typeof parsed.vendor === "string" ? parsed.vendor.trim() : null,
        category: validCategory,
        source: validSource,
        confidence: 0.95,
        isLLM: true,
      };
    } catch (e) {
      console.warn("Failed to parse JSON content:", content, e);
      return null;
    }
  } catch (error) {
    console.warn("LLM categorization failed, using fallback:", error);
    return null;
  }
};

// Keyword-based fallback function
export const categorizeWithKeywords = (
  text: string,
  isExpense: boolean,
  keywords: Record<string, string>
): { category: string; confidence: number } => {
  const lowerText = text.toLowerCase();
  let matchedCategory = "Other";
  let maxMatches = 0;

  for (const [keyword, category] of Object.entries(keywords)) {
    const matches = (lowerText.match(new RegExp(`\\b${keyword}\\b`, "g")) || []).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      matchedCategory = category;
    }
  }

  const confidence = maxMatches > 0 ? 0.9 : 0.5;

  return {
    category: matchedCategory,
    confidence,
  };
};
