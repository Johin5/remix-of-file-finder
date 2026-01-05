
import { GoogleGenAI, Type, FunctionDeclaration, SchemaType } from "@google/genai";
import { Account, Category, Transaction } from "../types";

// Initialize Gemini API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Tool Definitions ---

export const addTransactionTool: FunctionDeclaration = {
  name: "addTransaction",
  description: "Add a new financial transaction. Use this ONLY when the user explicitly wants to create an entry.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["expense", "income", "transfer"] },
      amount: { type: Type.NUMBER },
      categoryName: { type: Type.STRING, description: "Category name or description" },
      accountName: { type: Type.STRING, description: "Account name (e.g. Cash, Bank)" },
      toAccountName: { type: Type.STRING, description: "Destination account for transfers" },
      notes: { type: Type.STRING },
      date: { type: Type.STRING, description: "ISO date YYYY-MM-DD" }
    },
    required: ["type", "amount"]
  }
};

export const getFinancialSummaryTool: FunctionDeclaration = {
  name: "getFinancialSummary",
  description: "Get total income, expense, net balance, and count for a specific time range.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      monthOffset: { 
        type: Type.NUMBER, 
        description: "0 for current month, -1 for last month, -2 for 2 months ago, etc. Default is 0." 
      }
    }
  }
};

export const getCategoryBreakdownTool: FunctionDeclaration = {
  name: "getCategoryBreakdown",
  description: "Get spending breakdown grouped by category. Returns top 5 categories.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      monthOffset: { type: Type.NUMBER, description: "0 for current month, -1 for last month." },
      type: { type: Type.STRING, enum: ["expense", "income"], description: "Default is expense" }
    }
  }
};

export const getMerchantBreakdownTool: FunctionDeclaration = {
  name: "getMerchantBreakdown",
  description: "Get spending breakdown grouped by merchant/payee (based on notes). Returns top 5 merchants.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      monthOffset: { type: Type.NUMBER, description: "0 for current month, -1 for last month." }
    }
  }
};

export const getMonthlyTrendTool: FunctionDeclaration = {
  name: "getMonthlyTrend",
  description: "Get daily spending totals for a specific month to analyze trends.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      monthOffset: { type: Type.NUMBER, description: "0 for current month, -1 for last month." }
    }
  }
};

export const searchTransactionsTool: FunctionDeclaration = {
  name: "searchTransactions",
  description: "Search for specific individual transactions by keywords or amount. Limit 10 results.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Keyword to match in notes or category (e.g., 'Uber', 'Walmart')" },
      minAmount: { type: Type.NUMBER },
      maxAmount: { type: Type.NUMBER },
      monthOffset: { type: Type.NUMBER, description: "0 for current month, -1 for last month. Leave empty to search all time." }
    },
    required: ["query"]
  }
};

export interface AIContext {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[]; // Kept for type safety, but NOT sent to LLM
  currencySymbol: string;
  monthlyStartDate: number;
}

export const processQueryStream = async (
    query: string | null, 
    context: AIContext, 
    history: { role: 'user' | 'model', text?: string, parts?: any[] }[] = []
) => {
  const accountNames = context.accounts.map(a => a.name).join(", ");
  const categoryNames = context.categories.map(c => c.name).join(", ");
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const systemInstruction = `
    You are PocketLedger AI, a financial analyst assistant.
    Today is ${today}. Currency: ${context.currencySymbol}.

    METADATA:
    - Accounts: ${accountNames}
    - Categories: ${categoryNames}

    CRITICAL SECURITY & TOKEN RULES:
    1. **NO RAW DATA**: You do NOT have access to the transaction list. You are blind to the data until you run a tool.
    2. **DO NOT GUESS**: If the user asks "How much did I spend?", you CANNOT answer. You must call 'getFinancialSummary'.
    3. **CLARIFY TIME**: If the user doesn't specify a time range (e.g., "How much did I spend on food?"), ask: "For which month?" or assume current month (monthOffset: 0) but state your assumption.

    QUERY PLAN (Mental Process):
    1. Identify INTENT (Summary, Trend, Breakdown, Search, Add).
    2. Identify TIMEFRAME (Current month, Last month, etc.).
    3. Select TOOL.
    
    TOOL SELECTION GUIDE:
    - "Overview", "Balance", "Net worth", "How am I doing?" -> 'getFinancialSummary'
    - "Where did my money go?", "Spending by category" -> 'getCategoryBreakdown'
    - "Top merchants", "Where do I shop most?" -> 'getMerchantBreakdown'
    - "Spending graph", "Daily spending trend" -> 'getMonthlyTrend'
    - "Find the transaction for...", "Did I pay Netflix?" -> 'searchTransactions'
    - "I spent $50 on..." -> 'addTransaction'

    RESPONSE STYLE:
    - Be concise.
    - Present data clearly (e.g., "Your top expense was Food at $500").
    - Do not list raw JSON.
  `;

  // Filter history to ensure it complies with Gemini format
  const validHistory = history.map(msg => ({
    role: msg.role,
    parts: msg.parts || [{ text: msg.text || "" }]
  }));

  // If query is null, it means we are continuing a tool execution loop
  const contents = [...validHistory];
  if (query) {
    contents.push({ role: 'user', parts: [{ text: query }] });
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ 
            functionDeclarations: [
                addTransactionTool, 
                getFinancialSummaryTool, 
                getCategoryBreakdownTool, 
                getMerchantBreakdownTool,
                getMonthlyTrendTool,
                searchTransactionsTool
            ] 
        }]
      }
    });

    return stream;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
