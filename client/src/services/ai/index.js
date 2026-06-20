/**
 * Unified AI Service — client-side SDK for all Groq AI endpoints
 * Admin, Client Workspace, and Landing Page contexts
 */

// Re-export legacy modules so existing components don't break
export { default as aiModules } from './modules.js';
export { default as groqAI }    from './groqAI.js';

const RAW  = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const BASE = RAW.endsWith("/api") ? RAW : `${RAW}/api`;

async function post(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) throw new Error(json.error || `AI API error ${res.status}`);
  return json;
}

async function get(path) {
  const res  = await fetch(`${BASE}${path}`);
  return res.json();
}

// ── Health ─────────────────────────────────────────────────────────────────────
export const getAIHealth = () => get("/ai/health");
export const getAIModels = () => get("/ai/models");

// ── Admin Chatbot ──────────────────────────────────────────────────────────────
export async function askAdminAI({ query, history = [], moduleContext = "", contextData = {}, model }) {
  return post("/ai/admin-chatbot/ask", { query, history, moduleContext, contextData, model });
}

// ── Client Chatbot ─────────────────────────────────────────────────────────────
export async function askClientAI({ query, history = [], moduleContext = "", workspaceId, model }) {
  return post("/ai/client-chatbot/ask", { query, history, moduleContext, workspaceId, model });
}

// ── Landing Page Chatbot ───────────────────────────────────────────────────────
export async function askLandingAI({ query, history = [], businessName = "Exponify" }) {
  return post("/ai/landing-chat/ask", { query, history, businessName });
}

// ── Quick Actions ──────────────────────────────────────────────────────────────
export async function runQuickAction({ action, contextData = {}, role = "admin", model, customPrompt }) {
  return post("/ai/quick-action", { action, contextData, role, model, customPrompt });
}

export const budgetStatusAI    = (d) => runQuickAction({ action: "budget_status",     contextData: d });
export const crmInsightsAI     = (d) => runQuickAction({ action: "crm_insights",      contextData: d });
export const leadScoreAI       = (d) => runQuickAction({ action: "lead_score",        contextData: d });
export const kpiAnalysisAI     = (d) => runQuickAction({ action: "kpi_analysis",      contextData: d });
export const revenueInsightsAI = (d) => runQuickAction({ action: "revenue_insights",  contextData: d });
export const taskPrioritizeAI  = (d) => runQuickAction({ action: "task_prioritize",   contextData: d });
export const fraudSummaryAI    = (d) => runQuickAction({ action: "fraud_summary",     contextData: d });
export const cashFlowAI        = (d) => runQuickAction({ action: "cash_flow_insight", contextData: d });
export const draftEmailAI      = (d) => runQuickAction({ action: "email_draft",       contextData: d });
export const journalEntryAI    = (d) => runQuickAction({ action: "journal_entry",     contextData: d });
export const invoiceFollowUpAI = (d) => runQuickAction({ action: "invoice_follow_up", contextData: d });

// ── AI Write ───────────────────────────────────────────────────────────────────
export async function aiWrite({ type, context = {}, tone = "professional", language = "English", model }) {
  return post("/ai/write", { type, context, tone, language, model });
}

export const writeEmail        = (ctx, tone) => aiWrite({ type: "email",         context: ctx, tone });
export const writeProposal     = (ctx)       => aiWrite({ type: "proposal",      context: ctx });
export const writeSummary      = (ctx)       => aiWrite({ type: "summary",       context: ctx });
export const writeJobPost      = (ctx)       => aiWrite({ type: "job_post",      context: ctx });
export const writeMeetingNotes = (ctx)       => aiWrite({ type: "meeting_notes", context: ctx });
export const writeSOP          = (ctx)       => aiWrite({ type: "sop",           context: ctx });
export const writeReport       = (ctx)       => aiWrite({ type: "report",        context: ctx });

// ── Generic Chat ───────────────────────────────────────────────────────────────
export async function genericChat({ messages, systemPrompt, model, temperature, maxTokens }) {
  return post("/ai/chat", { messages, systemPrompt, model, temperature, maxTokens });
}

// ── Domain-specific ────────────────────────────────────────────────────────────
export const getCRMInsights    = (data, q) => post("/ai/crm-insights", { crmData: data, query: q });
export const getMarketResearch = (params)  => post("/ai/market-research", params);

// ── Feedback Loop ──────────────────────────────────────────────────────────────
export async function sendAIFeedback({ sessionId, query, response, rating, comment, role = "admin" }) {
  return post("/ai/feedback", { sessionId, query, response, rating, comment, role });
}

// ── Conversation History ───────────────────────────────────────────────────────
export async function getConversationHistory(sessionId, limit = 20) {
  return get(`/ai/conversations/${sessionId}?limit=${limit}`);
}

// ── KB Refresh ─────────────────────────────────────────────────────────────────
export const refreshAIKnowledge = () => post("/ai/kb/refresh", {});

// ── Memory Clear ───────────────────────────────────────────────────────────────
export async function clearAIMemory(sessionId) {
  const res = await fetch(`${BASE}/ai/memory/${sessionId}`, { method: "DELETE" });
  return res.json();
}
