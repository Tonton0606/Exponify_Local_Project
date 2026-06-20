const express = require("express");
const fs = require("fs");
const path = require("path");
const { supabase } = require("../../config/supabase");

const {
  createFacebookConfigService,
  normalizePageId,
  normalizeText,
} = require("../../services/facebook/facebookConfig");

const {
  createFacebookGraphApi,
  getTypingDelayMs,
  sleep,
} = require("../../services/facebook/facebookGraphApi");

const {
  compactFacebookReply,
} = require("../../services/facebook/facebookReplyUtils");

const {
  createFacebookChatbotReplyService,
} = require("../../services/facebook/facebookChatbotReply");

const {
  createFacebookWebhookSecurity,
} = require("../../services/facebook/facebookWebhookSecurity");

const {
  createFacebookConversationStateService,
} = require("../../services/facebook/facebookConversationState");

const {
  createFacebookClientConnectService,
} = require("../../services/facebook/facebookClientConnectService");


const {
  createFacebookKnowledgeManager,
} = require("../../services/facebook/facebookKnowledgeManager");

const handoffManager = require("../../services/facebook/handoffManager");
const { isHumanHandoffRequest, isTagalogStyle } = require("../../utils/handoffDetection");

const { requireAuth } = require("../../middleware/auth");
const logger = require("../../config/logger");
const router = express.Router();

router.use("/admin", requireAuth);
router.use("/client", requireAuth);


const DEFAULT_CHATBOT_MODEL = (process.env.GROQ_API_KEY || process.env.XAI_API_KEY)
  ? (process.env.GROQ_MODEL || "llama-3.3-70b-versatile")
  : "claude-3-sonnet-20240229";

const CONVERSATION_TTL_MS = 30 * 60 * 1000;
const CONVERSATION_MAX_MESSAGES = 8;
const WEBHOOK_EVENT_TTL_MS = 2 * 60 * 1000;
const conversationMemory = new Map();
const recentWebhookEvents = new Map();
const LOCAL_FACEBOOK_PAGES_FILE = path.resolve(
  __dirname,
  "../../data/facebook-pages.json"
);

const fbRuntimeConfig = {
  pageId: "",
  pageName: "",
  pageAccessToken: "",
  businessType: "",
  productServices: "",
  productServicePriceRanges: "",
  websiteLink: "",
  shoppeLink: "",
  lazadaLink: "",
  knowledge: "",
  connectedWorkspaceId: "",
  verifyToken: "",
  appSecret: "",
};

const supabaseClient = supabase;

const facebookConfigService = createFacebookConfigService({
  supabaseClient,
  runtimeConfig: fbRuntimeConfig,
  env: process.env,
});

const facebookClientConnectService = createFacebookClientConnectService({
  supabaseClient,
});

const {
  upsertPageSettings,
} = facebookClientConnectService;

const {
  getSupabaseFacebookPages,
  getSupabaseFacebookPagesByWorkspaceId,
  saveSupabasePageToken,
  updateSupabasePageAccessMode,
  updateSupabasePageDetails,
  deleteSupabasePage,
  getFacebookConfig,
  saveRuntimeConfig,
} = facebookConfigService;

const facebookGraphApi = createFacebookGraphApi({
  getFacebookConfig,
});

const {
  fetchFacebookPageConversations,
  subscribeFacebookPageToApp,
  sendFacebookMessage,
  sendFacebookSenderAction,
} = facebookGraphApi;

const {
  generateChatbotReply,
} = createFacebookChatbotReplyService({
  defaultChatbotModel: DEFAULT_CHATBOT_MODEL,
  env: process.env,
});

const {
  verifyFacebookSignature,
} = createFacebookWebhookSecurity({
  getFacebookConfig,
});

const conversationStateService = createFacebookConversationStateService({
  supabaseClient,
});

function buildConversationKey(pageId, senderId) {
  const normalizedPageId = normalizePageId(pageId) || "default";
  const normalizedSenderId =
    typeof senderId === "string"
      ? senderId.trim()
      : String(senderId || "").trim();

  return `${normalizedPageId}:${normalizedSenderId}`;
}

function cleanupRecentWebhookEvents() {
  const now = Date.now();
  for (const [key, createdAt] of recentWebhookEvents.entries()) {
    if (now - createdAt > WEBHOOK_EVENT_TTL_MS) {
      recentWebhookEvents.delete(key);
    }
  }
}

function buildWebhookEventKey({ pageId, senderId, messageId, incomingText }) {
  const normalizedPageId = normalizePageId(pageId) || "default";
  const normalizedSenderId =
    typeof senderId === "string"
      ? senderId.trim()
      : String(senderId || "").trim();
  const normalizedMessageId = normalizeText(messageId);

  if (normalizedMessageId) {
    return `${normalizedPageId}:${normalizedSenderId}:${normalizedMessageId}`;
  }

  return `${normalizedPageId}:${normalizedSenderId}:${normalizeText(incomingText).toLowerCase()}`;
}

function markWebhookEventIfNew(event) {
  cleanupRecentWebhookEvents();

  const key = buildWebhookEventKey(event);
  if (recentWebhookEvents.has(key)) {
    return false;
  }

  recentWebhookEvents.set(key, Date.now());
  return true;
}

function getConversationHistory(pageId, senderId) {
  const key = buildConversationKey(pageId, senderId);
  const cached = conversationMemory.get(key);

  if (!cached) {
    return [];
  }

  if (Date.now() - cached.updatedAt > CONVERSATION_TTL_MS) {
    conversationMemory.delete(key);
    return [];
  }

  return Array.isArray(cached.messages) ? cached.messages : [];
}

function setConversationHistory(pageId, senderId, messages = []) {
  const key = buildConversationKey(pageId, senderId);

  const normalizedMessages = Array.isArray(messages)
    ? messages
        .filter(
          (msg) =>
            msg &&
            (msg.role === "user" || msg.role === "assistant") &&
            typeof msg.content === "string"
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content.trim(),
        }))
        .filter((msg) => msg.content)
    : [];

  conversationMemory.set(key, {
    updatedAt: Date.now(),
    messages: normalizedMessages.slice(-CONVERSATION_MAX_MESSAGES),
  });
}

