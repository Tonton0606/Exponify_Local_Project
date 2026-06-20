const PREDICTIONS = {
  sales: [
    { id: "p1", title: "Accenture PH Deal Closure", probability: 74, risk: "low", confidence: 82, impact: "High", module: "CRM", action: "Send proposal follow-up this week", status: "active", factors: ["Recent meeting activity", "Budget confirmed", "Decision maker engaged"] },
    { id: "p2", title: "TechCorp Manila Contract Renewal", probability: 61, risk: "medium", confidence: 71, impact: "High", module: "CRM", action: "Schedule retention call", status: "active", factors: ["Contract ends in 45 days", "Usage dropped 12%", "Champion left company"] },
    { id: "p3", title: "Customer Churn Risk: GlobalShop PH", probability: 38, risk: "high", confidence: 68, impact: "Medium", module: "CRM", action: "Assign senior account manager", status: "active", factors: ["No activity in 14 days", "Support tickets increased", "Competitor approach detected"] },
  ],
  marketing: [
    { id: "p4", title: "Email Campaign Open Rate Increase", probability: 82, risk: "low", confidence: 88, impact: "Medium", module: "Marketing", action: "Scale current campaign budget", status: "active", factors: ["A/B test winner identified", "Segment response rate +28%", "Optimal send time found"] },
    { id: "p5", title: "Landing Page Conversion Drop", probability: 45, risk: "medium", confidence: 65, impact: "Medium", module: "Marketing", action: "Run UX audit on hero section", status: "active", factors: ["Bounce rate +18%", "Mobile traffic +34%", "Form completion dropped"] },
  ],
  operations: [
    { id: "p6", title: "Project Delay Risk: ERP Phase 2", probability: 67, risk: "high", confidence: 79, impact: "High", module: "Projects", action: "Reassign blocked tasks immediately", status: "active", factors: ["Task queue up 34%", "Two key milestones missed", "Resource conflicts detected"] },
    { id: "p7", title: "Task Bottleneck: Review Stage", probability: 71, risk: "medium", confidence: 83, impact: "Medium", module: "Tasks", action: "Add reviewer capacity", status: "active", factors: ["Avg review time 4.8 days", "Queue depth: 23 tasks", "One reviewer on leave"] },
  ],
  hr: [
    { id: "p8", title: "Employee Attrition Risk: Dept A", probability: 52, risk: "high", confidence: 72, impact: "High", module: "HR", action: "Conduct retention interviews", status: "active", factors: ["Engagement score dropped 18%", "2 resignations in 30 days", "Overtime hours +45%"] },
    { id: "p9", title: "Recruitment Timeline Delay", probability: 44, risk: "medium", confidence: 61, impact: "Low", module: "Recruitment", action: "Expand talent pipeline sources", status: "active", factors: ["Interview-to-offer ratio high", "Candidate dropout +22%", "Backlog: 8 open roles"] },
  ],
  finance: [
    { id: "p10", title: "Cash Flow Risk: July", probability: 39, risk: "medium", confidence: 74, impact: "High", module: "Finance", action: "Accelerate AR collections", status: "active", factors: ["3 large invoices overdue", "CAPEX scheduled July", "Revenue projection gap"] },
  ],
  inventory: [
    { id: "p11", title: "Inventory Shortage: SKU-009", probability: 88, risk: "high", confidence: 91, impact: "High", module: "Inventory", action: "Place emergency restock order", status: "active", factors: ["Stock at 8% capacity", "Demand up 34%", "Supplier lead time 12 days"] },
    { id: "p12", title: "Overstock Risk: SKU-014", probability: 63, risk: "low", confidence: 77, impact: "Low", module: "Inventory", action: "Run clearance promotion", status: "active", factors: ["Stock at 94%", "Demand dropped 21%", "Expiry in 60 days"] },
  ],
  executive: [
    { id: "p13", title: "Q3 Revenue Target Achievement", probability: 72, risk: "low", confidence: 85, impact: "High", module: "Executive", action: "Maintain current growth trajectory", status: "active", factors: ["Pipeline weighted at ₱15.2M", "Q2 growth momentum", "All key accounts active"] },
  ],
};

const RECOMMENDATIONS = [
  { id: "rec1", priority: 1, title: "Contact High-Value Leads Immediately", impact: "₱812,500 pipeline", effort: "Low", owner: "James Reyes", status: "pending", module: "CRM" },
  { id: "rec2", priority: 2, title: "Place Emergency Restock Order: SKU-009", impact: "₱420,000 revenue protection", effort: "Low", owner: "Miguel Torres", status: "pending", module: "Inventory" },
  { id: "rec3", priority: 3, title: "Reassign Blocked Tasks in Review Queue", impact: "5 projects unblocked", effort: "Medium", owner: "Sofia Mendoza", status: "in_progress", module: "Operations" },
  { id: "rec4", priority: 4, title: "Conduct HR Retention Interviews: Dept A", impact: "Reduce attrition risk", effort: "Medium", owner: "Ana Lim", status: "pending", module: "HR" },
  { id: "rec5", priority: 5, title: "Scale Winning Email Campaign to Full List", impact: "+94 projected leads", effort: "Low", owner: "Sofia Mendoza", status: "pending", module: "Marketing" },
  { id: "rec6", priority: 6, title: "Investigate Cash Flow Risk for July", impact: "₱2.1M exposure", effort: "High", owner: "Carlos Dela Cruz", status: "pending", module: "Finance" },
];

export async function getPredictiveAIDashboard() {
  return {
    predictions: PREDICTIONS,
    recommendations: RECOMMENDATIONS,
  };
}
