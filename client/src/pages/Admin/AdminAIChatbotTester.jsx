import { useState, useEffect, useRef, useMemo } from "react";
import facebookIntegrationService from "../../services/marketing/facebook_connect";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "../../components/admin/ui";

const PRICE_RANGE_OPTIONS = [
  { value: "", label: "Select price range" },
  { value: "Below PHP 500", label: "Below PHP 500" },
  { value: "PHP 500 - 1,999", label: "PHP 500 - 1,999" },
  { value: "PHP 2,000 - 4,999", label: "PHP 2,000 - 4,999" },
  { value: "PHP 5,000 - 9,999", label: "PHP 5,000 - 9,999" },
  { value: "PHP 10,000 and above", label: "PHP 10,000 and above" },
  { value: "Custom / Varies", label: "Custom / Varies" },
];

export default function AdminAIChatbotTester() {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [useOverrides, setUseOverrides] = useState(false);

  // Form states representing either read-only view or custom overrides
  const [configForm, setConfigForm] = useState({
    pageName: "",
    businessType: "",
    productServices: "",
    productServicePriceRanges: "",
    websiteLink: "",
    shoppeLink: "",
    lazadaLink: "",
    knowledge: "",
    aiInstruction: "",
  });

  // Chat conversation state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Last request context trace (displays what prompt details were sent to LLM)
  const [lastContextUsed, setLastContextUsed] = useState(null);

  const messagesEndRef = useRef(null);

  // Memoize connected pages
  const connectedPages = useMemo(() => {
    return Array.isArray(status?.connectedPages) ? status.connectedPages : [];
  }, [status]);

  // Load pages list on mount
  useEffect(() => {
    async function init() {
      try {
        setLoadingStatus(true);
        const data = await facebookIntegrationService.getStatus();
        setStatus(data);
        if (Array.isArray(data?.connectedPages) && data.connectedPages.length > 0) {
          const firstPage = data.connectedPages[0];
          setSelectedPageId(firstPage.pageId);
        }
      } catch (err) {
        setError(err.message || "Failed to retrieve connected Facebook Pages.");
      } finally {
        setLoadingStatus(false);
      }
    }
    init();
  }, []);

  // Update configuration form whenever selected page changes
  useEffect(() => {
    if (!selectedPageId) {
      setConfigForm({
        pageName: "",
        businessType: "",
        productServices: "",
        productServicePriceRanges: "",
        websiteLink: "",
        shoppeLink: "",
        lazadaLink: "",
        knowledge: "",
        aiInstruction: "",
      });
      return;
    }

    const matchedPage = connectedPages.find(
      (page) => String(page.pageId) === String(selectedPageId)
    );

    if (matchedPage) {
      setConfigForm({
        pageName: matchedPage.pageName || "",
        businessType: matchedPage.businessType || "",
        productServices: matchedPage.productServices || "",
        productServicePriceRanges: matchedPage.productServicePriceRanges || "",
        websiteLink: matchedPage.websiteLink || "",
        shoppeLink: matchedPage.shoppeLink || "",
        lazadaLink: matchedPage.lazadaLink || "",
        knowledge: matchedPage.knowledge || "",
        aiInstruction: matchedPage.aiInstruction || "",
      });
    }
  }, [selectedPageId, connectedPages]);

  const handlePageSelectChange = (e) => {
    setSelectedPageId(e.target.value);
    setMessages([]);
    setLastContextUsed(null);
    setError("");
  };

  const handleFormChange = (e) => {
    if (!useOverrides) return;
    const { name, value } = e.target;
    setConfigForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearChat = () => {
    setMessages([]);
    setLastContextUsed(null);
    setError("");
    setSuccess("Conversation cleared.");
  };

  const handleSaveOverrides = async () => {
    if (!selectedPageId) return;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const matchedPage = connectedPages.find(
        (page) => String(page.pageId) === String(selectedPageId)
      );
      const workspaceId = matchedPage?.connectedWorkspaceId || "";

      await facebookIntegrationService.updatePageDetails(selectedPageId, {
        pageName: configForm.pageName,
        businessType: configForm.businessType,
        productServices: configForm.productServices,
        productServicePriceRanges: configForm.productServicePriceRanges,
        websiteLink: configForm.websiteLink,
        shoppeLink: configForm.shoppeLink,
        lazadaLink: configForm.lazadaLink,
        knowledge: configForm.knowledge,
        aiInstruction: configForm.aiInstruction,
        workspaceId,
        connectedWorkspaceId: workspaceId,
      });

      // Refresh page status from server
      const data = await facebookIntegrationService.getStatus();
      setStatus(data);
      setSuccess("Page settings saved successfully.");
      setUseOverrides(false);
    } catch (err) {
      setError(err.message || "Failed to save page settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (isTyping) return;

    setError("");
    setSuccess("");

    const userText = inputMessage.trim();
    setInputMessage("");

    // Append user message to chat history
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // Build customContext payload if overrides are active
      const customContext = useOverrides
        ? {
            pageName: configForm.pageName,
            businessType: configForm.businessType,
            productServices: configForm.productServices,
            productServicePriceRanges: configForm.productServicePriceRanges,
            websiteLink: configForm.websiteLink,
            shoppeLink: configForm.shoppeLink,
            lazadaLink: configForm.lazadaLink,
            knowledge: configForm.knowledge,
            aiInstruction: configForm.aiInstruction,
          }
        : {};

      // Send testing payload to server (local sandbox)
      const res = await facebookIntegrationService.testChatbotReply({
        pageId: useOverrides ? null : selectedPageId,
        message: userText,
        history: messages,
        customContext,
      });

      if (res?.success && res?.data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data.reply || "No response received." },
        ]);
        setLastContextUsed(res.data.contextUsed);
      } else {
        throw new Error(res?.error || "Invalid response shape.");
      }
    } catch (err) {
      setError(err.message || "Failed to generate test reply from chatbot AI.");
    } finally {
      setIsTyping(false);
    }
  };

  const pageOptions = useMemo(() => {
    return [
      { value: "", label: "Select Facebook Page..." },
      ...connectedPages.map((page) => ({
        value: String(page.pageId),
        label: page.pageName || `ID: ${page.pageId}`,
      })),
    ];
  }, [connectedPages]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100">
      <style>{`
        @keyframes goldGlow {
          0%, 100% {
            filter: drop-shadow(0 0 3px rgba(212, 175, 55, 0.35)) brightness(1);
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.85)) brightness(1.1);
          }
        }
        @keyframes borderGlowPulse {
          0%, 100% {
            border-color: var(--brand-gold-border);
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.1);
          }
          50% {
            border-color: var(--brand-gold);
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.45);
          }
        }
        @keyframes goldGradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .system-gold-text {
          color: var(--brand-gold) !important;
        }
        .system-gold-glow-svg {
          color: var(--brand-gold) !important;
          animation: goldGlow 2.5s ease-in-out infinite;
        }
        .system-gold-glow-border {
          animation: borderGlowPulse 3s ease-in-out infinite;
        }
        .system-gold-btn {
          background: linear-gradient(135deg, var(--brand-gold), #fcd34d, var(--brand-gold)) !important;
          background-size: 200% 200% !important;
          animation: goldGradientMove 3s ease infinite;
          color: #0b1120 !important;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.25);
          border: none !important;
        }
        .system-gold-btn:hover {
          box-shadow: 0 0 25px rgba(212, 175, 55, 0.6);
          transform: translateY(-1px);
        }
        .system-gold-btn:active {
          transform: translateY(1px);
        }
        .system-user-bubble {
          background: linear-gradient(135deg, var(--brand-gold), #edd078) !important;
          color: #050816 !important;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(212, 175, 55, 0.18);
        }
        .system-active-badge {
          background-color: var(--brand-gold-soft) !important;
          color: var(--brand-gold) !important;
          border: 1px solid var(--brand-gold-border) !important;
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="system-gold-glow-svg">🤖</span>
            AI Chatbot Tester
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Simulate and test your Facebook Page bot personalities and custom instructions in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {connectedPages.length} Connected Pages
          </span>
        </div>
      </div>

      {/* Alert Banners */}
      {(error || success) && (
        <div className="space-y-2 animate-fade-in">
          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 flex justify-between items-center shadow-[0_0_15px_rgba(239,68,68,0.05)]">
              <span className="flex items-center gap-2">⚠️ {error}</span>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold ml-2 text-lg">×</button>
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-950/30 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
              <span className="flex items-center gap-2">✅ {success}</span>
              <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold ml-2 text-lg">×</button>
            </div>
          )}
        </div>
      )}

      {/* Two Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Config & Custom Overrides */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`bg-white dark:bg-[#0e1726]/75 border rounded-2xl p-6 shadow-sm backdrop-blur-md transition-all duration-300 ${
            useOverrides ? "system-gold-glow-border" : "border-slate-200 dark:border-slate-800/80"
          }`}>
            {/* Panel Top bar with Logo Illustration */}
            <div className="flex items-center justify-between pb-6 mb-4 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider system-gold-text">
                  Chatbot Configuration
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Adjust parameter sandbox
                </p>
              </div>
              {/* Glowing animated chatbot SVG */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-[var(--brand-gold-soft)] blur-md animate-pulse"></div>
                <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="relative system-gold-glow-svg">
                  <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" className="animate-[spin_60s_linear_infinite]" />
                  <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 2" />
                  <rect x="18" y="24" width="28" height="18" rx="5" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M22 42L20 47M42 42L44 47" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="26" cy="32" r="2" fill="currentColor" className="animate-pulse" />
                  <circle cx="38" cy="32" r="2" fill="currentColor" className="animate-pulse" />
                  <path d="M29 37H35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M32 17V24M32 17C33.8 17 35 15.8 35 14C35 12.2 33.8 11 32 11C30.2 11 29 12.2 29 14C29 15.8 30.2 17 32 17Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="space-y-5">
              {/* Page Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Select Base Facebook Page
                </label>
                <select
                  value={selectedPageId}
                  onChange={handlePageSelectChange}
                  disabled={loadingStatus}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 transition-all duration-200"
                >
                  {pageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="dark:bg-[#0e1726]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overrides Toggle */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[var(--brand-gold-soft)] border border-slate-200 dark:border-[var(--brand-gold-border)] rounded-xl p-4 transition-all duration-200 hover:border-[var(--brand-gold)]">
                <div className="pr-2">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-[var(--brand-gold)]">
                    Use Custom Overrides
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Modify chatbot rules locally without updating DB.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOverrides}
                    onChange={(e) => setUseOverrides(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-gold)] dark:peer-checked:bg-[var(--brand-gold)]"></div>
                </label>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/60 my-4" />

              {/* Editable Fields Form */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Page Name Override
                  </label>
                  <input
                    type="text"
                    name="pageName"
                    value={configForm.pageName}
                    onChange={handleFormChange}
                    placeholder="e.g. Hermes Tech Support"
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Business Type
                  </label>
                  <input
                    type="text"
                    name="businessType"
                    value={configForm.businessType}
                    onChange={handleFormChange}
                    placeholder="e.g. Retail Shop, Dental Clinic"
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Products & Services
                  </label>
                  <input
                    type="text"
                    name="productServices"
                    value={configForm.productServices}
                    onChange={handleFormChange}
                    placeholder="e.g. Haircut, Manicure, Coffee"
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Price Range
                  </label>
                  <select
                    name="productServicePriceRanges"
                    value={configForm.productServicePriceRanges}
                    onChange={handleFormChange}
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {PRICE_RANGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="dark:bg-[#0e1726]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Website Link
                    </label>
                    <input
                      type="text"
                      name="websiteLink"
                      value={configForm.websiteLink}
                      onChange={handleFormChange}
                      placeholder="https://..."
                      disabled={!useOverrides}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Shopee Link
                    </label>
                    <input
                      type="text"
                      name="shoppeLink"
                      value={configForm.shoppeLink}
                      onChange={handleFormChange}
                      placeholder="https://..."
                      disabled={!useOverrides}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Lazada Link
                  </label>
                  <input
                    type="text"
                    name="lazadaLink"
                    value={configForm.lazadaLink}
                    onChange={handleFormChange}
                    placeholder="https://..."
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Knowledge Base Content
                  </label>
                  <textarea
                    name="knowledge"
                    value={configForm.knowledge}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="Workspace details, Q&As, rules..."
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-y"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    AI Custom Instructions / Personality
                  </label>
                  <textarea
                    name="aiInstruction"
                    value={configForm.aiInstruction}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="e.g. Always respond in Taglish, sound cheerful, end with emojis."
                    disabled={!useOverrides}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-y"
                  />
                </div>
              </div>

              {useOverrides && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveOverrides}
                    disabled={isSaving || !selectedPageId}
                    className="w-full py-3.5 system-gold-btn disabled:opacity-55 disabled:cursor-not-allowed font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save Customizations to Page"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat window */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-white dark:bg-[#0e1726]/75 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col h-[650px] shadow-sm backdrop-blur-md overflow-hidden transition-all duration-300">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Interactive Sandbox Chat
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Sandbox environment. No logs or Facebook API connections are affected.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                disabled={messages.length === 0}
                className="text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 transition-all duration-200"
              >
                Clear Chat
              </button>
            </div>

            {/* Chat Messages Log Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40 dark:bg-slate-950/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--brand-gold-soft)] border border-[var(--brand-gold-border)] flex items-center justify-center system-gold-text text-2xl shadow-[0_0_15px_rgba(212,175,55,0.08)]">
                    💬
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Start Sandbox Chat</h3>
                    <p className="text-xs text-slate-450 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                      Send a message below to simulate how the AI chatbot would answer using the parameters defined in the left configuration card.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    } animate-fade-in`}
                  >
                    {msg.role !== "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] flex items-center justify-center system-gold-text shadow-[0_0_8px_rgba(212,175,55,0.15)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 8V4H8" />
                          <rect width="16" height="12" x="4" y="8" rx="2" />
                          <path d="M2 14h2" />
                          <path d="M20 14h2" />
                          <path d="M15 13v2" />
                          <path d="M9 13v2" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                        msg.role === "user"
                          ? "system-user-bubble rounded-tr-none"
                          : "bg-white dark:bg-[#121c30]/90 border border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 rounded-tl-none"
                      }`}
                    >
                      <span className="block whitespace-pre-wrap">
                        {msg.content}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Bot Typing Simulator */}
              {isTyping && (
                <div className="flex gap-3 justify-start items-start animate-pulse">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-[var(--brand-gold-border)] bg-[var(--brand-gold-soft)] flex items-center justify-center system-gold-text shadow-[0_0_8px_rgba(212,175,55,0.15)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8V4H8" />
                      <rect width="16" height="12" x="4" y="8" rx="2" />
                      <path d="M2 14h2" />
                      <path d="M20 14h2" />
                      <path d="M15 13v2" />
                      <path d="M9 13v2" />
                    </svg>
                  </div>
                  <div className="bg-white dark:bg-[#121c30]/90 border border-slate-100 dark:border-slate-800/60 rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Bot is thinking</span>
                    <span className="flex gap-0.5 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-450 dark:bg-slate-400 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-450 dark:bg-slate-400 animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-450 dark:bg-slate-400 animate-bounce delay-150"></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Message Form */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#0e1726]">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message to test..."
                  disabled={(!selectedPageId && !useOverrides) || isTyping}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121c30]/90 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-455 focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold-border)] focus:border-[var(--brand-gold)] disabled:opacity-50 transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={(!selectedPageId && !useOverrides) || isTyping || !inputMessage.trim()}
                  className="rounded-xl px-5 py-3 system-gold-btn disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all duration-200 flex items-center gap-1.5"
                >
                  <span>Send</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform rotate-45">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Prompt Parameters Trace Panel */}
          {lastContextUsed && (
            <div className="bg-white dark:bg-[#0e1726]/75 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-md transition-all duration-300 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-gold)] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.6)]"></span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Active Context Applied (Last Prompt)
                </h3>
              </div>
              <div className="text-xs space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-100 dark:border-slate-800/40">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Page Name</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">{lastContextUsed.pageName || "None"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Business Type</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">{lastContextUsed.businessType || "None"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Price Range</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">{lastContextUsed.productServicePriceRanges || "None"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Custom Instr. Set?</span>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase mt-1 ${
                      lastContextUsed.aiInstruction 
                        ? "system-active-badge" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
                    }`}>
                      {lastContextUsed.aiInstruction ? "Active" : "None"}
                    </span>
                  </div>
                </div>

                {lastContextUsed.aiInstruction && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Custom Injected Instructions:
                    </span>
                    <p className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800/50 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-350 font-mono text-[11px] leading-relaxed italic">
                      "{lastContextUsed.aiInstruction}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