function getPublicBaseUrl(req) {
  const configured =
    process.env.BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getFacebookWebhookUrl(req) {
  const configuredWebhookUrl = normalizeText(process.env.FACEBOOK_WEBHOOKS);

  if (configuredWebhookUrl) {
    try {
      const parsed = new URL(configuredWebhookUrl);
      const pathname = normalizeText(parsed.pathname);

      if (!pathname || pathname === "/") {
        parsed.pathname = "/api/webhooks/facebook";
      }

      return parsed.toString().replace(/\/$/, "");
    } catch {
      return configuredWebhookUrl.replace(/\/$/, "");
    }
  }

  return `${getPublicBaseUrl(req)}/api/webhooks/facebook`;
}

function maskPageAccessToken(token) {
  return token ? `${token.slice(0, 4)}********` : null;
}

function readLocalFacebookPages() {
  try {
    if (!fs.existsSync(LOCAL_FACEBOOK_PAGES_FILE)) return [];
    const parsed = JSON.parse(
      fs.readFileSync(LOCAL_FACEBOOK_PAGES_FILE, "utf8")
    );
    return Array.isArray(parsed?.pages) ? parsed.pages : [];
  } catch (error) {
    console.error("Failed to read local Facebook pages fallback", {
      message: error.message,
    });
    return [];
  }
}

function writeLocalFacebookPages(pages = []) {
  fs.mkdirSync(path.dirname(LOCAL_FACEBOOK_PAGES_FILE), { recursive: true });
  fs.writeFileSync(
    LOCAL_FACEBOOK_PAGES_FILE,
    JSON.stringify({ pages, updatedAt: new Date().toISOString() }, null, 2)
  );
  return pages;
}

function normalizeLocalFacebookPage(page = {}) {
  const pageId = normalizePageId(page.pageId || page.page_id || page.fb_page_id);
  if (!pageId) return null;

  return {
    fbPageRowId: normalizeText(page.fbPageRowId || page.id),
    pageId,
    pageName: normalizeText(page.pageName || page.fb_name || page.page_name),
    pageAccessToken: normalizeText(
      page.pageAccessToken || page.fb_token || page.page_access_token
    ),
    businessType: normalizeText(page.businessType || page.business_type),
    productServices: normalizeText(
      page.productServices || page.product_services || page.products_services
    ),
    productServicePriceRanges: normalizeText(
      page.productServicePriceRanges || page.product_service_price_ranges
    ),
    websiteLink: normalizeText(page.websiteLink || page.website_link),
    shoppeLink: normalizeText(page.shoppeLink || page.shoppe_link),
    lazadaLink: normalizeText(page.lazadaLink || page.lazada_link),
    knowledge: normalizeText(page.knowledge),
    aiInstruction: normalizeText(page.aiInstruction || page.ai_instruction),
    connectedWorkspaceId: normalizeText(
      page.connectedWorkspaceId || page.workspace_id || page.connected_workspace_id
    ),
    accessMode:
      normalizeText(page.accessMode || page.access_mode).toLowerCase() ===
      "disable"
        ? "disable"
        : "enable",
  };
}

function ensureSavedWorkspaceLink(savedPage, expectedWorkspaceId) {
  const normalizedExpected = normalizeText(expectedWorkspaceId);

  if (!normalizedExpected) {
    return;
  }

  const actualWorkspaceId = normalizeText(
    savedPage?.connectedWorkspaceId ||
      savedPage?.workspace_id ||
      savedPage?.workspaceId
  );

  if (actualWorkspaceId !== normalizedExpected) {
    throw new Error(
      `Facebook Page was not linked in fb_pages. Expected workspace_id ${normalizedExpected}, got ${actualWorkspaceId || "empty"}.`
    );
  }
}

function mergeFacebookPages(...pageLists) {
  const merged = new Map();

  pageLists.flat().forEach((page) => {
    const normalized = normalizeLocalFacebookPage(page);
    if (!normalized) return;

    const existing = merged.get(normalized.pageId) || {};
    merged.set(normalized.pageId, {
      ...existing,
      ...normalized,
      fbPageRowId: normalized.fbPageRowId || existing.fbPageRowId || "",
      pageAccessToken:
        normalized.pageAccessToken || existing.pageAccessToken || "",
      connectedWorkspaceId:
        normalized.connectedWorkspaceId || existing.connectedWorkspaceId || "",
    });
  });

  return Array.from(merged.values());
}

function upsertLocalFacebookPage(page = {}) {
  const normalized = normalizeLocalFacebookPage(page);
  if (!normalized) {
    throw new Error("pageId is required");
  }

  const pages = mergeFacebookPages(readLocalFacebookPages(), [normalized]);
  return writeLocalFacebookPages(pages);
}

function deleteLocalFacebookPage(pageId) {
  const normalizedPageId = normalizePageId(pageId);
  const pages = readLocalFacebookPages().filter(
    (page) => normalizePageId(page.pageId) !== normalizedPageId
  );
  return writeLocalFacebookPages(pages);
}

async function getAllFacebookPages() {
  const supabasePages = await getSupabaseFacebookPages();
  return mergeFacebookPages(supabasePages);
}

async function getClientPageSettingsForWorkspace(workspaceId) {
  const normalizedWorkspaceId = normalizeText(workspaceId);

  if (!normalizedWorkspaceId || !supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("client_facebook_page_settings")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to read client Facebook page settings", {
      workspaceId: normalizedWorkspaceId,
      message: error.message,
    });
    return [];
  }

  return Array.isArray(data)
    ? data
        .map((page) =>
          normalizeLocalFacebookPage({
            ...page,
            connectedWorkspaceId: page.workspace_id,
          })
        )
        .filter(Boolean)
    : [];
}

async function getFacebookPagesForWorkspace(workspaceId) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const supabasePages =
    await getSupabaseFacebookPagesByWorkspaceId(normalizedWorkspaceId);

  const exactPages = mergeFacebookPages(supabasePages);

  return {
    pages: exactPages,
    matchMode: exactPages.length > 0 ? "exact" : "none",
  };
}

function mapStoredFacebookConversation(record = {}) {
  const threadId = normalizeText(record.id);
  const customerPsid = normalizeText(record.customer_psid);
  const customerName = normalizeText(record.customer_name) || "Facebook User";
  const lastCustomerMessage = normalizeText(record.last_customer_message);
  const lastAiResponse = normalizeText(record.last_ai_response);
  const updatedTime =
    normalizeText(record.last_message_at) ||
    normalizeText(record.updated_at) ||
    normalizeText(record.created_at);

  const messages = [];

  if (lastCustomerMessage) {
    messages.push({
      id: `${threadId || customerPsid}-customer`,
      text: lastCustomerMessage,
      fromId: customerPsid,
      fromName: customerName,
      createdTime: updatedTime,
      isPageMessage: false,
    });
  }

  if (lastAiResponse) {
    messages.push({
      id: `${threadId || customerPsid}-page`,
      text: lastAiResponse,
      fromId: normalizePageId(record.page_id),
      fromName: "Page",
      createdTime: updatedTime,
      isPageMessage: true,
    });
  }

  return {
    threadId: threadId || customerPsid,
    participantId: customerPsid,
    participantName: customerName,
    updatedTime,
    snippet: lastCustomerMessage || lastAiResponse || "",
    messageCount: messages.length,
    messages,
    source: "stored",
  };
}

