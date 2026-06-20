/**
 * ARIA — Adaptive Resource & Intelligence Assistant (Admin)
 * Powered by Groq llama-3.3-70b-versatile
 *
 * Features:
 * - Intent detection + confidence scoring
 * - Proactive suggestions
 * - Thumbs up/down feedback loop
 * - Navigate-to route links
 * - Module-aware context injection
 * - Multilingual
 * - Pro tips from AI
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, X, Send, Sparkles, Brain, TrendingUp, Target, Zap,
  MessageSquare, Minimize2, Maximize2, Loader2, ThumbsUp, ThumbsDown,
  RefreshCw, Map, ChevronRight, AlertCircle, Lightbulb,
} from "lucide-react";
import { cn } from "../../../lib/adminUtils";

const RAW = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API  = RAW.endsWith("/api") ? RAW : `${RAW}/api`;

// ─── Session ID per browser tab ───────────────────────────────────────────────
const SESSION_ID = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Quick actions by module context ─────────────────────────────────────────

const QUICK_ACTIONS = {
  crm:         [{ icon: Target,      label: "Score Leads",        action: "lead_score"        },
                { icon: TrendingUp,  label: "CRM Insights",       action: "crm_insights"      },
                { icon: MessageSquare,label:"Draft Follow-Up",    action: "email_draft"       }],
  finance:     [{ icon: TrendingUp,  label: "Budget Status",      action: "budget_status"     },
                { icon: Brain,       label: "Cash Flow Analysis",  action: "cash_flow_insight" },
                { icon: Zap,         label: "Fraud Summary",       action: "fraud_summary"     }],
  accounting:  [{ icon: Brain,       label: "Journal Entry Help",  action: "journal_entry"     },
                { icon: Target,      label: "KPI Analysis",        action: "kpi_analysis"      },
                { icon: Sparkles,    label: "Write Report",        action: "report_narration"  }],
  invoicing:   [{ icon: MessageSquare,label:"Invoice Follow-Up",  action: "invoice_follow_up" },
                { icon: Brain,       label: "Revenue Insights",    action: "revenue_insights"  },
                { icon: Sparkles,    label: "Write Proposal",      action: "write_proposal"    }],
  hr:          [{ icon: Target,      label: "Payroll Review",      action: "payroll_summary"   },
                { icon: Brain,       label: "Attendance Analysis",  action: "attendance_report" },
                { icon: Sparkles,    label: "Write Job Post",       action: "job_post"          }],
  projects:    [{ icon: Target,      label: "Risk Analysis",        action: "project_risks"     },
                { icon: Brain,       label: "Prioritize Tasks",     action: "task_prioritize"   },
                { icon: Sparkles,    label: "Meeting Agenda",       action: "meeting_agenda"    }],
  analytics:   [{ icon: TrendingUp,  label: "KPI Analysis",        action: "kpi_analysis"      },
                { icon: Brain,       label: "Revenue Insights",     action: "revenue_insights"  },
                { icon: Zap,         label: "Market Brief",         action: "market_brief"      }],
  marketing:   [{ icon: Sparkles,    label: "Campaign Brief",       action: "market_brief"      },
                { icon: Target,      label: "Write Announcement",   action: "announcement"      },
                { icon: Brain,       label: "Write Proposal",       action: "write_proposal"    }],
  default:     [{ icon: Brain,       label: "KPI Insights",         action: "kpi_analysis"      },
                { icon: TrendingUp,  label: "Revenue Report",       action: "revenue_insights"  },
                { icon: Sparkles,    label: "Market Research",      action: "market_brief"      }],
};

// ─── Welcome messages ─────────────────────────────────────────────────────────

const WELCOMES = {
  crm:       "ARIA here — your Sales Intelligence advisor. I can score leads, analyze your pipeline, draft follow-ups, and help close more deals.",
  finance:   "ARIA online — your CFO-grade finance advisor. Ask me about budgets, cash flow, expense approvals, or fraud alerts.",
  accounting:"ARIA ready — your CPA-level accounting expert. I can help with journal entries, trial balance, account reconciliation.",
  invoicing: "ARIA active — your billing specialist. Ask about invoices, payment follow-ups, or generating proposals.",
  hr:        "ARIA here — your HR advisory system. Ask about payroll, attendance patterns, performance reviews, or job posts.",
  projects:  "ARIA ready — your project strategist. I can identify risks, break down tasks, estimate timelines, and draft agendas.",
  analytics: "ARIA online — your BI analyst. I can surface KPI insights, revenue patterns, and market intelligence.",
  marketing: "ARIA active — your marketing strategist. Ask about campaigns, content, or competitive positioning.",
  default:   "ARIA online — your intelligent admin assistant. Ask me anything about any module, get data insights, or navigate the platform.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callApi(path, body) {
  const res  = await fetch(`${API}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json();
}

async function callGet(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

// ─── Message component ────────────────────────────────────────────────────────

function Message({ msg, onNavigate, onFeedback }) {
  const [fbGiven, setFbGiven] = useState(null);

  function handleFeedback(rating) {
    setFbGiven(rating);
    onFeedback({ rating, query: msg.query, response: msg.text });
  }

  return (
    <div className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
      {msg.role === "assistant" && (
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={13} className="text-primary" />
        </div>
      )}

      <div className={cn("max-w-[85%] space-y-1.5", msg.role === "user" && "items-end flex flex-col")}>
        {/* Bubble */}
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
          msg.role === "user"
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-white/[0.06] text-white/90 border border-white/10 rounded-tl-sm"
        )}>
          {msg.text}
        </div>

        {/* Intent badge */}
        {msg.intent && msg.role === "assistant" && (
          <span className="text-[10px] text-white/30 font-mono">{msg.intent} · {msg.confidence ? `${Math.round(msg.confidence * 100)}% confidence` : ""}</span>
        )}

        {/* Navigate button */}
        {msg.route && msg.role === "assistant" && (
          <button
            onClick={() => onNavigate(msg.route)}
            className="flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary font-medium group"
          >
            <Map size={11} />
            <span>{msg.routeLabel || "Open Module"}</span>
            <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Pro tip */}
        {msg.proTip && msg.role === "assistant" && (
          <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 text-xs text-amber-400">
            <Lightbulb size={11} className="mt-0.5 shrink-0" />
            <span>{msg.proTip}</span>
          </div>
        )}

        {/* Related modules */}
        {msg.relatedModules?.length > 0 && msg.role === "assistant" && (
          <div className="flex flex-wrap gap-1">
            {msg.relatedModules.map(m => (
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{m}</span>
            ))}
          </div>
        )}

        {/* Feedback */}
        {msg.role === "assistant" && !msg.isWelcome && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFeedback("thumbs_up")}
              className={cn("p-1 rounded transition-colors", fbGiven === "thumbs_up" ? "text-green-400" : "text-white/20 hover:text-white/50")}
            >
              <ThumbsUp size={11} />
            </button>
            <button
              onClick={() => handleFeedback("thumbs_down")}
              className={cn("p-1 rounded transition-colors", fbGiven === "thumbs_down" ? "text-red-400" : "text-white/20 hover:text-white/50")}
            >
              <ThumbsDown size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Proactive suggestions ────────────────────────────────────────────────────

function Suggestions({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onSelect(s)}
          className="text-xs px-2.5 py-1 rounded-full border border-primary/25 text-primary/70 hover:border-primary/60 hover:text-primary hover:bg-primary/10 transition-all truncate max-w-[180px]">
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant({ context = "default", contextData = {}, moduleContext, className }) {
  const navigate      = useNavigate();
  const [open, setOpen]         = useState(false);
  const [minimized, setMin]     = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: WELCOMES[context] || WELCOMES.default, isWelcome: true }
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoad]  = useState(false);
  const [suggestions, setSug] = useState([]);
  const [status, setStatus]   = useState(null); // "online" | "error"
  const [unread, setUnread]   = useState(0);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]);

  const ctx = moduleContext || context;
  const qas = QUICK_ACTIONS[ctx] || QUICK_ACTIONS.default;

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  // Check health on first open
  useEffect(() => {
    if (!open || status !== null) return;
    callGet("/ai/health").then(d => setStatus(d.status === "operational" ? "online" : "degraded")).catch(() => setStatus("error"));
  }, [open, status]);

  const addMsg = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
    if (!open) setUnread(n => n + 1);
  }, [open]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setSug([]);

    const userMsg = { role: "user", text: q };
    setMessages(prev => [...prev, userMsg]);
    historyRef.current = [...historyRef.current.slice(-9), { role: "user", content: q }];
    setLoad(true);

    try {
      const res = await callApi("/ai/admin-chatbot/ask", {
        query:         q,
        history:       historyRef.current.slice(0, -1),
        moduleContext: ctx,
        contextData,
        sessionId:     SESSION_ID,
      });

      const answer = res.answer || "I couldn't generate a response. Please try again.";
      historyRef.current.push({ role: "assistant", content: answer });

      const aiMsg = {
        role:           "assistant",
        text:           answer,
        route:          res.route,
        routeLabel:     res.routeLabel,
        proTip:         res.proTip,
        relatedModules: res.relatedModules,
        intent:         res.intent,
        confidence:     parseFloat(res.confidence),
        query:          q,
      };

      addMsg(aiMsg);
      if (res.suggestions?.length) setSug(res.suggestions);
    } catch (e) {
      addMsg({ role: "assistant", text: "Connection issue — please check server is running and try again.", isError: true });
    } finally {
      setLoad(false);
    }
  }

  async function runQuickAction(action, label) {
    setSug([]);
    const q = `Run: ${label} (${action})`;
    setMessages(prev => [...prev, { role: "user", text: label }]);
    setLoad(true);

    try {
      const res = await callApi("/ai/quick-action", {
        action,
        contextData,
        role:    "admin",
        sessionId: SESSION_ID,
      });
      addMsg({ role: "assistant", text: res.result || "Action completed.", intent: action });
    } catch {
      addMsg({ role: "assistant", text: "Action failed — try asking me directly instead.", isError: true });
    } finally {
      setLoad(false);
    }
  }

  async function sendFeedback({ rating, query, response }) {
    await callApi("/ai/feedback", { sessionId: SESSION_ID, query, response, rating, role: "admin" }).catch(() => {});
  }

  function handleNavigate(route) {
    if (route?.startsWith("/")) navigate(route);
    setOpen(false);
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function clearChat() {
    setMessages([{ role: "assistant", text: WELCOMES[ctx] || WELCOMES.default, isWelcome: true }]);
    historyRef.current = [];
    setSug([]);
  }

  // ─── Minimized / closed toggle button ───────────────────────────────────────

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all text-sm font-medium",
          className
        )}
      >
        <Bot size={15} />
        <span>ARIA</span>
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ─── Full widget ─────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[9990] w-[380px] flex flex-col rounded-2xl shadow-2xl border border-white/10 bg-[#0d1117] overflow-hidden",
      minimized ? "h-auto" : "max-h-[640px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-primary/80 to-violet-600/80 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <Bot size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">ARIA</p>
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase",
              status === "online"   ? "bg-green-500/30 text-green-300" :
              status === "degraded" ? "bg-amber-500/30 text-amber-300" :
              status === "error"    ? "bg-red-500/30 text-red-300" :
                                     "bg-white/10 text-white/40"
            )}>
              {status || "connecting"}
            </span>
          </div>
          <p className="text-[10px] text-white/60 flex items-center gap-1"><Sparkles size={8} /> Adaptive Intelligence · Groq</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-1.5 text-white/50 hover:text-white transition-colors" title="New conversation">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setMin(m => !m)} className="p-1.5 text-white/50 hover:text-white transition-colors">
            {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 text-white/50 hover:text-white transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-[400px]">
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} onNavigate={handleNavigate} onFeedback={sendFeedback} />
            ))}
            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Loader2 size={13} className="text-primary animate-spin" />
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/10">
                  <div className="flex items-center gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Proactive suggestions */}
          <Suggestions suggestions={suggestions} onSelect={send} />

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {qas.map(({ icon: Icon, label, action }) => (
              <button
                key={action}
                onClick={() => runQuickAction(action, label)}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all whitespace-nowrap disabled:opacity-40"
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/10 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask ARIA anything…"
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-primary/50 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-30 transition-opacity shrink-0"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AIAssistant;
