import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";

// ── Always-loaded (tiny, needed immediately) ──────────────────────────────────
import NewLandingPage from "./pages/NewLandingPage.jsx";
import Auth from "./pages/Auth.jsx";
import NotFound from "./pages/NotFound.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import ProtectedRoute from "./pages/Components/ProtectedRoute.jsx";
import AdminLayout from "./components/admin/layout/AdminLayout.jsx";
import ClientLayout from "./pages/Components/Client_Components/Client_Layout.jsx";
import ClientModuleRoute from "./pages/Components/Client_Components/ClientModuleRoute.jsx";
const ChangePassword = lazy(() => import("./components/auth/ChangePassword.jsx"));

// ── Lazy-loaded: Admin pages ──────────────────────────────────────────────────
const UnifiedAdminDashboard    = lazy(() => import("./pages/Admin/UnifiedAdminDashboard.jsx"));
const AdminCRM                 = lazy(() => import("./pages/Admin/CRM/Admin_CRM.jsx"));
const AdminDeals               = lazy(() => import("./pages/Admin/AdminDeals.jsx"));
const AdminContacts            = lazy(() => import("./pages/Admin/AdminContacts.jsx"));
const AdminInventory           = lazy(() => import("./pages/Admin/AdminInventory.jsx"));
const AdminMarketing           = lazy(() => import("./pages/Admin/AdminMarketing.jsx"));
const AdminMarketingCollateral = lazy(() => import("./pages/Admin/AdminMarketingCollateral.jsx"));
const AdminAnalytics           = lazy(() => import("./pages/Admin/AdminAnalytics.jsx"));
const AdminWorkspaceAccess     = lazy(() => import("./pages/Admin/AdminWorkspaceAccess.jsx"));
const AdminWorkspaceAdministration = lazy(() => import("./pages/Admin/AdminWorkspaceAdministration.jsx"));
const AdminERPRegistry         = lazy(() => import("./pages/Admin/AdminERPRegistry.jsx"));
const AdminInbox               = lazy(() => import("./pages/Admin/AdminInbox.jsx"));
const AdminCalendar            = lazy(() => import("./pages/Admin/AdminCalendar.jsx"));
const AdminChatbot             = lazy(() => import("./pages/Admin/AdminChatbot.jsx"));
const AdminSecurity            = lazy(() => import("./pages/Admin/AdminSecurity.jsx"));
const AdminSettings            = lazy(() => import("./pages/Admin/AdminSettings.jsx"));
const AdminProjects            = lazy(() => import("./pages/Admin/AdminProjects.jsx"));
const AdminTasks               = lazy(() => import("./pages/Admin/AdminTasks.jsx"));
const AdminTeam                = lazy(() => import("./pages/Admin/AdminTeam.jsx"));
const AdminTeams               = lazy(() => import("./pages/Admin/AdminTeams.jsx"));
const AdminBooking             = lazy(() => import("./pages/Admin/AdminBooking.jsx"));
const AdminRevenue             = lazy(() => import("./pages/Admin/AdminRevenue.jsx"));
const AdminDataAnalytics       = lazy(() => import("./pages/Admin/AdminDataAnalytics.jsx"));
const AdminPipelineAnalytics   = lazy(() => import("./pages/Admin/AdminPipelineAnalytics.jsx"));
const AdminRevenueProjections  = lazy(() => import("./pages/Admin/AdminRevenueProjections.jsx"));
const AdminPredictive          = lazy(() => import("./pages/Admin/AdminPredictive.jsx"));
const AdminLeaderboard         = lazy(() => import("./pages/Admin/AdminLeaderboard.jsx"));
const AdminCustomerPortal      = lazy(() => import("./pages/Admin/AdminCustomerPortal.jsx"));
const AdminFeedbackPortal      = lazy(() => import("./pages/Admin/AdminFeedbackPortal.jsx"));
const AdminKnowledgeBase       = lazy(() => import("./pages/Admin/AdminKnowledgeBase.jsx"));
const AdminDataExport          = lazy(() => import("./pages/Admin/AdminDataExport.jsx"));
const AdminWorkflows           = lazy(() => import("./pages/Admin/AdminWorkflows.jsx"));
const AdminReports             = lazy(() => import("./pages/Admin/AdminReports.jsx"));
const AdminNotifications       = lazy(() => import("./pages/Admin/AdminNotifications.jsx"));
const AdminAuditLogs           = lazy(() => import("./pages/Admin/AdminAuditLogs.jsx"));
const Admin_FacebookConnect    = lazy(() => import("./pages/Admin/Admin_FacebookConnect.jsx"));
const AdminAIChatbotTester     = lazy(() => import("./pages/Admin/AdminAIChatbotTester.jsx"));
const AdminFacebookConnectOverride = lazy(() => import("./pages/Admin/Admin_FacebookConnectOverride.jsx"));
const AdminAccountControl      = lazy(() => import("./pages/Admin/AdminAccountControl.jsx"));
const AdminHRDashboard         = lazy(() => import("./pages/Admin/AdminHRDashboard.jsx"));
const AdminEmployees           = lazy(() => import("./pages/Admin/AdminEmployees.jsx"));
const AdminAttendance          = lazy(() => import("./pages/Admin/AdminAttendance.jsx"));
const AdminLeaveManagement     = lazy(() => import("./pages/Admin/AdminLeaveManagement.jsx"));
const AdminPayroll             = lazy(() => import("./pages/Admin/AdminPayroll.jsx"));
const AdminRecruitment         = lazy(() => import("./pages/Admin/AdminRecruitment.jsx"));
const AdminPerformance         = lazy(() => import("./pages/Admin/AdminPerformance.jsx"));
const AdminEmployeeEngagement  = lazy(() => import("./pages/Admin/AdminEmployeeEngagement.jsx"));
const AdminHRAnalytics         = lazy(() => import("./pages/Admin/AdminHRAnalytics.jsx"));
const AdminLeadsPipeline       = lazy(() => import("./pages/Admin/CRM/Admin_LeadsPipeline.jsx"));
const AdminSalesLeaderBoards   = lazy(() => import("./pages/Admin/AdminSalesLeaderboard.jsx"));
const AdminIntelligenceOverview        = lazy(() => import("./pages/Admin/Intelligence/IntelligenceOverview.jsx"));
const AdminIntelligenceDataAnalytics   = lazy(() => import("./pages/Admin/Intelligence/DataAnalytics.jsx"));
const AdminIntelligencePredictiveAI    = lazy(() => import("./pages/Admin/Intelligence/PredictiveAI.jsx"));
const AdminIntelligenceAIInsights      = lazy(() => import("./pages/Admin/Intelligence/AIInsights.jsx"));
const AdminIntelligenceRevenueForecast = lazy(() => import("./pages/Admin/Intelligence/RevenueForecast.jsx"));
const AdminIntelligenceReports         = lazy(() => import("./pages/Admin/Intelligence/Reports.jsx"));
const AdminIntelligenceDataExport      = lazy(() => import("./pages/Admin/Intelligence/DataExport.jsx"));
const AdminIntelligenceKPIBuilder      = lazy(() => import("./pages/Admin/Intelligence/KPIBuilder.jsx"));
const AdminIntelligenceAlertsMonitoring = lazy(() => import("./pages/Admin/Intelligence/AlertsMonitoring.jsx"));
const AdminInvestorRelations   = lazy(() => import("./pages/Admin/AdminInvestorRelations.jsx"));
const AdminStrategicPlanning   = lazy(() => import("./pages/Admin/AdminStrategicPlanning.jsx"));
const AdminFinanceControl      = lazy(() => import("./pages/Admin/Admin_FinanceControl.jsx"));
const AdminTreasury            = lazy(() => import("./pages/Admin/Admin_Treasury.jsx"));
const AdminFinancialPlanning   = lazy(() => import("./pages/Admin/Admin_FinancialPlanning.jsx"));
const AdminFraudDetection      = lazy(() => import("./pages/Admin/Admin_FraudDetection.jsx"));
const AdminAccounting          = lazy(() => import("./pages/Admin/Admin_Accounting.jsx"));
const AdminInvoicing           = lazy(() => import("./pages/Admin/Admin_Invoicing.jsx"));
const AdminBIRCompliance       = lazy(() => import("./pages/Admin/Admin_BIRCompliance.jsx"));
const AdminFixedAssets         = lazy(() => import("./pages/Admin/Admin_FixedAssets.jsx"));
const AdminPayrollTax          = lazy(() => import("./pages/Admin/Admin_PayrollTax.jsx"));
const AdminClientLandingPages  = lazy(() => import("./pages/Admin/AdminClientLandingPages.jsx"));

