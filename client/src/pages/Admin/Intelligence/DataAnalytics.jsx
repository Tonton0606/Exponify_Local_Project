import React, { useEffect, useState } from "react";

import {
  generateMarketResearch,
  getDataAnalyticsDashboard,
} from "../../../services/intelligence";

import IntelligenceHeader from "../../../components/admin/intelligence/IntelligenceHeader.jsx";
import IntelligenceChartCard, {
  RevenueTrendChart,
  DeptPerformanceChart,
} from "../../../components/admin/intelligence/IntelligenceChartCard.jsx";
import IntelligenceFilters from "../../../components/admin/intelligence/IntelligenceFilters.jsx";

const VIEWS = ["Dashboard", "Charts", "Table", "Comparison", "Market Research"];

const MARKET_RESULT_TABS = [
  { id: "overview", label: "Market Overview" },
  { id: "marketSize", label: "Market Size & Growth" },
  { id: "competitors", label: "Competitor Analysis" },
  { id: "trends", label: "Trends & Opportunities" },
  { id: "recommendations", label: "AI Recommendations" },
];

const INDUSTRIES = [
  "Technology",
  "Retail & Ecommerce",
  "Professional Services",
  "Healthcare",
  "Food & Beverage",
  "Real Estate",
  "Education",
  "Finance",
  "Manufacturing",
  "Hospitality",
  "Others",
];

const REGIONS = [
  "Philippines",
  "Southeast Asia",
  "Asia Pacific",
  "North America",
  "Europe",
  "Global",
];

const MARKET_GENERATION_STEPS = [
  "Understanding your input",
  "Analyzing market data",
  "Identifying trends",
  "Generating insights",
  "Finalizing report",
];

const MIN_MARKET_GENERATION_MS = 4200;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getMarketIndustry(form) {
  if (form.industry === "Others") {
    return String(form.customIndustry || "").trim();
  }

  return form.industry;
}

const STATUS_STYLE = {
  up: {
    color: "var(--success)",
    symbol: "^",
  },
  down: {
    color: "var(--danger)",
    symbol: "v",
  },
};

const AI_SUMMARY_ITEMS = [
  {
    label: "Revenue",
    text: "Revenue grew 18.4% this period, outperforming the 15% target. Sales pipeline velocity improved by 12%.",
    color: "var(--success)",
  },
  {
    label: "Marketing",
    text: "Campaign ROAS increased to 4.8x from 3.6x. Email CTR improved 28% from A/B test optimization.",
    color: "var(--brand-cyan)",
  },
  {
    label: "Operations",
    text: "Project completion rate dropped to 73% from 81%. Task review bottleneck identified as primary cause.",
    color: "#f5a623",
  },
  {
    label: "HR",
    text: "Employee retention at 94%, above industry average. Attendance anomaly in Dept A needs attention.",
    color: "#9b59b6",
  },
  {
    label: "Legal",
    text: "Compliance score dropped 24% due to missed filings. BIR deadline is critical: 8 days remaining.",
    color: "var(--danger)",
  },
];

function MarketAiAnimation({ isGenerating = false }) {
  return (
    <div
      className={`market-ai-visual ${isGenerating ? "is-generating" : "is-idle"}`}
      aria-hidden="true"
    >
      <div className="market-ai-wave market-ai-wave-left" />
      <div className="market-ai-wave market-ai-wave-right" />
      <div className="market-ai-tile market-ai-tile-chart">
        <span />
        <span />
        <span />
      </div>
      <div className="market-ai-tile market-ai-tile-pie">
        <span />
      </div>
      <div className="market-ai-tile market-ai-tile-search" />
      <div className="market-ai-tile market-ai-tile-report">
        <span />
        <span />
      </div>
      <div className="market-ai-orbit market-ai-orbit-one">
        <span />
      </div>
      <div className="market-ai-orbit market-ai-orbit-two">
        <span />
      </div>
      <div className="market-ai-core">
        <div className="market-ai-face">
          <span />
          <span />
        </div>
      </div>
      <div className="market-ai-base" />
      <div className="market-ai-scanline" />
    </div>
  );
}

