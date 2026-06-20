const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const crypto = require("crypto");

require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});

const logger = require("./config/logger");
const { supabase } = require("./config/supabase");

// ── Startup env validation ────────────────────────────────────────────────────
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PORT"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

if (missing.length) {
  logger.error(
    `[startup] Missing required environment variables: ${missing.join(", ")}`
  );
  logger.error("[startup] Copy .env.example to .env and fill in the values.");
  process.exit(1);
}

const OPTIONAL_WARN = [
  "GROQ_API_KEY",
  "CEREBRAS_API_KEY_FB",
  "SMTP_USER",
  "FACEBOOK_PAGE_ACCESS_TOKEN",
  "REDIS_URL",
  "SUPABASE_ANON_KEY",
];

const missingOptional = OPTIONAL_WARN.filter((k) => !process.env[k]);

if (missingOptional.length) {
  logger.warn(
    `[startup] Optional env vars not set (some features disabled): ${missingOptional.join(", ")}`
  );
}

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("./middleware/auth");

const app = express();
app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use((req, _res, next) => {
  logger.debug(
    { method: req.method, url: req.originalUrl, ip: req.ip },
    "incoming request"
  );
  next();
});

const allowedCorsOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://exponify.ph",
  "https://www.exponify.ph",
  "https://hermesv2-frontend.onrender.com",
  "https://chatbot-integration-frontend.onrender.com",
  "http://192.168.8.160:3000",
  "http://192.168.100.19:3000",
  "http://192.168.100.19:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

const IS_DEV = process.env.NODE_ENV !== "production";

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (allowedCorsOrigins.includes(origin)) return true;

  if (
    /^https:\/\/(hermesv2-frontend|hermesbackend(-[a-z0-9]+)?)\.onrender\.com$/.test(
      origin
    )
  ) {
    return true;
  }

  if (
    IS_DEV &&
    /^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1]))\.\d+\.\d+(:\d+)?$/.test(
      origin
    )
  ) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Blocked by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:5000",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5000",
          "http://192.168.8.160:3000",
          "http://192.168.8.160:5000",
          "http://192.168.100.19:3000",
          "http://192.168.100.19:5173",
          "http://192.168.100.19:5000",
          "https://zktcypraugqiddqhntsp.supabase.co",
          "https://*.supabase.co",
          "https://exponify.ph",
          "https://www.exponify.ph",
          "https://hermesbackend-j1w5.onrender.com",
          "https://*.onrender.com",
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 1000000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
    retryAfter: 15 * 60,
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 1000000 : 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: "Too many login attempts, please try again later.",
    retryAfter: 15 * 60,
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? 1000000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "AI rate limit exceeded. Please wait a moment before sending more requests.",
    retryAfter: 60,
  },
});

const facebookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? 1000000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Webhook rate limit exceeded.",
    retryAfter: 60,
  },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_DEV ? 1000000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Email rate limit exceeded. Please try again later.",
    retryAfter: 60 * 60,
  },
});

app.use("/api/", generalLimiter);

app.use((req, res, next) => {
  const id = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Hermes API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (_req, res) => {
  const start = Date.now();
  const checks = { db: "ok", memory: "ok" };

  try {
    const { error } = await supabase.from("workspaces").select("id").limit(1);
    if (error) checks.db = "degraded";
  } catch {
    checks.db = "degraded";
  }

  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);

  if (heapUsedMb > 512) checks.memory = "degraded";

  const status = Object.values(checks).every((v) => v === "ok")
    ? "ok"
    : "degraded";

  res.status(status === "ok" ? 200 : 503).json({
    status,
    checks,
    uptime: Math.floor(process.uptime()),
    heap_mb: heapUsedMb,
    latency_ms: Date.now() - start,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "2.2.1",
  });
});

// Main Routes
const mainRoutes = require("./routes/main");
app.use("/api", mainRoutes);

// Auth Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authLimiter, authRoutes);

// Admin/Public Demo Booking Routes
const zoomRoutes = require("./routes/zoom");
app.use("/api/zoom", requireAuth, emailLimiter, zoomRoutes);

// Client Workspace Booking Routes
const clientBookingRoutes = require("./routes/clientBookings");
app.use("/api/client-bookings", clientBookingRoutes);

// Landing Domain Routes
const landingDomainRoutes = require("./routes/landing/domains");
app.use("/api/landing/domains", landingDomainRoutes);
app.use("/api/landing/public/domains", landingDomainRoutes);

// Landing Public Routes
const landingPublicSubmitRoutes = require("./routes/landing/publicSubmit");
const landingPublicBookingRoutes = require("./routes/landing/publicBooking");
app.use("/api/landing/public", landingPublicSubmitRoutes);
app.use("/api/landing/public", landingPublicBookingRoutes);

// Workspace OAuth Integration Routes
const workspaceIntegrationRoutes = require("./routes/workspaceIntegrations");
app.use("/api/workspace-integrations", workspaceIntegrationRoutes);

// Task Routes
const taskRoutes = require("./routes/tasks");
app.use("/api/tasks", requireAuth, taskRoutes);

