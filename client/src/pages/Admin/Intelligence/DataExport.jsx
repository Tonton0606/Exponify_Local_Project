import React, { useEffect, useState } from "react";

import { getDataExportDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import ExportOptionCard from "../../../components/admin/intelligence/ExportOptionCard.jsx";

const FORMATS = [
  {
    format: "CSV",
    description: "Comma-separated values for spreadsheet import",
    icon: "📊",
    color: "var(--brand-cyan)",
  },
  {
    format: "Excel",
    description: "Microsoft Excel format with formatting",
    icon: "📗",
    color: "var(--success)",
  },
  {
    format: "PDF",
    description: "Formatted report with charts and branding",
    icon: "📄",
    color: "var(--danger)",
  },
  {
    format: "JSON",
    description: "Structured data format for API and integration use",
    icon: "🔧",
    color: "var(--brand-gold)",
  },
];

const MODULES = [
  "CRM",
  "Marketing",
  "Operations",
  "HR",
  "Finance",
  "Legal",
  "Inventory",
  "Projects",
  "Tasks",
  "Intelligence",
];

const SCOPES = [
  "Current View",
  "Filtered Data",
  "Full Report",
  "Entire Workspace",
  "Selected Modules",
  "Custom Dataset",
];

const STATUS_STYLE = {
  ready: {
    className: "intel-badge-success",
    label: "✓ Ready",
  },
  active: {
    className: "intel-badge-cyan",
    label: "● Active",
  },
  paused: {
    className: "",
    label: "⏸ Paused",
  },
};

const CONFIG_FIELDS = [
  [
    "Date Range",
    "dateRange",
    ["Last 7 Days", "Last 30 Days", "This Quarter", "This Year", "Custom"],
  ],
  [
    "Delivery Method",
    "delivery",
    ["Download", "Email", "Google Drive", "Webhook", "Cloud Sync"],
  ],
];

const INCLUDE_OPTIONS = [
  ["includeCharts", "Charts & Visualizations"],
  ["includeRaw", "Raw Data"],
  ["includeAI", "AI Summaries"],
  ["includeFilters", "Applied Filters"],
];

const ADVANCED_OPTIONS = [
  ["🔗 API Export", "Export via REST API endpoint"],
  ["🪝 Webhook Export", "Push data to external webhook"],
  ["☁️ Cloud Sync", "Sync to Google Drive / OneDrive"],
  ["📧 Scheduled Email", "Auto-send on schedule"],
];

export default function DataExport() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [selectedFormat, setSelectedFormat] = useState("Excel");
  const [selectedScope, setSelectedScope] = useState("Filtered Data");
  const [selectedModules, setSelectedModules] = useState([
    "CRM",
    "Finance",
    "HR",
  ]);
  const [exporting, setExporting] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    exportHistory: [],
    scheduledExports: [],
  });

  const [config, setConfig] = useState({
    dateRange: "Last 30 Days",
    includeCharts: true,
    includeRaw: true,
    includeAI: false,
    includeFilters: true,
    delivery: "Download",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDataExportDashboard() {
      const data = await getDataExportDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadDataExportDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleModule = (moduleName) => {
    setSelectedModules((current) =>
      current.includes(moduleName)
        ? current.filter((item) => item !== moduleName)
        : [...current, moduleName]
    );
  };

  const handleExport = () => {
    setExporting(true);
    window.setTimeout(() => setExporting(false), 2000);
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Data Export"
        subtitle="Export filtered ERP intelligence data in multiple formats"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        showAI={false}
      />

      <div className="intel-page-body">
        <div className="intel-grid-two">
          <div className="intel-flex-column">
            <div className="intel-card">
              <div className="intel-chart-title">Export Format</div>

              <div className="intel-grid-auto intel-mt-12">
                {FORMATS.map((formatOption) => (
                  <ExportOptionCard
                    key={formatOption.format}
                    {...formatOption}
                    selected={selectedFormat === formatOption.format}
                    onClick={() => setSelectedFormat(formatOption.format)}
                  />
                ))}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-chart-title">Export Scope</div>

              <div className="intel-actions-row intel-mt-12">
                {SCOPES.map((scope) => (
                  <button
                    key={scope}
                    className={`intel-btn ${
                      selectedScope === scope ? "intel-btn-primary" : ""
                    }`}
                    onClick={() => setSelectedScope(scope)}
                    type="button"
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-chart-title">Modules to Include</div>

              <div className="intel-actions-row intel-mt-12">
                {MODULES.map((moduleName) => {
                  const selected = selectedModules.includes(moduleName);

                  return (
                    <button
                      key={moduleName}
                      className={`intel-btn ${selected ? "intel-btn-ai" : ""}`}
                      onClick={() => toggleModule(moduleName)}
                      type="button"
                    >
                      {selected ? "✓ " : ""}
                      {moduleName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">
                <div className="intel-report-card-top">
                  <span>Scheduled Exports</span>

                  <button className="intel-btn intel-btn-ai" type="button">
                    + Schedule
                  </button>
                </div>
              </div>

              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {[
                        "Export Name",
                        "Frequency",
                        "Format",
                        "Destination",
                        "Last Run",
                        "Next Run",
                        "Status",
                      ].map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dashboardData.scheduledExports.map((scheduledExport) => {
                      const statusStyle =
                        STATUS_STYLE[scheduledExport.status] ||
                        STATUS_STYLE.paused;

                      return (
                        <tr key={scheduledExport.id}>
                          <td className="intel-table-title-cell">
                            {scheduledExport.name}
                          </td>
                          <td>{scheduledExport.frequency}</td>
                          <td>
                            <span className="intel-badge">
                              {scheduledExport.format}
                            </span>
                          </td>
                          <td>{scheduledExport.destination}</td>
                          <td>{scheduledExport.lastRun}</td>
                          <td>{scheduledExport.nextRun}</td>
                          <td>
                            <span
                              className={`intel-badge ${statusStyle.className}`}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="intel-panel">
              <div className="intel-panel-header">Export History</div>

              <div className="intel-table-wrap">
                <table className="intel-table">
                  <thead>
                    <tr>
                      {[
                        "File Name",
                        "Type",
                        "Generated By",
                        "Date",
                        "Size",
                        "Status",
                        "Download",
                      ].map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {dashboardData.exportHistory.map((exportItem) => (
                      <tr key={exportItem.id}>
                        <td className="intel-table-title-cell">
                          {exportItem.name}
                        </td>
                        <td>
                          <span className="intel-badge">{exportItem.type}</span>
                        </td>
                        <td>{exportItem.generatedBy}</td>
                        <td>{exportItem.date}</td>
                        <td>{exportItem.size}</td>
                        <td>
                          <span className="intel-badge intel-badge-success">
                            Ready
                          </span>
                        </td>
                        <td>
                          <button
                            className="intel-btn intel-btn-primary"
                            type="button"
                          >
                            ↓
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="intel-flex-column">
            <div className="intel-card">
              <div className="intel-chart-title">Export Configuration</div>

              <div className="intel-mt-14">
                {CONFIG_FIELDS.map(([label, key, options]) => (
                  <div key={key} className="intel-form-group">
                    <label className="intel-muted-label">{label}</label>

                    <select
                      className="intel-select intel-w-full intel-mt-4"
                      value={config[key]}
                      onChange={(event) =>
                        setConfig((current) => ({
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
              </div>

              <div className="intel-form-group">
                <div className="intel-kpi-label">Include</div>

                {INCLUDE_OPTIONS.map(([key, label]) => (
                  <label
                    key={key}
                    className="intel-checkbox-row"
                    htmlFor={`export-${key}`}
                  >
                    <input
                      id={`export-${key}`}
                      type="checkbox"
                      checked={Boolean(config[key])}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />

                    <span className="intel-muted-label">{label}</span>
                  </label>
                ))}
              </div>

              <div className="intel-mini-metric">
                <div className="intel-mini-metric-label">Export Summary</div>

                <div className="intel-insight-text">
                  Format: <strong>{selectedFormat}</strong> · Scope:{" "}
                  <strong>{selectedScope}</strong>
                  <br />
                  Modules: <strong>{selectedModules.length}</strong> selected
                  <br />
                  Delivery: <strong>{config.delivery}</strong>
                </div>
              </div>

              <button
                className={`intel-btn ${
                  exporting ? "" : "intel-btn-primary"
                } intel-w-full intel-mt-12`}
                onClick={handleExport}
                disabled={exporting}
                type="button"
              >
                {exporting ? "⏳ Exporting..." : `↓ Export as ${selectedFormat}`}
              </button>
            </div>

            <div className="intel-card">
              <div className="intel-chart-title">Advanced Options</div>

              <div className="intel-mt-10">
                {ADVANCED_OPTIONS.map(([label, description]) => (
                  <div key={label} className="intel-recommendation-row">
                    <div className="intel-flex-1">
                      <div className="intel-report-card-title">{label}</div>
                      <div className="intel-report-card-meta">
                        {description}
                      </div>
                    </div>

                    <button className="intel-btn" type="button">
                      Setup
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
