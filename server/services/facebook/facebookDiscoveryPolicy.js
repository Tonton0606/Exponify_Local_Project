function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasValue(value) {
  return normalizeText(value).length > 0;
}

function getPendingLeadData(data = {}) {
  return data.pendingLeadData && typeof data.pendingLeadData === "object"
    ? data.pendingLeadData
    : {};
}

function getConfirmedLeadData(data = {}) {
  return data.confirmedLeadData && typeof data.confirmedLeadData === "object"
    ? data.confirmedLeadData
    : {};
}

function getEffectiveLeadData(data = {}) {
  return {
    ...getConfirmedLeadData(data),
    ...getPendingLeadData(data),
  };
}

function isAutomationIntent(intent = "") {
  return [
    "automation_interest",
    "crm_interest",
    "pricing_inquiry",
    "demo_request",
  ].includes(normalizeText(intent));
}

function isAutomationInterest(data = {}, intentResult = {}) {
  const lead = getEffectiveLeadData(data);
  const joined = [
    intentResult.intent,
    lead.productOrServiceWanted,
    lead.problemEncountered,
    lead.desiredSolution,
  ]
    .map(normalizeText)
    .join(" ");

  return /automation|crm|auto|reply|messenger|inquir|lead|follow.?up|chatbot/i.test(
    joined
  );
}

function getRequiredDiscoveryFields({ intentResult = {}, data = {} }) {
  const required = ["productOrServiceWanted"];
  const automationRelated =
    isAutomationIntent(intentResult.intent) ||
    isAutomationInterest(data, intentResult);

  required.push("problemEncountered");
  required.push("desiredSolution");

  if (automationRelated) {
    required.push("businessType");
    required.push("dailyVolume");
  }

  return [...new Set(required)];
}

function getRequiredContactFields() {
  return ["customerName", "phone"];
}

function getMissingDiscoveryFields({ intentResult = {}, data = {} }) {
  const lead = getEffectiveLeadData(data);
  const required = getRequiredDiscoveryFields({ intentResult, data });

  return required.filter((field) => !hasValue(lead[field]));
}

function getMissingContactFields({ data = {} }) {
  const lead = getEffectiveLeadData(data);

  return getRequiredContactFields().filter((field) => !hasValue(lead[field]));
}

function getNextDiscoveryField({ intentResult = {}, data = {} }) {
  const priority = [
    "productOrServiceWanted",
    "businessType",
    "problemEncountered",
    "desiredSolution",
    "dailyVolume",
  ];

  const missing = getMissingDiscoveryFields({ intentResult, data });
  return priority.find((field) => missing.includes(field)) || "";
}

function getNextContactField({ data = {} }) {
  const priority = ["customerName", "phone"];
  const missing = getMissingContactFields({ data });

  return priority.find((field) => missing.includes(field)) || "";
}

function hasMinimumDiscovery({ intentResult = {}, data = {} }) {
  return getMissingDiscoveryFields({ intentResult, data }).length === 0;
}

function hasMinimumContact({ data = {} }) {
  return getMissingContactFields({ data }).length === 0;
}

function canShowCta({ intentResult = {}, data = {} }) {
  return hasMinimumDiscovery({ intentResult, data });
}

function shouldAskContactBeforeAction({ intentResult = {}, data = {} }) {
  return canShowCta({ intentResult, data }) && !hasMinimumContact({ data });
}

function canSyncCrm({ data = {} }) {
  const confirmed = getConfirmedLeadData(data);

  const hasContact =
    hasValue(confirmed.customerName) ||
    hasValue(confirmed.phone) ||
    hasValue(confirmed.email);

  const hasInquiry =
    hasValue(confirmed.productOrServiceWanted) ||
    hasValue(confirmed.problemEncountered) ||
    hasValue(confirmed.desiredSolution) ||
    hasValue(confirmed.businessType);

  return data.crmConfirmed === true && hasContact && hasInquiry;
}

function shouldConfirmBeforeCta({ intentResult = {}, data = {} }) {
  return (
    hasMinimumDiscovery({ intentResult, data }) &&
    hasMinimumContact({ data }) &&
    data.crmConfirmed !== true
  );
}

module.exports = {
  canShowCta,
  canSyncCrm,
  getEffectiveLeadData,
  getMissingContactFields,
  getMissingDiscoveryFields,
  getNextContactField,
  getNextDiscoveryField,
  getPendingLeadData,
  getConfirmedLeadData,
  getRequiredContactFields,
  getRequiredDiscoveryFields,
  hasMinimumContact,
  hasMinimumDiscovery,
  shouldAskContactBeforeAction,
  shouldConfirmBeforeCta,
};
