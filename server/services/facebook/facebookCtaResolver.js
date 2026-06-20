function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAffirmativeReply(text = "") {
  const message = normalizeText(text).toLowerCase();

  return /^(yes|yep|yeah|sure|ok|okay|sige|go|proceed|interested|oo|opo|pwede|please|g|tara)$/i.test(
    message
  );
}

function isNegativeReply(text = "") {
  const message = normalizeText(text).toLowerCase();

  return /^(no|nope|not now|later|hindi|di muna|ayaw|cancel)$/i.test(message);
}

function resolveCtaChoice(text = "") {
  const message = normalizeText(text).toLowerCase();

  if (/^(1|one|demo)$/i.test(message)) return "demo";

  if (/^(2|two|pricing|price|presyo|magkano)$/i.test(message)) {
    return "pricing";
  }

  if (/^(3|three|human|agent|representative|tao|staff)$/i.test(message)) {
    return "human";
  }

  if (
    message.includes("demo") ||
    message.includes("schedule") ||
    message.includes("appointment") ||
    message.includes("meeting")
  ) {
    return "demo";
  }

  if (
    message.includes("price") ||
    message.includes("pricing") ||
    message.includes("presyo") ||
    message.includes("magkano") ||
    message.includes("package") ||
    message.includes("plan")
  ) {
    return "pricing";
  }

  if (
    message.includes("human") ||
    message.includes("agent") ||
    message.includes("representative") ||
    message.includes("tao") ||
    message.includes("staff") ||
    message.includes("kausap")
  ) {
    return "human";
  }

  if (isAffirmativeReply(message)) return "needs_choice";
  if (isNegativeReply(message)) return "not_now";

  return "";
}

function buildLeadContextSentence(data = {}) {
  const parts = [];

  const businessType = normalizeText(data.businessType);
  const productOrServiceWanted = normalizeText(data.productOrServiceWanted);
  const dailyVolume = normalizeText(data.dailyVolume);

  if (businessType) {
    parts.push(`business/need: ${businessType}`);
  }

  if (productOrServiceWanted) {
    parts.push(`interest: ${productOrServiceWanted}`);
  }

  if (dailyVolume) {
    parts.push(`volume: ${dailyVolume}`);
  }

  if (parts.length === 0) {
    return "";
  }

  return `Based on what you shared so far (${parts.join(", ")}), `;
}

function buildCtaChoiceReply({ choice, data = {}, compactFacebookReply }) {
  const contextSentence = buildLeadContextSentence(data);

  if (choice === "demo") {
    return {
      stage: "awaiting_demo_schedule",
      data: {
        ...data,
        ctaChoice: "demo",
      },
      reply: compactFacebookReply(
        `${contextSentence}a demo or consultation is a good next step so the team can recommend the right setup.\n\nPlease send your preferred date/time and contact number so our team can arrange it.`
      ),
    };
  }

  if (choice === "pricing") {
    return {
      stage: "pricing_overview",
      data: {
        ...data,
        ctaChoice: "pricing",
      },
      reply: compactFacebookReply(
        `${contextSentence}pricing depends on the exact product, service, package, quantity, or automation setup needed.\n\nWould you like a demo/consultation first, or would you prefer a human representative to assist you?`
      ),
    };
  }

  if (choice === "human") {
    return {
      stage: "human_handoff",
      data: {
        ...data,
        ctaChoice: "human",
        requestedHuman: true,
      },
      reply: compactFacebookReply(
        "Sure po. I’ll mark this conversation for human assistance. Please send your name, contact number, and main concern so our team can assist you properly."
      ),
    };
  }

  if (choice === "not_now") {
    return {
      stage: "nurture",
      data: {
        ...data,
        ctaChoice: "not_now",
      },
      reply: compactFacebookReply(
        "No problem po. I noted your inquiry. You can message anytime if you want pricing, a demo/consultation, or human assistance."
      ),
    };
  }

  return {
    stage: "awaiting_cta_choice",
    data,
    reply: compactFacebookReply(
      "Sure po. Which would you prefer first?\n\n1. Demo / consultation\n2. Pricing overview\n3. Human representative"
    ),
  };
}

module.exports = {
  buildCtaChoiceReply,
  isAffirmativeReply,
  isNegativeReply,
  resolveCtaChoice,
};
