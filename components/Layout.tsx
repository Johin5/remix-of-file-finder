
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, Wallet, Plus, ListFilter, Send, Sparkles, X, CheckCircle2, Loader2, Bot, Mic, AudioLines, Radio, TrendingUp, CreditCard, DollarSign } from 'lucide-react';
import TransactionForm from './TransactionForm';
import { useFinance } from '../context/FinanceContext';
import { processQueryStream, addTransactionTool, getFinancialSummaryTool, getCategoryBreakdownTool, searchTransactionsTool, getMerchantBreakdownTool, getMonthlyTrendTool } from '../services/ai';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { getMonthRange } from '../utils/dateHelpers';
import { isWithinInterval, format, subMonths, eachDayOfInterval, isSameDay } from 'date-fns';
import StreakReward from './StreakReward';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text?: string;
    success?: string;
    isTool?: boolean;
    parts?: any[]; // Store structured parts for history API
}

// --- Audio Helpers ---
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // Little Endian
    }
    return buffer;
}

function base64EncodeAudio(float32Array: Float32Array): string {
    const arrayBuffer = floatTo16BitPCM(float32Array);
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64DecodeAudio(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

const Layout: React.FC = () => {
  const { accounts, categories, transactions, settings, addTransaction, isTransactionModalOpen, openTransactionModal, closeTransactionModal, showStreakReward } = useFinance();
  const location = useLocation();
  
  const [isAiMode, setIsAiMode] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const initialGreeting = 'Hi! I can help you track expenses. Ask me about your spending, recent activity, or add a new transaction.';

  // Chat State
  const [aiInput, setAiInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
      { id: 'init', role: 'model', text: initialGreeting }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Visibility Logic ---
  const showAiBubble = ['/', '/transactions', '/analytics', '/budgets'].includes(location.pathname);

  // --- Voice Mode State & Refs ---
  const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'listening' | 'speaking'>('connecting');
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const isSessionActive = useRef(false);

  // Auto-scroll to bottom of chat
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages, isAiMode]);

  // Focus input when AI mode opens
  useEffect(() => {
    if (isAiMode && !isVoiceMode && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isAiMode, isVoiceMode]);

  // Cleanup on unmount to prevent zombie connections
  useEffect(() => {
    return () => {
      if (isSessionActive.current) {
        stopVoiceSession();
      }
    };
  }, []);

  // --- "Backend" Execution Helper (The Query Engine) ---
  const executeFinancialQuery = (name: string, args: any) => {
    // Helper: Resolve Date Range
    const now = new Date();
    const monthOffset = args.monthOffset || 0;
    const targetDate = subMonths(now, Math.abs(monthOffset));
    const { start, end } = getMonthRange(targetDate, settings.monthlyStartDate);
    const dateLabel = settings.monthlyStartDate === 1 
        ? format(targetDate, 'MMMM yyyy')
        : `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;

    // 1. Get Financial Summary
    if (name === 'getFinancialSummary') {
        const relevantTxs = transactions.filter(t => isWithinInterval(new Date(t.date), { start, end }));
        let income = 0;
        let expense = 0;
        relevantTxs.forEach(t => {
            if (t.type === 'income') income += t.amount;
            if (t.type === 'expense') expense += t.amount;
            if (t.type === 'transfer') {
                const toAcc = accounts.find(a => a.id === t.to_account_id);
                if (toAcc?.type === 'credit') expense += t.amount;
            }
        });
        return { 
            period: dateLabel,
            income, 
            expense, 
            net: income - expense,
            transactionCount: relevantTxs.length
        };
    }

    // 2. Get Category Breakdown
    if (name === 'getCategoryBreakdown') {
        const type = args.type || 'expense';
        const limit = 5; // Hard limit per requirements
        const relevantTxs = transactions.filter(t => 
            t.type === type && isWithinInterval(new Date(t.date), { start, end })
        );

        const agg: Record<string, number> = {};
        relevantTxs.forEach(t => {
            const cat = categories.find(c => c.id === t.category_id);
            const name = cat?.name || 'Uncategorized';
            agg[name] = (agg[name] || 0) + t.amount;
        });

        const breakdown = Object.entries(agg)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);

        return { period: dateLabel, breakdown };
    }

    // 3. Get Merchant Breakdown
    if (name === 'getMerchantBreakdown') {
        const limit = 5; // Hard limit
        const relevantTxs = transactions.filter(t => 
            t.type === 'expense' && isWithinInterval(new Date(t.date), { start, end })
        );

        const agg: Record<string, number> = {};
        relevantTxs.forEach(t => {
            // Use notes as proxy for merchant/payee
            const merchant = t.notes || 'Unspecified';
            agg[merchant] = (agg[merchant] || 0) + t.amount;
        });

        const breakdown = Object.entries(agg)
            .map(([merchant, amount]) => ({ merchant, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);

        return { period: dateLabel, breakdown };
    }

    // 4. Get Monthly Trend
    if (name === 'getMonthlyTrend') {
        const days = eachDayOfInterval({ start, end });
        // Limit max points to ~30 (one month)
        const trend = days.map(day => {
            const amount = transactions
                .filter(t => t.type === 'expense' && isSameDay(new Date(t.date), day))
                .reduce((sum, t) => sum + t.amount, 0);
            return { date: format(day, 'yyyy-MM-dd'), amount };
        });

        return { period: dateLabel, trend };
    }

    // 5. Search Transactions
    if (name === 'searchTransactions') {
        const query = args.query.toLowerCase();
        let pool = transactions;
        
        // Optional Date Filter
        if (args.monthOffset !== undefined) {
             pool = pool.filter(t => isWithinInterval(new Date(t.date), { start, end }));
        }

        const results = pool.filter(t => {
            const cat = categories.find(c => c.id === t.category_id)?.name.toLowerCase() || '';
            const notes = (t.notes || '').toLowerCase();
            const matchesQuery = cat.includes(query) || notes.includes(query);
            
            const matchesAmount = (!args.minAmount || t.amount >= args.minAmount) && 
                                  (!args.maxAmount || t.amount <= args.maxAmount);

            return matchesQuery && matchesAmount;
        })
        .slice(0, 10) // Guardrail: Max 10 items
        .map(t => ({
            date: t.date.split('T')[0],
            amount: t.amount,
            type: t.type,
            category: categories.find(c => c.id === t.category_id)?.name,
            notes: t.notes
        }));

        return { count: results.length, transactions: results };
    }

    // 6. Add Transaction (Write)
    if (name === 'addTransaction') {
        // ... (Logic from previous impl)
        const account = accounts.find(a => a.name.toLowerCase().includes(args.accountName?.toLowerCase() || '')) || accounts[0];
        const toAccount = args.toAccountName ? accounts.find(a => a.name.toLowerCase().includes(args.toAccountName.toLowerCase())) : undefined;
        
        let category;
        if (args.categoryName) {
            category = categories.find(c => c.name.toLowerCase().includes(args.categoryName.toLowerCase()));
        }
        if (!category) {
            category = categories.find(c => c.type === (args.type || 'expense')) || categories[0];
        }

        const newTx = {
            id: crypto.randomUUID(),
            type: (args.type as any) || 'expense',
            amount: args.amount,
            currency: 'INR',
            date: args.date ? new Date(args.date).toISOString() : new Date().toISOString(),
            account_id: account.id,
            to_account_id: toAccount?.id,
            category_id: category.id,
            notes: args.notes || (args.type === 'income' ? 'Income' : 'AI Entry'),
            created_at: Date.now(),
            is_recurring: false
        };

        addTransaction(newTx);
        return { status: "success", message: `Added ${settings.currencySymbol}${args.amount} to ${category.name}` };
    }

    return { error: "Unknown tool" };
  };

  // --- Live API (Voice) Logic ---
  const startVoiceSession = async () => {
      if (isSessionActive.current) return;
      if (!process.env.API_KEY) {
          alert("API Key is missing. Please check your environment configuration.");
          return;
      }

      setIsVoiceMode(true);
      if(!isAiMode) setIsAiMode(true);
      setVoiceStatus('connecting');
      isSessionActive.current = true;
      
      try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass({ sampleRate: 24000 });
          await ctx.resume(); 
          audioContextRef.current = ctx;
          nextStartTimeRef.current = ctx.currentTime;
          const inputCtx = new AudioContextClass(); 
          await inputCtx.resume();
          inputContextRef.current = inputCtx;

          const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true } 
          });
          audioStreamRef.current = stream;
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(2048, 1, 1);
          inputSourceRef.current = source;
          processorRef.current = processor;
          const muteNode = inputCtx.createGain();
          muteNode.gain.value = 0;
          processor.connect(muteNode);
          muteNode.connect(inputCtx.destination);

          // Metadata for System Prompt
          const accountNames = accounts.map(a => a.name).join(", ");
          const categoryNames = categories.map(c => c.name).join(", ");
          const dynamicSystemInstruction = `
            You are PocketLedger Voice. Today: ${new Date().toDateString()}.
            Currency: ${settings.currencySymbol}.
            Available Metadata: Accounts[${accountNames}], Categories[${categoryNames}].
            
            CRITICAL RULES:
            1. **NO RAW DATA**: You CANNOT see transactions. You must use tools to answer questions.
            2. **TOOL FIRST**: To answer "How much did I spend?", call 'getFinancialSummary'. To answer "On what?", call 'getCategoryBreakdown'.
            3. **ADD FLOW**: If user wants to add, ask for Category & Account.
            4. **CONCISE**: Spoken responses must be very short (under 20 words).
          `;

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const sessionPromise = ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-09-2025',
              config: {
                  responseModalities: [Modality.AUDIO],
                  tools: [{ 
                      functionDeclarations: [
                          addTransactionTool, 
                          getFinancialSummaryTool, 
                          getCategoryBreakdownTool, 
                          getMerchantBreakdownTool,
                          getMonthlyTrendTool,
                          searchTransactionsTool
                      ] 
                  }],
                  systemInstruction: dynamicSystemInstruction,
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
              callbacks: {
                  onopen: () => {
                      if (!isSessionActive.current) return;
                      setVoiceStatus('listening');
                      processor.onaudioprocess = (e) => {
                          if (!isSessionActive.current) return;
                          const inputData = e.inputBuffer.getChannelData(0);
                          const base64Data = base64EncodeAudio(inputData);
                          const currentRate = inputCtx.sampleRate || 16000;
                          sessionPromise.then(session => {
                              try {
                                session.sendRealtimeInput({ media: { mimeType: `audio/pcm;rate=${currentRate}`, data: base64Data } });
                              } catch(e) {}
                          }).catch(() => {});
                      };
                      source.connect(processor);
                  },
                  onmessage: async (msg: LiveServerMessage) => {
                      if (!isSessionActive.current) return;
                      // Handle Tool Calls
                      if (msg.toolCall) {
                          for (const fc of msg.toolCall.functionCalls) {
                              const result = executeFinancialQuery(fc.name, fc.args);
                              sessionPromise.then(session => {
                                  session.sendToolResponse({
                                      functionResponses: { id: fc.id, name: fc.name, response: { result } }
                                  });
                              });
                          }
                      }
                      // Handle Audio Output
                      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                      if (audioData) {
                          setVoiceStatus('speaking');
                          const bytes = base64DecodeAudio(audioData);
                          const dataInt16 = new Int16Array(bytes.buffer);
                          const float32 = new Float32Array(dataInt16.length);
                          for(let i=0; i<dataInt16.length; i++) float32[i] = dataInt16[i] / 32768.0;
                          
                          if (ctx.state === 'suspended') await ctx.resume();
                          const buffer = ctx.createBuffer(1, float32.length, 24000);
                          buffer.getChannelData(0).set(float32);
                          const sourceNode = ctx.createBufferSource();
                          sourceNode.buffer = buffer;
                          sourceNode.connect(ctx.destination);
                          const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
                          sourceNode.start(startTime);
                          nextStartTimeRef.current = startTime + buffer.duration;
                          sourceNode.onended = () => { if (ctx.currentTime >= nextStartTimeRef.current - 0.2) setVoiceStatus('listening'); };
                      }
                  },
                  onclose: () => { setVoiceStatus('connecting'); isSessionActive.current = false; },
                  onerror: () => { if (isSessionActive.current) stopVoiceSession(); }
              }
          });
          sessionRef.current = sessionPromise;
      } catch (err) {
          stopVoiceSession();
      }
  };

  const stopVoiceSession = () => {
      isSessionActive.current = false;
      if (sessionRef.current) { sessionRef.current.then(session => session.close()).catch(() => {}); sessionRef.current = null; }
      if (processorRef.current) { processorRef.current.disconnect(); processorRef.current.onaudioprocess = null; processorRef.current = null; }
      if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
      if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(track => track.stop()); audioStreamRef.current = null; }
      if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
      if (inputContextRef.current) { inputContextRef.current.close(); inputContextRef.current = null; }
      setIsVoiceMode(false);
      setVoiceStatus('connecting');
  };

  const handleClose = (e?: React.MouseEvent) => {
      e?.stopPropagation(); 
      setIsAiMode(false);
      if (isVoiceMode) stopVoiceSession();
      setTimeout(() => {
          if (messages.length > 1) {
              setMessages([{ id: 'init', role: 'model', text: initialGreeting }]);
          }
      }, 500);
  };

  // --- Main Chat Logic (Refactored for Multi-Turn Tools) ---
  const handleAiSubmit = async (textOverride?: string) => {
      const textToProcess = textOverride || aiInput;
      if (!textToProcess.trim() || aiLoading) return;
      
      setAiInput('');
      setAiLoading(true);
      
      // Add User Message
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: textToProcess, parts: [{ text: textToProcess }] };
      setMessages(prev => [...prev, userMsg]);

      // Placeholder for streaming response
      const responseId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: responseId, role: 'model', text: '' }]);

      // Recursive function to handle the conversation loop
      const runChatLoop = async (currentQuery: string | null, currentHistory: ChatMessage[]) => {
          try {
            const apiHistory = currentHistory.map(m => ({
                role: m.role,
                parts: m.parts || [{ text: m.text || '' }]
            }));

            const stream = await processQueryStream(currentQuery, {
                accounts, categories, transactions, currencySymbol: settings.currencySymbol, monthlyStartDate: settings.monthlyStartDate
            }, apiHistory);

            let accumulatedText = '';
            let toolCalls = [];

            for await (const chunk of stream) {
                // Accumulate Text
                if (chunk.text) {
                    accumulatedText += chunk.text;
                    setMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: accumulatedText } : m));
                }
                // Accumulate Tool Calls
                if (chunk.functionCalls) {
                    toolCalls.push(...chunk.functionCalls);
                }
            }
            
            // If Text was generated, update history
            if (accumulatedText) {
                // Update the placeholder message with final text
                const finalModelMsg: ChatMessage = { 
                    id: responseId, 
                    role: 'model', 
                    text: accumulatedText,
                    parts: [{ text: accumulatedText }] 
                };
                // We don't push new here, we updated the existing one via setMessages. 
                // But for the *next* loop iteration, we need it in history.
                // However, if we have tool calls, the model might have output text AND tool calls.
            }

            // Handle Tools
            if (toolCalls.length > 0) {
                // 1. Add the Model's Tool Call to History
                const toolCallParts = toolCalls.map(fc => ({
                    functionCall: { name: fc.name, args: fc.args }
                }));
                
                const modelTurn = {
                    role: 'model',
                    parts: accumulatedText ? [{ text: accumulatedText }, ...toolCallParts] : toolCallParts
                };

                // Execute Tools
                const functionResponses = [];
                for (const call of toolCalls) {
                    const result = executeFinancialQuery(call.name, call.args);
                    functionResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: { result: result }
                        }
                    });
                    
                    // Optional: Show visual feedback for Write actions
                    if (call.name === 'addTransaction') {
                         setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', success: result.message || "Done", isTool: true }]);
                    }
                }

                // 2. Add Function Response
                const responseTurn = {
                    role: 'user', 
                    parts: functionResponses
                };

                // RECURSIVE CALL: Send the tool outputs back to the model to get the final answer
                // We pass `null` as query because the "user" input is the tool response
                await runChatLoop(null, [...currentHistory, modelTurn as any, responseTurn as any]);
            }

          } catch (err) {
              console.error(err);
              setMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: "Sorry, I encountered an error. Please try again." } : m));
          }
      };

      // Start the loop
      const historySnapshot = messages.filter(m => !m.isTool); // Exclude UI-only success messages
      await runChatLoop(textToProcess, historySnapshot);
      setAiLoading(false);
  };
  
  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-gray-50 dark:bg-[#0c0a18] overflow-hidden relative shadow-2xl border-x border-zinc-200 dark:border-white/5 transition-colors duration-300">
      <style>{`
        @keyframes wave {
            0%, 100% { height: 4px; opacity: 0.5; }
            50% { height: 100%; opacity: 1; }
        }
        @keyframes wave-slow {
            0%, 100% { height: 4px; opacity: 0.4; }
            50% { height: 12px; opacity: 0.8; }
        }
      `}</style>
      
      {showStreakReward && <StreakReward />}

      {/* Main Content Area - Unchanged scaling, just opacity/blur transition handled by overlay */}
      <div 
        className="flex-1 overflow-y-auto no-scrollbar pb-24 relative z-10 text-zinc-900 dark:text-white"
      >
        <Outlet />
      </div>

      {/* FAB - Visible when AI is closed */}
      <div className={`absolute bottom-24 right-5 z-40 transition-all duration-300 ease-out ${isAiMode || !showAiBubble ? 'translate-y-20 opacity-0 scale-50 pointer-events-none' : 'translate-y-0 opacity-100 scale-100'}`}>
         <button 
           onClick={() => setIsAiMode(true)}
           className="w-14 h-14 rounded-full bg-white dark:bg-[#1e1b2e] shadow-xl shadow-violet-500/20 border border-white/20 flex items-center justify-center text-violet-600 dark:text-violet-400 active:scale-90 transition-transform hover:scale-105"
        >
            <Sparkles size={24} />
        </button>
      </div>

      {/* AI Overlay Interface */}
      {isAiMode && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
              {/* Blurred Backdrop - Lighter to show background */}
              <div 
                className="absolute inset-0 bg-white/30 dark:bg-black/60 backdrop-blur-lg animate-in fade-in duration-300"
                onClick={handleClose}
              ></div>

              {/* Chat Container */}
              <div className="relative z-10 w-full max-w-md mx-auto h-full flex flex-col pointer-events-none">
                  
                  {/* Messages Area - Floats on top */}
                  <div 
                     ref={scrollRef}
                     className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pointer-events-auto flex flex-col"
                  >
                      {/* Spacer to push messages to bottom initially */}
                      <div className="mt-auto"></div>

                      {messages.map((msg) => {
                          // Hide empty model messages (placeholders) to avoid double bubbles with loader
                          if (msg.role === 'model' && !msg.text && !msg.success && !msg.isTool) return null;

                          return (
                          <div key={msg.id} className={`flex w-full animate-in slide-in-from-bottom-10 fade-in duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-lg relative backdrop-blur-md ${
                                  msg.role === 'user' 
                                      ? 'bg-violet-600 text-white rounded-tr-sm shadow-violet-600/20' 
                                      : msg.success
                                         ? 'bg-emerald-500 text-white rounded-tl-sm shadow-emerald-500/20'
                                         : 'bg-white/90 dark:bg-[#1e1b2e]/90 text-zinc-800 dark:text-zinc-100 border border-white/20 dark:border-white/5 rounded-tl-sm shadow-xl'
                              }`}>
                                  {msg.success ? (
                                      <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                                             <CheckCircle2 size={16} />
                                          </div>
                                          <span className="font-semibold text-sm">{msg.success}</span>
                                      </div>
                                  ) : (
                                      <span>{msg.text}</span>
                                  )}
                              </div>
                          </div>
                      )})}
                      
                      {aiLoading && (
                          <div className="flex justify-start w-full animate-in fade-in">
                              <div className="bg-white/90 dark:bg-[#1e1b2e]/90 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 border border-white/20 dark:border-white/5 shadow-lg backdrop-blur-md">
                                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                              </div>
                          </div>
                      )}
                      
                      {/* Spacer for input bar */}
                      <div className="h-24"></div>
                  </div>

                  {/* Input Bar - Fixed at bottom */}
                  <div className="absolute bottom-0 left-0 w-full p-4 pointer-events-auto">
                      <div className="bg-white dark:bg-[#151225] border border-zinc-200 dark:border-white/10 shadow-2xl rounded-[2rem] p-2 flex items-center gap-2 animate-in slide-in-from-bottom-20 duration-500 ease-out">
                          
                          {/* Close Button */}
                          <button 
                              onClick={handleClose}
                              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-all shrink-0 hover:bg-zinc-200 dark:hover:bg-white/10 active:scale-90"
                          >
                              <X size={20} />
                          </button>

                          {/* Input Field */}
                          <div className="flex-1 relative">
                              <input 
                                  ref={inputRef}
                                  type="text"
                                  value={aiInput}
                                  onChange={(e) => setAiInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                                  placeholder={isVoiceMode ? (voiceStatus === 'connecting' ? "Connecting..." : voiceStatus === 'speaking' ? "Speaking..." : "Listening...") : "Ask AI..."}
                                  disabled={aiLoading || isVoiceMode}
                                  className={`w-full h-10 rounded-full bg-transparent pl-2 pr-2 text-[16px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none transition-all font-medium ${isVoiceMode ? 'placeholder:text-violet-500' : ''}`}
                              />
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0">
                               {isVoiceMode ? (
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); stopVoiceSession(); }}
                                      className="h-10 px-4 rounded-full bg-violet-600 text-white flex items-center justify-center gap-2 hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/30 animate-in fade-in zoom-in-95 duration-200"
                                  >
                                      <div className="flex items-center justify-center gap-[3px] h-3.5 min-w-[20px]">
                                          {[1, 2, 3, 4].map((i) => (
                                              <div 
                                                  key={i}
                                                  className={`w-[3px] bg-white rounded-full transition-all duration-300 ${
                                                      voiceStatus === 'speaking' 
                                                      ? 'animate-[wave_0.4s_ease-in-out_infinite]' 
                                                      : 'animate-[wave-slow_1.5s_ease-in-out_infinite]'
                                                  }`}
                                                  style={{ animationDelay: `${i * 0.1}s` }}
                                              />
                                          ))}
                                      </div>
                                  </button>
                               ) : aiInput.trim() ? (
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleAiSubmit(); }}
                                      disabled={aiLoading}
                                      className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20 active:scale-95"
                                  >
                                      {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
                                  </button>
                               ) : (
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); startVoiceSession(); }}
                                      className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
                                  >
                                      <AudioLines size={20} />
                                  </button>
                               )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Floating Bottom Navigation - Hides when AI is open */}
      <nav className={`absolute bottom-0 w-full glass-nav pb-safe pt-2 px-6 z-20 h-20 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isAiMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <div className="flex justify-between items-center h-full pb-2">
             <NavLink to="/" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <LayoutDashboard size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Home</span>
                 </>
               )}
             </NavLink>
             <NavLink to="/transactions" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <ListFilter size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Trans.</span>
                 </>
               )}
             </NavLink>

             {/* Central Plus Button (Manual Entry) */}
             <div className="relative -top-5">
                <button 
                  onClick={() => openTransactionModal()}
                  className="w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/20 flex items-center justify-center border border-white/20 active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={2.5} />
                </button>
             </div>

             <NavLink to="/budgets" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <Wallet size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Budgets</span>
                 </>
               )}
             </NavLink>
             <NavLink to="/analytics" className={({isActive}) => `flex flex-col items-center gap-1 w-14 transition-all duration-300 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
               {({ isActive }) => (
                 <>
                   <PieChart size={22} strokeWidth={isActive ? 2.5 : 2} />
                   <span className="text-[10px] font-medium">Stats</span>
                 </>
               )}
             </NavLink>
        </div>
      </nav>

      {/* Transaction Modal - Controlled by Global Context */}
      {isTransactionModalOpen && (
        <TransactionForm onClose={closeTransactionModal} />
      )}
    </div>
  );
};

export default Layout;