async function fetchStoredFacebookConversationThreads({
  workspaceId,
  pageId,
  limit = 50,
}) {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  const normalizedPageId = normalizePageId(pageId);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  if (!normalizedWorkspaceId || !normalizedPageId || !supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("facebook_conversations")
    .select("*")
    .eq("workspace_id", normalizedWorkspaceId)
    .eq("page_id", normalizedPageId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(safeLimit);

  if (error) {
    console.error("Failed to load stored Facebook inbox conversations", {
      workspaceId: normalizedWorkspaceId,
      pageId: normalizedPageId,
      message: error.message,
    });
    return [];
  }

  return Array.isArray(data)
    ? data.map(mapStoredFacebookConversation).filter((thread) => thread.threadId)
    : [];
}

async function syncClientFacebookPageSettings({
  pageId,
  pageName,
  businessType,
  productServices,
  productServicePriceRanges,
  websiteLink,
  shoppeLink,
  lazadaLink,
  knowledge,
  connectedWorkspaceId,
}) {
  const normalizedWorkspaceId = normalizeText(connectedWorkspaceId);
  const normalizedPageId = normalizePageId(pageId);

  if (!normalizedWorkspaceId || !normalizedPageId) {
    return null;
  }

  return upsertPageSettings({
    workspaceId: normalizedWorkspaceId,
    pageId: normalizedPageId,
    payload: {
      pageId: normalizedPageId,
      pageName,
      businessType,
      businessDescription: knowledge,
      productsServices: productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      fallbackMode: "safe_reply_only",
      aiEnabled: true,
      faqEnabled: true,
      suggestionsEnabled: true,
      humanHandoffEnabled: true,
      ownerNotificationEnabled: true,
    },
  });
}

async function syncFacebookConversationWorkspace({ pageId, connectedWorkspaceId }) {
  const normalizedWorkspaceId = normalizeText(connectedWorkspaceId);
  const normalizedPageId = normalizePageId(pageId);

  if (!normalizedWorkspaceId || !normalizedPageId || !supabaseClient) {
    return null;
  }

  const { error } = await supabaseClient
    .from("facebook_conversations")
    .update({
      workspace_id: normalizedWorkspaceId,
      updated_at: new Date().toISOString(),
    })
    .eq("page_id", normalizedPageId);

  if (error) {
    throw new Error(error.message || "Failed to sync Facebook conversations.");
  }

  return true;
}

function isValidUuid(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof value === 'string' && uuidRegex.test(value);
}

function getRequestUserId(req) {
  const candidate = (
    normalizeText(req.user?.id) ||
    normalizeText(req.user?.user_id) ||
    normalizeText(req.body?.userId) ||
    normalizeText(req.query?.userId) ||
    ""
  );
  return isValidUuid(candidate) ? candidate : null;
}

function sendRouteError(res, error, fallbackMessage = "Facebook request failed.") {
  return res.status(400).json({
    error: error?.message || fallbackMessage,
  });
}

function buildStatusPayload({
  req,
  config,
  connectedPages,
  success = undefined,
  note,
}) {
  const effectiveConnectedPages =
    Array.isArray(connectedPages) && connectedPages.length > 0
      ? connectedPages
      : config.pageId
        ? [
            {
              pageId: config.pageId,
              pageName: config.pageName,
              pageAccessToken: config.pageAccessToken,
              businessType: config.businessType,
              productServices: config.productServices,
              productServicePriceRanges: config.productServicePriceRanges,
              websiteLink: config.websiteLink,
              shoppeLink: config.shoppeLink,
              lazadaLink: config.lazadaLink,
              knowledge: config.knowledge,
              connectedWorkspaceId: config.connectedWorkspaceId,
              accessMode: config.accessMode,
            },
          ]
        : [];
  const primaryPage = effectiveConnectedPages[0] || {};

  return {
    ...(success === undefined ? {} : { success }),
    connected: Boolean(
      effectiveConnectedPages.length > 0 &&
        (config.verifyToken || config.pageAccessToken)
    ),
    pageId: config.pageId || primaryPage.pageId || null,
    pageName: config.pageName || primaryPage.pageName || null,
    businessType: config.businessType || primaryPage.businessType || null,
    productServices: config.productServices || primaryPage.productServices || null,
    productServicePriceRanges:
      config.productServicePriceRanges ||
      primaryPage.productServicePriceRanges ||
      null,
    websiteLink: config.websiteLink || primaryPage.websiteLink || null,
    shoppeLink: config.shoppeLink || primaryPage.shoppeLink || null,
    lazadaLink: config.lazadaLink || primaryPage.lazadaLink || null,
    knowledge: config.knowledge || primaryPage.knowledge || null,
    connectedWorkspaceId:
      config.connectedWorkspaceId || primaryPage.connectedWorkspaceId || null,
    hasPageAccessToken: Boolean(config.pageAccessToken || primaryPage.pageAccessToken),
    hasVerifyToken: Boolean(config.verifyToken),
    hasAppSecret: Boolean(config.appSecret),
    accessMode: config.accessMode,
    verifyToken: config.verifyToken || null,
    pageAccessTokenMasked: maskPageAccessToken(
      config.pageAccessToken || primaryPage.pageAccessToken
    ),
    webhookUrl: getFacebookWebhookUrl(req),
    connectedPages: effectiveConnectedPages.map((page) => ({
      ...page,
      pageAccessTokenMasked: maskPageAccessToken(page.pageAccessToken),
    })),
    connectedCount: effectiveConnectedPages.length,
    note,
  };
}

router.get("/", async (req, res) => {
  const mode = req.query["hub.mode"] || req.query.hub_mode;
  const token = req.query["hub.verify_token"] || req.query.hub_verify_token;
  const challenge = req.query["hub.challenge"] || req.query.hub_challenge;

  const config = await getFacebookConfig();
  const expectedToken = (config.verifyToken || "").trim();
  const receivedToken = typeof token === "string" ? token.trim() : token;

  console.log("Facebook webhook verification attempt", {
    mode,
    receivedToken: receivedToken ? `${receivedToken.slice(0, 4)}****` : null,
    expectedToken: expectedToken ? `${expectedToken.slice(0, 4)}****` : null,
    hasChallenge: Boolean(challenge),
    configSource: {
      fromRuntime: Boolean(fbRuntimeConfig.verifyToken),
      fromEnv: Boolean(process.env.FB_VERIFY_TOKEN),
    },
  });

  if (mode === "subscribe" && receivedToken && receivedToken === expectedToken) {
    console.log("Facebook webhook verification SUCCESS");
    return res.status(200).send(challenge);
  }

  console.error("Facebook webhook verification FAILED", {
    mode,
    hasReceivedToken: Boolean(receivedToken),
    hasExpectedToken: Boolean(expectedToken),
    tokenMatched: receivedToken === expectedToken,
    hasChallenge: Boolean(challenge),
  });

  return res.sendStatus(403);
});

router.get("/admin/status", async (req, res) => {
  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();
  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasConfiguredPage = Boolean(config.pageId);
  const missingPageNote = usingServiceRole
    ? "No Facebook Pages were found in Supabase or the local fallback store. Save a Facebook Page connection to create one."
    : "No Facebook Pages were found. SUPABASE_SERVICE_ROLE_KEY is not loaded by the running backend process; restart the backend after adding it, or configure fb_pages RLS.";

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      note:
        connectedPages.length > 0
          ? "Facebook Pages are loaded from Supabase."
          : hasConfiguredPage
            ? "Supabase returned no fb_pages rows, so the runtime/env Facebook config is being shown. Add SUPABASE_SERVICE_ROLE_KEY or fix fb_pages RLS for persistent data."
            : missingPageNote,
    })
  );
});

