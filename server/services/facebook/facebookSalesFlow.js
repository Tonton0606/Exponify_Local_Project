const logger = require('../../config/logger');
const {
  createFacebookFlowStateService,
} = require("./facebookFlowState");

const {
  isAffirmativeReply,
  isNegativeReply,
} = require("./facebookCtaResolver");

const {
  buildCtaOptionsReply,
  handlePostConfirmationFlow,
  normalizeConfirmedFlowData,
} = require("./facebookPostConfirmationFlow");

const {
  inferLeadStageFromIntent,
  syncFacebookLead,
} = require("./facebookLeadCrmSync");

const {
  analyzeFacebookPageIntelligence,
} = require("./facebookPageIntelligence");

const {
  qualifyFacebookLead,
} = require("./facebookLeadQualification");

const {
  buildAdaptiveSalesReply,
  buildRecommendationReply,
} = require("./facebookSalesResponder");

const {
  getNextContactField,
  getNextDiscoveryField,
  shouldAskContactBeforeAction,
  shouldConfirmBeforeCta,
} = require("./facebookDiscoveryPolicy");

const {
  buildLeadConfirmationReply,
  canSaveConfirmedLeadToCrm,
  getConfirmedLeadData,
  getPendingLeadData,
  isConfirmationAccepted,
  isConfirmationRejected,
  needsLeadConfirmation,
  promotePendingToConfirmed,
  resetLeadConfirmation,
} = require("./facebookLeadConfirmation");

const {
  captureExpectedField,
  setAwaitingField,
} = require("./facebookExpectedFieldCapture");

const {
  createFacebookKnowledgeManager,
} = require("./facebookKnowledgeManager");

const flowStateService = createFacebookFlowStateService();

const CUSTOMER_FIELDS = [
  "customerName",
  "phone",
  "email",
  "location",
  "businessType",
  "businessModel",
  "productOrServiceWanted",
  "problemEncountered",
  "desiredSolution",
  "inquirySource",
  "dailyVolume",
  "budgetOrQuantity",
  "preferredSchedule",
  "urgency",
];

const KNOWLEDGE_BYPASS_INTENTS = new Set([
  "affirmative_response",
  "negative_response",
  "human_request",
]);

