/**
 * server/app.js — Secondary Express application module.
 * Used by Vercel/serverless adapters and legacy imports.
 * Security-hardened to match server.js standards.
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: '.env' });
require("dotenv").config({ path: '.env.local' }); // local overrides

const app = express();
app.disable("x-powered-by");

// ── Trusted proxy (for correct req.ip behind Render/nginx) ──────────────────
app.set("trust proxy", 1);

// ── Helmet security headers ──────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // handled by server.js when used as sub-app
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS — restricted to known origins ──────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://exponify.ph",
  "https://www.exponify.ph",
  "https://hermesv2-frontend.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const IS_DEV = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // server-to-server / curl
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https:\/\/(hermesv2-frontend|hermesbackend(-[a-z0-9]+)?)\.onrender\.com$/.test(origin))
        return callback(null, true);
      if (IS_DEV && /^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1]))\.\d+\.\d+(:\d+)?$/.test(origin))
        return callback(null, true);
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// ── Rate limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts, please try again later." },
});

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);

// ── Body parsing with rawBody for webhook signature verification ─────────────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
const { requireAuth, handleAuthError } = require("./middleware/auth");

const mainRoutes = require("./routes/main");
app.use("/api", mainRoutes);

const openClaudeRoutes = require("./routes/services/openClaude");
const facebookIntegrationRoutes = require("./routes/integrations/facebook");
app.use("/api/openclaude", requireAuth, openClaudeRoutes);
app.use("/api/webhooks/facebook", facebookIntegrationRoutes);

const revenueRoutes = require("./routes/revenue");
const analyticsRoutes = require("./routes/analytics");
const knowledgeBaseRoutes = require("./routes/knowledge-base");
const reportsRoutes = require("./routes/reports");
const auditLogsRoutes = require("./routes/audit-logs");
app.use("/api/revenue", requireAuth, revenueRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/knowledge-base", requireAuth, knowledgeBaseRoutes);
app.use("/api/reports", requireAuth, reportsRoutes);
app.use("/api/audit-logs", requireAuth, auditLogsRoutes);

const financeRoutes = require("./routes/finance");
const accountingRoutes = require("./routes/accounting");
const invoicingRoutes = require("./routes/invoicing");
app.use("/api/finance", requireAuth, financeRoutes);
app.use("/api/accounting", requireAuth, accountingRoutes);
app.use("/api/invoicing", requireAuth, invoicingRoutes);

const aiRoutes = require("./routes/services/ai");
app.use("/api/ai", requireAuth, aiRoutes);

const workflowRoutes = require("./routes/workflows");
app.use("/api/workflows", requireAuth, workflowRoutes);

const subscriptionRoutes = require("./routes/subscription");
app.use("/api/subscription", requireAuth, subscriptionRoutes);

const campaignRoutes = require("./routes/campaigns");
app.use("/api/campaigns", requireAuth, campaignRoutes);

// ── JSON 404 for API routes ──────────────────────────────────────────────────
app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "API route not found." });
});

app.use(handleAuthError);

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Server error",
  });
});

module.exports = app;