router.post("/admin/connect", async (req, res) => {
  const {
    pageId,
    pageName,
    pageAccessToken,
    fbPageRowId,
    verifyToken,
    appSecret,
    accessMode,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction,
    ai_instruction,
    connectedWorkspaceId,
    workspaceId,
  } = req.body || {};
  const linkedWorkspaceId = normalizeText(workspaceId || connectedWorkspaceId);

  if (!pageAccessToken || !verifyToken) {
    return res.status(400).json({
      error: "pageAccessToken and verifyToken are required",
    });
  }

  const resolvedAiInstruction = aiInstruction || ai_instruction;

  saveRuntimeConfig({
    pageId,
    pageName,
    verifyToken,
    appSecret,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  try {
    const savedPage = await saveSupabasePageToken({
      pageId,
      fbPageRowId,
      pageName,
      pageAccessToken,
      accessMode,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge,
      aiInstruction: resolvedAiInstruction,
      connectedWorkspaceId: linkedWorkspaceId,
      workspaceId: linkedWorkspaceId,
    });
    ensureSavedWorkspaceLink(savedPage, linkedWorkspaceId);
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Failed to save Facebook Page workspace link to fb_pages.",
    });
  }

  upsertLocalFacebookPage({
    pageId,
    pageName,
    pageAccessToken,
    accessMode,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  let pageSettingsError = null;
  let conversationSyncError = null;
  let subscriptionError = null;

  try {
    await syncClientFacebookPageSettings({
      pageId,
      pageName,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    pageSettingsError = error;
  }

  try {
    await syncFacebookConversationWorkspace({
      pageId,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    conversationSyncError = error;
  }

  try {
    await subscribeFacebookPageToApp({
      pageId,
      pageAccessToken,
    });
  } catch (error) {
    subscriptionError = error;
  }

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note:
        [
          "Page token saved to Supabase table fb_pages and local server fallback.",
          pageSettingsError
            ? `Page settings sync failed: ${pageSettingsError.message}`
            : "Client page settings synced.",
          conversationSyncError
            ? `Conversation workspace sync failed: ${conversationSyncError.message}`
            : "Conversation workspace links synced.",
          subscriptionError
            ? `Page webhook subscription failed: ${subscriptionError.message}`
            : "Page subscribed to Messenger webhooks.",
        ].join(" "),
    })
  );
});

router.post("/admin/subscribe-page", async (req, res) => {
  const pageId = normalizePageId(req.body?.pageId || req.query?.pageId);

  if (!pageId) {
    return res.status(400).json({ error: "pageId is required" });
  }

  try {
    const pageConfig = await getFacebookConfig({ pageId });

    if (!pageConfig.pageAccessToken) {
      return res.status(400).json({
        error: "Facebook Page access token is missing for this page.",
        pageId,
      });
    }

    const result = await subscribeFacebookPageToApp({
      pageId: pageConfig.pageId || pageId,
      pageAccessToken: pageConfig.pageAccessToken,
    });

    return res.status(200).json({
      success: true,
      pageId: pageConfig.pageId || pageId,
      pageName: pageConfig.pageName || "",
      subscribedFields: ["messages", "messaging_postbacks"],
      result,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to subscribe Facebook page webhooks.");
  }
});

router.post("/admin/access-mode", async (req, res) => {
  const { pageId, accessMode } = req.body || {};

  let supabaseModeError = null;

  try {
    await updateSupabasePageAccessMode(pageId, accessMode);
  } catch (error) {
    supabaseModeError = error;
  }

  const existingPage =
    readLocalFacebookPages().find(
      (page) => normalizePageId(page.pageId) === normalizePageId(pageId)
    ) || { pageId };

  upsertLocalFacebookPage({
    ...existingPage,
    pageId,
    accessMode,
  });

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note: supabaseModeError
        ? `Access mode saved to local server fallback because Supabase update failed: ${supabaseModeError.message}`
        : "Access mode updated successfully.",
    })
  );
});

router.post("/admin/page-details", async (req, res) => {
  const {
    pageId,
    pageName,
    fbPageRowId,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction,
    ai_instruction,
    connectedWorkspaceId,
    workspaceId,
  } = req.body || {};
  const linkedWorkspaceId = normalizeText(workspaceId || connectedWorkspaceId);
  const resolvedAiInstruction = aiInstruction || ai_instruction;

  try {
    const savedPage = await updateSupabasePageDetails(pageId, {
      pageName,
      fbPageRowId,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge,
      aiInstruction: resolvedAiInstruction,
      connectedWorkspaceId: linkedWorkspaceId,
      workspaceId: linkedWorkspaceId,
    });
    ensureSavedWorkspaceLink(savedPage, linkedWorkspaceId);
  } catch (error) {
    return res.status(400).json({
      error:
        error.message ||
        "Failed to update Facebook Page workspace link in fb_pages.",
    });
  }

  saveRuntimeConfig({
    pageId,
    pageName,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  const existingPage =
    readLocalFacebookPages().find(
      (page) => normalizePageId(page.pageId) === normalizePageId(pageId)
    ) || { pageId };

  upsertLocalFacebookPage({
    ...existingPage,
    pageId,
    pageName,
    businessType,
    productServices,
    productServicePriceRanges,
    websiteLink,
    shoppeLink,
    lazadaLink,
    knowledge,
    aiInstruction: resolvedAiInstruction,
    connectedWorkspaceId: linkedWorkspaceId,
  });

  let pageSettingsError = null;
  let conversationSyncError = null;

  try {
    await syncClientFacebookPageSettings({
      pageId,
      pageName,
      businessType,
      productServices,
      productServicePriceRanges,
      websiteLink,
      shoppeLink,
      lazadaLink,
      knowledge,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    pageSettingsError = error;
  }

  try {
    await syncFacebookConversationWorkspace({
      pageId,
      connectedWorkspaceId: linkedWorkspaceId,
    });
  } catch (error) {
    conversationSyncError = error;
  }

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note: [
        "Page details updated successfully.",
        pageSettingsError
          ? `Page settings sync failed: ${pageSettingsError.message}`
          : "Client page settings synced.",
        conversationSyncError
          ? `Conversation workspace sync failed: ${conversationSyncError.message}`
          : "Conversation workspace links synced.",
      ].join(" "),
    })
  );
});

router.post("/admin/test-reply", async (req, res) => {
  const { pageId, message, history = [], customContext = {} } = req.body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, error: "Message is required." });
  }

  try {
    let pageConfig = {};
    if (pageId) {
      try {
        pageConfig = await getFacebookConfig({ pageId });
      } catch (err) {
        logger.warn({ err, pageId }, "Failed to load page config, using customContext fallback");
      }
    }

    const context = {
      pageName: customContext.pageName !== undefined ? customContext.pageName : (pageConfig.pageName || ""),
      businessType: customContext.businessType !== undefined ? customContext.businessType : (pageConfig.businessType || ""),
      productServices: customContext.productServices !== undefined ? customContext.productServices : (pageConfig.productServices || ""),
      productServicePriceRanges: customContext.productServicePriceRanges !== undefined ? customContext.productServicePriceRanges : (pageConfig.productServicePriceRanges || ""),
      websiteLink: customContext.websiteLink !== undefined ? customContext.websiteLink : (pageConfig.websiteLink || ""),
      shoppeLink: customContext.shoppeLink !== undefined ? customContext.shoppeLink : (pageConfig.shoppeLink || ""),
      lazadaLink: customContext.lazadaLink !== undefined ? customContext.lazadaLink : (pageConfig.lazadaLink || ""),
      knowledge: customContext.knowledge !== undefined ? customContext.knowledge : (pageConfig.knowledge || ""),
      aiInstruction: customContext.aiInstruction !== undefined ? customContext.aiInstruction : (pageConfig.aiInstruction || ""),
    };

    const formattedHistory = (Array.isArray(history) ? history : []).map(msg => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: String(msg.content || "")
    }));

    formattedHistory.push({
      role: "user",
      content: message.trim()
    });

    const reply = await generateChatbotReply(formattedHistory, context);

    return res.status(200).json({
      success: true,
      data: {
        reply,
        contextUsed: {
          pageName: context.pageName,
          businessType: context.businessType,
          productServices: context.productServices,
          productServicePriceRanges: context.productServicePriceRanges,
          websiteLink: context.websiteLink,
          shoppeLink: context.shoppeLink,
          lazadaLink: context.lazadaLink,
          knowledge: context.knowledge ? (context.knowledge.length > 100 ? context.knowledge.substring(0, 100) + "..." : context.knowledge) : "",
          aiInstruction: context.aiInstruction,
        }
      }
    });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, "Test chatbot reply failed");
    return res.status(500).json({ success: false, error: error.message || "Failed to generate test reply" });
  }
});

