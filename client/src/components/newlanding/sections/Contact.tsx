import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const WHY = [
  'No setup fees — get started immediately',
  'Dedicated onboarding specialist assigned to you',
  'Results guaranteed or your money back',
  'Trusted by 120+ businesses across the Philippines',
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="contact" className="py-28 bg-[#070b14]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/60" />
            <span className="text-primary font-inter text-xs font-semibold tracking-[0.35em] uppercase">Get Started</span>
            <div className="h-px w-16 bg-primary/60" />
          </div>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-white leading-tight">Ready to</h2>
          <h2 className="font-playfair text-5xl md:text-6xl font-bold text-primary italic leading-tight">Transform?</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left — image card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative rounded-2xl overflow-hidden h-[500px] cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80"
              alt="Transform your business"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-10">
              <span className="font-inter text-xs font-bold text-primary tracking-[0.2em] uppercase mb-4 block">WHY EXPONIFY PH</span>
              <h3 className="font-playfair text-3xl font-bold text-white mb-6 leading-tight">
                Book a personalized demo and discover the difference.
              </h3>
              <div className="space-y-3">
                {WHY.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-inter text-sm text-white/60">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            {submitted ? (
              <div className="rounded-2xl bg-[#0d1220] border border-white/[0.08] p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-playfair text-2xl font-bold text-white mb-3">Thank You!</h3>
                <p className="font-inter text-white/50 text-sm">Our team will reach out within 24 hours to schedule your personalized demo.</p>
              </div>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); setSubmitted(true); }}
                className="rounded-2xl bg-[#0d1220] border border-white/[0.08] p-8 space-y-4"
              >
                <h3 className="font-playfair text-2xl font-bold text-white mb-1">Book a Demo</h3>
                <p className="font-inter text-sm text-white/45 mb-4">Fill out the form and we'll be in touch within 24 hours.</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    placeholder="Full Name *"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-inter text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <input
                    placeholder="Work Email *"
                    type="email"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-inter text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    placeholder="Company Name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-inter text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <input
                    placeholder="Phone Number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-inter text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-inter text-sm text-white/50 focus:outline-none focus:border-primary/50 transition-colors">
                  <option value="">Company Size</option>
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201+">201+ employees</option>
                </select>
                <textarea
                  placeholder="Tell us about your needs..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-inter text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-[#070b14] font-inter font-bold text-base py-4 rounded-full hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 group"
                >
                  Schedule Demo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="font-inter text-xs text-white/25 text-center">By submitting, you agree to our Privacy Policy.</p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