// ── Lazy-loaded: Client pages ─────────────────────────────────────────────────
const ClientDashboard          = lazy(() => import("./pages/Client/Client_Dashboard.jsx"));
const ClientProfile            = lazy(() => import("./pages/Client/Modules/Client_Profile.jsx"));
const ClientProjects           = lazy(() => import("./pages/Client/Modules/ClientProjects.jsx"));
const ClientCRM                = lazy(() => import("./pages/Client/Modules/ClientCRM.jsx"));
const ClientContacts           = lazy(() => import("./pages/Client/Modules/ClientContacts.jsx"));
const ClientDeals              = lazy(() => import("./pages/Client/Modules/ClientDeals.jsx"));
const ClientTasks              = lazy(() => import("./pages/Client/Modules/ClientTasks.jsx"));
const ClientLeads              = lazy(() => import("./pages/Client/Modules/ClientLeads.jsx"));
const ClientRevenue            = lazy(() => import("./pages/Client/Modules/ClientRevenue.jsx"));
const ClientPipelineAnalytics  = lazy(() => import("./pages/Client/Modules/ClientPipelineAnalytics.jsx"));
const ClientSalesLeaderBoard   = lazy(() => import("./pages/Client/Modules/ClientSalesLeaderboard.jsx"));
const ClientBooking            = lazy(() => import("./pages/Client/Modules/ClientBooking"));
const ClientLandingPages       = lazy(() => import("./pages/Client/Modules/ClientLandingPages"));
const ClientFacebookInbox      = lazy(() => import("./pages/Client/Modules/Client_FacebookInbox.jsx"));
const ClientEmployees          = lazy(() => import("./pages/Client/Modules/ClientEmployees"));
const ClientHRDashboard        = lazy(() => import("./pages/Client/Modules/ClientHRDashboard"));
const ClientOperationsTeams    = lazy(() => import("./pages/Client/Modules/ClientOperationsTeams"));
const ClientWorkspaceAccess    = lazy(() => import("./pages/Client/Modules/ClientWorkspaceAccess"));
const ClientFacebookConnect    = lazy(() => import("./pages/Client/Modules/ClientFacebookConnect.jsx"));
const ClientInventory          = lazy(() => import("./pages/Client/Modules/Inventory/ClientInventory"));
const GoogleMapsLeads          = lazy(() => import("./pages/Client/Modules/GoogleMapsLeads"));
const ClientInvoicing          = lazy(() => import("./pages/Client/Modules/ClientInvoicing"));
const ClientAccounting         = lazy(() => import("./pages/Client/Modules/ClientAccounting"));
const ClientMarketingHub       = lazy(() => import("./pages/Client/Modules/ClientMarketing"));
const ClientMarketingCollateral = lazy(() => import("./pages/Client/Modules/ClientMarketingCollateral"));
const PublicLandingPage        = lazy(() => import("./pages/Public/PublicLandingPage"));

