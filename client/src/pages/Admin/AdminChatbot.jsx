import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Bot, MessageSquare, Zap, Send, X, Edit2, Trash2,
  Save, ToggleLeft, ToggleRight, Search, Brain, CheckCircle,
  AlertCircle, Loader2, BookOpen, Settings, BarChart2, ChevronRight,
  Sparkles, RefreshCw, Copy, Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "../../components/admin/ui";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE === "/api" || /\/api$/i.test(RAW_API_BASE)
  ? RAW_API_BASE : `${RAW_API_BASE}/api`;

const DEFAULT_KB = [
  { id: "enable-modules", title: "Enable client modules", keywords: "enable, modules, client, workspace, toggle, access", excerpt: "Go to Admin > Workspace Administration, select the client workspace, then enable the required modules in the module access panel.", active: true },
  { id: "reset-admin-access", title: "Reset admin access", keywords: "reset, admin, access, restore, unlock, account", excerpt: "Open Admin > Account Control, search for the user, click Edit, then set role to Admin and status to Active.", active: true },
  { id: "audit-logs", title: "View audit logs", keywords: "audit, logs, activity, history, track, changes", excerpt: "Audit logs are in Admin > Audit Logs. Use filters to view actions by date, user, and module. Export to CSV for compliance.", active: true },
  { id: "facebook-connect", title: "Connect Facebook page", keywords: "facebook, FB, page, connect, messenger, social, meta", excerpt: "Connect Facebook pages in Admin > Facebook Connect. Authorize via Facebook login, select pages, and enable messenger auto-reply.", active: true },
  { id: "payroll-run", title: "Run payroll", keywords: "payroll, salary, pay, run payroll, compute, wages", excerpt: "Go to Admin > Payroll, select the pay period, review deductions and contributions, then click Run Payroll. Export pay slips from there.", active: true },
];

const TABS = [
  { id: "chat",      label: "Live Test",      icon: MessageSquare },
  { id: "rules",     label: "Auto-Reply Rules", icon: Zap },
  { id: "kb",        label: "Knowledge Base",  icon: BookOpen },
  { id: "analytics", label: "Analytics",       icon: BarChart2 },
  { id: "settings",  label: "AI Settings",     icon: Settings },
];

