import groqService from "../ai/groq.js";

const ANALYTICS_KPIS = [
  { label: "Revenue Growth", value: "+18.4%", raw: "₱12.84M", color: "#27ae60" },
  { label: "Lead Conversion", value: "28.4%", raw: "284 leads", color: "#4a90d9" },
  { label: "Project Completion", value: "73%", raw: "41 of 56", color: "#c9a84c" },
  { label: "Task Throughput", value: "94/week", raw: "avg this month", color: "#9b59b6" },
  { label: "Inventory Movement", value: "₱3.2M", raw: "monthly turnover", color: "#e74c3c" },
  { label: "Employee Utilization", value: "81%", raw: "247 of 304 hrs", color: "#1abc9c" },
  { label: "Campaign Performance", value: "4.8x ROAS", raw: "₱840K spend", color: "#f5a623" },
];

const REVENUE_TREND = [
  { month: "Nov", actual: 8200000, forecast: null, target: 9000000 },
  { month: "Dec", actual: 9400000, forecast: null, target: 9000000 },
  { month: "Jan", actual: 10100000, forecast: null, target: 10000000 },
  { month: "Feb", actual: 9800000, forecast: null, target: 10500000 },
  { month: "Mar", actual: 11200000, forecast: null, target: 11000000 },
  { month: "Apr", actual: 12840000, forecast: null, target: 12000000 },
  { month: "May", actual: null, forecast: 13500000, target: 13000000 },
  { month: "Jun", actual: null, forecast: 14200000, target: 13500000 },
  { month: "Jul", actual: null, forecast: 15200000, target: 14000000 },
];

const DEPT_PERFORMANCE = [
  { dept: "Sales & CRM", current: 4840000, previous: 4100000, change: "+18%", status: "up", owner: "James Reyes", metric: "Revenue" },
  { dept: "Marketing", current: 1240000, previous: 980000, change: "+27%", status: "up", owner: "Sofia Mendoza", metric: "Attributed Revenue" },
  { dept: "Operations", current: 76, previous: 81, change: "-6%", status: "down", owner: "Miguel Torres", metric: "Completion Rate" },
  { dept: "HR", current: 94, previous: 91, change: "+3%", status: "up", owner: "Ana Lim", metric: "Retention Rate" },
  { dept: "Finance", current: 88, previous: 84, change: "+5%", status: "up", owner: "Carlos Dela Cruz", metric: "Budget Adherence" },
  { dept: "Legal", current: 55, previous: 72, change: "-24%", status: "down", owner: "Maria Santos", metric: "Compliance Score" },
];

function normalizeMarketResearchForm(form = {}) {
  const industry =
    form.industry === "Others"
      ? String(form.customIndustry || "").trim()
      : String(form.industry || "").trim();

  return {
    ...form,
    industry: industry || "General business",
    region: String(form.region || "Philippines").trim() || "Philippines",
    businessType: String(form.businessType || "Business").trim() || "Business",
    targetAudience:
      String(form.targetAudience || "General market").trim() || "General market",
  };
}

export async function getDataAnalyticsDashboard() {
  return {
    kpis: ANALYTICS_KPIS,
    revenueTrend: REVENUE_TREND,
    departmentPerformance: DEPT_PERFORMANCE,
  };
}

export async function generateMarketResearch(form = {}) {
  const normalizedForm = normalizeMarketResearchForm(form);

  const topic = [
    normalizedForm.industry,
    `in ${normalizedForm.region}`,
    `for ${normalizedForm.businessType}`,
    `targeting ${normalizedForm.targetAudience}`,
  ].join(" ");

  return groqService.generateMarketResearch(topic, normalizedForm);
}