// ── Placeholder for unimplemented client modules ──────────────────────────────
const PlaceholderPage = ({ title }) => (
  <div className="p-6">
    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
    <p className="mt-2 text-gray-500">This module is coming soon.</p>
    <div className="mt-8 rounded-lg bg-gray-50 p-12 text-center dark:bg-white/5">
      <p className="text-gray-500">Full functionality will be available in the next update.</p>
    </div>
  </div>
);

const ClientAnalytics          = () => <PlaceholderPage title="Analytics" />;
const ClientDataAnalytics      = () => <PlaceholderPage title="Data Analytics" />;
const ClientRevenueProjections = () => <PlaceholderPage title="Revenue Projections" />;
const ClientPredictive         = () => <PlaceholderPage title="Predictive" />;
const ClientLeaderboard        = () => <PlaceholderPage title="Leaderboard" />;
const ClientCustomerPortal     = () => <PlaceholderPage title="Customer Portal" />;
const ClientFeedbackPortal     = () => <PlaceholderPage title="Feedback Portal" />;
const ClientKnowledgeBase      = () => <PlaceholderPage title="Knowledge Base" />;
const ClientChatbot            = () => <PlaceholderPage title="Chatbot" />;
// ClientMarketing is now a real lazy component (ClientMarketingHub above)
const ClientDataExport         = () => <PlaceholderPage title="Data Export" />;
const ClientTeam               = () => <PlaceholderPage title="Team" />;
const ClientWorkflows          = () => <PlaceholderPage title="Workflows" />;
const ClientReports            = () => <PlaceholderPage title="Reports" />;
const ClientNotifications      = () => <PlaceholderPage title="Notifications" />;
const ClientAuditLogs          = () => <PlaceholderPage title="Audit Logs" />;
const ClientSettings           = () => <PlaceholderPage title="Settings" />;