function MarketResearchMotionState({ isGenerating }) {
  return (
    <div
      className={`market-research-motion-state ${
        isGenerating ? "is-generating" : "is-idle"
      }`}
    >
      <div className="market-motion-scene">
        <div className="market-motion-visual-column">
          <MarketAiAnimation isGenerating={isGenerating} />
        </div>

        <div className="market-motion-content-column">
          <div className="market-motion-copy">
            <div className="market-motion-spark">AI</div>
            <div>
              <div className="intel-section-title">
                {isGenerating
                  ? "AI is generating your market research..."
                  : "Ready to generate market intelligence"}
              </div>
              <div className="intel-section-subtitle">
                {isGenerating
                  ? "Our AI is analyzing your inputs, market signals, competitor positioning, and opportunity patterns."
                  : "Fill out the research brief above, then generate a report with market size, competitors, trends, and recommended actions."}
              </div>
            </div>
          </div>

          <div className="market-ai-stage-rail">
            {MARKET_GENERATION_STEPS.map((step, index) => (
              <div key={step} className="market-ai-stage">
                <span>{index + 1}</span>
                <div>{step}</div>
              </div>
            ))}
          </div>

          <div className="market-ai-progress">
            <div className="market-ai-progress-track">
              <div className="market-ai-progress-fill" />
            </div>
            <span className="market-ai-progress-value">
              {isGenerating ? (
                <>
                  <span>0%</span>
                  <span>18%</span>
                  <span>42%</span>
                  <span>67%</span>
                  <span>100%</span>
                </>
              ) : (
                "Ready"
              )}
            </span>
          </div>

          <div className="market-ai-status-line">
            <span />
            {isGenerating
              ? "Analyzing industry data and competitor insights..."
              : "Waiting for your research request..."}
          </div>
        </div>
      </div>

      <div className="market-ai-note">
        This may take 15-60 seconds depending on the depth of analysis.
      </div>
    </div>
  );
}

const PDF_COLORS = {
  navy: [15, 23, 42],
  panel: [248, 250, 252],
  cyan: [34, 211, 238],
  gold: [201, 168, 76],
  text: [15, 23, 42],
  muted: [100, 116, 139],
  border: [218, 226, 235],
  white: [255, 255, 255],
};

function sanitizeFilePart(value) {
  return String(value || "Market_Research")
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "Market_Research";
}

function getReportDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addReportFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...PDF_COLORS.border);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Generated by Hermes Admin AI Market Research", 14, pageHeight - 8);
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 8, {
    align: "right",
  });
}

