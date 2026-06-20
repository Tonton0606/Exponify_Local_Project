import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    tag: 'PHASE ONE',
    title: 'Discovery & Audit',
    description: 'We audit your current operations, map pain points, and align on your growth objectives.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=80',
  },
  {
    tag: 'PHASE TWO',
    title: 'Strategy & Roadmap',
    description: 'A tailored implementation roadmap built specifically for your industry and scale.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80',
  },
  {
    tag: 'PHASE THREE',
    title: 'Implementation',
    description: 'Our expert team deploys, migrates data, and configures modules with precision.',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900&q=80',
  },
  {
    tag: 'PHASE FOUR',
    title: 'Scale & Optimize',
    description: 'Continuous optimization, AI learning, and scaling support as your business evolves.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=80',
  },
];

export default function Process() {
  return (
    <section id="process" className="py-28 bg-[#070b14]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">How It Works</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Your Journey to</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Digital Excellence</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative rounded-2xl overflow-hidden h-80 cursor-pointer"
            >
              <img
                src={step.image}
                alt={step.title}
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/60 to-transparent" />
              <div className="absolute top-5 right-5 font-playfair text-5xl font-bold text-white/5">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2 block">{step.tag}</span>
                <h3 className="font-inter text-lg font-bold text-white mb-2 leading-tight">{step.title}</h3>
                <p className="font-inter text-sm text-white/50 leading-relaxed mb-4">{step.description}</p>
                <span className="font-inter text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all duration-300">
                  Learn More <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