const KNOWLEDGE_BYPASS_STAGES = new Set([
  "awaiting_lead_confirmation",
  "awaiting_lead_correction",
  "awaiting_demo_schedule",
  "demo_schedule_received",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function detectFacebookIntent(text = "") {
  const message = String(text || "").toLowerCase();
  const hasAny = (keywords) =>
    keywords.some((keyword) => message.includes(keyword));

  if (isAffirmativeReply(message) || isConfirmationAccepted(message)) {
    return { intent: "affirmative_response", confidence: 0.82 };
  }

  if (isNegativeReply(message) || isConfirmationRejected(message)) {
    return { intent: "negative_response", confidence: 0.82 };
  }

  if (
    hasAny([
      "tao",
      "agent",
      "representative",
      "human",
      "admin",
      "kausap",
      "tawag",
      "call",
      "staff",
    ])
  ) {
    return { intent: "human_request", confidence: 0.9 };
  }

  if (
    hasAny([
      "demo",
      "meeting",
      "schedule",
      "appointment",
      "book",
      "presentation",
      "pakita",
      "sample",
      "consultation",
      "consult",
    ])
  ) {
    return { intent: "demo_request", confidence: 0.88 };
  }

  if (
    hasAny([
      "magkano",
      "price",
      "pricing",
      "presyo",
      "cost",
      "bayad",
      "package",
      "plan",
      "rate",
      "avail",
    ])
  ) {
    return { intent: "pricing_inquiry", confidence: 0.88 };
  }

  if (
    hasAny([
      "automated",
      "automation",
      "auto reply",
      "autoreply",
      "chatbot",
      "reply",
      "messenger",
      "inquiries",
      "inquiry",
      "customer",
      "customers",
      "lead",
      "leads",
      "automatic",
      "auto",
      "order",
      "ordering",
      "commerce",
    ])
  ) {
    return { intent: "automation_interest", confidence: 0.9 };
  }

  if (
    hasAny([
      "crm",
      "pipeline",
      "sales",
      "follow up",
      "follow-up",
      "customer management",
      "manage customer",
    ])
  ) {
    return { intent: "crm_interest", confidence: 0.86 };
  }

  if (
    hasAny([
      "hello",
      "hi",
      "hey",
      "good day",
      "kumusta",
      "kamusta",
      "interested",
      "interesado",
    ])
  ) {
    return { intent: "greeting", confidence: 0.75 };
  }

  return { intent: "unknown", confidence: 0.35 };
}

function extractDailyVolume(text = "") {
  const message = normalizeText(text);

  const rangeMatch = message.match(/\b(\d+)\s*[-–to]+\s*(\d+)\b/i);
  if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]} per day`;

  const plusMatch = message.match(/\b(\d+)\s*\+/);
  if (
    plusMatch &&
    /(inquir|order|message|lead|customer|booking|daily|day|per day|araw|kada)/i.test(
      message
    )
  ) {
    return `${plusMatch[1]}+ per day`;
  }

  const numberMatch = message.match(/\b(\d+)\b/);
  if (
    numberMatch &&
    /(inquir|order|message|lead|customer|booking|daily|day|per day|araw|kada)/i.test(
      message
    )
  ) {
    return `${numberMatch[1]} per day`;
  }

  if (/(few|konti|kaunti)/i.test(message)) return "low volume";
  if (/(many|madami|marami|high)/i.test(message)) return "high volume";

  return "";
}

function shouldBypassKnowledgeLookup({ intentResult, currentStage }) {
  if (KNOWLEDGE_BYPASS_INTENTS.has(intentResult?.intent)) {
    return true;
  }

  if (KNOWLEDGE_BYPASS_STAGES.has(currentStage)) {
    return true;
  }

  return false;
}

function shouldForceKnowledgeLookup(text = "") {
  const message = normalizeText(text).toLowerCase();

  if (!message) return false;
  if (message.includes("?")) return true;

  return [
    "faq",
    "membership",
    "rate",
    "rates",
    "price",
    "pricing",
    "cost",
    "fee",
    "monthly",
    "package",
    "plan",
    "magkano",
    "presyo",
    "bayad",
    "papayat",
    "mag papayat",
    "magpapayat",
    "pumayat",
    "lose weight",
    "weight loss",
    "fat loss",
    "nutrition",
    "meal",
    "diet",
    "beginner",
    "baguhan",
    "muscle",
    "gain muscle",
    "build muscle",
    "home workout",
    "workout",
    "program",
    "guidance",
  ].some((keyword) => message.includes(keyword));
}

function mergeCustomerFields(base = {}, patch = {}) {
  const merged = { ...(base || {}) };

  CUSTOMER_FIELDS.forEach((field) => {
    const value = normalizeText(patch?.[field]);

    if (value) {
      merged[field] = value;
    }
  });

  return merged;
}

function extractSafeQualificationData(qualification = {}) {
  const extracted =
    qualification.extractedData && typeof qualification.extractedData === "object"
      ? qualification.extractedData
      : {};

  const safe = {};

  CUSTOMER_FIELDS.forEach((field) => {
    const value = normalizeText(extracted[field]);

    if (value) {
      safe[field] = value;
    }
  });

  return safe;
}

function mergeFlowData(currentData = {}, pageIntelligence = {}, qualification = {}) {
  const alreadyConfirmed = currentData.crmConfirmed === true;

  const pendingLeadData = alreadyConfirmed
    ? {}
    : mergeCustomerFields(
        getPendingLeadData(currentData),
        extractSafeQualificationData(qualification)
      );

  return {
    ...(currentData || {}),
    pageType: pageIntelligence?.pageType || currentData.pageType || "",
    offeringType: pageIntelligence?.offeringType || currentData.offeringType || "",
    customerGoal: pageIntelligence?.customerGoal || currentData.customerGoal || "",
    customerIntent:
      pageIntelligence?.customerIntent || currentData.customerIntent || "",
    pendingLeadData,
    confirmedLeadData: getConfirmedLeadData(currentData),
    crmConfirmed: alreadyConfirmed,
    awaitingField: alreadyConfirmed ? "" : currentData.awaitingField || "",
    leadScore:
      qualification?.leadScore !== undefined
        ? qualification.leadScore
        : currentData.leadScore,
    leadPriority: qualification?.leadPriority || currentData.leadPriority || "",
    qualificationSummary:
      qualification?.qualificationSummary ||
      currentData.qualificationSummary ||
      "",
  };
}

function buildDiscoveryReply({
  data,
  intentResult,
  nextField,
  pageConfig,
  pageIntelligence,
  qualification,
  compactFacebookReply,
}) {
  return compactFacebookReply(
    buildAdaptiveSalesReply({
      intentResult,
      data,
      nextField,
      pageConfig,
      pageIntelligence,
      qualification: {
        ...qualification,
        nextBestQuestion: "",
      },
      discoveryOnly: true,
      includeLinks: false,
    })
  );
}

function buildConfirmationMessage(data = {}, compactFacebookReply) {
  const reply = buildLeadConfirmationReply(data);

  return compactFacebookReply(
    reply ||
      "Please confirm if the details are correct by replying YES, or send the corrected details."
  );
}

function buildNextStepAfterDiscovery({
  data,
  intentResult,
  pageConfig,
  pageIntelligence,
  qualification,
  compactFacebookReply,
}) {
  if (data.crmConfirmed === true) {
    return {
      stage: "awaiting_cta_choice",
      data: normalizeConfirmedFlowData(data),
      reply: buildCtaOptionsReply(compactFacebookReply),
    };
  }

  const nextDiscoveryField = getNextDiscoveryField({
    intentResult,
    data,
  });

  if (nextDiscoveryField) {
    const nextData = setAwaitingField(data, nextDiscoveryField);

    return {
      stage:
        nextDiscoveryField === "dailyVolume"
          ? "awaiting_daily_volume"
          : "adaptive_qualification",
      data: nextData,
      reply: buildDiscoveryReply({
        data: nextData,
        intentResult,
        nextField: nextDiscoveryField,
        pageConfig,
        pageIntelligence,
        qualification,
        compactFacebookReply,
      }),
    };
  }

  if (shouldAskContactBeforeAction({ intentResult, data })) {
    const nextContactField = getNextContactField({ data });
    const nextData = setAwaitingField(data, nextContactField);

    return {
      stage: "collecting_contact",
      data: nextData,
      reply: buildDiscoveryReply({
        data: nextData,
        intentResult,
        nextField: nextContactField,
        pageConfig,
        pageIntelligence,
        qualification,
        compactFacebookReply,
      }),
    };
  }

  const clearedData = {
    ...data,
    awaitingField: "",
  };

  if (
    shouldConfirmBeforeCta({ intentResult, data: clearedData }) ||
    needsLeadConfirmation(clearedData)
  ) {
    return {
      stage: "awaiting_lead_confirmation",
      data: clearedData,
      reply: buildConfirmationMessage(clearedData, compactFacebookReply),
    };
  }

  return {
    stage: "recommendation",
    data: clearedData,
    reply: compactFacebookReply(
      buildRecommendationReply({
        data: clearedData,
        pageConfig,
        pageIntelligence,
      })
    ),
  };
}

function applyExpectedFieldCapture({ data = {}, incomingText = "" }) {
  if (data.crmConfirmed === true) {
    return normalizeConfirmedFlowData(data);
  }

  const result = captureExpectedField({
    data,
    incomingText,
  });

  return result.captured ? result.data : data;
}

function buildStatefulSalesReply({
  incomingText,
  intentResult,
  pageConfig,
  pageId,
  senderId,
  compactFacebookReply,
  pageIntelligence,
  qualification,
}) {
  const state = flowStateService.getFlowState(pageId, senderId);
  const mergedData = mergeFlowData(state.data || {}, pageIntelligence, qualification);
  const data = applyExpectedFieldCapture({
    data: mergedData,
    incomingText,
  });

  if (state.stage === "awaiting_lead_confirmation") {
    if (intentResult.intent === "affirmative_response") {
      const confirmedData = normalizeConfirmedFlowData(
        promotePendingToConfirmed(data)
      );

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "awaiting_cta_choice",
          data: confirmedData,
        }),
        reply: buildCtaOptionsReply(compactFacebookReply),
      };
    }

    if (intentResult.intent === "negative_response") {
      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "awaiting_lead_correction",
          data: resetLeadConfirmation(data),
        }),
        reply: compactFacebookReply(
          "No problem po. Please send the corrected details, and I’ll confirm them again before saving."
        ),
      };
    }

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "awaiting_lead_confirmation",
        data,
      }),
      reply: buildConfirmationMessage(data, compactFacebookReply),
    };
  }

  if (state.stage === "awaiting_lead_correction") {
    const nextData = resetLeadConfirmation(data);

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "awaiting_lead_confirmation",
        data: nextData,
      }),
      reply: buildConfirmationMessage(nextData, compactFacebookReply),
    };
  }

  if (state.stage === "awaiting_daily_volume") {
    const extractedVolume = extractDailyVolume(incomingText);
    const nextData = {
      ...data,
      awaitingField: "",
      pendingLeadData: mergeCustomerFields(getPendingLeadData(data), {
        ...(extractedVolume ? { dailyVolume: extractedVolume } : {}),
      }),
    };

    const nextStep = buildNextStepAfterDiscovery({
      data: nextData,
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  if (state.stage === "collecting_contact") {
    const nextStep = buildNextStepAfterDiscovery({
      data,
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  if (
    state.stage === "adaptive_qualification" ||
    state.stage === "understanding_inquiry"
  ) {
    const nextStep = buildNextStepAfterDiscovery({
      data,
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  if (
    data.crmConfirmed === true ||
    state.stage === "recommendation" ||
    state.stage === "awaiting_cta_choice" ||
    state.stage === "pricing_overview" ||
    state.stage === "awaiting_demo_schedule" ||
    state.stage === "demo_schedule_received" ||
    state.stage === "human_handoff"
  ) {
    if (intentResult.intent === "greeting") {
      const pageName = normalizeText(pageConfig?.pageName) || "this page";

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "understanding_inquiry",
          data: {
            ...data,
            requestedHuman: false,
            ctaChoice: "",
          },
        }),
        reply: compactFacebookReply(
          `Hello po! This is ${pageName}. How can we help you today?`
        ),
      };
    }

    if (shouldForceKnowledgeLookup(incomingText)) {
      const priceInfo = normalizeText(pageConfig?.productServicePriceRanges);
      const servicesInfo = normalizeText(pageConfig?.productServices);

      const reply = priceInfo
        ? ["Here is the available pricing information:", "", priceInfo].join("\n")
        : servicesInfo
          ? ["Here are the products/services we offer:", "", servicesInfo].join("\n")
          : "I don't have an approved answer for that yet. Please wait for the page owner to review your question.";

      return {
        handled: true,
        flowState: flowStateService.setFlowState(pageId, senderId, {
          stage: "understanding_inquiry",
          data: {
            ...data,
            requestedHuman: false,
            ctaChoice: "",
          },
        }),
        reply: compactFacebookReply(reply),
      };
    }

    return handlePostConfirmationFlow({
      incomingText,
      data,
      stateStage: state.stage,
      pageConfig,
      flowStateService,
      pageId,
      senderId,
      compactFacebookReply,
    });
  }

  if (intentResult.intent === "greeting") {
    const pageName = normalizeText(pageConfig?.pageName) || "this page";

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: "understanding_inquiry",
        data,
      }),
      reply: compactFacebookReply(
        `Hello po! This is ${pageName}. How can we help you today?`
      ),
    };
  }

  if (
    intentResult.intent === "human_request" ||
    intentResult.intent === "demo_request" ||
    intentResult.intent === "pricing_inquiry" ||
    intentResult.intent === "automation_interest" ||
    intentResult.intent === "crm_interest" ||
    intentResult.intent === "unknown"
  ) {
    const nextStep = buildNextStepAfterDiscovery({
      data: {
        ...data,
        interest: intentResult.intent,
      },
      intentResult,
      pageConfig,
      pageIntelligence,
      qualification,
      compactFacebookReply,
    });

    return {
      handled: true,
      flowState: flowStateService.setFlowState(pageId, senderId, {
        stage: nextStep.stage,
        data: nextStep.data,
      }),
      reply: nextStep.reply,
    };
  }

  const nextStep = buildNextStepAfterDiscovery({
    data,
    intentResult,
    pageConfig,
    pageIntelligence,
    qualification,
    compactFacebookReply,
  });

  return {
    handled: true,
    flowState: flowStateService.setFlowState(pageId, senderId, {
      stage: nextStep.stage,
      data: nextStep.data,
    }),
    reply: nextStep.reply,
  };
}

function getConversationPatchFromFlow({
  statefulResult,
  intentResult,
  replyText,
  pageIntelligence,
  qualification,
  knowledgeResult,
}) {
  const flowState = statefulResult?.flowState || { stage: "new", data: {} };
  const data = flowState.data || {};
  const confirmedLeadData = getConfirmedLeadData(data);

  const knowledgePatch =
    knowledgeResult && typeof knowledgeResult === "object"
      ? {
          knowledge: {
            handled: Boolean(knowledgeResult.handled),
            source: knowledgeResult.source || "",
            confidence: knowledgeResult.confidence || 0,
            shouldHandoff: Boolean(knowledgeResult.shouldHandoff),
            bookingCtaSent: Boolean(knowledgeResult.bookingCtaSent),
            faqId: knowledgeResult.faq?.id || null,
          },
        }
      : {};

  return {
    currentState: flowState.stage || "new",
    leadStage: inferLeadStageFromIntent(intentResult.intent),
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    businessType: confirmedLeadData.businessType || undefined,
    dailyInquiries: confirmedLeadData.dailyVolume || undefined,
    interestedFeatures: [
      confirmedLeadData.productOrServiceWanted,
      confirmedLeadData.desiredSolution,
      data.customerGoal,
    ].filter(Boolean),
    conversationSummary:
      qualification?.qualificationSummary || data.qualificationSummary || undefined,
    lastAiResponse: replyText || undefined,
    metadata: {
      flowData: data,
      pendingLeadData: getPendingLeadData(data),
      confirmedLeadData,
      pageIntelligence: pageIntelligence || null,
      qualification: qualification || null,
      ...knowledgePatch,
    },
  };
}

function buildCrmFlowState(flowStateForCrm = {}) {
  const data = flowStateForCrm.data || {};
  const confirmedLeadData = getConfirmedLeadData(data);

  return {
    ...flowStateForCrm,
    data: {
      ...data,
      crmConfirmed: true,
      confirmedLeadData,
      pendingLeadData: {},
      awaitingField: "",
    },
  };
}

async function appendAiConversationMessage({
  conversationStateService,
  conversation,
  workspaceId,
  pageId,
  senderId,
  replyText,
  intentResult,
  metadata = {},
}) {
  if (!conversationStateService || !conversation?.id || !workspaceId) {
    return null;
  }

  return conversationStateService.appendConversationMessage({
    conversationId: conversation.id,
    workspaceId,
    pageId,
    customerPsid: senderId,
    senderType: "ai",
    messageText: replyText,
    messageType: "text",
    aiGenerated: true,
    intent: intentResult.intent,
    metadata,
  });
}

async function handleFacebookSalesConversation({
  supabaseClient,
  normalizeText: externalNormalizeText,
  compactFacebookReply,
  generateChatbotReply,
  conversationStateService,
  senderId,
  incomingText,
  requestMessages,
  pageConfig,
}) {
  const cleanText =
    typeof externalNormalizeText === "function"
      ? externalNormalizeText(incomingText)
      : normalizeText(incomingText);

  const pageId = pageConfig.pageId || "default";
  const workspaceId =
    typeof externalNormalizeText === "function"
      ? externalNormalizeText(pageConfig?.connectedWorkspaceId)
      : normalizeText(pageConfig?.connectedWorkspaceId);

  // Failsafe: Check if conversation is in human handoff/paused state
  if (supabaseClient && workspaceId) {
    const { data: clientConv } = await supabaseClient
      .from("client_facebook_conversations")
      .select("bot_paused, status")
      .eq("workspace_id", workspaceId)
      .eq("page_id", pageId)
      .eq("customer_psid", senderId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    logger.info("[Sales Flow Failsafe Debug] Query params:", { workspaceId, pageId, senderId });
    logger.info("[Sales Flow Failsafe Debug] clientConv fetched:", clientConv);

    if (clientConv && (clientConv.bot_paused || clientConv.status === "human_handoff")) {
      logger.info(`[Sales Flow Failsafe] Chatbot is paused for customer ${senderId}. Aborting AI response.`);
      return "Please wait for the agent reply.";
    }
  }

  const intentResult = detectFacebookIntent(cleanText);

  let conversation = null;
  let dbRequestMessages = [];
  let currentFlowState = flowStateService.getFlowState(pageId, senderId);

  if (conversationStateService && workspaceId) {
    conversation = await conversationStateService.getOrCreateConversation({
      workspaceId,
      pageId,
      customerPsid: senderId,
      currentState: "new",
      leadStage: inferLeadStageFromIntent(intentResult.intent),
      intent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      metadata: {
        source: "facebook",
        pageName: pageConfig.pageName || "",
      },
    });

    if (conversation?.id) {
      currentFlowState = flowStateService.hydrateFlowStateFromConversation(
        pageId,
        senderId,
        conversation
      );

      await conversationStateService.appendConversationMessage({
        conversationId: conversation.id,
        workspaceId,
        pageId,
        customerPsid: senderId,
        senderType: "customer",
        messageText: cleanText,
        messageType: "text",
        aiGenerated: false,
        intent: intentResult.intent,
        metadata: {
          intentConfidence: intentResult.confidence,
        },
      });

      const recentMessages =
        await conversationStateService.getRecentConversationMessages(
          conversation.id,
          12
        );

      dbRequestMessages =
        conversationStateService.toChatMessages(recentMessages);
    }
  }

  if (
    supabaseClient &&
    workspaceId &&
    (!shouldBypassKnowledgeLookup({
      intentResult,
      currentStage: currentFlowState.stage,
    }) ||
      shouldForceKnowledgeLookup(cleanText))
  ) {
    const knowledgeManager = createFacebookKnowledgeManager({ supabaseClient });

    const knowledgeResult = await knowledgeManager.resolveKnowledgeReply({
      workspaceId,
      pageId,
      incomingText: cleanText,
      pageConfig,
      conversationId: conversation?.id || "",
      compactFacebookReply,
      generateChatbotReply,
      conversationMessages: dbRequestMessages,
    });

    if (knowledgeResult?.handled && knowledgeResult.reply) {
      const nextStage = knowledgeResult.shouldHandoff
        ? "human_handoff"
        : currentFlowState.stage || "understanding_inquiry";

      const nextFlowState = flowStateService.setFlowState(pageId, senderId, {
        stage: nextStage,
        data: {
          ...(currentFlowState.data || {}),
          knowledgeHandled: true,
          knowledgeSource: knowledgeResult.source || "",
          requestedAction: knowledgeResult.shouldHandoff
            ? "human"
            : currentFlowState.data?.requestedAction || "",
        },
      });

      await appendAiConversationMessage({
        conversationStateService,
        conversation,
        workspaceId,
        pageId,
        senderId,
        replyText: knowledgeResult.reply,
        intentResult,
        metadata: {
          state: nextFlowState.stage,
          knowledge: {
            handled: true,
            source: knowledgeResult.source || "",
            confidence: knowledgeResult.confidence || 0,
            shouldHandoff: Boolean(knowledgeResult.shouldHandoff),
            bookingCtaSent: Boolean(knowledgeResult.bookingCtaSent),
            faqId: knowledgeResult.faq?.id || null,
          },
        },
      });

      if (conversationStateService && conversation?.id && workspaceId) {
        await conversationStateService.updateConversation(conversation.id, {
          currentState: nextFlowState.stage,
          leadStage: inferLeadStageFromIntent(intentResult.intent),
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          lastCustomerMessage: cleanText,
          lastAiResponse: knowledgeResult.reply,
          lastMessageAt: new Date().toISOString(),
          humanTakeover: Boolean(knowledgeResult.shouldHandoff),
          metadata: {
            ...(conversation.metadata || {}),
            flowData: nextFlowState.data,
            knowledge: {
              handled: true,
              source: knowledgeResult.source || "",
              confidence: knowledgeResult.confidence || 0,
              shouldHandoff: Boolean(knowledgeResult.shouldHandoff),
              bookingCtaSent: Boolean(knowledgeResult.bookingCtaSent),
              faqId: knowledgeResult.faq?.id || null,
            },
          },
        });
      }

      return knowledgeResult.reply;
    }
  }

  const recentMessagesForIntelligence = (
    dbRequestMessages.length ? dbRequestMessages : requestMessages
  ).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const pageIntelligence = await analyzeFacebookPageIntelligence({
    incomingText: cleanText,
    pageConfig,
    flowData: currentFlowState.data || {},
    recentMessages: recentMessagesForIntelligence,
  });

  const qualification = await qualifyFacebookLead({
    incomingText: cleanText,
    pageConfig,
    pageIntelligence,
    flowData: {
      ...(currentFlowState.data || {}),
      pendingLeadData: getPendingLeadData(currentFlowState.data || {}),
      confirmedLeadData: getConfirmedLeadData(currentFlowState.data || {}),
    },
    recentMessages: recentMessagesForIntelligence,
  });

  const hydratedFlowState = flowStateService.setFlowState(pageId, senderId, {
    stage: currentFlowState.stage || "new",
    data: mergeFlowData(
      currentFlowState.data || {},
      pageIntelligence,
      qualification
    ),
  });

  const statefulResult = buildStatefulSalesReply({
    incomingText: cleanText,
    intentResult,
    pageConfig,
    pageId,
    senderId,
    compactFacebookReply,
    pageIntelligence,
    qualification,
  });

  const flowStateForCrm = statefulResult.flowState || hydratedFlowState;
  const shouldSyncCrm = canSaveConfirmedLeadToCrm(flowStateForCrm.data || {});
  const crmFlowState = shouldSyncCrm ? buildCrmFlowState(flowStateForCrm) : null;

  const lead = crmFlowState
    ? await syncFacebookLead({
        supabaseClient,
        pageConfig,
        senderId,
        incomingText: cleanText,
        intentResult,
        flowState: crmFlowState,
        pageIntelligence,
      })
    : null;

  const replyText =
    statefulResult.handled && statefulResult.reply
      ? statefulResult.reply
      : await generateChatbotReply(
          dbRequestMessages.length ? dbRequestMessages : requestMessages,
          {
            businessType: pageConfig.businessType || "",
            pageName: pageConfig.pageName || "",
            productServices: pageConfig.productServices || "",
            productServicePriceRanges:
              pageConfig.productServicePriceRanges || "",
            websiteLink: pageConfig.websiteLink || "",
            shoppeLink: pageConfig.shoppeLink || "",
            lazadaLink: pageConfig.lazadaLink || "",
            knowledge: pageConfig.knowledge || "",
            businessDescription: pageConfig.knowledge || "",
            pageIntelligence,
            qualification,
          }
        );

  if (conversationStateService && conversation?.id && workspaceId) {
    await conversationStateService.appendConversationMessage({
      conversationId: conversation.id,
      workspaceId,
      pageId,
      customerPsid: senderId,
      senderType: "ai",
      messageText: replyText,
      messageType: "text",
      aiGenerated: true,
      intent: intentResult.intent,
      metadata: {
        state: statefulResult.flowState?.stage || "new",
        pageIntelligence,
        qualification,
        crmSyncAttempted: Boolean(crmFlowState),
        crmSyncCreated: Boolean(lead),
      },
    });

    await conversationStateService.updateConversation(conversation.id, {
      ...getConversationPatchFromFlow({
        statefulResult,
        intentResult,
        replyText,
        pageIntelligence,
        qualification,
      }),
      clientLeadId: lead?.id || undefined,
      clientContactId: lead?.contact_id || undefined,
      lastCustomerMessage: cleanText,
      lastMessageAt: new Date().toISOString(),
    });
  }

  return replyText;
}

module.exports = {
  handleFacebookSalesConversation,
};