function createPdfWriter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;
  let y = 18;
  let pageNumber = 1;

  function ensureSpace(height = 16) {
    if (y + height <= pageHeight - 22) return;
    addReportFooter(doc, pageNumber);
    doc.addPage();
    pageNumber += 1;
    y = 18;
  }

  function sectionTitle(title) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(title, margin, y);
    y += 2.5;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 34, y);
    y += 6;
  }

  function paragraph(text, options = {}) {
    const value = String(text || "").trim();
    if (!value) return;

    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.size || 10);
    if (Array.isArray(options.color)) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      doc.setTextColor(...PDF_COLORS.text);
    }
    const lines = doc.splitTextToSize(value, options.maxWidth || maxWidth);
    ensureSpace(lines.length * 4.4 + 3);
    doc.text(lines, margin + (options.indent || 0), y);
    y += lines.length * 4.4 + (options.after ?? 3);
  }

  function keyValue(label, value) {
    if (!value) return;
    const labelWidth = Math.min(46, Math.max(24, doc.getTextWidth(`${label}:`) + 3));
    const lines = doc.splitTextToSize(String(value), maxWidth - labelWidth);
    ensureSpace(lines.length * 4.4 + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(lines, margin + labelWidth, y);
    y += Math.max(5.5, lines.length * 4.4 + 1.5);
  }

  function infoBlock(label, value) {
    if (!value) return;
    const labelLines = doc.splitTextToSize(String(label), 34);
    const valueLines = doc.splitTextToSize(String(value), maxWidth - 44);
    const blockHeight = Math.max(labelLines.length, valueLines.length) * 4.2 + 5;

    ensureSpace(blockHeight + 2);
    doc.setFillColor(...PDF_COLORS.panel);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.roundedRect(margin, y - 4, maxWidth, blockHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.navy);
    doc.text(labelLines, margin + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(valueLines, margin + 42, y);
    y += blockHeight + 2;
  }

  function bullet(text) {
    const value = String(text || "").trim();
    if (!value) return;

    const lines = doc.splitTextToSize(value, maxWidth - 8);
    ensureSpace(lines.length * 4.4 + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text("-", margin, y);
    doc.text(lines, margin + 6, y);
    y += lines.length * 4.4 + 2;
  }

  function tableRow(columns, widths, isHeader = false, rowIndex = 0) {
    const lineGroups = columns.map((column, index) =>
      doc.splitTextToSize(String(column || ""), widths[index] - 4)
    );
    const rowHeight = Math.max(...lineGroups.map((lines) => lines.length * 4)) + 6;

    ensureSpace(rowHeight + 2);
    const rowX = margin;
    const rowY = y;
    if (isHeader) {
      doc.setFillColor(...PDF_COLORS.navy);
    } else if (rowIndex % 2 === 0) {
      doc.setFillColor(...PDF_COLORS.panel);
    } else {
      doc.setFillColor(...PDF_COLORS.white);
    }
    doc.rect(rowX, rowY - 4, maxWidth, rowHeight, "F");
    doc.setDrawColor(...PDF_COLORS.border);
    doc.rect(rowX, rowY - 4, maxWidth, rowHeight, "S");
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(8);
    doc.setTextColor(...(isHeader ? PDF_COLORS.white : PDF_COLORS.text));

    let x = rowX + 2;
    lineGroups.forEach((lines, index) => {
      doc.text(lines, x, rowY);
      x += widths[index];
    });

    y += rowHeight;
  }

  function finish() {
    addReportFooter(doc, pageNumber);
  }

  return {
    bullet,
    ensureSpace,
    finish,
    infoBlock,
    keyValue,
    margin,
    maxWidth,
    paragraph,
    sectionTitle,
    tableRow,
    getY: () => y,
    setY: (nextY) => {
      y = nextY;
    },
  };
}

export default function DataAnalytics() {
  const [period, setPeriod] = useState("This Month");
  const [workspace, setWorkspace] = useState("All Workspaces");
  const [view, setView] = useState("Dashboard");

  const [dashboardData, setDashboardData] = useState({
    kpis: [],
    revenueTrend: [],
    departmentPerformance: [],
  });

  const [filters, setFilters] = useState({
    dateRange: "Last 30 Days",
    department: "All Departments",
    metric: "All Metrics",
    chartType: "Line",
    comparePeriod: "vs Previous Period",
    search: "",
  });

  const [marketForm, setMarketForm] = useState({
    businessName: "",
    websiteUrl: "",
    industry: "",
    customIndustry: "",
    researchGoal: "",
    region: "",
    countries: "",
    focus: "",
    notes: "",
  });
  const [marketResearch, setMarketResearch] = useState(null);
  const [marketResultTab, setMarketResultTab] = useState("overview");
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [marketExporting, setMarketExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDataAnalyticsDashboard() {
      const data = await getDataAnalyticsDashboard();

      if (isMounted) {
        setDashboardData(data);
      }
    }

    loadDataAnalyticsDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const numericDept = dashboardData.departmentPerformance.filter(
    (department) =>
      typeof department.current === "number" && department.current > 1000
  );
  const activeMarketSection =
    marketResearch?.sections?.[marketResultTab] || [];
  const marketAnalytics = marketResearch?.analytics || {};
  const scoreCards = marketAnalytics.scores || [];
  const competitorBenchmarks = marketAnalytics.competitorBenchmarks || [];
  const opportunityMap = marketAnalytics.opportunityMap || [];
  const roadmap = marketAnalytics.roadmap || [];
  const assumptions = marketAnalytics.assumptions || [];

  function updateMarketForm(field, value) {
    setMarketForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleGenerateMarketResearch(event) {
    event?.preventDefault();
    setMarketError("");
    setMarketLoading(true);

    try {
      const requestForm = {
        ...marketForm,
        industry: getMarketIndustry(marketForm),
      };
      const [research] = await Promise.all([
        generateMarketResearch(requestForm),
        wait(MIN_MARKET_GENERATION_MS),
      ]);
      setMarketResearch(research);
      setMarketResultTab("overview");
    } catch (error) {
      setMarketError(error.message || "Unable to generate market research.");
    } finally {
      setMarketLoading(false);
    }
  }

  async function handleExportMarketResearch() {
    if (!marketResearch || marketExporting) return;

    setMarketExporting(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const writer = createPdfWriter(doc);
      const reportDate = getReportDate();
      const productName =
        marketForm.businessName || marketResearch.title || "Product";
      const reportIndustry = getMarketIndustry(marketForm);
      const fileName = `${sanitizeFilePart(productName)}_${reportDate}_Market_Research.pdf`;
      const analytics = marketResearch.analytics || {};
      const sections = marketResearch.sections || {};

      doc.setFillColor(...PDF_COLORS.navy);
      doc.rect(0, 0, 210, 34, "F");
      doc.setFillColor(...PDF_COLORS.gold);
      doc.rect(0, 0, 210, 2.5, "F");
      doc.setFillColor(...PDF_COLORS.gold);
      doc.rect(14, 30.5, 44, 1.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...PDF_COLORS.white);
      doc.text("AI Market Research Report", 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(202, 213, 226);
      doc.text(`Prepared for ${productName}`, 14, 22);
      doc.text(`Generated ${reportDate}`, 14, 28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_COLORS.gold);
      doc.text("Hermes Admin Intelligence", 194, 22, { align: "right" });
      writer.setY(44);

      writer.sectionTitle("Research Brief");
      writer.keyValue("Business / Brand", productName);
      writer.keyValue("Website", marketForm.websiteUrl);
      writer.keyValue("Industry", reportIndustry);
      writer.keyValue("Target Region", marketForm.region);
      writer.keyValue("Countries", marketForm.countries);
      writer.keyValue("Research Goal", marketForm.researchGoal);
      writer.keyValue("Research Focus", marketForm.focus);
      writer.keyValue("Additional Notes", marketForm.notes);

      writer.sectionTitle("Executive Summary");
      writer.paragraph(marketResearch.executiveSummary);

      if (marketResearch.kpis?.length > 0) {
        writer.sectionTitle("Key Market Indicators");
        writer.tableRow(["Metric", "Value", "Basis / Caveat"], [45, 30, 103], true);
        marketResearch.kpis.forEach((kpi, index) => {
          writer.tableRow([kpi.label, kpi.value, kpi.raw], [45, 30, 103], false, index);
        });
      }

      if (analytics.scores?.length > 0) {
        writer.sectionTitle("Analytics Scorecard");
        writer.tableRow(["Score", "Rating", "Interpretation"], [48, 22, 108], true);
        analytics.scores.forEach((score, index) => {
          writer.tableRow(
            [score.label, `${score.value}/100`, score.interpretation],
            [48, 22, 108],
            false,
            index
          );
        });
      }

      MARKET_RESULT_TABS.forEach((tab) => {
        const insights = sections[tab.id] || [];
        if (!insights.length) return;

        writer.sectionTitle(tab.label);
        insights.forEach((item, index) => {
          writer.paragraph(`${index + 1}. ${item.title || "Insight"}`, {
            bold: true,
            after: 2,
          });
          writer.paragraph(item.detail || item);
          if (item.evidence) writer.infoBlock("Basis", item.evidence);
          if (item.action) writer.infoBlock("Recommended Action", item.action);
          if (item.impact) writer.infoBlock("Expected Impact", item.impact);
        });
      });

      if (analytics.competitorBenchmarks?.length > 0) {
        writer.sectionTitle("Competitor Benchmark");
        writer.tableRow(
          ["Brand", "Positioning", "Pricing", "Strengths", "Weaknesses", "Threat"],
          [24, 36, 28, 34, 34, 18],
          true
        );
        analytics.competitorBenchmarks.forEach((competitor, index) => {
          writer.tableRow(
            [
              competitor.brand,
              competitor.positioning,
              competitor.pricing,
              (competitor.strengths || []).join(", "),
              (competitor.weaknesses || []).join(", "),
              competitor.threatLevel,
            ],
            [24, 36, 28, 34, 34, 18],
            false,
            index
          );
        });
      }

      if (analytics.opportunityMap?.length > 0) {
        writer.sectionTitle("Opportunity Map");
        analytics.opportunityMap.forEach((opportunity) => {
          writer.paragraph(opportunity.opportunity, { bold: true, after: 2 });
          writer.paragraph(opportunity.whyItMatters);
          writer.keyValue("Impact", opportunity.impact);
          writer.keyValue("Effort", opportunity.effort);
        });
      }

      if (analytics.roadmap?.length > 0) {
        writer.sectionTitle("90-Day Action Roadmap");
        writer.tableRow(["Timeframe", "Action", "Expected Outcome"], [28, 78, 72], true);
        analytics.roadmap.forEach((step, index) => {
          writer.tableRow(
            [step.timeframe, step.action, step.expectedOutcome],
            [28, 78, 72],
            false,
            index
          );
        });
      }

      if (marketResearch.risks?.length > 0) {
        writer.sectionTitle("Risks To Watch");
        marketResearch.risks.forEach(writer.bullet);
      }

      if (marketResearch.nextSteps?.length > 0) {
        writer.sectionTitle("Recommended Next Steps");
        marketResearch.nextSteps.forEach(writer.bullet);
      }

      if (analytics.assumptions?.length > 0) {
        writer.sectionTitle("Assumptions And Data Notes");
        analytics.assumptions.forEach(writer.bullet);
      }

      writer.finish();
      doc.save(fileName);
    } catch (error) {
      setMarketError(error.message || "Unable to export market research PDF.");
    } finally {
      setMarketExporting(false);
    }
  }

  return (
    <div className="crm-page intelligence-page">
      <IntelligenceHeader
        title={view === "Market Research" ? "AI Market Research" : "Data Analytics"}
        subtitle={
          view === "Market Research"
            ? "Provide details about your business and research goals. AI will generate market insights in seconds."
            : "Unified ERP analytics across sales, marketing, operations, HR, finance, and executive modules"
        }
        period={period}
        onPeriodChange={setPeriod}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onRefresh={() => {}}
        showAI={view !== "Market Research"}
        showControls={view !== "Market Research"}
      />

      {view !== "Market Research" && (
        <div className="intel-filter-shell">
          <IntelligenceFilters
            filters={filters}
            onChange={setFilters}
            fields={[
              "dateRange",
              "department",
              "metric",
              "chartType",
              "comparePeriod",
              "search",
            ]}
          />
        </div>
      )}

      <div className="intel-tabs intel-view-tabs">
        {VIEWS.map((item) => (
          <button
            key={item}
            className={`intel-tab ${view === item ? "is-active" : ""}`}
            onClick={() => setView(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="intel-page-body">
        {view !== "Market Research" && (
          <div className="intel-stat-strip">
            {dashboardData.kpis.map((kpi, index) => (
              <div key={`${kpi.label}-${index}`} className="intel-kpi">
                <div
                  className="intel-scenario-accent"
                  style={{ background: kpi.color || "var(--brand-cyan)" }}
                />
                <div className="intel-kpi-label">{kpi.label}</div>
                <div
                  className="intel-kpi-value"
                  style={{ color: kpi.color || "var(--brand-cyan)" }}
                >
                  {kpi.value}
                </div>
                <div className="intel-kpi-sub">{kpi.raw}</div>
              </div>
            ))}
          </div>
        )}

        {view === "Dashboard" && (
          <div className="intel-analytics-layout">
            <div className="intel-flex-column">
              <IntelligenceChartCard
                title="Revenue Trend"
                subtitle="Monthly actual vs forecast vs target"
              >
                <RevenueTrendChart data={dashboardData.revenueTrend} />
              </IntelligenceChartCard>

              <IntelligenceChartCard
                title="Department Performance"
                subtitle="Current vs previous period"
              >
                <DeptPerformanceChart data={numericDept} />
              </IntelligenceChartCard>
            </div>

            <div className="intel-ai-panel">
              <div className="intel-row intel-mb-12">
                <span className="intel-text-cyan">AI</span>
                <div className="intel-section-title">AI Analytics Summary</div>
              </div>

              {AI_SUMMARY_ITEMS.map((item) => (
                <div key={item.label} className="intel-mb-12">
                  <div className="intel-kpi-label" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <div className="intel-insight-text">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(view === "Table" || view === "Dashboard") && (
          <div className="intel-panel">
            <div className="intel-panel-header">Analytics Drilldown</div>

            <div className="intel-table-wrap">
              <table className="intel-table">
                <thead>
                  <tr>
                    {[
                      "Department",
                      "Metric",
                      "Current Value",
                      "Previous Value",
                      "Change",
                      "Status",
                      "Owner",
                    ].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {dashboardData.departmentPerformance.map((row, index) => {
                    const statusStyle =
                      STATUS_STYLE[row.status] || STATUS_STYLE.up;

                    return (
                      <tr key={`${row.dept}-${index}`}>
                        <td className="intel-table-title-cell">{row.dept}</td>
                        <td>{row.metric}</td>
                        <td className="intel-table-money">
                          {typeof row.current === "number" && row.current > 1000
                            ? `PHP ${row.current.toLocaleString()}`
                            : row.current}
                        </td>
                        <td>
                          {typeof row.previous === "number" &&
                          row.previous > 1000
                            ? `PHP ${row.previous.toLocaleString()}`
                            : row.previous}
                        </td>
                        <td>
                          <span
                            className="intel-bold"
                            style={{ color: statusStyle.color }}
                          >
                            {statusStyle.symbol} {row.change}
                          </span>
                        </td>
                        <td>
                          <span
                            className="intel-status-dot"
                            style={{ background: statusStyle.color }}
                          />
                        </td>
                        <td>{row.owner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "Charts" && (
          <div className="intel-card-grid">
            <IntelligenceChartCard title="Revenue Trend">
              <RevenueTrendChart data={dashboardData.revenueTrend} />
            </IntelligenceChartCard>

            <IntelligenceChartCard title="Department Performance">
              <DeptPerformanceChart data={numericDept} />
            </IntelligenceChartCard>
          </div>
        )}

        {view === "Comparison" && (
          <div className="intel-empty-state">
            Comparison view is ready for future real-data benchmarking.
          </div>
        )}

        {view === "Market Research" && (
          <div className="market-research-shell">
            <div className="market-research-actions">
              <button
                className="intel-btn"
                onClick={handleExportMarketResearch}
                type="button"
                disabled={!marketResearch || marketExporting}
              >
                {marketExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>

            <form
              className="market-research-form intel-panel"
              onSubmit={handleGenerateMarketResearch}
            >
              <div className="market-research-form-header">
                <div className="intel-row">
                  <span className="intel-text-cyan">AI</span>
                  <div>
                    <div className="intel-section-title">
                      Tell us about your business and research goals
                    </div>
                    <div className="intel-section-subtitle">
                      The more details you provide, the better and more accurate the AI insights will be.
                    </div>
                  </div>
                </div>
              </div>

              <div className="market-research-grid">
                <label className="market-field">
                  <span>Business / Brand Name</span>
                  <input
                    className="intel-input"
                    value={marketForm.businessName}
                    onChange={(event) => updateMarketForm("businessName", event.target.value)}
                    placeholder="e.g. ExponifyPH"
                    required
                  />
                </label>

                <label className="market-field">
                  <span>Business Website URL</span>
                  <input
                    className="intel-input"
                    value={marketForm.websiteUrl}
                    onChange={(event) => updateMarketForm("websiteUrl", event.target.value)}
                    placeholder="https://yourbusiness.com"
                    inputMode="url"
                  />
                </label>

                <label className="market-field">
                  <span>Industry</span>
                  <select
                    className="intel-select"
                    value={marketForm.industry}
                    onChange={(event) => {
                      updateMarketForm("industry", event.target.value);
                      if (event.target.value !== "Others") {
                        updateMarketForm("customIndustry", "");
                      }
                    }}
                    required
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </label>

                {marketForm.industry === "Others" && (
                  <label className="market-field">
                    <span>What industry?</span>
                    <input
                      className="intel-input"
                      value={marketForm.customIndustry}
                      onChange={(event) =>
                        updateMarketForm("customIndustry", event.target.value)
                      }
                      placeholder="e.g. Milk tea franchise, logistics, beauty services"
                      required
                    />
                  </label>
                )}

                <label className="market-field">
                  <span>What do you want to research?</span>
                  <input
                    className="intel-input"
                    value={marketForm.researchGoal}
                    onChange={(event) => updateMarketForm("researchGoal", event.target.value)}
                    placeholder="e.g. Market size, competitors, trends"
                    required
                  />
                </label>

                <label className="market-field">
                  <span>Target Region</span>
                  <select
                    className="intel-select"
                    value={marketForm.region}
                    onChange={(event) => updateMarketForm("region", event.target.value)}
                  >
                    <option value="">Select region</option>
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="market-field">
                  <span>Country / Countries</span>
                  <input
                    className="intel-input"
                    value={marketForm.countries}
                    onChange={(event) => updateMarketForm("countries", event.target.value)}
                    placeholder="e.g. Philippines, Singapore"
                  />
                </label>

                <label className="market-field">
                  <span>Research Focus</span>
                  <input
                    className="intel-input"
                    value={marketForm.focus}
                    onChange={(event) => updateMarketForm("focus", event.target.value)}
                    placeholder="e.g. Pricing, positioning, demand"
                  />
                </label>

                <label className="market-field">
                  <span>Additional Notes (Optional)</span>
                  <input
                    className="intel-input"
                    value={marketForm.notes}
                    onChange={(event) => updateMarketForm("notes", event.target.value)}
                    placeholder="Any specific areas of interest"
                  />
                </label>
              </div>

              {marketError && <div className="market-research-error">{marketError}</div>}

              <div className="market-research-submit-row">
                <button
                  className="intel-btn intel-btn-ai market-generate-btn"
                  type="submit"
                  disabled={marketLoading}
                >
                  {marketLoading ? "Generating..." : "Generate AI Research"}
                </button>
                <span className="intel-insight-text">
                  AI will analyze your prompt and generate actionable market insights.
                </span>
              </div>
            </form>

            <div className="intel-panel market-research-results">
              <div className="market-research-results-header">
                <div>
                  <div className="intel-row">
                    <span className="intel-text-cyan">AI</span>
                    <div className="intel-section-title">AI Generated Insights</div>
                  </div>
                  <div className="intel-section-subtitle">
                    Comprehensive market research based on your input.
                  </div>
                </div>
                {marketResearch?.model && (
                  <span className="intel-badge intel-badge-cyan">{marketResearch.model}</span>
                )}
              </div>

              {marketLoading ? (
                <MarketResearchMotionState isGenerating />
              ) : (
                <>
              {marketResearch?.kpis?.length > 0 && (
                <div className="intel-stat-strip market-research-kpis">
                  {marketResearch.kpis.map((kpi, index) => (
                    <div key={`${kpi.label}-${index}`} className="intel-kpi">
                      <div
                        className="intel-scenario-accent"
                        style={{ background: kpi.color || "var(--brand-cyan)" }}
                      />
                      <div className="intel-kpi-label">{kpi.label}</div>
                      <div
                        className="intel-kpi-value"
                        style={{ color: kpi.color || "var(--brand-cyan)" }}
                      >
                        {kpi.value}
                      </div>
                      <div className="intel-kpi-sub">{kpi.raw}</div>
                    </div>
                  ))}
                </div>
              )}

              {scoreCards.length > 0 && (
                <div className="market-analytics-grid">
                  {scoreCards.map((score, index) => (
                    <div key={`${score.label}-${index}`} className="market-score-card">
                      <div className="intel-row-between">
                        <div className="intel-section-title">{score.label}</div>
                        <div className="market-score-value">{score.value}/100</div>
                      </div>
                      <div className="market-score-track">
                        <div
                          className="market-score-fill"
                          style={{ width: `${Math.max(0, Math.min(100, score.value || 0))}%` }}
                        />
                      </div>
                      <div className="intel-insight-text">{score.interpretation}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="intel-tabs market-result-tabs">
                {MARKET_RESULT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`intel-tab ${marketResultTab === tab.id ? "is-active" : ""}`}
                    onClick={() => setMarketResultTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {!marketResearch ? (
                <MarketResearchMotionState isGenerating={false} />
              ) : (
                <div className="market-research-content">
                  <div className="market-executive-summary">
                    <div className="intel-section-title">{marketResearch.title}</div>
                    <p>{marketResearch.executiveSummary}</p>
                  </div>

                  <div className="market-insight-list">
                    {activeMarketSection.length > 0 ? (
                      activeMarketSection.map((item, index) => (
                        <div key={`${marketResultTab}-${index}`} className="market-insight-item">
                          <span>{index + 1}</span>
                          <div>
                            <div className="market-insight-title-row">
                              <div className="market-insight-title">
                                {item.title || `Insight ${index + 1}`}
                              </div>
                              {item.impact && (
                                <span className="intel-badge intel-badge-cyan">
                                  {item.impact} impact
                                </span>
                              )}
                            </div>
                            <p>{item.detail || item}</p>
                            {(item.evidence || item.action) && (
                              <div className="market-insight-meta-grid">
                                {item.evidence && (
                                  <div>
                                    <div className="intel-kpi-label">Basis</div>
                                    <div className="intel-insight-text">{item.evidence}</div>
                                  </div>
                                )}
                                {item.action && (
                                  <div>
                                    <div className="intel-kpi-label">Action</div>
                                    <div className="intel-insight-text">{item.action}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="intel-empty-state">
                        No AI details were returned for this section.
                      </div>
                    )}
                  </div>

                  {(competitorBenchmarks.length > 0 || opportunityMap.length > 0) && (
                    <div className="market-research-secondary-grid market-analytics-detail-grid">
                      {competitorBenchmarks.length > 0 && (
                        <div className="intel-card">
                          <div className="intel-section-title intel-mb-10">Competitor Benchmark</div>
                          <div className="market-competitor-list">
                            {competitorBenchmarks.map((competitor, index) => (
                              <div key={`${competitor.brand}-${index}`} className="market-competitor-card">
                                <div className="market-competitor-top">
                                  <div className="market-insight-title">{competitor.brand}</div>
                                  <span className="intel-badge intel-badge-warning">
                                    {competitor.threatLevel}
                                  </span>
                                </div>
                                <div className="intel-insight-text">{competitor.positioning}</div>
                                <div className="market-competitor-pricing">{competitor.pricing}</div>
                                <div className="market-chip-row">
                                  {(competitor.strengths || []).map((strength) => (
                                    <span key={strength} className="market-chip is-strength">
                                      {strength}
                                    </span>
                                  ))}
                                  {(competitor.weaknesses || []).map((weakness) => (
                                    <span key={weakness} className="market-chip">
                                      {weakness}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {opportunityMap.length > 0 && (
                        <div className="intel-card">
                          <div className="intel-section-title intel-mb-10">Opportunity Map</div>
                          {opportunityMap.map((opportunity, index) => (
                            <div key={`${opportunity.opportunity}-${index}`} className="market-opportunity-row">
                              <div>
                                <div className="market-insight-title">{opportunity.opportunity}</div>
                                <div className="intel-insight-text">{opportunity.whyItMatters}</div>
                              </div>
                              <div className="market-opportunity-badges">
                                <span className="intel-badge intel-badge-cyan">
                                  {opportunity.impact} impact
                                </span>
                                <span className="intel-badge">
                                  {opportunity.effort} effort
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(roadmap.length > 0 || assumptions.length > 0) && (
                    <div className="market-research-secondary-grid market-analytics-detail-grid">
                      {roadmap.length > 0 && (
                        <div className="intel-card">
                          <div className="intel-section-title intel-mb-10">90-Day Action Roadmap</div>
                          {roadmap.map((step, index) => (
                            <div key={`${step.timeframe}-${index}`} className="market-roadmap-row">
                              <span>{step.timeframe}</span>
                              <div>
                                <div className="market-insight-title">{step.action}</div>
                                <div className="intel-insight-text">{step.expectedOutcome}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {assumptions.length > 0 && (
                        <div className="intel-card">
                          <div className="intel-section-title intel-mb-10">Assumptions And Data Notes</div>
                          {assumptions.map((assumption, index) => (
                            <div key={`assumption-${index}`} className="market-assumption-row">
                              {assumption}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(marketResearch.risks?.length > 0 || marketResearch.nextSteps?.length > 0) && (
                    <div className="market-research-secondary-grid">
                      {marketResearch.risks?.length > 0 && (
                        <div className="intel-card">
                          <div className="intel-section-title intel-mb-10">Risks To Watch</div>
                          {marketResearch.risks.map((risk, index) => (
                            <div key={`risk-${index}`} className="intel-insight-text intel-mb-10">
                              {risk}
                            </div>
                          ))}
                        </div>
                      )}

                      {marketResearch.nextSteps?.length > 0 && (
                        <div className="intel-card">
                          <div className="intel-section-title intel-mb-10">Next Steps</div>
                          {marketResearch.nextSteps.map((step, index) => (
                            <div key={`step-${index}`} className="intel-insight-text intel-mb-10">
                              {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