// ─── Live Chat Test ─────────────────────────────────────────────────────────────
function LiveChatTest() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm the Exponify Admin AI. Ask me anything about the admin panel — modules, settings, workflows, HR, finance, and more. I'm here to help!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const send = async (query) => {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      const r = await fetch(`${API_BASE_URL}/ai/admin-chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, history, moduleContext: "admin-chatbot-test" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Request failed");
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          text: data.answer || "No response.",
          route: data.route,
          routeLabel: data.routeLabel,
          snippets: data.snippets || [],
        },
      ]);
    } catch (e) {
      setMessages((p) => [...p, { role: "assistant", text: `Error: ${e.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED = [
    "How do I enable modules for a client workspace?",
    "Where are audit logs?",
    "How do I connect a Facebook page?",
    "How do I run payroll?",
    "Where do I manage team leave requests?",
  ];

  return (
    <div className="flex flex-col border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-secondary)]" style={{ height: "min(600px, calc(100vh - 340px))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="w-8 h-8 rounded-xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] flex items-center justify-center border border-[var(--brand-cyan-border)]">
          <Bot className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-sm text-[var(--text-primary)]">Exponify Admin AI</p>
          <p className="text-xs text-[var(--text-muted)]">Live test environment</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="text-xs text-[var(--text-muted)]">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--brand-cyan-border)]">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="max-w-[80%] space-y-1.5">
              <div className={`rounded-2xl px-3 py-2 text-sm border relative group ${
                msg.role === "user"
                  ? "bg-[var(--brand-gold)] text-[#050816] border-[var(--brand-gold-border)] rounded-br-md"
                  : msg.isError
                  ? "bg-red-500/10 text-red-400 border-red-500/20 rounded-bl-md"
                  : "bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] rounded-bl-md"
              }`}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</pre>
                {msg.role === "assistant" && !msg.isError && (
                  <button
                    onClick={() => copyText(msg.text, idx)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[var(--hover-bg)]"
                  >
                    {copied === idx ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3 text-[var(--text-muted)]" />}
                  </button>
                )}
              </div>
              {msg.route && (
                <a
                  href={msg.route}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)] hover:bg-[var(--brand-cyan-soft)] transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                  Go to {msg.routeLabel || msg.route}
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <div className="w-7 h-7 rounded-xl bg-[var(--brand-cyan-soft)] flex items-center justify-center border border-[var(--brand-cyan-border)]">
              <Loader2 className="w-3.5 h-3.5 text-[var(--brand-cyan)] animate-spin" />
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-cyan-border)] hover:text-[var(--brand-cyan)] transition-colors whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the admin AI anything..."
            disabled={loading}
            className="flex-1 px-3 py-2.5 text-sm rounded-xl border bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-soft)] focus:border-[var(--brand-gold-border)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-[var(--brand-gold)] text-[#050816] border border-[var(--brand-gold-border)] disabled:opacity-50 hover:brightness-110 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Auto-Reply Rules ───────────────────────────────────────────────────────────
function AutoReplyRules() {
  const [rules, setRules] = useState([
    { id: 1, trigger: "pricing", response: "Thank you for asking about pricing! Our plans start at ₱999/month. Please book a demo to get a customized quote.", active: true, channel: "all", matchCount: 42 },
    { id: 2, trigger: "how to connect facebook", response: "To connect your Facebook page, go to Admin > Facebook Connect, click Authorize, select your page, and click Connect.", active: true, channel: "all", matchCount: 28 },
    { id: 3, trigger: "reset password", response: "To reset a password, go to Admin > Account Control, find the user, click Edit, and use the Reset Password option.", active: false, channel: "admin", matchCount: 7 },
  ]);
  const [editRule, setEditRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ trigger: "", response: "", channel: "all", active: true });

  const save = () => {
    if (!form.trigger.trim() || !form.response.trim()) return;
    if (editRule) {
      setRules((p) => p.map((r) => r.id === editRule.id ? { ...r, ...form } : r));
      setEditRule(null);
    } else {
      setRules((p) => [...p, { id: Date.now(), ...form, matchCount: 0 }]);
    }
    setForm({ trigger: "", response: "", channel: "all", active: true });
    setShowForm(false);
  };

  const startEdit = (rule) => {
    setEditRule(rule);
    setForm({ trigger: rule.trigger, response: rule.response, channel: rule.channel, active: rule.active });
    setShowForm(true);
  };

  const deleteRule = (id) => setRules((p) => p.filter((r) => r.id !== id));
  const toggleRule = (id) => setRules((p) => p.map((r) => r.id === id ? { ...r, active: !r.active } : r));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">Rules trigger keyword-matched auto-replies before the AI responds.</p>
        <Button icon={Plus} onClick={() => { setEditRule(null); setForm({ trigger: "", response: "", channel: "all", active: true }); setShowForm(true); }}>
          Add Rule
        </Button>
      </div>

      {showForm && (
        <Card className="border-[var(--brand-cyan-border)]">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{editRule ? "Edit Rule" : "New Auto-Reply Rule"}</h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Trigger keyword / phrase</label>
              <input
                value={form.trigger}
                onChange={(e) => setForm((p) => ({ ...p, trigger: e.target.value }))}
                placeholder="e.g. pricing, how to connect, reset password"
                className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Auto-reply response</label>
              <textarea
                value={form.response}
                onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))}
                placeholder="Enter the response to send when this keyword is matched..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)] resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={form.channel}
                onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none"
              >
                <option value="all">All channels</option>
                <option value="admin">Admin only</option>
                <option value="client">Client only</option>
              </select>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">Cancel</button>
                <button onClick={save} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-gold)] text-[#050816] flex items-center gap-1.5 hover:brightness-110">
                  <Save className="w-3.5 h-3.5" /> Save Rule
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {rules.map((rule) => (
          <Card key={rule.id} className={`transition-opacity ${rule.active ? "" : "opacity-60"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${rule.active ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--brand-cyan-soft)] text-[var(--brand-cyan)] border border-[var(--brand-cyan-border)]">
                      "{rule.trigger}"
                    </span>
                    <Badge className="text-xs">{rule.channel}</Badge>
                    <span className="text-xs text-[var(--text-muted)]">{rule.matchCount} matches</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{rule.response}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleRule(rule.id)} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                    {rule.active ? <ToggleRight className="w-4 h-4 text-[var(--success)]" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => startEdit(rule)} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No auto-reply rules yet. Add your first rule above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Knowledge Base Editor ──────────────────────────────────────────────────────
function KnowledgeBaseEditor() {
  const [entries, setEntries] = useState(DEFAULT_KB);
  const [editEntry, setEditEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", keywords: "", excerpt: "", active: true });
  const [search, setSearch] = useState("");

  const filtered = entries.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.keywords.toLowerCase().includes(search.toLowerCase())
  );

  const save = () => {
    if (!form.title.trim() || !form.excerpt.trim()) return;
    const entry = { ...form, id: editEntry?.id || `kb_${Date.now()}` };
    if (editEntry) {
      setEntries((p) => p.map((e) => e.id === editEntry.id ? entry : e));
      setEditEntry(null);
    } else {
      setEntries((p) => [...p, entry]);
    }
    setForm({ title: "", keywords: "", excerpt: "", active: true });
    setShowForm(false);
  };

  const startEdit = (entry) => {
    setEditEntry(entry);
    setForm({ title: entry.title, keywords: entry.keywords, excerpt: entry.excerpt, active: entry.active });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]"
          />
        </div>
        <Button icon={Plus} onClick={() => { setEditEntry(null); setForm({ title: "", keywords: "", excerpt: "", active: true }); setShowForm(true); }}>
          Add Entry
        </Button>
      </div>

      {showForm && (
        <Card className="border-[var(--brand-cyan-border)]">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{editEntry ? "Edit KB Entry" : "New Knowledge Base Entry"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Title</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Entry title" className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Keywords (comma-separated)</label>
                <input value={form.keywords} onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))} placeholder="keyword1, keyword2, phrase" className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)]" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">Answer / Excerpt</label>
              <textarea value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} placeholder="Enter the answer that will be shown when this entry matches..." rows={3} className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-gold-border)] resize-none" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} className="rounded" />
                Active
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]">Cancel</button>
                <button onClick={save} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-gold)] text-[#050816] flex items-center gap-1.5 hover:brightness-110">
                  <Save className="w-3.5 h-3.5" /> Save Entry
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((entry) => (
          <Card key={entry.id} className={entry.active ? "" : "opacity-60"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-[var(--brand-cyan)] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{entry.title}</span>
                    {!entry.active && <Badge className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Keywords: {entry.keywords}</p>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{entry.excerpt}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(entry)} className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--text-muted)]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEntries((p) => p.filter((e) => e.id !== entry.id))} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics ──────────────────────────────────────────────────────────────────
function ChatbotAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const workspaceId = localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id") || "";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Query real conversation data from Supabase via AI health + analytics endpoint
        const res = await fetch(`${API_BASE_URL}/ai/chatbot-analytics?workspaceId=${workspaceId}`);
        if (res.ok) {
          const json = await res.json();
          setStats(json.data || json);
        } else {
          // Graceful fallback: show zeros instead of fake numbers
          setStats({ totalMessages: 0, aiResolved: 0, escalated: 0, resolutionRate: 0, topQueries: [] });
        }
      } catch {
        setStats({ totalMessages: 0, aiResolved: 0, escalated: 0, resolutionRate: 0, topQueries: [] });
      } finally { setLoading(false); }
    })();
  }, [workspaceId]);

  const statCards = stats ? [
    { label: "Total Messages", value: stats.totalMessages?.toLocaleString() || "0", color: "var(--brand-cyan)" },
    { label: "AI Resolved",    value: stats.aiResolved?.toLocaleString()    || "0", color: "var(--success)" },
    { label: "Escalated",      value: stats.escalated?.toLocaleString()      || "0", color: "var(--brand-gold)" },
    { label: "Resolution Rate",value: stats.resolutionRate ? `${stats.resolutionRate}%` : "—", color: "#9b59b6" },
  ] : [];

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-10 text-[var(--text-muted)]">
          <RefreshCw className="animate-spin mx-auto mb-2 w-5 h-5" />Loading real analytics…
        </div>
      ) : (
        <>
          {stats?.totalMessages === 0 && (
            <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              No chatbot data yet — analytics will populate as users interact with the chatbot.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Live data</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(stats?.topQueries || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Queries (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[var(--border-color)]">
                  {(stats.topQueries || []).map((q, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs font-mono text-[var(--text-muted)] w-5">{i + 1}</span>
                      <p className="flex-1 text-sm text-[var(--text-primary)]">{q.query}</p>
                      <div className="flex items-center gap-2">
                        {q.resolved
                          ? <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />
                          : <AlertCircle className="w-3.5 h-3.5 text-[var(--brand-gold)]" />}
                        <span className="text-xs text-[var(--text-muted)]">{q.count}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(stats?.topQueries || []).length === 0 && !loading && stats?.totalMessages === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-[var(--text-muted)] text-sm">
                Top queries will appear here as users chat with the AI assistant.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── AI Settings ────────────────────────────────────────────────────────────────
function AISettings() {
  const [settings, setSettings] = useState({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    maxTokens: 700,
    language: "auto",
    fallbackEnabled: true,
    routingEnabled: true,
    historyDepth: 6,
  });
  const [healthStatus, setHealthStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const checkHealth = async () => {
    setTesting(true);
    try {
      const r = await fetch(`${API_BASE_URL}/ai/health`);
      const data = await r.json();
      setHealthStatus(data);
    } catch (e) {
      setHealthStatus({ status: "unhealthy", error: e.message });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  const set = (key, val) => setSettings((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-[var(--brand-cyan)]" /> AI Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {testing ? <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-cyan)]" />
                : healthStatus?.status === "healthy" ? <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                : <AlertCircle className="w-4 h-4 text-red-400" />}
              <div>
                <p className="text-sm font-medium">
                  {testing ? "Checking..." : healthStatus?.status === "healthy" ? "All Systems Operational" : "Service Issue Detected"}
                </p>
                {healthStatus?.latency && <p className="text-xs text-[var(--text-muted)]">Latency: {healthStatus.latency}</p>}
                {healthStatus?.error && <p className="text-xs text-red-400">{healthStatus.error}</p>}
              </div>
            </div>
            <button onClick={checkHealth} disabled={testing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
          {!healthStatus?.status && !testing && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
              Configure GROQ_API_KEY or ADMIN_CHATBOT_KEY in server environment variables to enable live AI responses.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Model Configuration</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">AI Model</label>
              <select value={settings.model} onChange={(e) => set("model", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none">
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Best Quality)</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Fastest)</option>
                <option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile (Balanced)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Response Language</label>
              <select value={settings.language} onChange={(e) => set("language", e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none">
                <option value="auto">Auto-detect (Recommended)</option>
                <option value="en">English only</option>
                <option value="tl">Tagalog only</option>
                <option value="mixed">Taglish (English + Tagalog)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Temperature ({settings.temperature})</label>
              <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(e) => set("temperature", parseFloat(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>Precise</span><span>Creative</span></div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">Max Response Tokens ({settings.maxTokens})</label>
              <input type="range" min="200" max="1500" step="100" value={settings.maxTokens} onChange={(e) => set("maxTokens", parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-[var(--text-muted)]"><span>Concise</span><span>Detailed</span></div>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
            {[
              { key: "fallbackEnabled", label: "Fallback to KB when AI unavailable", desc: "Use static knowledge base entries if AI service is down" },
              { key: "routingEnabled", label: "Include navigation routes in responses", desc: "AI includes deep links to relevant admin pages in answers" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={settings[opt.key]} onChange={(e) => set(opt.key, e.target.checked)} className="mt-0.5 rounded" />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminChatbot() {
  const [activeTab, setActiveTab] = useState("chat");
  const [liveStats, setLiveStats] = useState(null);
  const workspaceId = localStorage.getItem("workspaceId") || localStorage.getItem("workspace_id") || "";

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`${API_BASE_URL}/ai/chatbot-analytics?workspaceId=${workspaceId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data || json?.totalMessages !== undefined) setLiveStats(json.data || json); })
      .catch(() => {});
  }, [workspaceId]);

  const stats = [
    { icon: Bot,          label: "AI Responses",    value: liveStats ? liveStats.aiResolved.toLocaleString()    : "—", color: "var(--brand-cyan)" },
    { icon: MessageSquare,label: "Total Messages",   value: liveStats ? liveStats.totalMessages.toLocaleString() : "—", color: "var(--success)" },
    { icon: Zap,          label: "Active Rules",     value: "Live",  color: "var(--brand-gold)" },
    { icon: Brain,        label: "Resolution Rate",  value: liveStats ? `${liveStats.resolutionRate}%`           : "—", color: "#9b59b6" },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--brand-cyan)]" /> AI Chatbot Management
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Configure, test, and monitor the Exponify AI assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-xs text-[var(--success)] font-medium">
            <Sparkles className="w-3 h-3" /> AI Active
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-5 h-5 flex-shrink-0" style={{ color: s.color }} />
              <div>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-color)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[var(--brand-gold)] text-[var(--brand-gold)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "chat"      && <LiveChatTest />}
      {activeTab === "rules"     && <AutoReplyRules />}
      {activeTab === "kb"        && <KnowledgeBaseEditor />}
      {activeTab === "analytics" && <ChatbotAnalytics />}
      {activeTab === "settings"  && <AISettings />}
    </div>
  );
}
