import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'SERVICES', href: '#services' },
  { name: 'FEATURES', href: '#features' },
  { name: 'AI ENGINE', href: '#ai' },
  { name: 'PROCESS', href: '#process' },
  { name: 'CONTACT', href: '#contact' },
];

export default function Navbar({ onLogin, onSignup, onBookDemo }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'nav-glass' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-primary" />
          </div>
          <span className="font-playfair text-lg font-bold text-white tracking-tight">Exponify PH</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <a
              key={l.name}
              href={l.href}
              className="font-inter text-sm font-medium text-white/50 hover:text-primary transition-colors duration-300 tracking-wide"
            >
              {l.name}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onLogin}
            className="font-inter text-sm border border-white/20 text-white hover:border-primary hover:text-primary rounded-full px-5 py-2 transition-all duration-300"
          >
            Log In
          </button>
          <button
            onClick={onSignup}
            className="font-inter text-sm border border-white/20 text-white hover:border-primary hover:text-primary rounded-full px-5 py-2 transition-all duration-300"
          >
            Sign Up
          </button>
          <button
            onClick={onBookDemo}
            className="font-inter text-sm font-semibold bg-primary text-[#070b14] hover:bg-primary/90 rounded-full px-6 py-2.5 transition-all duration-300"
          >
            Book a Demo
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden nav-glass border-b border-white/5"
          >
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-4">
              {navLinks.map(l => (
                <a
                  key={l.name}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-inter text-sm font-medium text-white/50 hover:text-primary py-2 border-b border-white/5 transition-colors"
                >
                  {l.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => { setOpen(false); onSignup(); }}
                  className="font-inter text-sm text-center border border-white/20 text-white rounded-full px-5 py-3"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => { setOpen(false); onBookDemo(); }}
                  className="font-inter text-sm font-semibold text-center bg-primary text-[#070b14] rounded-full px-6 py-3"
                >
                  Book a Demo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
