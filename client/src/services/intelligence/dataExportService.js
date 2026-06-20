const EXPORT_HISTORY = [
  { id: "ex1", name: "executive_summary_may2026.pdf", type: "PDF", generatedBy: "System", date: "2026-05-23 09:00", size: "2.4 MB", status: "ready" },
  { id: "ex2", name: "sales_pipeline_q2.xlsx", type: "Excel", generatedBy: "James Reyes", date: "2026-05-22 14:30", size: "1.1 MB", status: "ready" },
  { id: "ex3", name: "hr_attendance_may.csv", type: "CSV", generatedBy: "Ana Lim", date: "2026-05-21 16:00", size: "0.3 MB", status: "ready" },
  { id: "ex4", name: "predictive_ai_report.pdf", type: "PDF", generatedBy: "AI Engine", date: "2026-05-20 08:00", size: "4.1 MB", status: "ready" },
  { id: "ex5", name: "full_workspace_export.json", type: "JSON", generatedBy: "Carlos Dela Cruz", date: "2026-05-19 12:00", size: "18.2 MB", status: "ready" },
  { id: "ex6", name: "inventory_movement_may.csv", type: "CSV", generatedBy: "Miguel Torres", date: "2026-05-19 11:30", size: "0.6 MB", status: "ready" },
];

const SCHEDULED_EXPORTS = [
  { id: "se1", name: "Weekly Executive Summary", frequency: "Weekly", format: "PDF", destination: "Email", lastRun: "2026-05-19", nextRun: "2026-05-26", status: "active" },
  { id: "se2", name: "Daily Sales Pipeline", frequency: "Daily", format: "Excel", destination: "Google Drive", lastRun: "2026-05-22", nextRun: "2026-05-23", status: "active" },
  { id: "se3", name: "Monthly HR Payroll", frequency: "Monthly", format: "PDF", destination: "Email", lastRun: "2026-05-01", nextRun: "2026-06-01", status: "active" },
  { id: "se4", name: "Quarterly Board Report", frequency: "Quarterly", format: "PDF", destination: "Email", lastRun: "2026-04-01", nextRun: "2026-07-01", status: "paused" },
];

export async function getDataExportDashboard() {
  return {
    exportHistory: EXPORT_HISTORY,
    scheduledExports: SCHEDULED_EXPORTS,
  };
}
