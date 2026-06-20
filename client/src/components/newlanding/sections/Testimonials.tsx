import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    tag: 'ENTERPRISE CLIENT',
    quote: 'Exponify PH transformed our operations. We reduced manual processes by 80% in the first quarter alone.',
    name: 'Sarah Chen',
    title: 'COO, TechVista Inc.',
    initial: 'S',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&q=80',
  },
  {
    tag: 'GROWTH PARTNER',
    quote: "The AI-powered analytics give us insights we never had before. It's like having a team of data scientists on demand.",
    name: 'Marcus Rivera',
    title: 'CEO, GlobalTrade Co.',
    initial: 'M',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=900&q=80',
  },
  {
    tag: 'SALES LEADER',
    quote: 'Moving from Salesforce to Exponify PH was the best decision we made. Better features, lower cost, superior AI.',
    name: 'Emily Nakamura',
    title: 'VP Sales, Horizon Group',
    initial: 'E',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&q=80',
  },
];

export default function Testimonials() {
  return (
    <section className="py-28 bg-[#070b14]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">Testimonials</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">What Leaders</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Are Saying</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="group relative rounded-2xl overflow-hidden h-80 cursor-pointer"
            >
              <img
                src={t.image}
                alt={t.name}
                className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-3 block">{t.tag}</span>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="font-inter text-sm text-white/70 leading-relaxed mb-5 line-clamp-3">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-inter text-xs font-bold text-primary">{t.initial}</span>
                  </div>
                  <div>
                    <div className="font-inter text-sm font-semibold text-white">{t.name}</div>
                    <div className="font-inter text-xs text-white/40">{t.title}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
