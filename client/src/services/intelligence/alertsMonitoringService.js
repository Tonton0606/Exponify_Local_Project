const ACTIVE_ALERTS = [
  { id: "a1", title: "Revenue Below Monthly Target", module: "Finance", severity: "critical", detected: "2026-05-23 08:14", status: "active", impact: "High", action: "Review pipeline and accelerate deals", detail: "Revenue is ₱840,000 below the monthly target threshold of ₱4.5M." },
  { id: "a2", title: "Pipeline Conversion Dropped 14%", module: "Sales & CRM", severity: "critical", detected: "2026-05-22 14:32", status: "investigating", impact: "High", action: "Analyze funnel stages for bottlenecks", detail: "Lead-to-opportunity conversion dropped from 34% to 20% in the past 7 days." },
  { id: "a3", title: "High-Value Deal At Risk", module: "CRM", severity: "critical", detected: "2026-05-23 09:55", status: "active", impact: "High", action: "Escalate to senior sales executive", detail: 'Deal "Enterprise ERP Migration - Accenture PH" has not had activity in 7 days.' },
  { id: "a4", title: "Inventory Shortage in 10 Days", module: "Inventory", severity: "warning", detected: "2026-05-22 11:00", status: "active", impact: "Medium", action: "Place restock order immediately", detail: "Product SKU-009 stock level at 8% — below 15% safety threshold." },
  { id: "a5", title: "Project Overdue Risk: 5 Projects", module: "Operations", severity: "warning", detected: "2026-05-21 16:00", status: "active", impact: "Medium", action: "Review task assignments and blockers", detail: "5 active projects have tasks 3+ days past due date." },
  { id: "a6", title: "HR Attendance Anomaly – Dept A", module: "HR", severity: "warning", detected: "2026-05-23 07:30", status: "active", impact: "Low", action: "HR to follow up with team lead", detail: "Abnormal absence rate of 23% in Department A this week vs 8% baseline." },
  { id: "a7", title: "Compliance Deadline: May 31", module: "Legal", severity: "info", detected: "2026-05-20 09:00", status: "active", impact: "Medium", action: "Prepare and submit required documents", detail: "BIR filing deadline in 8 days. Current compliance status: 72%." },
];

const MONITORING_RULES = [
  { id: "mr1", name: "Revenue Threshold Monitor", module: "Finance", condition: "Monthly revenue < ₱4.5M", status: "active", triggers: 2 },
  { id: "mr2", name: "Task Delay Monitor", module: "Operations", condition: "Task overdue > 3 days", status: "active", triggers: 5 },
  { id: "mr3", name: "Inventory Low Stock Monitor", module: "Inventory", condition: "Stock level < 15%", status: "active", triggers: 1 },
  { id: "mr4", name: "Campaign Drop Monitor", module: "Marketing", condition: "CTR drops > 20% week-over-week", status: "active", triggers: 0 },
  { id: "mr5", name: "Fraud Risk Monitor", module: "Finance", condition: "Unusual transaction patterns detected", status: "active", triggers: 0 },
  { id: "mr6", name: "Compliance Deadline Monitor", module: "Legal", condition: "Filing deadline within 14 days", status: "active", triggers: 1 },
];

export async function getAlertsMonitoringDashboard() {
  return {
    activeAlerts: ACTIVE_ALERTS,
    monitoringRules: MONITORING_RULES,
  };
}
