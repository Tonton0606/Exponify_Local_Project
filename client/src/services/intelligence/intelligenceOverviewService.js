export const INTEL_PERIODS = [
  "Today",
  "This Week",
  "This Month",
  "This Quarter",
  "This Year",
];

export const INTEL_WORKSPACES = [
  "All Workspaces",
  "Executive",
  "CRM",
  "Marketing",
  "HR",
  "Finance",
  "Operations",
  "Inventory",
];

const OVERVIEW_KPIS = [
  { id: "rev", label: "Total Revenue", value: "₱12,840,000", change: "+18.4%", positive: true, sub: "vs last quarter", icon: "peso" },
  { id: "frev", label: "Forecasted Revenue", value: "₱15,200,000", change: "+18.4%", positive: true, sub: "Q3 2026 projection", icon: "forecast" },
  { id: "pred", label: "Active Predictions", value: "47", change: "+6", positive: true, sub: "across 7 modules", icon: "brain" },
  { id: "alerts", label: "Critical Alerts", value: "3", change: "-2", positive: true, sub: "requires attention", icon: "alert" },
  { id: "reports", label: "Report Runs", value: "128", change: "+24", positive: true, sub: "this month", icon: "report" },
  { id: "sources", label: "Data Sources", value: "9", change: "0", positive: true, sub: "all connected", icon: "source" },
];

const FORECAST_SCENARIOS = [
  { id: "best", label: "Best Case", amount: "₱18,500,000", probability: 25, confidence: 72, color: "#27ae60", drivers: ["Strong Q3 pipeline", "New enterprise deals", "Campaign outperformance"] },
  { id: "expected", label: "Expected Case", amount: "₱15,200,000", probability: 60, confidence: 88, color: "#4a90d9", drivers: ["Current pipeline velocity", "Historical avg conversion", "Planned campaigns"] },
  { id: "worst", label: "Worst Case", amount: "₱11,100,000", probability: 15, confidence: 65, color: "#e74c3c", drivers: ["Pipeline slowdown risk", "14% conversion decline", "Project delays"] },
];

const DEPARTMENT_HEALTH = [
  { id: "sales", label: "Sales & CRM", score: 84, trend: "+3%", risk: "low", status: "healthy" },
  { id: "marketing", label: "Marketing", score: 76, trend: "+8%", risk: "low", status: "healthy" },
  { id: "operations", label: "Operations", score: 61, trend: "-5%", risk: "medium", status: "caution" },
  { id: "hr", label: "HR", score: 79, trend: "+2%", risk: "low", status: "healthy" },
  { id: "finance", label: "Finance", score: 88, trend: "+1%", risk: "low", status: "healthy" },
  { id: "legal", label: "Legal", score: 55, trend: "-9%", risk: "high", status: "critical" },
  { id: "executive", label: "Executive", score: 91, trend: "+4%", risk: "low", status: "excellent" },
];

const ACTIVE_ALERTS = [
  { id: "a1", title: "Revenue Below Monthly Target", module: "Finance", severity: "critical", detected: "2026-05-23 08:14", status: "active", impact: "High", action: "Review pipeline and accelerate deals", detail: "Revenue is ₱840,000 below the monthly target threshold of ₱4.5M." },
  { id: "a2", title: "Pipeline Conversion Dropped 14%", module: "Sales & CRM", severity: "critical", detected: "2026-05-22 14:32", status: "investigating", impact: "High", action: "Analyze funnel stages for bottlenecks", detail: "Lead-to-opportunity conversion dropped from 34% to 20% in the past 7 days." },
  { id: "a3", title: "High-Value Deal At Risk", module: "CRM", severity: "critical", detected: "2026-05-23 09:55", status: "active", impact: "High", action: "Escalate to senior sales executive", detail: 'Deal "Enterprise ERP Migration - Accenture PH" has not had activity in 7 days.' },
  { id: "a4", title: "Inventory Shortage in 10 Days", module: "Inventory", severity: "warning", detected: "2026-05-22 11:00", status: "active", impact: "Medium", action: "Place restock order immediately", detail: "Product SKU-009 stock level at 8% — below 15% safety threshold." },
  { id: "a5", title: "Project Overdue Risk: 5 Projects", module: "Operations", severity: "warning", detected: "2026-05-21 16:00", status: "active", impact: "Medium", action: "Review task assignments and blockers", detail: "5 active projects have tasks 3+ days past due date." },
];

const RECENT_REPORTS = [
  { id: "r1", name: "Executive Summary Report", module: "Executive", generated: "2026-05-23", format: "PDF", status: "ready", generatedBy: "System", size: "2.4 MB" },
  { id: "r2", name: "Sales Pipeline Report", module: "CRM", generated: "2026-05-22", format: "Excel", status: "ready", generatedBy: "James Reyes", size: "1.1 MB" },
  { id: "r3", name: "Revenue Forecast Report", module: "Finance", generated: "2026-05-22", format: "PDF", status: "ready", generatedBy: "System", size: "3.2 MB" },
  { id: "r4", name: "HR Attendance Report", module: "HR", generated: "2026-05-21", format: "Excel", status: "ready", generatedBy: "Ana Lim", size: "0.8 MB" },
  { id: "r5", name: "Inventory Movement Report", module: "Inventory", generated: "2026-05-21", format: "CSV", status: "ready", generatedBy: "System", size: "0.4 MB" },
  { id: "r6", name: "Predictive AI Report", module: "Intelligence", generated: "2026-05-20", format: "PDF", status: "ready", generatedBy: "AI Engine", size: "4.1 MB" },
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

export async function getIntelligenceOverviewDashboard() {
  return {
    overviewKpis: OVERVIEW_KPIS,
    forecastScenarios: FORECAST_SCENARIOS,
    departmentHealth: DEPARTMENT_HEALTH,
    activeAlerts: ACTIVE_ALERTS,
    recentReports: RECENT_REPORTS,
    revenueTrend: REVENUE_TREND,
  };
}
