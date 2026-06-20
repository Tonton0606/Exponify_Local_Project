import React, { useEffect, useState } from "react";

import { getIntelligenceOverviewDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceKpiCard from "../../../components/admin/intelligence/IntelligenceKpiCard.jsx";
import IntelligenceChartCard, {
  RevenueTrendChart,
} from "../../../components/admin/intelligence/IntelligenceChartCard.jsx";
import IntelligenceAlertCard from "../../../components/admin/intelligence/IntelligenceAlertCard.jsx";
import ForecastScenarioCard from "../../../components/admin/intelligence/ForecastScenarioCard.jsx";

const HEALTH_COLORS = {
  healthy: "var(--success)",
  caution: "#f5a623",
  critical: "var(--danger)",
  excellent: "var(--brand-cyan)",
};

const FORMAT_COLORS = {
  PDF: "var(--danger)",
  Excel: "var(--success)",
  CSV: "var(--brand-cyan)",
  JSON: "var(--brand-gold)",
};

export default function IntelligenceOverview() {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");

  const [dashboardData, setDashboardData] = useState({
    overviewKpis: [],
    forecastScenarios: [],
    departmentHealth: [],
    activeAlerts: [],
    recentReports: [],
    revenueTrend: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadIntelligenceOverviewDashboard() {
      const data = await getIntelligenceOverviewDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadIntelligenceOverviewDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Intelligence Overview"
        subtitle="Business intelligence, predictive analytics, reporting, and executive insights"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        onAISummary={() => {}}
      />

      <div className="intel-page-body">
        <div className="intel-grid-auto">
          {dashboardData.overviewKpis.map((kpi) => (
            <IntelligenceKpiCard
              key={kpi.id}
              {...kpi}
              accent="var(--brand-cyan)"
            />
          ))}
        </div>

        <div className="intel-ai-panel">
          <div className="intel-report-card-top">
            <div className="intel-insight-tags">
              <div className="intel-badge intel-badge-cyan">✦</div>

              <div>
                <div className="intel-chart-title">AI Executive Summary</div>
                <div className="intel-chart-subtitle">
                  Generated · {new Date().toLocaleDateString("en-PH")} ·
                  Confidence 88%
                </div>
              </div>
            </div>

            <button className="intel-btn intel-btn-ai" type="button">
              Regenerate
            </button>
          </div>

          <p className="intel-insight-text">
            Revenue is projected to increase by{" "}
            <strong className="intel-text-success">18% this quarter</strong>,
            driven by improved CRM conversion and stronger marketing engagement,
            with Q3 weighted pipeline reaching{" "}
            <strong className="intel-text-gold">₱15.2M</strong>. However,
            project delay risk increased by{" "}
            <strong className="intel-text-warning">9%</strong> due to task
            backlog in the Operations review stage. Legal compliance score
            dropped to <strong className="intel-text-danger">55%</strong>.
            Inventory shortage risk for SKU-009 is elevated; restocking should
            be initiated within 72 hours to prevent a potential{" "}
            <strong className="intel-text-danger">₱420,000 revenue gap</strong>.
          </p>

          <div className="intel-actions-row intel-mt-14">
            {[
              "Contact High-Value Leads",
              "Restock SKU-009",
              "Review Legal Compliance",
              "Unblock Operations Tasks",
            ].map((action) => (
              <span key={action} className="intel-badge intel-badge-cyan">
                → {action}
              </span>
            ))}
          </div>
        </div>

        <div className="intel-scenario-grid">
          {dashboardData.forecastScenarios.map((scenario) => (
            <ForecastScenarioCard key={scenario.id} scenario={scenario} />
          ))}

          <div className="intel-min-w-0">
            <IntelligenceChartCard
              title="Revenue Trend"
              subtitle="Actual vs Forecast vs Target"
            >
              <RevenueTrendChart data={dashboardData.revenueTrend} />
            </IntelligenceChartCard>
          </div>
        </div>

        <div className="intel-grid-two">
          <div className="intel-panel">
            <div className="intel-panel-header">
              <div className="intel-report-card-top">
                <span>Active Alerts</span>
                <span className="intel-badge intel-badge-danger">
                  {
                    dashboardData.activeAlerts.filter(
                      (alert) => alert.status !== "resolved"
                    ).length
                  }{" "}
                  active
                </span>
              </div>
            </div>

            {dashboardData.activeAlerts.slice(0, 5).map((alert) => (
              <IntelligenceAlertCard key={alert.id} alert={alert} compact />
            ))}

            <div className="intel-panel-body">
              <a
                href="/admin/intelligence/alerts-monitoring"
                className="intel-link"
              >
                View all alerts →
              </a>
            </div>
          </div>

          <div className="intel-panel">
            <div className="intel-panel-header">Department Health</div>

            <div className="intel-panel-body">
              <div className="intel-flex-column">
                {dashboardData.departmentHealth.map((department) => {
                  const color =
                    HEALTH_COLORS[department.status] || "var(--brand-cyan)";

                  return (
                    <div key={department.id} className="intel-health-row">
                      <div className="intel-health-label">
                        {department.label}
                      </div>

                      <div className="intel-health-bar">
                        <div
                          className="intel-health-fill"
                          style={{
                            width: `${department.score}%`,
                            background: color,
                          }}
                        />
                      </div>

                      <div
                        className="intel-health-score"
                        style={{ color }}
                      >
                        {department.score}
                      </div>

                      <span
                        className="intel-health-trend"
                        style={{
                          color: department.trend.startsWith("+")
                            ? "var(--success)"
                            : "var(--danger)",
                        }}
                      >
                        {department.trend}
                      </span>

                      <span
                        className="intel-badge intel-health-risk"
                        style={{
                          background: `${color}18`,
                          color,
                          borderColor: `${color}44`,
                        }}
                      >
                        {department.risk}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="intel-panel">
          <div className="intel-panel-header">
            <div className="intel-report-card-top">
              <span>Recent Reports</span>

              <button className="intel-btn intel-btn-primary" type="button">
                + Generate Report
              </button>
            </div>
          </div>

          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  {[
                    "Report Name",
                    "Module",
                    "Generated",
                    "By",
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
                      <td>{report.generated}</td>
                      <td>{report.generatedBy}</td>
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
                          <button className="intel-btn" type="button">
                            Preview
                          </button>
                          <button className="intel-btn" type="button">
                            ↓
                          </button>
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
    </div>
  );
}
