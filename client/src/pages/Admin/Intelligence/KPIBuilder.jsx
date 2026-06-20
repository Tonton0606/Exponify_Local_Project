import React, { useEffect, useState } from "react";

import { getKpiBuilderDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import KpiBuilderWidget from "../../../components/admin/intelligence/KpiBuilderWidget.jsx";

const AVAILABLE_WIDGETS = [
  { id: "avail-1", title: "Revenue KPI", type: "kpi", metric: "Total Revenue" },
  { id: "avail-2", title: "Sales Funnel", type: "chart", metric: "Sales Stages" },
  { id: "avail-3", title: "Lead Conversion", type: "kpi", metric: "Conversion Rate" },
  { id: "avail-4", title: "Project Health", type: "gauge", metric: "Completion Rate" },
  { id: "avail-5", title: "Task Completion", type: "kpi", metric: "Tasks Done" },
  { id: "avail-6", title: "Inventory Movement", type: "chart", metric: "Stock Turnover" },
  { id: "avail-7", title: "Employee Attendance", type: "kpi", metric: "Attendance Rate" },
  { id: "avail-8", title: "Marketing Engagement", type: "kpi", metric: "Email CTR" },
  { id: "avail-9", title: "Forecast Widget", type: "forecast", metric: "Q3 Revenue" },
  { id: "avail-10", title: "AI Insight Widget", type: "insight", metric: "Critical Insights" },
];

const CHART_TYPES = ["KPI Card", "Line Chart", "Bar Chart", "Area Chart", "Gauge", "Funnel", "Forecast"];
const DATA_SOURCES = ["CRM", "Marketing", "Operations", "HR", "Finance", "Inventory", "Intelligence"];
const PERIOD_OPTIONS = ["Today", "This Week", "This Month", "This Quarter", "This Year"];

const ACCENT_COLORS = [
  "var(--brand-cyan)",
  "var(--success)",
  "var(--brand-gold)",
  "var(--danger)",
  "#9b59b6",
  "var(--brand-cyan-bright)",
];

export default function KPIBuilder() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [canvasWidgets, setCanvasWidgets] = useState([]);
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [selectedDashboard, setSelectedDashboard] = useState("sd1");

  const [widgetConfig, setWidgetConfig] = useState({
    title: "",
    source: "CRM",
    metric: "Revenue",
    period: "This Month",
    chartType: "KPI Card",
    threshold: "",
    color: "var(--brand-cyan)",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadKpiBuilderDashboard() {
      const data = await getKpiBuilderDashboard();

      if (isMounted) {
        setCanvasWidgets(data.kpiWidgets || []);
        setSavedDashboards(data.savedDashboards || []);
      }
    }

    loadKpiBuilderDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedDashboardName =
    savedDashboards.find((dashboard) => dashboard.id === selectedDashboard)?.name ||
    "Custom Dashboard";

  const addWidget = (availableWidget) => {
    const nextWidget = {
      ...availableWidget,
      id: `canvas-${Date.now()}`,
      x: 0,
      y: canvasWidgets.length,
      w: 2,
      h: 1,
    };

    setCanvasWidgets((current) => [...current, nextWidget]);
    setSelectedWidget(nextWidget);
  };

  const removeWidget = (id) => {
    setCanvasWidgets((current) => current.filter((widget) => widget.id !== id));

    if (selectedWidget?.id === id) {
      setSelectedWidget(null);
    }
  };

  const updateConfig = (key, value) => {
    setWidgetConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const renderSettingsField = ([label, key, type]) => {
    const commonProps = {
      value: widgetConfig[key] || "",
      onChange: (event) => updateConfig(key, event.target.value),
    };

    let control;

    if (type === "select-source") {
      control = (
        <select className="intel-select intel-w-full intel-mt-4" {...commonProps}>
          {DATA_SOURCES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      );
    } else if (type === "select-chart") {
      control = (
        <select className="intel-select intel-w-full intel-mt-4" {...commonProps}>
          {CHART_TYPES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      );
    } else if (type === "select-period") {
      control = (
        <select className="intel-select intel-w-full intel-mt-4" {...commonProps}>
          {PERIOD_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      );
    } else {
      control = (
        <input
          className="intel-input intel-w-full intel-mt-4"
          type="text"
          placeholder={label}
          {...commonProps}
        />
      );
    }

    return (
      <div key={key} className="intel-form-group">
        <label className="intel-muted-label">{label}</label>
        {control}
      </div>
    );
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="KPI Builder"
        subtitle="Build custom intelligence dashboards using ERP metrics and widgets"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        showAI={false}
      />

      <div className="intel-toolbar intel-dashboard-toolbar">
        <div className="intel-text-muted intel-small">Saved Dashboards:</div>

        {savedDashboards.map((dashboard) => (
          <button
            key={dashboard.id}
            className={`intel-btn ${
              selectedDashboard === dashboard.id ? "intel-btn-ai" : ""
            }`}
            onClick={() => setSelectedDashboard(dashboard.id)}
            type="button"
          >
            {dashboard.name}
            {dashboard.shared && (
              <span className="intel-badge intel-badge-success">shared</span>
            )}
          </button>
        ))}

        <button className="intel-btn intel-btn-primary" type="button">
          + New Dashboard
        </button>

        <button className="intel-btn" type="button">
          💾 Save
        </button>
      </div>

      <div className="intel-builder-layout">
        <div className="intel-builder-sidebar">
          <div className="intel-kpi-label">Widget Library</div>

          <div className="intel-library-list intel-mt-10">
            {AVAILABLE_WIDGETS.map((widget) => (
              <div
                key={widget.id}
                className="intel-builder-widget intel-card-hover"
                onClick={() => addWidget(widget)}
              >
                <div className="intel-builder-widget-title">{widget.title}</div>
                <div className="intel-builder-widget-metric">{widget.metric}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="intel-builder-canvas">
          <div className="intel-row-between intel-mb-14">
            <div className="intel-section-title">{selectedDashboardName}</div>
            <div className="intel-text-muted intel-small">
              {canvasWidgets.length} widgets
            </div>
          </div>

          <div className="intel-widget-canvas-grid">
            {canvasWidgets.map((widget) => (
              <div key={widget.id} className="intel-widget-shell">
                <KpiBuilderWidget
                  widget={widget}
                  selected={selectedWidget?.id === widget.id}
                  onClick={setSelectedWidget}
                />

                <button
                  className="intel-widget-remove"
                  onClick={() => removeWidget(widget.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="intel-empty-dropzone">
              <div className="intel-kpi-value">+</div>
              <div className="intel-small">Add Widget</div>
            </div>
          </div>
        </div>

        <div className="intel-builder-settings">
          <div className="intel-kpi-label">Widget Settings</div>

          {selectedWidget ? (
            <div className="intel-flex-column intel-mt-12">
              <div className="intel-settings-preview">
                <div className="intel-section-title">{selectedWidget.title}</div>
                <div className="intel-text-muted intel-xs">{selectedWidget.type}</div>
              </div>

              {[
                ["Title", "title", "text"],
                ["Metric", "metric", "text"],
                ["Time Period", "period", "select-period"],
                ["Data Source", "source", "select-source"],
                ["Chart Type", "chartType", "select-chart"],
                ["Threshold", "threshold", "text"],
              ].map(renderSettingsField)}

              <div className="intel-form-group">
                <label className="intel-muted-label">Accent Color</label>

                <div className="intel-color-palette intel-mt-4">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`intel-color-swatch ${
                        widgetConfig.color === color ? "is-active" : ""
                      }`}
                      style={{ background: color }}
                      onClick={() => updateConfig("color", color)}
                      type="button"
                    />
                  ))}
                </div>
              </div>

              <button className="intel-btn intel-btn-primary intel-w-full" type="button">
                Apply Settings
              </button>
            </div>
          ) : (
            <div className="intel-empty-settings">
              <div className="intel-kpi-value">🧩</div>
              <div className="intel-small">Select a widget to configure</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
