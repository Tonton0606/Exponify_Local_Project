const logger = require('../../config/logger');
const {
  buildBusinessFallbackReply,
  extractReplyText,
  compactFacebookReply,
} = require("./facebookReplyUtils");

function createFacebookChatbotReplyService({
  defaultChatbotModel,
  env = process.env,
}) {
  async function generateChatbotReply(input, context = {}) {
    const baseMessages = Array.isArray(input)
      ? input
      : [
          {
            role: "user",
            content: typeof input === "string" ? input : String(input || ""),
          },
        ];

    const knowledgeText =
      typeof context.knowledge === "string" ? context.knowledge.trim() : "";

    const messages = knowledgeText
      ? [
          {
            role: "system",
            content:
              "Use only the following knowledge when answering. If the answer is not in the knowledge, say you do not have that info yet.\n\nKnowledge:\n" +
              knowledgeText,
          },
          ...baseMessages,
        ]
      : baseMessages;

    const chatEndpoint =
      env.INTERNAL_CHATBOT_URL ||
      `http://127.0.0.1:${env.PORT || 5000}/api/openclaude/chat`;

    const preferredProvider = "";
    const buildRequestBody = (provider = "") => ({
        messages,
        model: defaultChatbotModel,
        options: {
          maxTokens: parseInt(env.FB_CHATBOT_MAX_TOKENS, 10) || 512,
          temperature: 0.45,
          channel: "facebook",
          promptMode: "lite",
          multilingual: true,
          knowledge: knowledgeText,
          provider,
          businessType:
            typeof context.businessType === "string" ? context.businessType : "",
          pageName:
            typeof context.pageName === "string" ? context.pageName : "",
          businessDescription:
            typeof context.businessDescription === "string"
              ? context.businessDescription
              : knowledgeText,
          adminKnowledge:
            typeof context.adminKnowledge === "string"
              ? context.adminKnowledge
              : "",
          productServices:
            typeof context.productServices === "string"
              ? context.productServices
              : "",
          productServicePriceRanges:
            typeof context.productServicePriceRanges === "string"
              ? context.productServicePriceRanges
              : "",
          websiteLink:
            typeof context.websiteLink === "string" ? context.websiteLink : "",
          shoppeLink:
            typeof context.shoppeLink === "string" ? context.shoppeLink : "",
          lazadaLink:
            typeof context.lazadaLink === "string" ? context.lazadaLink : "",
          aiInstruction:
            typeof context.aiInstruction === "string"
              ? context.aiInstruction
              : typeof context.ai_instruction === "string"
                ? context.ai_instruction
                : "",
        },
      });

    let response;
    const fetchTimeoutMs = 30000;

    const doFetch = async (providerName) => {
      try {
        const { callOpenClaude } = require('../../routes/services/openClaude');
        if (typeof callOpenClaude === 'function') {
          const reqBody = buildRequestBody(providerName);
          const result = await callOpenClaude({
            messages: reqBody.messages,
            model: reqBody.model,
            options: reqBody.options
          });
          return { ok: true, json: async () => result };
        }
      } catch (err) {
        logger.warn({ err }, "Direct callOpenClaude invocation failed, falling back to HTTP fetch");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
      try {
        const res = await fetch(chatEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildRequestBody(providerName)),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        logger.error({ err, provider: providerName }, "Chatbot fetch call failed or timed out");
        return { ok: false, status: 504 };
      }
    };

    if (preferredProvider) {
      response = await doFetch(preferredProvider);
    } else {
      response = await doFetch("");
    }

    if (!response.ok && preferredProvider) {
      logger.error("Preferred chatbot provider failed; retrying default provider", {
        provider: preferredProvider,
        status: response.status,
      });

      response = await doFetch("");
    }

    if (!response.ok) {
      if (response.status === 402) {
        const lastUser = messages
          .slice()
          .reverse()
          .find((m) => m.role === "user");

        const lastUserText =
          typeof lastUser?.content === "string" ? lastUser.content : "";

        return compactFacebookReply(
          buildBusinessFallbackReply(context, lastUserText)
        );
      }

      throw new Error(`Chatbot API error (${response.status})`);
    }

    const result = await response.json();
    logger.debug("[facebookChatbotReply] Raw LLM response result:", result);
    const replyText = extractReplyText(result);
    logger.debug("[facebookChatbotReply] Compacted reply text:", replyText);

    if (
      result?.restricted === true ||
      /I can only help with:/i.test(replyText)
    ) {
      const lastUser = messages
        .slice()
        .reverse()
        .find((m) => m.role === "user");

      const lastUserText =
        typeof lastUser?.content === "string" ? lastUser.content : "";

      return compactFacebookReply(
        buildBusinessFallbackReply(context, lastUserText)
      );
    }

    return replyText;
  }

  return {
    generateChatbotReply,
  };
}

module.exports = {
  createFacebookChatbotReplyService,
};
