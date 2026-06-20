import React, { useEffect, useState } from "react";

import { getRevenueForecastDashboard } from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceChartCard, {
  RevenueTrendChart,
} from "../../../components/admin/intelligence/IntelligenceChartCard.jsx";
import ForecastScenarioCard from "../../../components/admin/intelligence/ForecastScenarioCard.jsx";

const FORECAST_KPIS = [
  { label: "Current Revenue", value: "₱12,840,000", color: "var(--brand-cyan)" },
  { label: "Forecasted Q3", value: "₱15,200,000", color: "var(--success)" },
  { label: "Forecast Accuracy", value: "88%", color: "var(--brand-cyan)" },
  { label: "Pipeline Value", value: "₱5,225,000", color: "var(--brand-gold)" },
  { label: "Weighted Pipeline", value: "₱3,118,000", color: "#9b59b6" },
  { label: "Target Achievement", value: "107%", color: "var(--success)" },
];

function getProbabilityColor(probability) {
  if (probability >= 70) return "var(--success)";
  if (probability >= 40) return "#f5a623";
  return "var(--danger)";
}

export default function RevenueForecast() {
  const [period, setPeriod] = useState("This Quarter");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [convRate, setConvRate] = useState(28);
  const [velocity, setVelocity] = useState(35);
  const [includeRisky, setIncludeRisky] = useState(true);

  const [dashboardData, setDashboardData] = useState({
    forecastScenarios: [],
    pipelineContribution: [],
    revenueTrend: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRevenueForecastDashboard() {
      const data = await getRevenueForecastDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadRevenueForecastDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const adjustment =
    (1 + (Number(convRate) - 28) / 100) *
    (Number(velocity) / 35) *
    (includeRisky ? 1 : 0.88);

  const adjustedForecast = Math.max(0, Math.round(15200000 * adjustment));

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title="Revenue Forecast"
        subtitle="Predict future revenue using pipeline trends, sales velocity, and forecast scenarios"
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        onAISummary={() => {}}
      />

      <div className="intel-page-body">
        <div className="intel-kpi-strip">
          {FORECAST_KPIS.map((kpi) => (
            <div key={kpi.label} className="intel-kpi">
              <div className="intel-scenario-accent" style={{ background: kpi.color }} />
              <div className="intel-kpi-label">{kpi.label}</div>
              <div className="intel-kpi-value" style={{ color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        <div className="intel-scenario-grid">
          {dashboardData.forecastScenarios.map((scenario) => (
            <ForecastScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>

        <div className="intel-forecast-layout">
          <IntelligenceChartCard
            title="Revenue Forecast Chart"
            subtitle="Historical solid line vs forecast dashed line vs target"
          >
            <RevenueTrendChart data={dashboardData.revenueTrend} />
          </IntelligenceChartCard>

          <div className="intel-flex-column">
            <div className="intel-card">
              <div className="intel-chart-title">Scenario Planning</div>

              <div className="intel-form-group">
                <div className="intel-report-card-top">
                  <span className="intel-kpi-sub">Conversion Rate</span>
                  <span className="intel-badge intel-badge-gold">{convRate}%</span>
                </div>

                <input
                  className="intel-range"
                  type="range"
                  min={10}
                  max={50}
                  value={convRate}
                  onChange={(event) => setConvRate(Number(event.target.value))}
                />
              </div>

              <div className="intel-form-group">
                <div className="intel-report-card-top">
                  <span className="intel-kpi-sub">Deal Velocity (days)</span>
                  <span className="intel-badge intel-badge-cyan">{velocity}d</span>
                </div>

                <input
                  className="intel-range"
                  type="range"
                  min={10}
                  max={90}
                  value={velocity}
                  onChange={(event) => setVelocity(Number(event.target.value))}
                />
              </div>

              <label className="intel-checkbox-row" htmlFor="include-risky-deals">
                <input
                  type="checkbox"
                  checked={includeRisky}
                  onChange={(event) => setIncludeRisky(event.target.checked)}
                  id="include-risky-deals"
                />
                <span className="intel-muted-label">Include high-risk deals</span>
              </label>

              <div className="intel-mini-metric intel-badge-success">
                <div className="intel-mini-metric-label">Adjusted Forecast</div>
                <div className="intel-kpi-value">
                  ₱{adjustedForecast.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="intel-ai-panel">
              <div className="intel-ai-title">✦ AI Forecast Explanation</div>
              <div className="intel-insight-text">
                Forecast increased 18% driven by{" "}
                <strong>3 enterprise deals in Negotiation</strong> stage. Main
                risk: GlobalShop PH churn probability at 38%. Removal would
                reduce forecast by ₱180,000. Recommended: prioritize Accenture
                PH and TechCorp Manila to secure ₱1.5M by June 15.
              </div>
            </div>
          </div>
        </div>

        <div className="intel-panel">
          <div className="intel-panel-header">
            Pipeline Contribution to Forecast
          </div>

          <div className="intel-table-wrap">
            <table className="intel-table">
              <thead>
                <tr>
                  {[
                    "Deal / Segment",
                    "Owner",
                    "Stage",
                    "Value",
                    "Probability",
                    "Expected Close",
                    "Weighted Revenue",
                  ].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {dashboardData.pipelineContribution.map((row, index) => {
                  const probabilityColor = getProbabilityColor(row.probability);

                  return (
                    <tr key={`${row.deal}-${index}`}>
                      <td className="intel-table-title-cell">{row.deal}</td>
                      <td>{row.owner}</td>
                      <td>
                        <span className="intel-badge">{row.stage}</span>
                      </td>
                      <td className="intel-table-money">
                        ₱{row.value.toLocaleString()}
                      </td>
                      <td>
                        <div className="intel-insight-tags">
                          <div className="intel-health-bar intel-progress-fixed">
                            <div
                              className="intel-health-fill"
                              style={{
                                width: `${row.probability}%`,
                                background: probabilityColor,
                              }}
                            />
                          </div>
                          <span>{row.probability}%</span>
                        </div>
                      </td>
                      <td>{row.close}</td>
                      <td className="intel-table-cyan">
                        ₱{row.weighted.toLocaleString()}
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
