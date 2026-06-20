import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const MODULES = [
  {
    tag: 'CUSTOMER MANAGEMENT',
    title: 'CRM & Sales Intelligence',
    description: '360° customer profiles, lead scoring, pipeline management, and lifetime value tracking across all channels.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80',
  },
  {
    tag: 'OPERATIONS',
    title: 'Inventory & ERP',
    description: 'Real-time stock management, automated reorder alerts, margin analysis, and multi-warehouse operations.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80',
  },
  {
    tag: 'INSIGHTS & DATA',
    title: 'Advanced Analytics',
    description: 'AI-powered revenue forecasting, cohort analysis, funnel metrics, and cross-platform performance dashboards.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
  },
  {
    tag: 'ARTIFICIAL INTELLIGENCE',
    title: 'AI Automation Engine',
    description: 'Smart workflows that learn from your data, automate repetitive tasks, and surface actionable insights.',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
  },
  {
    tag: 'COMMUNICATIONS',
    title: 'Unified Inbox',
    description: 'Manage conversations from email, social, chat, and marketplace platforms in one intelligent inbox.',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=80',
  },
  {
    tag: 'FINANCE & ACCOUNTING',
    title: 'Financial Suite',
    description: 'Invoicing, expense tracking, multi-currency accounting, and real-time financial reporting.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 bg-[#070b14]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">What We Offer</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Enterprise Modules,</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Designed for Growth</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-white/[0.14] transition-all duration-300"
            >
              <img
                src={mod.image}
                alt={mod.title}
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/75 to-[#070b14]/20" />
              <div className="relative p-7 flex flex-col min-h-[280px] justify-end">
                <span className="font-inter text-[11px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">{mod.tag}</span>
                <h3 className="font-inter text-xl font-bold text-white mb-2 leading-snug">{mod.title}</h3>
                <p className="font-inter text-sm text-white/45 leading-relaxed mb-5 line-clamp-2">{mod.description}</p>
                <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-300">
                  Explore Module <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
