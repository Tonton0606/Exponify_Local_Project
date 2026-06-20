const REPORT_TEMPLATES = {
  executive: [
    { id: "rt1", name: "Executive Summary Report", description: "Full company health overview across all modules.", module: "Executive", lastGenerated: "2026-05-23", schedule: "Weekly", format: "PDF", owner: "System" },
    { id: "rt2", name: "Board KPI Dashboard", description: "KPI summary for board presentations.", module: "Executive", lastGenerated: "2026-05-20", schedule: "Monthly", format: "PDF", owner: "Carlos Dela Cruz" },
  ],
  crm: [
    { id: "rt3", name: "Sales Pipeline Report", description: "Pipeline status, deal stages, and conversion metrics.", module: "CRM", lastGenerated: "2026-05-22", schedule: "Daily", format: "Excel", owner: "James Reyes" },
    { id: "rt4", name: "Opportunity Aging Report", description: "Deals by days in current stage and activity score.", module: "CRM", lastGenerated: "2026-05-21", schedule: "Weekly", format: "Excel", owner: "James Reyes" },
  ],
  marketing: [
    { id: "rt5", name: "Marketing Campaign Report", description: "Campaign performance, CTR, conversion, and ROAS.", module: "Marketing", lastGenerated: "2026-05-22", schedule: "Weekly", format: "PDF", owner: "Sofia Mendoza" },
  ],
  hr: [
    { id: "rt6", name: "HR Attendance Report", description: "Attendance records, anomalies, and overtime logs.", module: "HR", lastGenerated: "2026-05-21", schedule: "Weekly", format: "Excel", owner: "Ana Lim" },
    { id: "rt7", name: "Payroll Summary Report", description: "Monthly payroll run summary with deductions and net pay.", module: "HR", lastGenerated: "2026-05-15", schedule: "Monthly", format: "PDF", owner: "System" },
  ],
  finance: [
    { id: "rt8", name: "Revenue Forecast Report", description: "Multi-scenario revenue forecast with confidence scores.", module: "Finance", lastGenerated: "2026-05-22", schedule: "Weekly", format: "PDF", owner: "System" },
    { id: "rt9", name: "Finance Summary Report", description: "P&L summary, cash flow, and budget adherence.", module: "Finance", lastGenerated: "2026-05-20", schedule: "Monthly", format: "Excel", owner: "Carlos Dela Cruz" },
  ],
  ai: [
    { id: "rt10", name: "Predictive AI Report", description: "All active AI predictions, confidence scores, and actions.", module: "Intelligence", lastGenerated: "2026-05-20", schedule: "Weekly", format: "PDF", owner: "AI Engine" },
    { id: "rt11", name: "AI Insight Digest", description: "Weekly AI-generated business insights and recommendations.", module: "Intelligence", lastGenerated: "2026-05-19", schedule: "Weekly", format: "PDF", owner: "AI Engine" },
  ],
};

const RECENT_REPORTS = [
  { id: "r1", name: "Executive Summary Report", module: "Executive", generated: "2026-05-23", format: "PDF", status: "ready", generatedBy: "System", size: "2.4 MB" },
  { id: "r2", name: "Sales Pipeline Report", module: "CRM", generated: "2026-05-22", format: "Excel", status: "ready", generatedBy: "James Reyes", size: "1.1 MB" },
  { id: "r3", name: "Revenue Forecast Report", module: "Finance", generated: "2026-05-22", format: "PDF", status: "ready", generatedBy: "System", size: "3.2 MB" },
  { id: "r4", name: "HR Attendance Report", module: "HR", generated: "2026-05-21", format: "Excel", status: "ready", generatedBy: "Ana Lim", size: "0.8 MB" },
  { id: "r5", name: "Inventory Movement Report", module: "Inventory", generated: "2026-05-21", format: "CSV", status: "ready", generatedBy: "System", size: "0.4 MB" },
  { id: "r6", name: "Predictive AI Report", module: "Intelligence", generated: "2026-05-20", format: "PDF", status: "ready", generatedBy: "AI Engine", size: "4.1 MB" },
];

export async function getReportsDashboard() {
  return {
    reportTemplates: REPORT_TEMPLATES,
    recentReports: RECENT_REPORTS,
  };
}