router.post("/admin/delete", async (req, res) => {
  const { pageId } = req.body || {};

  let supabaseDeleteError = null;

  try {
    await deleteSupabasePage(pageId);
  } catch (error) {
    supabaseDeleteError = error;
  }

  deleteLocalFacebookPage(pageId);

  const config = await getFacebookConfig();
  const connectedPages = await getAllFacebookPages();

  return res.status(200).json(
    buildStatusPayload({
      req,
      config,
      connectedPages,
      success: true,
      note: supabaseDeleteError
        ? `Page removed from local server fallback because Supabase delete failed: ${supabaseDeleteError.message}`
        : "Page deleted successfully.",
    })
  );
});

router.get("/client/pages", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  const { pages, matchMode } = await getFacebookPagesForWorkspace(workspaceId);

  return res.status(200).json({
    workspaceId,
    pages,
    count: pages.length,
    matchMode,
  });
});

router.get("/client/inbox", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const requestedPageId = normalizePageId(req.query?.pageId);

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  const { pages, matchMode } = await getFacebookPagesForWorkspace(workspaceId);

  if (pages.length === 0) {
    return res.status(200).json({
      workspaceId,
      pageId: "",
      pages: [],
      threads: [],
      count: 0,
      matchMode,
    });
  }

  const activePage =
    pages.find((page) => normalizePageId(page.pageId) === requestedPageId) ||
    pages[0];

  if (!activePage?.pageId) {
    return res.status(200).json({
      workspaceId,
      pageId: "",
      pages: [],
      threads: [],
      count: 0,
      matchMode,
    });
  }

  try {
    const graphThreads = await fetchFacebookPageConversations(activePage, {
      conversationLimit: req.query?.conversationLimit,
      messageLimit: req.query?.messageLimit,
    });
    const storedThreads =
      graphThreads.length > 0
        ? []
        : await fetchStoredFacebookConversationThreads({
            workspaceId,
            pageId: activePage.pageId,
            limit: req.query?.conversationLimit || 50,
          });
    const threads = graphThreads.length > 0 ? graphThreads : storedThreads;

    return res.status(200).json({
      workspaceId,
      pageId: activePage.pageId,
      pages: pages.map((page) => ({
        pageId: page.pageId,
        pageName: page.pageName,
        accessMode: page.accessMode,
        connectedWorkspaceId: page.connectedWorkspaceId,
      })),
      threads,
      count: threads.length,
      inboxSource: graphThreads.length > 0 ? "graph" : "stored",
      matchMode,
    });
  } catch (error) {
    const storedThreads = await fetchStoredFacebookConversationThreads({
      workspaceId,
      pageId: activePage.pageId,
      limit: req.query?.conversationLimit || 50,
    });

    if (storedThreads.length > 0) {
      return res.status(200).json({
        workspaceId,
        pageId: activePage.pageId,
        pages: pages.map((page) => ({
          pageId: page.pageId,
          pageName: page.pageName,
          accessMode: page.accessMode,
          connectedWorkspaceId: page.connectedWorkspaceId,
        })),
        threads: storedThreads,
        count: storedThreads.length,
        inboxSource: "stored",
        graphError: error.message || "Failed to load Facebook Graph inbox.",
        matchMode,
      });
    }

    return res.status(502).json({
      error: error.message || "Failed to load Facebook inbox conversations",
      workspaceId,
      pageId: activePage.pageId,
      pages: pages.map((page) => ({
        pageId: page.pageId,
        pageName: page.pageName,
        accessMode: page.accessMode,
        connectedWorkspaceId: page.connectedWorkspaceId,
      })),
      threads: [],
      count: 0,
      matchMode,
    });
  }
});

router.get("/client/connect/dashboard", async (req, res) => {
  try {
    const data = await facebookClientConnectService.getDashboard({
      workspaceId: req.query?.workspaceId,
      pageId: req.query?.pageId,
    });

    return res.status(200).json(data);
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook Connect dashboard.");
  }
});

router.get("/client/connect/faqs", async (req, res) => {
  try {
    const faqs = await facebookClientConnectService.listFaqs({
      workspaceId: req.query?.workspaceId,
      status: req.query?.status,
      search: req.query?.search,
    });

    return res.status(200).json({ faqs, count: faqs.length });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook FAQs.");
  }
});

router.post("/client/connect/faqs", async (req, res) => {
  try {
    const faq = await facebookClientConnectService.createFaq({
      workspaceId: req.body?.workspaceId,
      payload: req.body,
      userId: getRequestUserId(req),
    });

    return res.status(201).json({ faq });
  } catch (error) {
    return sendRouteError(res, error, "Failed to create Facebook FAQ.");
  }
});

router.put("/client/connect/faqs/:faqId", async (req, res) => {
  try {
    const faq = await facebookClientConnectService.updateFaq({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      faqId: req.params?.faqId,
      payload: req.body,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ faq });
  } catch (error) {
    return sendRouteError(res, error, "Failed to update Facebook FAQ.");
  }
});

router.post("/client/connect/faqs/:faqId/archive", async (req, res) => {
  try {
    const faq = await facebookClientConnectService.archiveFaq({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      faqId: req.params?.faqId,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ faq });
  } catch (error) {
    return sendRouteError(res, error, "Failed to archive Facebook FAQ.");
  }
});

router.get("/client/connect/suggestions", async (req, res) => {
  try {
    const suggestions = await facebookClientConnectService.listSuggestions({
      workspaceId: req.query?.workspaceId,
      status: req.query?.status,
    });

    return res.status(200).json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load FAQ suggestions.");
  }
});

router.post("/client/connect/suggestions/:suggestionId/approve", async (req, res) => {
  try {
    const result = await facebookClientConnectService.approveSuggestion({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      suggestionId: req.params?.suggestionId,
      answer: req.body?.answer,
      category: req.body?.category,
      keywords: req.body?.keywords,
      userId: getRequestUserId(req),
    });

    return res.status(200).json(result);
  } catch (error) {
    return sendRouteError(res, error, "Failed to approve FAQ suggestion.");
  }
});

router.post("/client/connect/suggestions/:suggestionId/reject", async (req, res) => {
  try {
    const suggestion = await facebookClientConnectService.rejectSuggestion({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      suggestionId: req.params?.suggestionId,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ suggestion });
  } catch (error) {
    return sendRouteError(res, error, "Failed to reject FAQ suggestion.");
  }
});

