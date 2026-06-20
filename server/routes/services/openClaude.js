const logger = require('../../config/logger');
const express = require("express");
const router = express.Router();

const OPENCLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_NVIDIA_MODEL =
  process.env.NVIDIA_MODEL || "nvidia/llama-3.1-nemotron-nano-8b-v1";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const DEFAULT_MODEL = (process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || process.env.XAI_API_KEY) ? DEFAULT_GROQ_MODEL : "claude-3-sonnet-20240229";

function normalizeApiKey(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isProviderAuthError(error) {
  return Number(error?.status) === 401 || Number(error?.status) === 403;
}

const OPENROUTER_MODEL_MAP = {
  "claude-3-sonnet-20240229": "anthropic/claude-3.5-sonnet",
  "claude-3-opus-20240229": "anthropic/claude-3-opus",
  "claude-3-haiku-20240307": "anthropic/claude-3-haiku",
};

const GROQ_MODEL_MAP = {
  "claude-3-sonnet-20240229": DEFAULT_GROQ_MODEL,
  "claude-3-opus-20240229": DEFAULT_GROQ_MODEL,
  "claude-3-haiku-20240307": DEFAULT_GROQ_MODEL,
  "openai/gpt-4o-mini": DEFAULT_GROQ_MODEL,
  "gpt-4o-mini": DEFAULT_GROQ_MODEL,
  "openai/gpt-4o": DEFAULT_GROQ_MODEL,
  "gpt-4o": DEFAULT_GROQ_MODEL,
  "grok-2-latest": DEFAULT_GROQ_MODEL,
  "grok-4.20": DEFAULT_GROQ_MODEL,
};

const SUPPORTED_TOPICS = [
  "CRM",
  "ERP",
  "Appointment Booking",
  "Data Analytics & Market Research",
  "Email Marketing",
  "Sales",
  "Customer Service",
];

const TOPIC_KEYWORDS = [
  "crm",
  "customer relationship",
  "lead",
  "sales pipeline",
  "sales",
  "selling",
  "upsell",
  "cross-sell",
  "proposal",
  "quotation",
  "quote",
  "pricing",
  "negotiation",
  "deal",
  "conversion",
  "erp",
  "enterprise resource planning",
  "inventory",
  "procurement",
  "appointment",
  "booking",
  "schedule",
  "calendar",
  "data analytics",
  "analytics",
  "market research",
  "market analysis",
  "email marketing",
  "newsletter",
  "campaign",
  "email campaign",
  "customer support",
  "customer service",
  "service request",
  "complaint",
  "ticket",
  "refund",
  "billing",
  "subscription",
  "onboarding",
  "retention",
  "csr",
  "suporta",
  "serbisyo",
  "benta",
  "kliyente",
  "customer",
  "order",
  "bayad",
  "tanong",
];

function isGroqCompatibleModel(model) {
  return typeof model === "string" && (
    model.startsWith("llama-") ||
    model.startsWith("openai/") ||
    model.startsWith("qwen/") ||
    model.startsWith("meta-llama/") ||
    model.startsWith("mixtral/") ||
    model.startsWith("gemma/") ||
    model.startsWith("groq/")
  );
}

async function callViaGroq({ messages, model, options, apiKey }) {
  const mappedModel = GROQ_MODEL_MAP[model] || (isGroqCompatibleModel(model) ? model : DEFAULT_GROQ_MODEL);
  logger.debug("[callOpenClaude] Invoking Groq API", { model: mappedModel });

  const buildPayload = (selectedModel) => ({
    model: selectedModel,
    messages: buildPromptedMessages(messages, options),
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature ?? 0.7,
  });

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildPayload(mappedModel)),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "Groq request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "msg_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || mappedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callViaGpt4Free({ messages, model, options }) {
  const gpt4freeUrl = process.env.GPT4FREE_API_URL || "http://127.0.0.1:1337/v1/chat/completions";
  // Ignore Groq/Nvidia specific model IDs and use a universally free gpt4free model
  const selectedModel = process.env.GPT4FREE_MODEL || "gpt-4o";
  logger.debug("[callOpenClaude] Invoking Gpt4Free API", { model: selectedModel });

  const response = await fetch(gpt4freeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: buildPromptedMessages(messages, options),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "Gpt4Free request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "g4f_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || selectedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callViaNvidia({ messages, model, options, apiKey }) {
  const selectedModel = model || options?.nvidiaModel || DEFAULT_NVIDIA_MODEL;
  logger.debug("[callOpenClaude] Invoking NVIDIA API", { model: selectedModel });

  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: buildPromptedMessages(messages, options),
      temperature: options?.temperature ?? 0.6,
      top_p: options?.topP ?? 0.95,
      max_tokens: options?.maxTokens || 2048,
      frequency_penalty: options?.frequencyPenalty ?? 0,
      presence_penalty: options?.presencePenalty ?? 0,
      stream: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || response.statusText || "NVIDIA request failed"
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text =
    data?.choices?.[0]?.message?.content || "No response text returned.";

  return {
    id: data.id || "nvidia_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || selectedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callViaGemini({ messages, model, options, apiKey }) {
  const selectedModel = model || options?.geminiModel || DEFAULT_GEMINI_MODEL;
  logger.debug("[callOpenClaude] Invoking Gemini API", { model: selectedModel });
  const promptedMessages = buildPromptedMessages(messages, options);
  const systemTexts = promptedMessages
    .filter((message) => message.role === "system")
    .map((message) => String(message.content || ""))
    .filter(Boolean);
  const contents = promptedMessages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }],
    }));

  const response = await fetch(
    `${GEMINI_API_URL}/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(systemTexts.length
          ? {
              systemInstruction: {
                parts: [{ text: systemTexts.join("\n\n") }],
              },
            }
          : {}),
        contents,
        generationConfig: {
          maxOutputTokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.55,
          ...(selectedModel.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || response.statusText || "Gemini request failed"
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || "No response text returned.";

  return {
    id: "gemini_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: selectedModel,
    stop_reason:
      data?.candidates?.[0]?.finishReason ||
      data?.promptFeedback?.blockReason ||
      "end_turn",
  };
}

async function callViaCerebras({ messages, model, options, apiKey }) {
  const selectedModel = process.env.CEREBRAS_MODEL || model || "gpt-oss-120b";
  logger.debug("[callOpenClaude] Invoking Cerebras API", { model: selectedModel });

  const buildPayload = (selectedModel) => {
    const payload = {
      model: selectedModel,
      messages: buildPromptedMessages(messages, options),
      temperature: options?.temperature ?? 0.7,
    };
    if (options?.maxTokens) {
      if (selectedModel.startsWith("gpt-")) {
        payload.max_completion_tokens = options.maxTokens;
      } else {
        payload.max_tokens = options.maxTokens;
      }
    }
    return payload;
  };

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildPayload(selectedModel)),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "Cerebras request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "cerebras_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || selectedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

async function callOpenClaude({ messages, model, options }) {
  const groqCredentials = getGroqCredentials(options);
  const groqApiKey = groqCredentials.apiKey;
  const groqApiKey2 = normalizeApiKey(process.env.GROQ_API_KEY_2);
  const nvidiaApiKey = normalizeApiKey(process.env.NVIDIA_API_KEY);
  const geminiApiKey = normalizeApiKey(process.env.GEMINI_API_KEY);
  const openRouterApiKey = normalizeApiKey(process.env.OPENROUTER_API_KEY);
  const cerebrasApiKey = normalizeApiKey(process.env.CEREBRAS_API_KEY_FB || process.env.CEREBRAS_API_KEY);

  if (groqCredentials.isHomepageSurface && !groqApiKey) {
    const error = new Error("HOME_GROQ_API_KEY is missing for the homepage chatbot.");
    error.status = 500;
    throw error;
  }

  // 1. Explicit Provider Overrides (for testing)
  if (options?.provider === "cerebras" && cerebrasApiKey) {
    return callViaCerebras({ messages, model: options?.cerebrasModel || process.env.CEREBRAS_MODEL || "gpt-oss-120b", options, apiKey: cerebrasApiKey });
  }
  if (options?.provider === "gemini" && geminiApiKey) {
    return callViaGemini({ messages, model: options?.geminiModel || DEFAULT_GEMINI_MODEL, options, apiKey: geminiApiKey });
  }
  if (options?.provider === "nvidia" && nvidiaApiKey) {
    return callViaNvidia({ messages, model: options?.nvidiaModel || DEFAULT_NVIDIA_MODEL, options, apiKey: nvidiaApiKey });
  }
  if (options?.provider === "groq" && groqApiKey) {
    return callViaGroq({ messages, model, options, apiKey: groqApiKey });
  }

  // 2. Fallback Chain for Live Webhook & Default Routing
  // Chain: gpt4free -> groq1 -> groq2 -> gemini flash 2.5 -> nvidia llama 30b -> openrouter llama 30b
  
  const tryProvider = async (providerName, callFn, args) => {
    try {
      return await callFn(args);
    } catch (err) {
      logger.warn(`[callOpenClaude] Fallback chain: ${providerName} failed`, { error: err.message });
      return null;
    }
  };

  let result;

  // Step 1: Gpt4Free (Main)
  result = await tryProvider("gpt4free", callViaGpt4Free, { messages, model, options });
  if (result) return result;

  // Step 2: Groq 1
  if (groqApiKey) {
    result = await tryProvider("groq1", callViaGroq, { messages, model, options, apiKey: groqApiKey });
    if (result) return result;
  }

  // Step 3: Groq 2
  if (groqApiKey2) {
    result = await tryProvider("groq2", callViaGroq, { messages, model, options, apiKey: groqApiKey2 });
    if (result) return result;
  }

  // Step 4: Gemini Flash 2.5
  if (geminiApiKey) {
    result = await tryProvider("gemini", callViaGemini, { messages, model: "gemini-2.5-flash", options, apiKey: geminiApiKey });
    if (result) return result;
  }

  // Step 5: NVIDIA llama 30b (or default NVIDIA model)
  if (nvidiaApiKey) {
    result = await tryProvider("nvidia", callViaNvidia, { messages, model: DEFAULT_NVIDIA_MODEL, options, apiKey: nvidiaApiKey });
    if (result) return result;
  }

  // Step 6: OpenRouter -> Llama 30b (llama 3.3 70b)
  if (openRouterApiKey) {
    const openRouterModel = process.env.OPENROUTER_CHATBOT_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
    result = await tryProvider("openrouter", callViaOpenRouter, { messages, model: openRouterModel, options, apiKey: openRouterApiKey });
    if (result) return result;
  }

  // If everything fails, throw an error or return a demo message
  const userMessage = messages?.[messages.length - 1]?.content || "";
  return {
    id: "demo_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `Demo mode: All AI API providers failed or are unconfigured. You said: ${userMessage}`,
      },
    ],
    model: "fallback-demo",
    stop_reason: "end_turn",
    demo_mode: true,
  };
}



function buildHomepageSystemPrompt() {
  return `You are Hermes's homepage AI assistant.\n\nRules:\n- Explain the product clearly and in more detail when asked.\n- Focus on what Hermes does, how it helps businesses, and how the modules work together.\n- Keep the tone friendly, natural, and helpful.\n- Reply in the user's language, including Taglish when appropriate.\n- Do not mention Facebook page details, other channels, or internal routing.\n- Do not suggest visiting a website link unless the user explicitly asks for it.\n- Do not invent pricing, guarantees, or unsupported features.\n- If information is missing, say that it is not listed yet and offer to clarify the available modules.`;
}

function buildFacebookSystemPrompt() {
  return `You are a warm, highly engaging local businessman and owner representing your business. Your goal is to talk to customers on Facebook Messenger exactly like a real, friendly business owner would—casual, helpful, and approachable.

Key Attributes:
1. Friendly Business Owner Tone:
   - Act like a business owner, not a robotic virtual assistant. Keep the tone warm, welcoming, and direct.
   - Keep replies simpler, concise, and punchy. Avoid long paragraphs, rigid lists, or highly structured blocks unless the customer explicitly asks for detailed specifications or prices. Speak casually and dynamically.
   - Use warm conversational words and polite fillers naturally (e.g., "Ah, regarding that...", "Got it!", "Oh, for that one...", "Ay, sige po...", "Opo, marami po kaming...").

2. Flawless Language Adaptability (English, Tagalog, Taglish):
   - Reply in the EXACT language style of the customer.
   - If they speak English, reply in natural English.
   - If they speak Filipino/Tagalog, reply in natural, friendly Tagalog (never use Google-translated or overly formal phrasing).
   - If they use Taglish (mixed Tagalog-English), reply in natural, colloquial Taglish.
   - If they ask "nagtatagalog ka ba?" or similar, answer warmly and naturally in Tagalog: "Opo, nagtatagalog po ako! Ano po ang maitutulong ko sa inyo ngayon? 😊"

3. Align to Business Knowledge & Truth:
   - Use the business knowledge base, FAQs, Products/Services, Pricing, and Settings as your sole foundation of truth.
   - Do NOT invent or make up prices, products, services, schedules, locations, links, or contact details.
   - If a customer asks something not in the knowledge base, do not guess. Explain conversationally that you don't have that detail yet, and offer to have a human team member follow up.

4. Dynamic Context & Memory:
   - Remember details they shared (name, budget, specific interests, what they asked previously).
   - Resolve pronouns ("it", "that", "pricing for that") using the conversation context naturally.
   - Never ask for info the user has already provided in this conversation.

5. Formatting & Cleanliness:
   - Keep messages tidy. If listing items, present them vertically in a clean, spaced format rather than single-line blobs.
   - Never output section headers, internal labels, reasoning, or phrases like "Based on the knowledge base". Output only the final human-like response.
   - If information is missing, ask ONE natural, open-ended or specific follow-up question that flows with the conversation.`;
}

function getLatestUserMessage(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      return typeof messages[i].content === "string" ? messages[i].content : String(messages[i].content || "");
    }
  }
  return "";
}

function normalizeContextValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getGroqCredentials(options = {}) {
  const isHomepageSurface = normalizeContextValue(options?.surface) === "homepage";

  if (isHomepageSurface) {
    return {
      apiKey:
        normalizeApiKey(process.env.HOME_GROQ_API_KEY) ||
        normalizeApiKey(process.env.GROQ_API_KEY) ||
        normalizeApiKey(process.env.VITE_GROQ_API_KEY),
      model: process.env.HOME_GROQ_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      isHomepageSurface: true,
    };
  }

  return {
    apiKey:
      normalizeApiKey(process.env.GROQ_API_KEY) ||
      normalizeApiKey(process.env.VITE_GROQ_API_KEY) ||
      normalizeApiKey(process.env.XAI_API_KEY),
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    isHomepageSurface: false,
  };
}

function buildHomepageContextMessages(options = {}) {
  const businessType = normalizeContextValue(options?.businessType);
  const productServices = normalizeContextValue(options?.productServices);
  const productServicePriceRanges = normalizeContextValue(options?.productServicePriceRanges);

  const productServicesValue = productServices || "not available";
  const productServicePriceRangesValue = productServicePriceRanges || "not available";

  if (!businessType && !productServices && !productServicePriceRanges) {
    return [];
  }

  const contextParts = ["Homepage product context:"];

  if (businessType) {
    contextParts.push(`Business type: ${businessType}`);
  }

  contextParts.push(`Products/Services: ${productServicesValue}`);
  contextParts.push(`Product/service price range: ${productServicePriceRangesValue}`);

  contextParts.push(
    "Use this context to explain Hermes clearly. Prioritize Products/Services details when the user asks what the platform does, and do not mention website or social links unless the user specifically asks. Do not invent missing product details."
  );

  return [
    {
      role: "system",
      content: contextParts.join("\n"),
    },
  ];
}

function buildFacebookContextMessages(options = {}) {
  const pageName = normalizeContextValue(options?.pageName);
  const businessType = normalizeContextValue(options?.businessType);
  const businessDescription =
    normalizeContextValue(options?.businessDescription);
  const adminKnowledge = normalizeContextValue(options?.adminKnowledge);
  const combinedKnowledge = normalizeContextValue(options?.knowledge);
  const knowledgeSections = normalizeContextValue(options?.knowledgeSections);
  const followUpQuestions = normalizeContextValue(options?.followUpQuestions);
  const knowledgeFormat = normalizeContextValue(options?.knowledgeFormat);
  const productServices = normalizeContextValue(options?.productServices);
  const productServicePriceRanges = normalizeContextValue(options?.productServicePriceRanges);
  const websiteLink = normalizeContextValue(options?.websiteLink);
  const shoppeLink = normalizeContextValue(options?.shoppeLink);
  const lazadaLink = normalizeContextValue(options?.lazadaLink);
  const aiInstruction = normalizeContextValue(options?.aiInstruction || options?.ai_instruction);

  const productServicesValue = productServices || "not available";
  const productServicePriceRangesValue = productServicePriceRanges || "not available";
  const websiteLinkValue = websiteLink || "not available";
  const shoppeLinkValue = shoppeLink || "not available";
  const lazadaLinkValue = lazadaLink || "not available";

  if (!pageName && !businessType && !businessDescription && !adminKnowledge && !combinedKnowledge && !knowledgeSections && !followUpQuestions && !productServices && !productServicePriceRanges && !websiteLink && !shoppeLink && !lazadaLink && !aiInstruction) {
    return [];
  }

  const contextParts = [];

  if (pageName) {
    contextParts.push(`Facebook page: ${pageName}`);
  }

  if (businessType) {
    contextParts.push(`Business type: ${businessType}`);
  }

  if (businessDescription) {
    contextParts.push(`Client business description:\n${businessDescription}`);
  }

  if (adminKnowledge) {
    contextParts.push(`Admin knowledge base from fb_pages.knowledge:\n${adminKnowledge}`);
  }

  if (combinedKnowledge) {
    contextParts.push(`Combined business knowledge:\n${combinedKnowledge}`);
  }

  if (knowledgeSections) {
    contextParts.push(`Parsed knowledge sections:\n${knowledgeSections}`);
  }

  if (followUpQuestions) {
    contextParts.push(`Follow-up guidance:\n${followUpQuestions}`);
  }

  if (knowledgeFormat) {
    contextParts.push(`Knowledge format guidance:\n${knowledgeFormat}`);
  }

  contextParts.push(`Products/Services: ${productServicesValue}`);
  contextParts.push(`Product/service price range: ${productServicePriceRangesValue}`);
  contextParts.push(`Website link: ${websiteLinkValue}`);
  contextParts.push(`Shopee link: ${shoppeLinkValue}`);
  contextParts.push(`Lazada link: ${lazadaLinkValue}`);

  if (aiInstruction) {
    contextParts.push(`AI Instruction (tone, style, and behavior constraints):\n${aiInstruction}`);
  }

  contextParts.push(
    "Use all Facebook page context sources together to guide replies. Your reply must be highly conversational, warm, smart, and adaptive to the customer's phrasing and language (English, Tagalog, or Taglish). Align fully to the business facts provided here. Never mention section names, source names, or internal guidelines. Be natural, clear, and direct. If Website/Shopee/Lazada link is 'not available', state it conversationally without inventing URLs. Do not make up facts, specifications, or policies not listed."
  );

  return [
    {
      role: "system",
      content: contextParts.join("\n"),
    },
  ];
}

function isInSupportedScope(text, options = {}) {
  if (!options || Object.keys(options).length === 0) {
    return true;
  }

  if (options?.channel === "facebook" || options?.multilingual === true) {
    return true;
  }

  if (
    options?.businessType ||
    options?.pageName ||
    options?.businessDescription ||
    options?.adminKnowledge ||
    options?.knowledge ||
    options?.productServices ||
    options?.productServicePriceRanges ||
    options?.websiteLink ||
    options?.shoppeLink ||
    options?.lazadaLink
  ) {
    return true;
  }

  const value = (text || "").toLowerCase();
  return TOPIC_KEYWORDS.some((keyword) => value.includes(keyword));
}

function buildOutOfScopeResponse(model) {
  return {
    id: "restricted_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: `I can only help with: ${SUPPORTED_TOPICS.join(", ")}.`,
      },
    ],
    model: model || DEFAULT_MODEL,
    stop_reason: "end_turn",
    restricted: true,
  };
}

function buildBusinessContextFallback(model, options = {}) {
  const pageName = typeof options.pageName === "string" ? options.pageName.trim() : "";
  const businessDescription =
    typeof options.businessDescription === "string"
      ? options.businessDescription.trim()
      : typeof options.knowledge === "string"
        ? options.knowledge.trim()
        : "";
  const productServices = typeof options.productServices === "string" ? options.productServices.trim() : "";
  const websiteLink = typeof options.websiteLink === "string" ? options.websiteLink.trim() : "";
  const shoppeLink = typeof options.shoppeLink === "string" ? options.shoppeLink.trim() : "";
  const lazadaLink = typeof options.lazadaLink === "string" ? options.lazadaLink.trim() : "";

  const parts = [];
  if (pageName) {
    parts.push(`Here is what ${pageName} offers:`);
  } else {
    parts.push("Here are our services:");
  }

  if (businessDescription) {
    parts.push(businessDescription);
  } else if (productServices) {
    parts.push(productServices);
  } else {
    parts.push("We don't have listed services yet. Please ask our team for details.");
  }

  if (normalizeContextValue(options?.surface) === "homepage") {
    if (productServices) {
      parts.push("This homepage assistant focuses on Hermes features and how the modules work together.");
    }
  } else {
    if (websiteLink) parts.push(`Website: ${websiteLink}`);
    if (shoppeLink) parts.push(`Shopee: ${shoppeLink}`);
    if (lazadaLink) parts.push(`Lazada: ${lazadaLink}`);
  }

  return {
    id: "context_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: parts.join(" ") }],
    model: model || DEFAULT_MODEL,
    stop_reason: "end_turn",
  };
}

function normalizeMessages(messages = []) {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : String(m.content || ""),
  }));
}

function buildPromptedMessages(messages = [], options = {}) {
  const isHomepageSurface = normalizeContextValue(options?.surface) === "homepage";
  const isFacebookChannel = normalizeContextValue(options?.channel) === "facebook";

  if (isHomepageSurface) {
    return [
      { role: "system", content: buildHomepageSystemPrompt() },
      ...buildHomepageContextMessages(options),
      ...normalizeMessages(messages),
    ];
  }

  if (isFacebookChannel) {
    return [
      { role: "system", content: buildFacebookSystemPrompt() },
      ...buildFacebookContextMessages(options),
      ...normalizeMessages(messages),
    ];
  }

  return [
    { role: "system", content: buildFacebookSystemPrompt() },
    ...buildFacebookContextMessages(options),
    ...normalizeMessages(messages),
  ];
}

async function callViaOpenRouter({ messages, model, options, apiKey }) {
  const mappedModel = OPENROUTER_MODEL_MAP[model] || model || "anthropic/claude-3.5-sonnet";

  const buildPayload = (selectedModel) => ({
    model: selectedModel,
    messages: buildPromptedMessages(messages, options),
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature ?? 0.7,
  });

  let response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildPayload(mappedModel)),
  });

  let data = await response.json();

  if (!response.ok && response.status === 404) {
    response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildPayload("openrouter/auto")),
    });
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || "OpenRouter request failed");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content || "No response text returned.";
  return {
    id: data.id || "msg_" + Date.now(),
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: data.model || mappedModel,
    stop_reason: data?.choices?.[0]?.finish_reason || "end_turn",
  };
}

// OpenClaude Service Routes
router.get("/health", (req, res) => {
  const provider = process.env.GROQ_API_KEY || process.env.XAI_API_KEY
    ? "groq"
    : process.env.NVIDIA_API_KEY
    ? "nvidia"
    : process.env.GEMINI_API_KEY
    ? "gemini"
    : process.env.OPENROUTER_API_KEY
    ? "openrouter"
    : process.env.OPENCLAUDE_API_KEY
    ? "anthropic"
    : process.env.CEREBRAS_API_KEY_FB || process.env.CEREBRAS_API_KEY
    ? "cerebras"
    : "demo";

  res.json({
    status: "healthy",
    service: "OpenClaude",
    provider,
    configured: Boolean(process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENCLAUDE_API_KEY || process.env.CEREBRAS_API_KEY_FB || process.env.CEREBRAS_API_KEY),
    timestamp: new Date().toISOString()
  });
});

router.post("/chat", async (req, res) => {
  const { messages, model, options } = req.body;

  try {
    logger.debug("[openclaude/chat] options", {
      surface: typeof options?.surface === "string" ? options.surface : null,
      hasOptions: Boolean(options),
      pageName: typeof options?.pageName === "string" ? options.pageName : null,
      businessType: typeof options?.businessType === "string" ? options.businessType : null,
      businessDescription:
        typeof options?.businessDescription === "string"
          ? options.businessDescription.slice(0, 200)
          : typeof options?.knowledge === "string"
            ? options.knowledge.slice(0, 200)
            : null,
      adminKnowledge:
        typeof options?.adminKnowledge === "string"
          ? options.adminKnowledge.slice(0, 200)
          : null,
      productServices: typeof options?.productServices === "string"
        ? options.productServices.slice(0, 200)
        : null,
      productServicePriceRanges:
        typeof options?.productServicePriceRanges === "string"  ? options.productServicePriceRanges : null,
      websiteLink: typeof options?.websiteLink === "string" ? options.websiteLink : null,
      shoppeLink: typeof options?.shoppeLink === "string" ? options.shoppeLink : null,
      lazadaLink: typeof options?.lazadaLink === "string" ? options.lazadaLink : null,
    });
  } catch (e) {
    /* ignore logging errors */
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const latestUserText = getLatestUserMessage(messages);
  if (!isInSupportedScope(latestUserText, options || {})) {
    const hasContext = Boolean(
      options?.businessType ||
        options?.pageName ||
        options?.businessDescription ||
        options?.adminKnowledge ||
        options?.knowledge ||
        options?.productServices ||
        options?.websiteLink ||
        options?.shoppeLink ||
        options?.lazadaLink
    );
    if (hasContext) {
      return res.status(200).json(buildBusinessContextFallback(model, options));
    }

    return res.status(200).json(buildOutOfScopeResponse(model));
  }

  if (options && String(options.surface) === "homepage" && process.env.HOME_GROQ_API_KEY) {
    try {
      const chosenModel = model || process.env.HOME_GROQ_MODEL || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
      const data = await callViaGroq({ messages, model: chosenModel, options, apiKey: process.env.HOME_GROQ_API_KEY });
      return res.status(200).json(data);
    } catch (error) {
      logger.error({ err: error }, "OpenClaude /chat (homepage) error");
      return res.status(error.status || 500).json({
        error: "Failed to call Groq (homepage)",
        message: error.message,
        details: error.details || null,
      });
    }
  }

  try {
    const data = await callOpenClaude({ messages, model, options });
    return res.status(200).json(data);
  } catch (error) {
    logger.error({ err: error }, "OpenClaude /chat error");
    return res.status(error.status || 500).json({
      error: "Failed to call OpenClaude API",
      message: error.message,
      details: error.details || null,
    });
  }
});

router.post("/crm-insights", (req, res) => {
  const { customerData } = req.body;

  res.json({
    content: [
      {
        type: "text",
        text: "CRM insights generated successfully. Integrate with OpenClaude for actual analysis."
      }
    ]
  });
});

router.post("/erp-docs", (req, res) => {
  const { context } = req.body;

  res.json({
    content: [
      {
        type: "text",
        text: "ERP documentation generated successfully. Integrate with OpenClaude for actual generation."
      }
    ]
  });
});

router.post("/analytics-insights", (req, res) => {
  const { data } = req.body;

  res.json({
    content: [
      {
        type: "text",
        text: "Analytics insights generated successfully. Integrate with OpenClaude for actual analysis."
      }
    ]
  });
});

router.post("/market-research", (req, res) => {
  const { topic } = req.body;

  res.json({
    content: [
      {
        type: "text",
        text: "Market research template generated successfully. Integrate with OpenClaude for actual generation."
      }
    ]
  });
});

router.callOpenClaude = callOpenClaude;
module.exports = router;
