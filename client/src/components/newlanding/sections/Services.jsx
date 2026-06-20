import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, MessageSquare, Users, Package, BarChart3, Bot, Megaphone } from 'lucide-react';

const SERVICES = [
  {
    id: 'inbox',
    Icon: MessageSquare,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    tag: 'UNIFIED COMMUNICATIONS',
    label: 'Hermes Inbox',
    shortDesc: 'AI-powered unified inbox across Facebook, Instagram, TikTok, Shopee, Lazada & more.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=80',
    demo: {
      title: 'Hermes Inbox — Live Demo',
      desc: 'Manage all your customer conversations from every platform in one intelligent inbox. Auto-prioritize, auto-respond, and never miss a message.',
      metrics: [
        { label: 'Avg Response Time', value: '< 2 min' },
        { label: 'Platforms Connected', value: '12+' },
        { label: 'Messages Handled', value: '50K/day' },
      ],
      preview: [
        { platform: 'Facebook', msg: 'Hi! Is this available for delivery?', time: '2m ago', badge: 'bg-blue-500' },
        { platform: 'Shopee', msg: 'Can I get a discount for bulk order?', time: '5m ago', badge: 'bg-orange-500' },
        { platform: 'Instagram', msg: 'Love your products! DM me', time: '8m ago', badge: 'bg-pink-500' },
        { platform: 'TikTok', msg: 'Where can I buy this item?', time: '12m ago', badge: 'bg-slate-500' },
        { platform: 'Lazada', msg: 'Order #8821 — when will this ship?', time: '15m ago', badge: 'bg-indigo-500' },
      ],
    },
  },
  {
    id: 'crm',
    Icon: Users,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    tag: 'CUSTOMER MANAGEMENT',
    label: 'Hermes CRM',
    shortDesc: '360° customer profiles, lead scoring, pipeline management, and lifetime value tracking.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
    demo: {
      title: 'Hermes CRM — Live Demo',
      desc: 'See every customer touchpoint, purchase history, and engagement score in one unified profile. AI ranks your hottest leads automatically.',
      metrics: [
        { label: 'Lead Conversion', value: '+47%' },
        { label: 'Customer Profiles', value: 'Full 360°' },
        { label: 'Pipeline Visibility', value: 'Real-time' },
      ],
      preview: [
        { platform: 'Hot Lead', msg: 'Maria Santos — Score: 94/100 | ₱280K LTV', time: 'New', badge: 'bg-emerald-500' },
        { platform: 'Returning', msg: 'Juan Cruz — 5th purchase | ₱45K total', time: '1h ago', badge: 'bg-blue-500' },
        { platform: 'At Risk', msg: 'Ana Reyes — No purchase 30 days', time: '3h ago', badge: 'bg-yellow-500' },
        { platform: 'AI Tip', msg: 'Follow up with Maria — 87% close prob', time: 'AI', badge: 'bg-purple-500' },
      ],
    },
  },
  {
    id: 'erp',
    Icon: Package,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    tag: 'OPERATIONS MANAGEMENT',
    label: 'Hermes ERP',
    shortDesc: 'Real-time stock management, automated reorder alerts, margin analysis, and multi-brand catalog.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80',
    demo: {
      title: 'Hermes ERP — Live Demo',
      desc: "Complete end-to-end operations management. Know exactly what's in stock, what's selling, and what needs restocking — all automated.",
      metrics: [
        { label: 'Stock Accuracy', value: '99.8%' },
        { label: 'Reorder Automation', value: '100%' },
        { label: 'Margin Analysis', value: 'Real-time' },
      ],
      preview: [
        { platform: 'Low Stock', msg: 'iPhone 15 Pro — 3 units left', time: 'Now', badge: 'bg-red-500' },
        { platform: 'Hot Item', msg: 'AirPods Max — 87 sold today', time: '2h ago', badge: 'bg-emerald-500' },
        { platform: 'Reorder', msg: 'Samsung S24 — Auto-ordered 50 units', time: '4h ago', badge: 'bg-blue-500' },
        { platform: 'AI Alert', msg: 'Summer collection trending +45%', time: 'AI', badge: 'bg-purple-500' },
      ],
    },
  },
  {
    id: 'analytics',
    Icon: BarChart3,
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    tag: 'BUSINESS INTELLIGENCE',
    label: 'Hermes Analytics',
    shortDesc: 'AI-powered revenue forecasting, cohort analysis, funnel metrics, and cross-platform dashboards.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
    demo: {
      title: 'Hermes Analytics — Live Demo',
      desc: 'Turn raw data into business decisions. Our AI engine spots trends, flags anomalies, and forecasts your next 90 days of revenue.',
      metrics: [
        { label: 'Forecast Accuracy', value: '94%' },
        { label: 'Anomaly Detection', value: 'Real-time' },
        { label: 'Revenue Insights', value: 'AI-powered' },
      ],
      preview: [
        { platform: 'Revenue', msg: '₱2.4M this month — +23% vs target', time: 'Today', badge: 'bg-emerald-500' },
        { platform: 'Forecast', msg: 'Next 90 days: ₱8.2M projected', time: 'Updated', badge: 'bg-blue-500' },
        { platform: 'Trend', msg: 'Mobile sales up 45% this week', time: 'Alert', badge: 'bg-yellow-500' },
        { platform: 'AI Insight', msg: 'Weekend traffic spike predicted', time: 'AI', badge: 'bg-purple-500' },
      ],
    },
  },
  {
    id: 'chatbot',
    Icon: Bot,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    tag: 'AI ASSISTANT',
    label: 'Hermes AI Chatbot',
    shortDesc: 'Smart auto-replies in Taglish — trained on your brand voice, products, and FAQs. Live 24/7.',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
    demo: {
      title: 'Hermes AI Chatbot — Live Demo',
      desc: "Your AI-powered salesperson that never sleeps. Answers questions, qualifies leads, takes orders, and hands off to humans when needed.",
      metrics: [
        { label: 'Response Time', value: '< 1 sec' },
        { label: 'Languages', value: 'Taglish/English' },
        { label: 'Accuracy', value: '92%' },
      ],
      preview: [
        { platform: 'Customer', msg: 'Magkano po ito?', time: 'Now', badge: 'bg-blue-500' },
        { platform: 'Bot', msg: 'Good day! Item is ₱1,299. Cash or GCash?', time: 'Instant', badge: 'bg-green-500' },
        { platform: 'Customer', msg: 'Available for shipping?', time: '30s ago', badge: 'bg-blue-500' },
        { platform: 'Bot', msg: 'Yes! Same-day delivery within Metro Manila', time: 'Instant', badge: 'bg-green-500' },
      ],
    },
  },
  {
    id: 'socialads',
    Icon: Megaphone,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    tag: 'SOCIAL ADVERTISING',
    label: 'Hermes Social Ads',
    shortDesc: 'Track ROAS, optimize ad creatives, and attribute revenue across Facebook, TikTok & Shopee Ads.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80',
    demo: {
      title: 'Hermes Social Ads — Live Demo',
      desc: 'Stop guessing which ads work. Our platform tracks every peso spent and every peso earned — with AI recommendations to scale winners and cut losers.',
      metrics: [
        { label: 'Avg ROAS', value: '4.2x' },
        { label: 'Ad Platforms', value: 'FB, TT, Shopee' },
        { label: 'AI Optimization', value: 'Daily' },
      ],
      preview: [
        { platform: 'FB Ad #A12', msg: 'Summer Sale — ROAS: 6.2x | Spend: ₱15K', time: 'Scale it', badge: 'bg-emerald-500' },
        { platform: 'TikTok #T04', msg: 'Unboxing Video — ROAS: 4.1x | CTR: 3.8%', time: 'Running', badge: 'bg-blue-500' },
        { platform: 'Shopee Ad #S7', msg: 'Flash Deal Banner — ROAS: 2.1x', time: 'Review', badge: 'bg-yellow-500' },
        { platform: 'FB Ad #A09', msg: 'Old Creative — ROAS: 0.8x — Paused', time: 'AI paused', badge: 'bg-red-500' },
        { platform: 'AI Tip', msg: 'Increase FB #A12 budget by ₱5K — projected +₱31K revenue', time: 'Recommendation', badge: 'bg-purple-500' },
      ],
    },
  },
];

