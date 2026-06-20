import React, { useEffect, useState } from "react";

import { getAIInsightsDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceInsightCard from "../../../components/admin/intelligence/IntelligenceInsightCard.jsx";

const EFFORT_COLOR = {
  Low: "var(--success)",
  Medium: "#f5a623",
  High: "var(--danger)",
};

const STATUS_COLOR = {
  pending: "#f5a623",
  in_progress: "var(--brand-cyan)",
  done: "var(--success)",
};

const INSIGHT_TIMELINE = [
  {
    time: "09:55",
    event: "New critical insight: High-value deal at risk",
    severity: "critical",
  },
  {
    time: "09:14",
    event: "Revenue threshold alert triggered",
    severity: "critical",
  },
  {
    time: "08:30",
    event: "AI insight confirmed: Email campaign outperforming",
    severity: "positive",
  },
  {
    time: "07:30",
    event: "HR attendance anomaly detected in Dept A",
    severity: "warning",
  },
  {
    time: "Yesterday",
    event: "Inventory shortage prediction updated: 88% probability",
    severity: "warning",
  },
  {
    time: "Yesterday",
    event: "Weekly AI digest generated",
    severity: "info",
  },
];

const SEV_DOT = {
  critical: "var(--danger)",
  warning: "#f5a623",
  positive: "var(--success)",
  info: "var(--brand-cyan)",
};

const QUICK_ACTIONS = [
  "Create Task from Insight",
  "Generate AI Report",
  "Send Summary to Team",
  "Export All Insights",
  "Mark All Reviewed",
];

export default function AIInsights() {
  const [period, setPeriod] = useState("This Week");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [severityFilter, setSeverityFilter] = useState("all");

  const [dashboardData, setDashboardData] = useState({
    insights: [],
    recommendations: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAIInsightsDashboard() {
      const data = await getAIInsightsDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadAIInsightsDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInsights =
    severityFilter === "all"
      ? dashboardData.insights
      : dashboardData.insights.filter(
          (insight) => insight.severity === severityFilter
        );

  const handleInsightAction = (action, insight) => {
    console.log("Mock insight action:", action, insight);
  };

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="AI Insights"
        subtitle="AI-generated explanations, root cause analysis, and recommended business actions"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        onAISummary={() => {}}
      />

      <div className="intel-page-body">
        <div className="intel-row-between">
          <div className="intel-actions-row">
            {["all", "critical", "warning", "positive", "info"].map(
              (filter) => (
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
              )
            )}
          </div>

          <div className="intel-text-muted intel-small">
            {filteredInsights.length} insights
          </div>
        </div>

        <div className="intel-main-with-sidebar">
          <div className="intel-flex-column">
            {filteredInsights.map((insight) => (
              <IntelligenceInsightCard
                key={insight.id}
                insight={insight}
                onAction={handleInsightAction}
              />
            ))}

            <div className="intel-panel">
              <div className="intel-panel-header">
                Prioritized Recommendations
              </div>

              {dashboardData.recommendations.map((recommendation) => {
                const effortColor =
                  EFFORT_COLOR[recommendation.effort] || "var(--text-muted)";

                const statusColor =
                  STATUS_COLOR[recommendation.status] || "var(--text-muted)";

                return (
                  <div
                    key={recommendation.id}
                    className="intel-recommendation-row"
                  >
                    <div className="intel-priority-badge">
                      #{recommendation.priority}
                    </div>

                    <div className="intel-flex-1 intel-min-w-220">
                      <div className="intel-section-title">
                        {recommendation.title}
                      </div>

                      <div className="intel-section-subtitle">
                        {recommendation.module} · {recommendation.owner} ·{" "}
                        <span style={{ color: effortColor }}>
                          Effort: {recommendation.effort}
                        </span>{" "}
                        · Impact:{" "}
                        <span className="intel-text-gold">
                          {recommendation.impact}
                        </span>
                      </div>
                    </div>

                    <span
                      className="intel-badge"
                      style={{
                        background: `${statusColor}22`,
                        color: statusColor,
                        borderColor: `${statusColor}44`,
                      }}
                    >
                      {String(recommendation.status || "pending").replace(
                        "_",
                        " "
                      )}
                    </span>

                    <button className="intel-btn" type="button">
                      Take Action
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="intel-flex-column">
            <div className="intel-panel">
              <div className="intel-panel-header">Insight Timeline</div>

              <div className="intel-timeline">
                <div className="intel-timeline-line" />

                {INSIGHT_TIMELINE.map((item, index) => {
                  const dotColor =
                    SEV_DOT[item.severity] || "var(--brand-cyan)";

                  return (
                    <div
                      key={`${item.time}-${index}`}
                      className="intel-timeline-item"
                    >
                      <span
                        className="intel-timeline-dot"
                        style={{ background: dotColor }}
                      />

                      <div>
                        <div className="intel-small intel-text-secondary">
                          {item.event}
                        </div>

                        <div className="intel-xs intel-text-muted intel-mt-4">
                          {item.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-section-title intel-mb-10">
                Quick Actions
              </div>

              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  className="intel-btn intel-quick-action"
                  type="button"
                >
                  → {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