// ── Shared loading fallback ───────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-gold)] border-t-transparent" />
  </div>
);

function GuardedClientModule({ moduleKey, children }) {
  return <ClientModuleRoute moduleKey={moduleKey}>{children}</ClientModuleRoute>;
}

function CustomDomainLandingRoute() {
  const hostname = window.location.hostname.toLowerCase();
  const isPlatformRoot = hostname === "exponify.ph" || hostname === "www.exponify.ph";
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.includes("onrender.com");

  if (isLocal || isPlatformRoot) return <NewLandingPage />;
  return (
    <Suspense fallback={<PageLoader />}>
      <PublicLandingPage />
    </Suspense>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<CustomDomainLandingRoute />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ErrorBoundary title="Password change error">
              <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
                <Suspense fallback={<PageLoader />}>
                  <ChangePassword />
                </Suspense>
              </div>
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/l/:slug" element={<Suspense fallback={<PageLoader />}><PublicLandingPage /></Suspense>} />

        {/* ── Case redirects ── */}
        <Route path="/admin/*" element={<Navigate to="/Admin/Dashboard" replace />} />
        <Route path="/admin"   element={<Navigate to="/Admin/Dashboard" replace />} />
        <Route path="/client/*" element={<Navigate to="/Client/Dashboard" replace />} />
        <Route path="/client"   element={<Navigate to="/Client/Dashboard" replace />} />

        {/* ── Admin ── */}
        <Route
          path="/Admin/*"
          element={
            <ProtectedRoute requiredRole="Admin">
              <ErrorBoundary title="Admin panel error — a module crashed">
                <AdminLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route path="Dashboard"    element={<Suspense fallback={<PageLoader />}><UnifiedAdminDashboard /></Suspense>} />
          <Route path="CRM"          element={<Suspense fallback={<PageLoader />}><AdminCRM /></Suspense>} />
          <Route path="Deals"        element={<Suspense fallback={<PageLoader />}><AdminDeals /></Suspense>} />
          <Route path="Contacts"     element={<Suspense fallback={<PageLoader />}><AdminContacts /></Suspense>} />
          <Route path="Inventory"    element={<Suspense fallback={<PageLoader />}><AdminInventory /></Suspense>} />
          <Route path="Marketing"    element={<Suspense fallback={<PageLoader />}><AdminMarketing /></Suspense>} />
          <Route path="MarketingCollateral" element={<Suspense fallback={<PageLoader />}><AdminMarketingCollateral /></Suspense>} />
          <Route path="Analytics"    element={<Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense>} />
          <Route path="WorkspaceAccess"         element={<Suspense fallback={<PageLoader />}><AdminWorkspaceAccess /></Suspense>} />
          <Route path="WorkspaceAdministration" element={<Suspense fallback={<PageLoader />}><AdminWorkspaceAdministration /></Suspense>} />
          <Route path="ERPRegistry"  element={<Suspense fallback={<PageLoader />}><AdminERPRegistry /></Suspense>} />
          <Route path="Inbox"        element={<Suspense fallback={<PageLoader />}><AdminInbox /></Suspense>} />
          <Route path="Calendar"     element={<Suspense fallback={<PageLoader />}><AdminCalendar /></Suspense>} />
          <Route path="Chatbot"      element={<Suspense fallback={<PageLoader />}><AdminChatbot /></Suspense>} />
          <Route path="Security"     element={<Suspense fallback={<PageLoader />}><AdminSecurity /></Suspense>} />
          <Route path="Settings"     element={<Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>} />
          <Route path="Projects"     element={<Suspense fallback={<PageLoader />}><AdminProjects /></Suspense>} />
          <Route path="Tasks"        element={<Suspense fallback={<PageLoader />}><AdminTasks /></Suspense>} />
          <Route path="Team"         element={<Suspense fallback={<PageLoader />}><AdminTeam /></Suspense>} />
          <Route path="Teams"        element={<Suspense fallback={<PageLoader />}><AdminTeams /></Suspense>} />
          <Route path="Booking"      element={<Suspense fallback={<PageLoader />}><AdminBooking /></Suspense>} />
          <Route path="Revenue"      element={<Suspense fallback={<PageLoader />}><AdminRevenue /></Suspense>} />
          <Route path="DataAnalytics"       element={<Suspense fallback={<PageLoader />}><AdminDataAnalytics /></Suspense>} />
          <Route path="PipelineAnalytics"   element={<Suspense fallback={<PageLoader />}><AdminPipelineAnalytics /></Suspense>} />
          <Route path="RevenueProjections"  element={<Suspense fallback={<PageLoader />}><AdminRevenueProjections /></Suspense>} />
          <Route path="Predictive"          element={<Suspense fallback={<PageLoader />}><AdminPredictive /></Suspense>} />
          <Route path="Leaderboard"         element={<Suspense fallback={<PageLoader />}><AdminLeaderboard /></Suspense>} />
          <Route path="CustomerPortal"      element={<Suspense fallback={<PageLoader />}><AdminCustomerPortal /></Suspense>} />
          <Route path="FeedbackPortal"      element={<Suspense fallback={<PageLoader />}><AdminFeedbackPortal /></Suspense>} />
          <Route path="KnowledgeBase"       element={<Suspense fallback={<PageLoader />}><AdminKnowledgeBase /></Suspense>} />
          <Route path="DataExport"          element={<Suspense fallback={<PageLoader />}><AdminDataExport /></Suspense>} />
          <Route path="Workflows"           element={<Suspense fallback={<PageLoader />}><AdminWorkflows /></Suspense>} />
          <Route path="Reports"             element={<Suspense fallback={<PageLoader />}><AdminReports /></Suspense>} />
          <Route path="Notifications"       element={<Suspense fallback={<PageLoader />}><AdminNotifications /></Suspense>} />
          <Route path="AuditLogs"           element={<Suspense fallback={<PageLoader />}><AdminAuditLogs /></Suspense>} />
          <Route path="FacebookConnect"     element={<Suspense fallback={<PageLoader />}><Admin_FacebookConnect /></Suspense>} />
          <Route path="AIChatbotTester"     element={<Suspense fallback={<PageLoader />}><AdminAIChatbotTester /></Suspense>} />
          <Route path="FacebookConnectOverride"             element={<Suspense fallback={<PageLoader />}><AdminFacebookConnectOverride /></Suspense>} />
          <Route path="FacebookConnectOverride/:workspaceId" element={<Suspense fallback={<PageLoader />}><AdminFacebookConnectOverride /></Suspense>} />
          <Route path="AccountControl"      element={<Suspense fallback={<PageLoader />}><AdminAccountControl /></Suspense>} />
          <Route path="HRDashboard"         element={<Suspense fallback={<PageLoader />}><AdminHRDashboard /></Suspense>} />
          <Route path="Employees"           element={<Suspense fallback={<PageLoader />}><AdminEmployees /></Suspense>} />
          <Route path="Attendance"          element={<Suspense fallback={<PageLoader />}><AdminAttendance /></Suspense>} />
          <Route path="LeaveManagement"     element={<Suspense fallback={<PageLoader />}><AdminLeaveManagement /></Suspense>} />
          <Route path="Payroll"             element={<Suspense fallback={<PageLoader />}><AdminPayroll /></Suspense>} />
          <Route path="Recruitment"         element={<Suspense fallback={<PageLoader />}><AdminRecruitment /></Suspense>} />
          <Route path="Performance"         element={<Suspense fallback={<PageLoader />}><AdminPerformance /></Suspense>} />
          <Route path="EmployeeEngagement"  element={<Suspense fallback={<PageLoader />}><AdminEmployeeEngagement /></Suspense>} />
          <Route path="HRAnalytics"         element={<Suspense fallback={<PageLoader />}><AdminHRAnalytics /></Suspense>} />
          <Route path="LeadsPipeline"       element={<Suspense fallback={<PageLoader />}><AdminLeadsPipeline /></Suspense>} />
          <Route path="SalesLeaderBoards"   element={<Suspense fallback={<PageLoader />}><AdminSalesLeaderBoards /></Suspense>} />
          <Route path="Intelligence"                    element={<Suspense fallback={<PageLoader />}><AdminIntelligenceOverview /></Suspense>} />
          <Route path="Intelligence/DataAnalytics"      element={<Suspense fallback={<PageLoader />}><AdminIntelligenceDataAnalytics /></Suspense>} />
          <Route path="Intelligence/PredictiveAI"       element={<Suspense fallback={<PageLoader />}><AdminIntelligencePredictiveAI /></Suspense>} />
          <Route path="Intelligence/AIInsights"         element={<Suspense fallback={<PageLoader />}><AdminIntelligenceAIInsights /></Suspense>} />
          <Route path="Intelligence/RevenueForecast"    element={<Suspense fallback={<PageLoader />}><AdminIntelligenceRevenueForecast /></Suspense>} />
          <Route path="Intelligence/Reports"            element={<Suspense fallback={<PageLoader />}><AdminIntelligenceReports /></Suspense>} />
          <Route path="Intelligence/DataExport"         element={<Suspense fallback={<PageLoader />}><AdminIntelligenceDataExport /></Suspense>} />
          <Route path="Intelligence/KPIBuilder"         element={<Suspense fallback={<PageLoader />}><AdminIntelligenceKPIBuilder /></Suspense>} />
          <Route path="Intelligence/AlertsMonitoring"   element={<Suspense fallback={<PageLoader />}><AdminIntelligenceAlertsMonitoring /></Suspense>} />
          <Route path="InvestorRelations"   element={<Suspense fallback={<PageLoader />}><AdminInvestorRelations /></Suspense>} />
          <Route path="StrategicPlanning"   element={<Suspense fallback={<PageLoader />}><AdminStrategicPlanning /></Suspense>} />
          <Route path="FinanceControl"      element={<Suspense fallback={<PageLoader />}><AdminFinanceControl /></Suspense>} />
          <Route path="Treasury"            element={<Suspense fallback={<PageLoader />}><AdminTreasury /></Suspense>} />
          <Route path="FinancialPlanning"   element={<Suspense fallback={<PageLoader />}><AdminFinancialPlanning /></Suspense>} />
          <Route path="FraudDetection"      element={<Suspense fallback={<PageLoader />}><AdminFraudDetection /></Suspense>} />
          <Route path="Accounting"          element={<Suspense fallback={<PageLoader />}><AdminAccounting /></Suspense>} />
          <Route path="BIRCompliance"       element={<Suspense fallback={<PageLoader />}><AdminBIRCompliance /></Suspense>} />
          <Route path="FixedAssets"         element={<Suspense fallback={<PageLoader />}><AdminFixedAssets /></Suspense>} />
          <Route path="PayrollTax"          element={<Suspense fallback={<PageLoader />}><AdminPayrollTax /></Suspense>} />
          <Route path="GoogleMapsLeads"     element={<Suspense fallback={<PageLoader />}><GoogleMapsLeads /></Suspense>} />
          <Route path="Invoicing"           element={<Suspense fallback={<PageLoader />}><AdminInvoicing /></Suspense>} />
          <Route path="ClientLandingPages"            element={<Suspense fallback={<PageLoader />}><AdminClientLandingPages /></Suspense>} />
          <Route path="ClientLandingPages/:workspaceId" element={<Suspense fallback={<PageLoader />}><AdminClientLandingPages /></Suspense>} />
          <Route index element={<Navigate to="Dashboard" replace />} />
        </Route>

        {/* ── Legacy Admin redirects ── */}
        <Route path="/AdminDashboard"           element={<Navigate to="/Admin/Dashboard" replace />} />
        <Route path="/AdminCRM"                 element={<Navigate to="/Admin/CRM" replace />} />
        <Route path="/AdminDeals"               element={<Navigate to="/Admin/Deals" replace />} />
        <Route path="/AdminContacts"            element={<Navigate to="/Admin/Contacts" replace />} />
        <Route path="/AdminInventory"           element={<Navigate to="/Admin/Inventory" replace />} />
        <Route path="/AdminMarketing"           element={<Navigate to="/Admin/Marketing" replace />} />
        <Route path="/AdminAnalytics"           element={<Navigate to="/Admin/Analytics" replace />} />
        <Route path="/AdminDataAnalytics"       element={<Navigate to="/Admin/Analytics" replace />} />
        <Route path="/AdminWorkspaceAccess"     element={<Navigate to="/Admin/WorkspaceAccess" replace />} />
        <Route path="/AdminWorkspaceAdministration" element={<Navigate to="/Admin/WorkspaceAdministration" replace />} />
        <Route path="/AdminERPRegistry"         element={<Navigate to="/Admin/ERPRegistry" replace />} />
        <Route path="/AdminInbox"               element={<Navigate to="/Admin/Inbox" replace />} />
        <Route path="/AdminCalendar"            element={<Navigate to="/Admin/Calendar" replace />} />
        <Route path="/AdminHermesChatbot"       element={<Navigate to="/Admin/Chatbot" replace />} />
        <Route path="/AdminChatbot"             element={<Navigate to="/Admin/Chatbot" replace />} />
        <Route path="/AdminSecurity"            element={<Navigate to="/Admin/Security" replace />} />
        <Route path="/AdminSettings"            element={<Navigate to="/Admin/Settings" replace />} />
        <Route path="/AdminAccountControl"      element={<Navigate to="/Admin/AccountControl" replace />} />

        {/* ── Client ── */}
        <Route
          path="/Client/*"
          element={
            <ProtectedRoute requiredRole={["Client", "User"]}>
              <ErrorBoundary title="Client portal error — a module crashed">
                <ClientLayout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route path="Dashboard" element={<Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense>} />
          <Route path="Profile"   element={<Suspense fallback={<PageLoader />}><ClientProfile /></Suspense>} />

          <Route path="Projects" element={<GuardedClientModule moduleKey="projects"><Suspense fallback={<PageLoader />}><ClientProjects /></Suspense></GuardedClientModule>} />
          <Route path="Tasks"    element={<GuardedClientModule moduleKey="tasks"><Suspense fallback={<PageLoader />}><ClientTasks /></Suspense></GuardedClientModule>} />
          <Route path="HRDashboard" element={<GuardedClientModule moduleKey="hr_dashboard"><Suspense fallback={<PageLoader />}><ClientHRDashboard /></Suspense></GuardedClientModule>} />
          <Route path="Employees"   element={<GuardedClientModule moduleKey="employees"><Suspense fallback={<PageLoader />}><ClientEmployees /></Suspense></GuardedClientModule>} />
          <Route path="Deals"       element={<GuardedClientModule moduleKey="deals"><Suspense fallback={<PageLoader />}><ClientDeals /></Suspense></GuardedClientModule>} />
          <Route path="Contacts"    element={<GuardedClientModule moduleKey="contacts"><Suspense fallback={<PageLoader />}><ClientContacts /></Suspense></GuardedClientModule>} />
          <Route path="Inbox"       element={<GuardedClientModule moduleKey="inbox"><Suspense fallback={<PageLoader />}><ClientFacebookInbox /></Suspense></GuardedClientModule>} />
          <Route path="CRM"         element={<GuardedClientModule moduleKey="crm"><Suspense fallback={<PageLoader />}><ClientCRM /></Suspense></GuardedClientModule>} />
          <Route path="Revenue"     element={<GuardedClientModule moduleKey="revenue"><Suspense fallback={<PageLoader />}><ClientRevenue /></Suspense></GuardedClientModule>} />
          <Route path="Analytics"         element={<GuardedClientModule moduleKey="analytics"><ClientAnalytics /></GuardedClientModule>} />
          <Route path="DataAnalytics"     element={<GuardedClientModule moduleKey="data_analytics"><ClientDataAnalytics /></GuardedClientModule>} />
          <Route path="PipelineAnalytics" element={<GuardedClientModule moduleKey="pipeline_analytics"><Suspense fallback={<PageLoader />}><ClientPipelineAnalytics /></Suspense></GuardedClientModule>} />
          <Route path="RevenueProjections" element={<GuardedClientModule moduleKey="revenue_projections"><ClientRevenueProjections /></GuardedClientModule>} />
          <Route path="Predictive"        element={<GuardedClientModule moduleKey="predictive"><ClientPredictive /></GuardedClientModule>} />
          <Route path="Leaderboard"       element={<GuardedClientModule moduleKey="leaderboard"><ClientLeaderboard /></GuardedClientModule>} />
          <Route path="CustomerPortal"    element={<GuardedClientModule moduleKey="customer_portal"><ClientCustomerPortal /></GuardedClientModule>} />
          <Route path="FeedbackPortal"    element={<GuardedClientModule moduleKey="feedback_portal"><ClientFeedbackPortal /></GuardedClientModule>} />
          <Route path="KnowledgeBase"     element={<GuardedClientModule moduleKey="knowledge_base"><ClientKnowledgeBase /></GuardedClientModule>} />
          <Route path="Chatbot"           element={<GuardedClientModule moduleKey="chatbot"><ClientChatbot /></GuardedClientModule>} />
          <Route path="FacebookConnect"   element={<GuardedClientModule moduleKey="facebook_connect"><Suspense fallback={<PageLoader />}><ClientFacebookConnect /></Suspense></GuardedClientModule>} />
          <Route path="AIChatbotTester"   element={<GuardedClientModule moduleKey="ai_chatbot_tester"><Suspense fallback={<PageLoader />}><AdminAIChatbotTester /></Suspense></GuardedClientModule>} />
          <Route path="Inventory"         element={<GuardedClientModule moduleKey="inventory"><Suspense fallback={<PageLoader />}><ClientInventory /></Suspense></GuardedClientModule>} />
          <Route path="Marketing"            element={<GuardedClientModule moduleKey="marketing"><Suspense fallback={<PageLoader />}><ClientMarketingHub /></Suspense></GuardedClientModule>} />
          <Route path="MarketingCollateral"  element={<GuardedClientModule moduleKey="marketing_collateral"><Suspense fallback={<PageLoader />}><ClientMarketingCollateral /></Suspense></GuardedClientModule>} />
          <Route path="GoogleMapsLeads"      element={<GuardedClientModule moduleKey="google_maps_leads"><Suspense fallback={<PageLoader />}><GoogleMapsLeads /></Suspense></GuardedClientModule>} />
          <Route path="Invoicing"            element={<GuardedClientModule moduleKey="invoicing"><Suspense fallback={<PageLoader />}><ClientInvoicing /></Suspense></GuardedClientModule>} />
          <Route path="Accounting"           element={<GuardedClientModule moduleKey="accounting"><Suspense fallback={<PageLoader />}><ClientAccounting /></Suspense></GuardedClientModule>} />
          <Route path="Teams"             element={<GuardedClientModule moduleKey="teams"><Suspense fallback={<PageLoader />}><ClientOperationsTeams /></Suspense></GuardedClientModule>} />
          <Route path="WorkspaceAccess"   element={<GuardedClientModule moduleKey="workspace_access"><Suspense fallback={<PageLoader />}><ClientWorkspaceAccess /></Suspense></GuardedClientModule>} />
          <Route path="DataExport"        element={<GuardedClientModule moduleKey="data_export"><ClientDataExport /></GuardedClientModule>} />
          <Route path="Team"              element={<GuardedClientModule moduleKey="team"><ClientTeam /></GuardedClientModule>} />
          <Route path="Workflows"         element={<GuardedClientModule moduleKey="workflows"><ClientWorkflows /></GuardedClientModule>} />
          <Route path="Reports"           element={<GuardedClientModule moduleKey="reports"><ClientReports /></GuardedClientModule>} />
          <Route path="Notifications"     element={<GuardedClientModule moduleKey="notifications"><ClientNotifications /></GuardedClientModule>} />
          <Route path="AuditLogs"         element={<GuardedClientModule moduleKey="audit_logs"><ClientAuditLogs /></GuardedClientModule>} />
          <Route path="Settings"          element={<GuardedClientModule moduleKey="settings"><ClientSettings /></GuardedClientModule>} />
          <Route path="LeadsPipeline"     element={<GuardedClientModule moduleKey="leads_pipeline"><Suspense fallback={<PageLoader />}><ClientLeads /></Suspense></GuardedClientModule>} />
          <Route path="SalesLeaderBoards" element={<GuardedClientModule moduleKey="sales_leaderboard"><Suspense fallback={<PageLoader />}><ClientSalesLeaderBoard /></Suspense></GuardedClientModule>} />
          <Route path="Booking"           element={<GuardedClientModule moduleKey="booking"><Suspense fallback={<PageLoader />}><ClientBooking /></Suspense></GuardedClientModule>} />
          <Route path="LandingPages"      element={<GuardedClientModule moduleKey="landing_pages"><Suspense fallback={<PageLoader />}><ClientLandingPages /></Suspense></GuardedClientModule>} />

          <Route index element={<Navigate to="Dashboard" replace />} />
        </Route>

        {/* ── Legacy Client redirects ── */}
        <Route path="/ClientDashboard"    element={<Navigate to="/Client/Dashboard" replace />} />
        <Route path="/ClientProfile"      element={<Navigate to="/Client/Profile" replace />} />
        <Route path="/ClientProjects"     element={<Navigate to="/Client/Projects" replace />} />
        <Route path="/ClientHR"           element={<Navigate to="/Client/HRDashboard" replace />} />
        <Route path="/ClientWorkspaceAccess" element={<Navigate to="/Client/WorkspaceAccess" replace />} />

        {/* ── Catch-all ── */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