router.post("/client/connect/suggestions/:suggestionId/archive", async (req, res) => {
  try {
    const suggestion = await facebookClientConnectService.archiveSuggestion({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      suggestionId: req.params?.suggestionId,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ suggestion });
  } catch (error) {
    return sendRouteError(res, error, "Failed to archive FAQ suggestion.");
  }
});

router.get("/client/connect/settings", async (req, res) => {
  try {
    const settings = await facebookClientConnectService.getPageSettings({
      workspaceId: req.query?.workspaceId,
      pageId: req.query?.pageId,
    });

    return res.status(200).json({ settings });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook page settings.");
  }
});

router.put("/client/connect/settings", async (req, res) => {
  try {
    const settings = await facebookClientConnectService.upsertPageSettings({
      workspaceId: req.body?.workspaceId || req.query?.workspaceId,
      pageId: req.body?.pageId || req.query?.pageId,
      payload: req.body,
      userId: getRequestUserId(req),
    });

    return res.status(200).json({ settings });
  } catch (error) {
    return sendRouteError(res, error, "Failed to update Facebook page settings.");
  }
});

router.get("/client/connect/analytics", async (req, res) => {
  try {
    const analytics = await facebookClientConnectService.listAnalytics({
      workspaceId: req.query?.workspaceId,
      pageId: req.query?.pageId,
      limit: req.query?.limit,
    });

    return res.status(200).json({
      analytics,
      count: analytics.length,
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook analytics.");
  }
});

router.get("/admin/test-faq", async (req, res) => {
  try {
    const pageId = normalizePageId(req.query?.pageId);
    const incomingText = normalizeText(
      req.query?.text || "What are your gym membership rates?"
    );
    const pageConfig = await getFacebookConfig({ pageId });
    const workspaceId = normalizeText(pageConfig.connectedWorkspaceId);

    if (!pageConfig.pageId) {
      return res.status(404).json({
        success: false,
        error: "Facebook page was not found in fb_pages.",
        pageId,
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: "Facebook page is not linked to a workspace in fb_pages.workspace_id.",
        pageId: pageConfig.pageId,
        pageName: pageConfig.pageName,
      });
    }

    const knowledgeManager = createFacebookKnowledgeManager({ supabaseClient });
    const activeFaqs = await knowledgeManager.getActiveFaqs({
      supabaseClient,
      workspaceId,
    });
    const result = await knowledgeManager.resolveKnowledgeReply({
      workspaceId,
      pageId: pageConfig.pageId,
      incomingText,
      pageConfig,
      compactFacebookReply,
      generateChatbotReply,
      recordAnalytics: false,
    });

    return res.status(200).json({
      success: true,
      pageId: pageConfig.pageId,
      pageName: pageConfig.pageName,
      workspaceId,
      accessMode: pageConfig.accessMode,
      hasPageAccessToken: Boolean(pageConfig.pageAccessToken),
      activeFaqCount: activeFaqs.length,
      incomingText,
      handled: Boolean(result?.handled),
      source: result?.source || "",
      confidence: result?.confidence || 0,
      reply: result?.reply || "",
      matchedFaqId: result?.faq?.id || null,
      matchedQuestion: result?.faq?.question || "",
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to test Facebook FAQ reply.");
  }
});

router.get("/admin/webhook-diagnostics", async (req, res) => {
  try {
    const pageId = normalizePageId(req.query?.pageId);
    const pageConfig = await getFacebookConfig({ pageId });

    return res.status(200).json({
      success: true,
      build: "facebook-webhook-handoff-failsafe-2026-06-15-v2",
      webhookUrl: getFacebookWebhookUrl(req),
      pageId: pageConfig.pageId || pageId || null,
      pageName: pageConfig.pageName || null,
      accessMode: pageConfig.accessMode || null,
      connectedWorkspaceId: pageConfig.connectedWorkspaceId || null,
      hasPageAccessToken: Boolean(pageConfig.pageAccessToken),
      hasVerifyToken: Boolean(pageConfig.verifyToken),
      hasAppSecret: Boolean(pageConfig.appSecret),
      supabaseConnected: Boolean(supabaseClient),
      note:
        "If Messenger messages do not create 'Facebook webhook received' logs in this backend, Meta is calling a different webhook URL or a different deployment.",
    });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load Facebook webhook diagnostics.");
  }
});

router.get("/client/handoffs", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const pageId = normalizeText(req.query?.pageId);
  const filter = normalizeText(req.query?.filter) || "all";

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  try {
    const conversations = await handoffManager.getHandoffConversations({ workspaceId, pageId, filter });
    return res.status(200).json({ conversations });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load handoff conversations.");
  }
});

router.get("/client/handoffs/badge-count", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const pageId = normalizeText(req.query?.pageId);

  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId is required" });
  }

  try {
    const count = await handoffManager.getHandoffBadgeCount({ workspaceId, pageId });
    return res.status(200).json({ count });
  } catch (error) {
    return sendRouteError(res, error, "Failed to get handoff badge count.");
  }
});

router.get("/client/handoffs/:conversationId/messages", async (req, res) => {
  const workspaceId = normalizeText(req.query?.workspaceId);
  const conversationId = req.params?.conversationId;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "workspaceId and conversationId are required" });
  }

  try {
    const messages = await handoffManager.getHandoffMessages({ workspaceId, conversationId });
    return res.status(200).json({ messages });
  } catch (error) {
    return sendRouteError(res, error, "Failed to load handoff messages.");
  }
});

router.post("/client/handoffs/:conversationId/reply", async (req, res) => {
  const workspaceId = normalizeText(req.body?.workspaceId);
  const conversationId = req.params?.conversationId;
  const { messageText, mediaUrl, mediaType, senderName } = req.body || {};

  if (!workspaceId || !conversationId || (!messageText && !mediaUrl)) {
    return res.status(400).json({ error: "workspaceId, conversationId, and either messageText or mediaUrl are required" });
  }

  try {
    const result = await handoffManager.sendHumanReply({
      workspaceId,
      conversationId,
      messageText,
      mediaUrl,
      mediaType,
      senderName,
    });
    return res.status(200).json(result);
  } catch (error) {
    return sendRouteError(res, error, "Failed to send handoff reply.");
  }
});

router.post("/client/handoffs/:conversationId/enable-chatbot", async (req, res) => {
  const workspaceId = normalizeText(req.body?.workspaceId);
  const conversationId = req.params?.conversationId;

  if (!workspaceId || !conversationId) {
    return res.status(400).json({ error: "workspaceId and conversationId are required" });
  }

  try {
    const result = await handoffManager.enableChatbot({ workspaceId, conversationId });
    return res.status(200).json(result);
  } catch (error) {
    return sendRouteError(res, error, "Failed to enable chatbot.");
  }
});

