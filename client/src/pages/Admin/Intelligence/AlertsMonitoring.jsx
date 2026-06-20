import React, { useEffect, useState } from "react";

import { getAlertsMonitoringDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceAlertCard from "../../../components/admin/intelligence/IntelligenceAlertCard.jsx";

const SEV_FILTER = ["All", "Critical", "Warning", "Info", "Resolved"];

const ALERT_TIMELINE = [
  { time: "09:55", title: "High-Value Deal At Risk", action: "Detected", user: "System", color: "var(--danger)" },
  { time: "09:14", title: "Revenue Below Target", action: "Detected", user: "System", color: "var(--danger)" },
  { time: "08:45", title: "Revenue Below Target", action: "Assigned", user: "Carlos Dela Cruz", color: "#f5a623" },
  { time: "08:30", title: "Inventory Shortage Risk", action: "Investigated", user: "Miguel Torres", color: "var(--brand-cyan)" },
  { time: "Yesterday", title: "Pipeline Conversion Drop", action: "Detected", user: "System", color: "var(--danger)" },
  { time: "Yesterday", title: "HR Attendance Anomaly", action: "Assigned", user: "Ana Lim", color: "#f5a623" },
];

export default function AlertsMonitoring() {
  const [period, setPeriod] = useState("This Week");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [severityFilter, setSeverityFilter] = useState("All");

  const [dashboardData, setDashboardData] = useState({
    activeAlerts: [],
    monitoringRules: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAlertsMonitoringDashboard() {
      const data = await getAlertsMonitoringDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadAlertsMonitoringDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAlerts =
    severityFilter === "All"
      ? dashboardData.activeAlerts
      : severityFilter === "Resolved"
        ? dashboardData.activeAlerts.filter((alert) => alert.status === "resolved")
        : dashboardData.activeAlerts.filter(
            (alert) => alert.severity === severityFilter.toLowerCase()
          );

  const critical = dashboardData.activeAlerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

  const warning = dashboardData.activeAlerts.filter(
    (alert) => alert.severity === "warning"
  ).length;

  const info = dashboardData.activeAlerts.filter(
    (alert) => alert.severity === "info"
  ).length;

  const summaryCards = [
    { label: "Critical Alerts", value: critical, color: "var(--danger)" },
    { label: "Warning Alerts", value: warning, color: "#f5a623" },
    { label: "Info Alerts", value: info, color: "var(--brand-cyan)" },
    {
      label: "Active Monitors",
      value: dashboardData.monitoringRules.filter(
        (rule) => rule.status === "active"
      ).length,
      color: "var(--brand-cyan)",
    },
    { label: "Avg Response Time", value: "2.4h", color: "var(--success)" },
  ];

  const handleAlertAction = (action, alert) => {
    console.log("Mock alert action:", action, alert);
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Alerts & Monitoring"
        subtitle="Track anomalies, threshold breaches, and critical business risks"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        showAI={false}
      />

      <div className="intel-page-body">
        <div className="intel-stat-strip">
          {summaryCards.map((card) => (
            <div key={card.label} className="intel-kpi">
              <div
                className="intel-scenario-accent"
                style={{ background: card.color }}
              />
              <div className="intel-kpi-label">{card.label}</div>
              <div className="intel-kpi-value" style={{ color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="intel-actions-row">
          {SEV_FILTER.map((filter) => (
            <button
              key={filter}
              className={`intel-btn ${
                severityFilter === filter ? "intel-btn-ai" : ""
              }`}
              onClick={() => setSeverityFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="intel-main-with-sidebar">
          <div className="intel-flex-column">
            <div className="intel-section-subtitle">
              Active Alerts ({filteredAlerts.length})
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="intel-card intel-alert-empty">
                <div className="intel-kpi-value">✅</div>
                <div className="intel-section-title">No alerts in this category</div>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <IntelligenceAlertCard
                  key={alert.id}
                  alert={alert}
                  onAction={handleAlertAction}
                />
              ))
            )}

            <div className="intel-panel intel-mt-8">
              <div className="intel-panel-header">
                <div className="intel-row-between">
                  <span>Monitoring Rules</span>

                  <button className="intel-btn intel-btn-ai" type="button">
                    + Add Rule
                  </button>
                </div>
              </div>

              {dashboardData.monitoringRules.map((rule) => {
                const isActive = rule.status === "active";
                const hasTriggers = rule.triggers > 0;

                return (
                  <div key={rule.id} className="intel-rule-row">
                    <span
                      className="intel-status-dot"
                      style={{
                        background: isActive ? "var(--success)" : "var(--danger)",
                      }}
                    />

                    <div className="intel-flex-1 intel-min-w-220">
                      <div className="intel-section-title">{rule.name}</div>
                      <div className="intel-section-subtitle">
                        {rule.module} · {rule.condition}
                      </div>
                    </div>

                    <span
                      className={`intel-badge ${
                        hasTriggers ? "intel-badge-danger" : ""
                      }`}
                    >
                      {rule.triggers} triggers
                    </span>

                    <button className="intel-btn" type="button">
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="intel-panel intel-sticky-top">
            <div className="intel-panel-header">Alert Lifecycle</div>

            <div className="intel-timeline">
              <div className="intel-timeline-line" />

              {ALERT_TIMELINE.map((item, index) => (
                <div key={`${item.time}-${index}`} className="intel-timeline-item">
                  <span
                    className="intel-lifecycle-dot"
                    style={{ background: item.color }}
                  />

                  <div>
                    <div className="intel-mb-2">
                      <span
                        className="intel-badge"
                        style={{
                          background: `${item.color}18`,
                          color: item.color,
                          borderColor: `${item.color}44`,
                        }}
                      >
                        {item.action}
                      </span>
                    </div>

                    <div className="intel-small intel-text-secondary">
                      {item.title}
                    </div>

                    <div className="intel-xs intel-text-muted intel-mt-4">
                      {item.time} · {item.user}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
