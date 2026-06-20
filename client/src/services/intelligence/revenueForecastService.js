const FORECAST_SCENARIOS = [
  { id: "best", label: "Best Case", amount: "₱18,500,000", probability: 25, confidence: 72, color: "#27ae60", drivers: ["Strong Q3 pipeline", "New enterprise deals", "Campaign outperformance"] },
  { id: "expected", label: "Expected Case", amount: "₱15,200,000", probability: 60, confidence: 88, color: "#4a90d9", drivers: ["Current pipeline velocity", "Historical avg conversion", "Planned campaigns"] },
  { id: "worst", label: "Worst Case", amount: "₱11,100,000", probability: 15, confidence: 65, color: "#e74c3c", drivers: ["Pipeline slowdown risk", "14% conversion decline", "Project delays"] },
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

const PIPELINE_CONTRIBUTION = [
  { deal: "Enterprise ERP Migration", owner: "James Reyes", stage: "Proposal", value: 1250000, probability: 65, close: "2026-06-30", weighted: 812500 },
  { deal: "SaaS Platform License", owner: "Ana Lim", stage: "Negotiation", value: 875000, probability: 80, close: "2026-06-15", weighted: 700000 },
  { deal: "Analytics Dashboard Setup", owner: "Ana Lim", stage: "Won", value: 600000, probability: 100, close: "2026-05-28", weighted: 600000 },
  { deal: "HR Module Integration", owner: "James Reyes", stage: "Proposal", value: 780000, probability: 55, close: "2026-07-10", weighted: 429000 },
  { deal: "E-commerce Portal Build", owner: "Ana Lim", stage: "Qualified", value: 950000, probability: 35, close: "2026-07-30", weighted: 332500 },
  { deal: "Inventory Module Upgrade", owner: "James Reyes", stage: "Qualified", value: 450000, probability: 40, close: "2026-08-15", weighted: 180000 },
  { deal: "CRM + Chatbot Bundle", owner: "Sofia Mendoza", stage: "New", value: 320000, probability: 20, close: "2026-08-30", weighted: 64000 },
];

export async function getRevenueForecastDashboard() {
  return {
    forecastScenarios: FORECAST_SCENARIOS,
    pipelineContribution: PIPELINE_CONTRIBUTION,
    revenueTrend: REVENUE_TREND,
  };
}
