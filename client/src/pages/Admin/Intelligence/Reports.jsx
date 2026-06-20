import React, { useEffect, useState } from "react";

import { getReportsDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import ReportTemplateCard from "../../../components/admin/intelligence/ReportTemplateCard.jsx";

const REPORT_TABS = ["executive", "crm", "marketing", "hr", "finance", "ai"];

const TAB_LABELS = {
  executive: "🏛️ Executive",
  crm: "💼 CRM",
  marketing: "📣 Marketing",
  hr: "👥 HR",
  finance: "💰 Finance",
  ai: "✦ AI Reports",
};

const FORMAT_COLORS = {
  PDF: "var(--danger)",
  Excel: "var(--success)",
  CSV: "var(--brand-cyan)",
  JSON: "var(--brand-gold)",
};

const SCHED_OPTS = ["None", "Daily", "Weekly", "Monthly", "Quarterly"];

const BUILDER_FIELDS = [
  [
    "Module",
    "module",
    ["CRM", "Marketing", "HR", "Finance", "Operations", "Inventory", "Intelligence"],
  ],
  [
    "Metric",
    "metric",
    [
      "Revenue",
      "Conversion Rate",
      "Task Completion",
      "Attendance",
      "Budget Adherence",
      "Compliance",
    ],
  ],
  ["Date Range", "dateRange", ["Last 7 Days", "Last 30 Days", "This Quarter", "This Year"]],
  ["Format", "format", ["PDF", "Excel", "CSV", "JSON"]],
  ["Delivery", "delivery", ["Download", "Email", "Google Drive", "Webhook"]],
  ["Schedule", "schedule", SCHED_OPTS],
];

const SCHEDULE_CARDS = [
  { frequency: "Daily", icon: "📅", count: 1 },
  { frequency: "Weekly", icon: "📆", count: 4 },
  { frequency: "Monthly", icon: "🗓️", count: 2 },
  { frequency: "Quarterly", icon: "📊", count: 1 },
];

export default function Reports() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [activeTab, setActiveTab] = useState("executive");
  const [showBuilder, setShowBuilder] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    reportTemplates: {},
    recentReports: [],
  });

  const [builderConfig, setBuilderConfig] = useState({
    module: "CRM",
    metric: "Revenue",
    dateRange: "Last 30 Days",
    format: "PDF",
    delivery: "Email",
    schedule: "None",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadReportsDashboard() {
      const data = await getReportsDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadReportsDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const templates = dashboardData.reportTemplates[activeTab] || [];

  const handleGenerate = (report) => {
    setPreviewReport(report);
  };

  const handleSchedule = (report) => {
    setPreviewReport(report);
    setShowBuilder(true);
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Reports"
        subtitle="Generate, schedule, save, and share ERP reports"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        showAI={false}
      />

      <div className="intel-page-body">
        <div className="intel-tabs">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              className={`intel-tab ${activeTab === tab ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {TAB_LABELS[tab] || tab}
            </button>
          ))}

          <div className="intel-toolbar intel-flex-1">
            <button
              className={`intel-btn ${showBuilder ? "intel-btn-ai" : ""}`}
              onClick={() => setShowBuilder(!showBuilder)}
              type="button"
            >
              ⚙ Report Builder
            </button>

            <button
              className="intel-btn intel-btn-primary"
              onClick={() => setShowBuilder(true)}
              type="button"
            >
              + Generate New
            </button>
          </div>
        </div>

        <div className={showBuilder ? "intel-main-with-sidebar" : "intel-grid"}>
          <div className="intel-flex-column">
            <div className="intel-card-grid">
              {templates.map((template) => (
                <ReportTemplateCard
                  key={template.id}
                  report={template}
                  onGenerate={handleGenerate}
                  onPreview={setPreviewReport}
                  onSchedule={handleSchedule}
                />
              ))}
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">Scheduling</div>

              <div className="intel-card-grid intel-p-14">
                {SCHEDULE_CARDS.map((item) => (
                  <div key={item.frequency} className="intel-mini-metric">
                    <div className="intel-export-option-icon">{item.icon}</div>
                    <div className="intel-section-title">{item.frequency}</div>
                    <div className="intel-kpi-value intel-text-cyan">{item.count}</div>
                    <div className="intel-mini-metric-label">active reports</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">Recent Report Runs</div>

              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {[
                        "Report Name",
                        "Module",
                        "Generated By",
                        "Date",
                        "Format",
                        "Size",
                        "Actions",
                      ].map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dashboardData.recentReports.map((report) => {
                      const formatColor =
                        FORMAT_COLORS[report.format] || "var(--text-muted)";

                      return (
                        <tr key={report.id}>
                          <td className="intel-table-title-cell">{report.name}</td>
                          <td>{report.module}</td>
                          <td>{report.generatedBy}</td>
                          <td>{report.generated}</td>
                          <td>
                            <span
                              className="intel-badge"
                              style={{
                                background: `${formatColor}18`,
                                color: formatColor,
                                borderColor: `${formatColor}44`,
                              }}
                            >
                              {report.format}
                            </span>
                          </td>
                          <td>{report.size}</td>
                          <td>
                            <div className="intel-actions-row">
                              {["Preview", "Email", "↓"].map((action) => (
                                <button
                                  key={action}
                                  className="intel-btn"
                                  onClick={() => {
                                    if (action === "Preview") {
                                      setPreviewReport(report);
                                    }
                                  }}
                                  type="button"
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {showBuilder && (
            <div className="intel-side-panel">
              <div className="intel-chart-title">⚙ Report Builder</div>

              <div className="intel-flex-column intel-mt-14">
                {BUILDER_FIELDS.map(([label, key, options]) => (
                  <div key={key} className="intel-form-group">
                    <label className="intel-muted-label">{label}</label>

                    <select
                      className="intel-select intel-w-full intel-mt-4"
                      value={builderConfig[key]}
                      onChange={(event) =>
                        setBuilderConfig((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    >
                      {options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                ))}

                <button className="intel-btn intel-btn-primary intel-w-full" type="button">
                  Generate Report
                </button>
              </div>
            </div>
          )}
        </div>

        {previewReport && (
          <div
            className="intel-modal-backdrop"
            onClick={() => setPreviewReport(null)}
          >
            <div
              className="intel-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="intel-row-between intel-mb-14">
                <div className="intel-section-title">{previewReport.name}</div>

                <button
                  className="intel-btn"
                  onClick={() => setPreviewReport(null)}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="intel-preview-box">
                <div className="intel-export-option-icon">📄</div>

                <div className="intel-text-muted intel-small">
                  Report preview for: {previewReport.name}
                </div>

                <div className="intel-text-muted intel-small">
                  Module: {previewReport.module} · Format: {previewReport.format}
                </div>
              </div>

              <div className="intel-actions-row">
                <button className="intel-btn intel-btn-primary intel-flex-1" type="button">
                  Generate Full Report
                </button>

                <button className="intel-btn" type="button">
                  Email
                </button>

                <button className="intel-btn" type="button">
                  ↓
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
