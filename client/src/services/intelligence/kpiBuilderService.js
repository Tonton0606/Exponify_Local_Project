const KPI_WIDGETS = [
  { id: "w1", title: "Revenue KPI", type: "kpi", metric: "Total Revenue", value: "₱12.84M", trend: "+18%", color: "#27ae60", x: 0, y: 0, w: 2, h: 1 },
  { id: "w2", title: "Lead Conversion", type: "kpi", metric: "Conversion Rate", value: "28.4%", trend: "-6%", color: "#e74c3c", x: 2, y: 0, w: 2, h: 1 },
  { id: "w3", title: "Sales Funnel", type: "chart", chartType: "funnel", metric: "Sales Stages", x: 0, y: 1, w: 4, h: 2 },
  { id: "w4", title: "Forecast Widget", type: "forecast", metric: "Q3 Revenue", value: "₱15.2M", confidence: 88, x: 4, y: 0, w: 2, h: 2 },
  { id: "w5", title: "Project Health", type: "gauge", metric: "Completion Rate", value: 73, target: 85, x: 0, y: 3, w: 2, h: 1 },
  { id: "w6", title: "AI Insight Widget", type: "insight", metric: "Critical Insights", count: 3, x: 2, y: 3, w: 4, h: 1 },
];

const SAVED_DASHBOARDS = [
  { id: "sd1", name: "Executive Overview", widgets: 8, lastModified: "2026-05-23", owner: "Carlos Dela Cruz", shared: true },
  { id: "sd2", name: "Sales Intelligence", widgets: 6, lastModified: "2026-05-22", owner: "James Reyes", shared: false },
  { id: "sd3", name: "Operations Health", widgets: 5, lastModified: "2026-05-21", owner: "Miguel Torres", shared: true },
  { id: "sd4", name: "HR Performance", widgets: 4, lastModified: "2026-05-20", owner: "Ana Lim", shared: false },
  { id: "sd5", name: "Finance Monitor", widgets: 7, lastModified: "2026-05-19", owner: "Carlos Dela Cruz", shared: true },
];

export async function getKpiBuilderDashboard() {
  return {
    kpiWidgets: KPI_WIDGETS,
    savedDashboards: SAVED_DASHBOARDS,
  };
}