// Invoicing & Accounting Routes
const invoicingRoutes = require("./routes/invoicing");
const accountingRoutes = require("./routes/accounting");
app.use("/api/invoicing", requireAuth, invoicingRoutes);
app.use("/api/accounting", requireAuth, accountingRoutes);

// Finance & Treasury Routes
const financeRoutes = require("./routes/finance");
app.use("/api/finance", requireAuth, financeRoutes);

// PH Tax Compliance Routes
const birRoutes = require("./routes/bir");
const fixedAssetsRoutes = require("./routes/fixedAssets");
const payrollTaxRoutes = require("./routes/payrollTax");
app.use("/api/bir", requireAuth, birRoutes);
app.use("/api/fixed-assets", requireAuth, fixedAssetsRoutes);
app.use("/api/payroll-tax", requireAuth, payrollTaxRoutes);

// Analytics, Revenue & Reporting Routes
const analyticsRoutes = require("./routes/analytics");
const revenueRoutes = require("./routes/revenue");
const reportsRoutes = require("./routes/reports");
const knowledgeBaseRoutes = require("./routes/knowledge-base");
const auditLogsRoutes = require("./routes/audit-logs");
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/revenue", requireAuth, revenueRoutes);
app.use("/api/reports", requireAuth, reportsRoutes);
app.use("/api/knowledge-base", requireAuth, knowledgeBaseRoutes);
app.use("/api/audit-logs", requireAuth, auditLogsRoutes);

// Google Maps Lead Generator Routes
// /health is public so the frontend can probe availability without workspace auth
const googleMapsLeadsRoutes = require("./routes/googleMapsLeads");
app.use("/api/marketing/google-maps-leads/health", googleMapsLeadsRoutes);
app.use("/api/marketing/google-maps-leads", requireAuth, googleMapsLeadsRoutes);

// Campaigns, Workflows, Subscriptions
const campaignRoutes = require("./routes/campaigns");
const workflowRoutes = require("./routes/workflows");
const subscriptionRoutes = require("./routes/subscription");
app.use("/api/campaigns", requireAuth, campaignRoutes);
app.use("/api/workflows", requireAuth, workflowRoutes);
app.use("/api/subscriptions", requireAuth, subscriptionRoutes);

// AI & Security Routes
const aiRoutes = require("./routes/services/ai");
const securityRoutes = require("./routes/services/security");
const openClaudeRoutes = require("./routes/services/openClaude");
const facebookIntegrationRoutes = require("./routes/integrations/facebook");

app.use("/api/ai", requireAuth, aiLimiter, aiRoutes);
app.use("/api/security", requireAuth, securityRoutes);
app.use("/api/openclaude", requireAuth, aiLimiter, openClaudeRoutes);
app.use("/api/webhooks/facebook", facebookLimiter, facebookIntegrationRoutes);

// Email Unsubscribe
app.get("/api/email/unsubscribe", async (req, res) => {
  const { email, token } = req.query;

  if (!email || !token) {
    return res.status(400).send("Invalid unsubscribe link.");
  }

  const secret =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "exponify-unsub";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(String(email).toLowerCase())
    .digest("hex")
    .slice(0, 32);

  if (token !== expected) {
    return res.status(403).send("Invalid or expired unsubscribe token.");
  }

  try {
    const { supabase: adminSb } = require("./config/supabase");

    await adminSb.from("email_unsubscribes").upsert(
      {
        email: String(email).toLowerCase(),
        unsubscribed_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    const safeEmail = String(email)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    return res.send(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>&#x2705; Unsubscribed</h2><p>${safeEmail} has been removed from our mailing list.</p></body></html>`
    );
  } catch (error) {
    logger.error({ error: error.message }, "Unsubscribe failed");
    return res.status(500).send("Could not process unsubscribe. Please try again.");
  }
});

app.post("/api/email/unsubscribe", async (req, res) => {
  const { email, token } = req.query;

  if (!email || !token) {
    return res.status(400).json({ error: "Invalid" });
  }

  const secret =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "exponify-unsub";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(String(email).toLowerCase())
    .digest("hex")
    .slice(0, 32);

  if (token !== expected) {
    return res.status(403).json({ error: "Invalid token" });
  }

  try {
    const { supabase: adminSb } = require("./config/supabase");

    await adminSb.from("email_unsubscribes").upsert(
      {
        email: String(email).toLowerCase(),
        unsubscribed_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    return res.json({ success: true });
  } catch (error) {
    logger.error({ error: error.message }, "Unsubscribe POST failed");
    return res.status(500).json({ error: error.message });
  }
});

// JSON 404 for API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API route not found.",
    method: req.method,
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error(
    { err, method: req.method, url: req.originalUrl },
    "unhandled error"
  );

  const isProd = process.env.NODE_ENV === "production";

  res.status(err.status || 500).json({
    success: false,
    error: isProd
      ? "An unexpected error occurred."
      : err.message || "Server error",
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(
    { port: PORT, env: process.env.NODE_ENV || "development" },
    "Server started"
  );
});
/ /   t r i g g e r   n o d e m o n   r e s t a r t  
 