router.post("/", async (req, res) => {
  console.log("Facebook webhook received", {
    object: req.body?.object,
    entries: Array.isArray(req.body?.entry) ? req.body.entry.length : 0,
    hasSignature: Boolean(
      req.headers?.["x-hub-signature-256"] || req.headers?.["x-hub-signature"]
    ),
  });

  if (!(await verifyFacebookSignature(req))) {
    console.error("Facebook webhook signature failed");
    return res.status(403).json({ error: "Invalid Facebook webhook signature" });
  }

  if (req.body.object !== "page") {
    return res.sendStatus(404);
  }

  const messageEvents = [];

  for (const entry of req.body.entry || []) {
    for (const event of entry.messaging || []) {
      try {
        const fs = require("fs");
        const logMsg = `[${new Date().toISOString()}] Event: ` + JSON.stringify(event) + "\n";
        fs.appendFileSync(path.join(__dirname, "webhook_debug.log"), logMsg);
      } catch (err) {}

      const senderId = event?.sender?.id;
      const recipientPageId = normalizePageId(event?.recipient?.id);
      const incomingText = event?.message?.text || "";
      const attachments = event?.message?.attachments || [];
      
      // Extract first media attachment (image, video, audio, or file)
      const mediaAttachment = attachments.find((a) => 
        ["image", "video", "audio", "file"].includes(a.type)
      );
      const imageUrl = mediaAttachment?.payload?.url || null;
      const mediaType = mediaAttachment?.type || null;
      const messageId = normalizeText(event?.message?.mid);

      const normalizedSenderId =
        typeof senderId === "number"
          ? String(senderId)
          : typeof senderId === "string"
            ? senderId.trim()
            : "";

      const hasValidSenderId = /^\d+$/.test(normalizedSenderId);

      if (!hasValidSenderId || event?.message?.is_echo || (!incomingText && !imageUrl)) {
        if (incomingText && !event?.message?.is_echo) {
          console.warn("Skipping webhook event with invalid sender id", {
            entryId: entry?.id,
            senderId,
            senderIdType: typeof senderId,
          });
        }

        continue;
      }

      const messageEvent = {
        senderId: normalizedSenderId,
        incomingText,
        imageUrl,
        mediaType,
        messageId,
        entryId: entry?.id,
        pageId: recipientPageId || normalizePageId(entry?.id),
      };

      if (!markWebhookEventIfNew(messageEvent)) {
        console.log("Skipping duplicate Facebook webhook message", {
          pageId: messageEvent.pageId,
          senderId: normalizedSenderId,
          messageId: messageId || null,
        });
        continue;
      }

      messageEvents.push(messageEvent);
    }
  }

  console.log("Facebook webhook message batch", {
    count: messageEvents.length,
    pages: Array.from(new Set(messageEvents.map((event) => event.pageId))).filter(Boolean),
  });

  if (messageEvents.length === 0) {
    return res.status(200).send("EVENT_RECEIVED");
  }

  const pageConfigCache = new Map();

  async function getCachedPageConfig(pageId) {
    const cacheKey = normalizePageId(pageId) || "default";

    if (!pageConfigCache.has(cacheKey)) {
      pageConfigCache.set(cacheKey, await getFacebookConfig({ pageId }));
    }

    return pageConfigCache.get(cacheKey);
  }

  async function fetchFacebookUserProfile(senderId, pageAccessToken) {
    if (!senderId || !pageAccessToken) return null;
    try {
      const url = `https://graph.facebook.com/v22.0/${senderId}?fields=first_name,last_name,name&access_token=${encodeURIComponent(pageAccessToken)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.name || [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
      }
    } catch (err) {
      console.warn("[Facebook Profile Fetch Error]", err.message);
    }
    return null;
  }

  const replyResults = await Promise.allSettled(
    messageEvents.map(async ({ senderId, incomingText, imageUrl, mediaType, entryId, pageId, messageId }) => {
      try {
        const pageConfig = await getCachedPageConfig(pageId);
        const chatbotEnabled = pageConfig.accessMode !== "disable";

        // Human Handoff Check
        const workspaceId = pageConfig.connectedWorkspaceId;
        let botIsPaused = false; // tracks if this conversation is paused for human handoff
        if (workspaceId) {
          // Check if conversation exists
          const { data: existingConv } = await supabaseClient
            .from("facebook_conversations")
            .select("customer_name")
            .eq("customer_psid", senderId)
            .maybeSingle();
          
          let customerName = existingConv?.customer_name;

          if (!customerName || customerName === "Facebook User") {
            const fetchedName = await fetchFacebookUserProfile(senderId, pageConfig.pageAccessToken);
            if (fetchedName) {
              customerName = fetchedName;
              
              // Proactively cache/update facebook_conversations with the fetched name
              try {
                await supabaseClient
                  .from("facebook_conversations")
                  .update({ customer_name: customerName })
                  .eq("customer_psid", senderId);
              } catch (updateErr) {
                console.error("Failed to update facebook_conversations name:", updateErr);
              }
            }
          }

          if (!customerName) {
            customerName = "Facebook User";
          }

          const handoffPageId = pageConfig.pageId || pageId;

          let { data: clientConv } = await supabaseClient
            .from("client_facebook_conversations")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("page_id", handoffPageId)
            .eq("customer_psid", senderId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log("[Webhook Handoff Debug] Query params:", {
            workspaceId,
            pageId: handoffPageId,
            senderId,
          });
          console.log("[Webhook Handoff Debug] clientConv fetched:", clientConv);

          const isPausedHandoff =
            clientConv &&
            (clientConv.bot_paused || clientConv.status === "human_handoff");

          // 1. Existing handoffs stay human-only. Record the message, then stop.
          if (isPausedHandoff) {
            console.log(
              `[Handoff] Chatbot is already paused for customer ${customerName} (${senderId}). Saving message without bot reply.`
            );
            botIsPaused = true;

            await supabaseClient
              .from("client_facebook_messages")
              .insert({
                conversation_id: clientConv.id,
                workspace_id: workspaceId,
                sender_type: "customer",
                sender_name: customerName,
                message_text: incomingText || (mediaType === "video" ? "Sent a video" : mediaType === "audio" ? "Sent audio" : mediaType === "file" ? "Sent a file" : "Sent an image"),
                image_url: imageUrl || null,
                facebook_mid: messageId || null,
              });

            const _mediaEmojis = { image: "📷", video: "🎬", audio: "🎵", file: "📎" };
            await supabaseClient
              .from("client_facebook_conversations")
              .update({
                customer_name: customerName,
                bot_paused: true,
                needs_human: true,
                status: "human_handoff",
                last_message: incomingText || `${_mediaEmojis[mediaType] || "📷"} ${mediaType === "video" ? "Video" : mediaType === "audio" ? "Audio" : mediaType === "file" ? "File" : "Photo"}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", clientConv.id);

            return; // Exit early: no transfer repeat, FAQ, fallback, or AI reply.
          }

          // 2. New handoff request: pause the bot, notify once, then stop.
          if (isHumanHandoffRequest(incomingText)) {
            console.log(`[Handoff] Human request detected from customer ${customerName} (${senderId}). Sending transfer message.`);
            
            const isTagalog = isTagalogStyle(incomingText);
            const transferMessage = isTagalog
              ? "Sandali lamang. Ililipat ko kayo sa aming sales representative para mas matulungan kayo. 👥"
              : "Please wait. I will transfer you to a sales representative. 👥";

            if (!clientConv) {
              const { data: newConv, error: insertErr } = await supabaseClient
                .from("client_facebook_conversations")
                .insert({
                  workspace_id: workspaceId,
                  page_id: handoffPageId,
                  customer_psid: senderId,
                  customer_name: customerName,
                  last_message: incomingText,
                  bot_paused: true,
                  needs_human: true,
                  status: "human_handoff",
                })
                .select("*")
                .single();

              if (insertErr) console.error("Failed to insert client conversation:", insertErr);
              clientConv = newConv;
            } else {
              const { data: updatedConv, error: updateErr } = await supabaseClient
                .from("client_facebook_conversations")
                .update({
                  customer_name: customerName,
                  bot_paused: true,
                  needs_human: true,
                  status: "human_handoff",
                  last_message: incomingText,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", clientConv.id)
                .select("*")
                .single();

              if (updateErr) console.error("Failed to update client conversation:", updateErr);
              clientConv = updatedConv || clientConv;
            }

            // Send typing indicators
            try {
              await sendFacebookSenderAction(senderId, "typing_on", {
                pageId: pageConfig.pageId,
                pageAccessToken: pageConfig.pageAccessToken,
              });
            } catch (err) {}

            await sleep(getTypingDelayMs(transferMessage));

            try {
              await sendFacebookMessage(senderId, transferMessage, {
                pageId: pageConfig.pageId,
                pageAccessToken: pageConfig.pageAccessToken,
              });
            } catch (err) {
              console.warn("[Handoff Warning] Failed to send Facebook transfer response:", err.message);
            }

            try {
              await sendFacebookSenderAction(senderId, "typing_off", {
                pageId: pageConfig.pageId,
                pageAccessToken: pageConfig.pageAccessToken,
              });
            } catch (err) {}

            if (clientConv) {
              // Save customer message
              await supabaseClient
                .from("client_facebook_messages")
                .insert({
                  conversation_id: clientConv.id,
                  workspace_id: workspaceId,
                  sender_type: "customer",
                  sender_name: customerName,
                  message_text: incomingText || (mediaType === "video" ? "Sent a video" : mediaType === "audio" ? "Sent audio" : mediaType === "file" ? "Sent a file" : "Sent an image"),
                  image_url: imageUrl || null,
                  facebook_mid: messageId || null,
                });

              // Save transfer message
              await supabaseClient
                .from("client_facebook_messages")
                .insert({
                  conversation_id: clientConv.id,
                  workspace_id: workspaceId,
                  sender_type: "bot",
                  sender_name: "Chatbot",
                  message_text: transferMessage,
                });
            }

            return; // Exit early: do not generate any AI response
          }
        }

        if (!chatbotEnabled) {
          console.log(`[Webhook] Chatbot disabled for page ${pageConfig.pageId || pageId}. No outgoing reply sent.`);
          return;
        }

        const businessType = pageConfig.businessType || "";
        const pageName = pageConfig.pageName || "";
        const productServices = pageConfig.productServices || "";
        const productServicePriceRanges =
          pageConfig.productServicePriceRanges || "";
        const websiteLink = pageConfig.websiteLink || "";
        const shoppeLink = pageConfig.shoppeLink || "";
        const lazadaLink = pageConfig.lazadaLink || "";

        const memoryPageId = pageConfig.pageId || pageId;
        const history = getConversationHistory(memoryPageId, senderId);
        const requestMessages = [
          ...history,
          { role: "user", content: incomingText },
        ];

        let replyText = "Please wait for the agent reply.";
        let conversation = null;
        let replySource = "default";

        if (chatbotEnabled && !botIsPaused && pageConfig.connectedWorkspaceId) {
          const knowledgeManager = createFacebookKnowledgeManager({ supabaseClient });
          const knowledgeResult = await knowledgeManager.resolveKnowledgeReply({
            workspaceId: pageConfig.connectedWorkspaceId,
            pageId: pageConfig.pageId || pageId,
            incomingText,
            pageConfig: {
              ...pageConfig,
              businessType,
              pageName,
              productServices,
              productServicePriceRanges,
              websiteLink,
              shoppeLink,
              lazadaLink,
              knowledge: pageConfig.knowledge || "",
            },
            compactFacebookReply,
            generateChatbotReply,
            conversationMessages: requestMessages,
          });

          if (knowledgeResult?.handled && knowledgeResult.reply) {
            replyText = knowledgeResult.reply;
            replySource = knowledgeResult.source || "knowledge";
            conversation = await conversationStateService.getOrCreateConversation({
              workspaceId: pageConfig.connectedWorkspaceId,
              pageId: pageConfig.pageId || pageId,
              customerPsid: senderId,
              metadata: {
                source: "facebook_webhook",
                pageName,
              },
            });

            if (conversation?.id) {
              await conversationStateService.updateConversation(conversation.id, {
                lastCustomerMessage: incomingText,
                lastAiResponse: replyText,
                lastMessageAt: new Date().toISOString(),
                metadata: {
                  lastReplySource: knowledgeResult.source || "knowledge",
                  lastFaqId: knowledgeResult.faq?.id || null,
                },
              });
            }
          }
        }



        // Final Failsafe: Check if chatbot was paused/handoff triggered during processing
        if (workspaceId) {
          const { data: finalCheck } = await supabaseClient
            .from("client_facebook_conversations")
            .select("bot_paused, status")
            .eq("workspace_id", workspaceId)
            .eq("page_id", pageConfig.pageId || pageId)
            .eq("customer_psid", senderId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (finalCheck && (finalCheck.bot_paused || finalCheck.status === "human_handoff")) {
            console.log(`[Webhook Failsafe] Chatbot is paused for customer ${senderId}. Bypassing outgoing message.`);
            return;
          }
        }

        setConversationHistory(memoryPageId, senderId, [
          ...requestMessages,
          { role: "assistant", content: replyText },
        ]);

        try {
          await sendFacebookSenderAction(senderId, "typing_on", {
            pageId: pageConfig.pageId,
            pageAccessToken: pageConfig.pageAccessToken,
          });
        } catch (typingError) {
          console.error("Facebook typing_on skipped:", {
            message: typingError.message,
            senderId,
            pageId: pageConfig.pageId || pageId,
          });
        }

        await sleep(getTypingDelayMs(replyText));

        await sendFacebookMessage(senderId, replyText, {
          pageId: pageConfig.pageId,
          pageAccessToken: pageConfig.pageAccessToken,
        });

        console.log("Facebook webhook reply sent", {
          pageId: pageConfig.pageId || pageId,
          senderId,
          replySource,
          replyLength: replyText.length,
        });

        try {
          await sendFacebookSenderAction(senderId, "typing_off", {
            pageId: pageConfig.pageId,
            pageAccessToken: pageConfig.pageAccessToken,
          });
        } catch (typingError) {
          console.error("Facebook typing_off skipped:", {
            message: typingError.message,
            senderId,
            pageId: pageConfig.pageId || pageId,
          });
        }
      } catch (error) {
        console.error("Facebook webhook reply error:", {
          message: error.message,
          senderId,
          entryId,
          pageId,
        });
      }
    })
  );

  console.log("Facebook webhook reply batch completed", {
    total: replyResults.length,
    fulfilled: replyResults.filter((result) => result.status === "fulfilled").length,
    rejected: replyResults.filter((result) => result.status === "rejected").length,
  });

  return res.status(200).send("EVENT_RECEIVED");
});

module.exports = router;
