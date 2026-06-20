-- =========================================================
-- MIGRATION 019: FIX AI CHATBOT TESTER CLIENT ROUTE
-- =========================================================
-- Update client_route and visibility for ai_chatbot_tester feature to avoid /Admin prefix conflicts
UPDATE public.erp_features
SET client_route = '/Client/AIChatbotTester',
    client_visible = true
WHERE feature_key = 'ai_chatbot_tester';