function DemoModal({ service, onClose }) {
  const Icon = service.Icon;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-64 bg-gradient-to-br from-[var(--primary-600)]/20 to-[var(--primary-600)]/5">
          <img
            src={service.image}
            alt={service.label}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-6 left-6">
            <div className={`w-12 h-12 rounded-lg ${service.iconBg} flex items-center justify-center mb-4`}>
              <Icon className={`w-6 h-6 ${service.iconColor}`} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{service.label}</h3>
            <p className="text-white/80 text-sm">{service.tag}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)] bg-[var(--card)]/50">
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-white mb-3">{service.demo.title}</h4>
            <p className="text-gray-400 mb-6">{service.demo.desc}</p>
            
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {service.demo.metrics.map((metric, index) => (
                <div key={index} className="bg-[var(--card)]/50 rounded-lg p-4 border border-[var(--border)]/10">
                  <p className="text-gray-400 text-sm mb-1">{metric.label}</p>
                  <p className="text-white text-lg font-bold">{metric.value}</p>
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div className="bg-[var(--card)]/50 rounded-lg p-4 border border-[var(--border)]/10">
              <h5 className="text-white font-semibold mb-4">Live Preview</h5>
              <div className="space-y-3">
                {service.demo.preview.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${item.badge} mt-2`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm mb-1">{item.msg}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{item.platform}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-4">
            <button className="flex-1 bg-[#c9a84c] hover:bg-[#c9a84c]/90 text-white font-medium py-3 px-6 rounded-lg transition-colors">
              Get Started
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-colors border border-white/20"
            >
              Close Demo
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Services() {
  const [selectedService, setSelectedService] = useState(null);

  return (
    <section className="py-20 relative bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything You Need to Scale Your Business
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Six powerful modules that work together seamlessly. From customer conversations to revenue analytics — all in one platform.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {SERVICES.map((service, index) => {
            const Icon = service.Icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
                onClick={() => setSelectedService(service)}
              >
                <div className="h-full bg-[var(--background)] border border-[var(--border)]/20 rounded-2xl p-6 hover:border-[var(--primary-600)]/40 transition-all duration-300 group-hover:transform group-hover:scale-105">
                  <div className={`w-14 h-14 rounded-xl ${service.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${service.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{service.label}</h3>
                  <p className="text-gray-400 mb-4 line-clamp-2">{service.shortDesc}</p>
                  <div className="flex items-center text-[#c9a84c] group-hover:text-[#c9a84c]/80 transition-colors">
                    <span className="text-sm font-medium">View Demo</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="flex items-center gap-4 bg-[var(--primary-600)]/10 border border-[var(--border)]/30 rounded-full px-8 py-4">
            <span className="text-white font-medium">Ready to transform your business?</span>
            <button className="bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-[var(--ep-white)] font-medium py-2 px-6 rounded-full transition-colors">
              Start Free Trial
            </button>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      <AnimatePresence>
        {selectedService && (
          <DemoModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
