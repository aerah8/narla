"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckSquare, Receipt, Package, ShoppingCart, Sparkles,
  Menu, X, ArrowRight, Users, Zap, ChevronDown,
} from "lucide-react";
import { ParticleField } from "./ParticleField";

const navLinks = [
  { label: "Features",     href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Our Mission",  href: "#mission" },
  { label: "About Us",     href: "#about" },
];

const features = [
  {
    icon: CheckSquare,
    title: "Chores",
    desc: "Auto-rotating assignments, overdue tracking, and fair workload balancing across everyone in your home.",
    gradientFrom: "rgba(139,92,246,0.18)",
    glow: "hover:shadow-[0_0_35px_rgba(139,92,246,0.2)]",
  },
  {
    icon: Receipt,
    title: "Bills",
    desc: "Split expenses fairly, scan receipts with AI, and track who has paid what. No spreadsheets needed.",
    gradientFrom: "rgba(236,72,153,0.18)",
    glow: "hover:shadow-[0_0_35px_rgba(236,72,153,0.2)]",
  },
  {
    icon: Package,
    title: "Inventory",
    desc: "Smart pantry tracking that learns what you run through fastest and alerts you before you run out.",
    gradientFrom: "rgba(249,115,22,0.18)",
    glow: "hover:shadow-[0_0_35px_rgba(249,115,22,0.2)]",
  },
  {
    icon: ShoppingCart,
    title: "Groceries",
    desc: "A living shared shopping list that syncs across all roommates in real time.",
    gradientFrom: "rgba(16,185,129,0.18)",
    glow: "hover:shadow-[0_0_35px_rgba(16,185,129,0.2)]",
  },
  {
    icon: Sparkles,
    title: "AI Insights",
    desc: "Claude-powered intelligence that surfaces spending patterns, workload gaps, and personalised suggestions.",
    gradientFrom: "rgba(99,102,241,0.18)",
    glow: "hover:shadow-[0_0_35px_rgba(99,102,241,0.2)]",
  },
];

const steps = [
  {
    num: "01",
    title: "Create a household",
    desc: "Sign up in seconds, create your household, then share a simple invite code with your roommates.",
    icon: Users,
  },
  {
    num: "02",
    title: "Add your home",
    desc: "Set up chores, add shared bills, track your pantry inventory, and build your grocery list together.",
    icon: Package,
  },
  {
    num: "03",
    title: "Let narla think",
    desc: "Our AI surfaces insights, catches imbalances, and keeps the whole household in sync. Automatically.",
    icon: Sparkles,
  },
];

const orbitIcons = [
  { Icon: CheckSquare, label: "Chores",    color: "#8b5cf6" },
  { Icon: Receipt,     label: "Bills",     color: "#ec4899" },
  { Icon: Package,     label: "Inventory", color: "#f97316" },
  { Icon: ShoppingCart,label: "Groceries", color: "#10b981" },
  { Icon: Sparkles,    label: "AI",        color: "#6366f1" },
];

const innerDots = ["#ec4899", "#8b5cf6", "#f97316"];

const OUTER_R   = 185;
const INNER_R   = 112;
const ORBIT_DUR = 28;
const INNER_DUR = 18;

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".landing-fade");

    const reveal = (el: HTMLElement) => el.classList.add("is-visible");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      // Trigger as soon as 1px enters viewport (threshold 0),
      // but only once the element is at least 60px past the bottom edge
      { threshold: 0, rootMargin: "0px 0px -60px 0px" }
    );

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyVisible) {
        // Delay slightly so browser renders opacity:0 first, then animates in
        setTimeout(() => reveal(el), 200);
      } else {
        observer.observe(el);
      }
    });

    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090e] text-white overflow-x-hidden">
      {/* ── Animated background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#09090e]">
        <div className="narla-blob-orange" />
        <div className="narla-blob-purple" />
        {/* Extra ambient glow layers for richer vibrancy */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 5% 90%, rgba(180,55,10,0.55) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 95% 10%, rgba(110,18,145,0.5) 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 50% 50%, rgba(140,30,10,0.15) 0%, transparent 65%)",
          }}
        />
      </div>
      <ParticleField />

      {/* ══════════════════════════════════ NAV ══════════════════════════════════ */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "bg-black/50 backdrop-blur-xl border-b border-white/10 shadow-xl" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <Link href="/" className="flex-shrink-0">
            <Image src="/narla-logo.png" alt="narla" width={110} height={55} className="w-auto h-10" priority />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="px-4 py-1.5 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden md:block px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-white/65 text-white shadow-[0_0_14px_rgba(255,255,255,0.18)] hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_28px_rgba(255,255,255,0.38)] transition-all duration-300"
            >
              Get Started
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-black/80 backdrop-blur-xl border-b border-white/10">
            <div className="px-6 py-4 space-y-1">
              {navLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  {label}
                </a>
              ))}
              <Link
                href="/sign-in"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                Log In
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════ HERO ══════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-[calc(100vh-64px)] flex items-center"
      >
        <div className="max-w-6xl mx-auto px-6 py-24 w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div className="landing-fade">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-xs font-medium text-white/70 mb-7">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              AI-powered household management
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Smarter<br />
              <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                Shared Living,
              </span>
              <br />Simplified.
            </h1>
            <p className="text-lg text-white/55 leading-relaxed mb-9 max-w-md">
              narla is the AI-powered apartment co-pilot that keeps your household in sync: chores, bills, inventory, groceries, and more.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/65 text-white text-sm font-semibold shadow-[0_0_18px_rgba(255,255,255,0.18)] hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_35px_rgba(255,255,255,0.42)] transition-all duration-300"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/80 text-sm font-medium hover:bg-white/10 transition-all"
              >
                Log In
              </Link>
            </div>
          </div>

          {/* Right: Orbital visualization */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-[420px] h-[420px]">
              {/* Outer decorative ring */}
              <div className="absolute inset-0 rounded-full border border-white/10" />
              {/* Inner decorative ring */}
              <div className="absolute inset-[80px] rounded-full border border-white/[0.07]" />

              {/* Center glow + logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[116px] h-[116px] rounded-full bg-white/5 border border-white/15 backdrop-blur flex items-center justify-center shadow-[0_0_70px_rgba(165,45,10,0.4),0_0_70px_rgba(100,15,130,0.3)]">
                  <Image src="/narla-logo.png" alt="narla" width={80} height={40} className="w-auto h-9" />
                </div>
              </div>

              {/* Outer orbit — 5 feature icons */}
              {orbitIcons.map(({ Icon, label, color }, i) => {
                const delay = -((i / orbitIcons.length) * ORBIT_DUR);
                return (
                  <div
                    key={label}
                    className="absolute left-1/2 top-1/2 w-0 h-0"
                    style={{
                      animation: `orbit-spin ${ORBIT_DUR}s linear infinite`,
                      animationDelay: `${delay}s`,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{ left: `${OUTER_R - 20}px`, top: "-20px" }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                        style={{
                          animation: `counter-spin ${ORBIT_DUR}s linear infinite`,
                          animationDelay: `${delay}s`,
                          boxShadow: `0 0 18px ${color}50`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Inner orbit — 3 glowing dots (counter-clockwise) */}
              {innerDots.map((color, i) => {
                const delay = -((i / innerDots.length) * INNER_DUR);
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 w-0 h-0"
                    style={{
                      animation: `counter-spin ${INNER_DUR}s linear infinite`,
                      animationDelay: `${delay}s`,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{ left: `${INNER_R - 6}px`, top: "-6px" }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 12px ${color}`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25 pointer-events-none">
          <span className="text-xs tracking-widest uppercase">scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ══════════════════════════════ FEATURES ══════════════════════════════ */}
      <section id="features" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 landing-fade">
            <p className="text-sm font-medium text-pink-400 mb-3 uppercase tracking-widest">Features</p>
            <h2 className="text-4xl font-bold text-white mb-4">Everything your household needs</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Five powerful modules, one seamless experience. Built for the way modern roommates actually live.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, gradientFrom, glow }, i) => (
              <div
                key={title}
                className={`landing-fade group relative p-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden transition-all duration-300 cursor-default ${glow}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {/* Hover gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at top left, ${gradientFrom}, transparent 70%)` }}
                />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════════ */}
      <section id="how-it-works" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 landing-fade">
            <p className="text-sm font-medium text-violet-400 mb-3 uppercase tracking-widest">How it Works</p>
            <h2 className="text-4xl font-bold text-white mb-4">Up and running in minutes</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Getting your household on narla takes less time than writing a group chat message.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line — desktop */}
            <div className="hidden lg:block absolute top-10 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {steps.map(({ num, title, desc, icon: Icon }, i) => (
                <div
                  key={num}
                  className="landing-fade flex flex-col items-center text-center"
                  style={{ transitionDelay: `${i * 0.12}s` }}
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white/70" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <span className="text-[10px] font-bold text-white">{num}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed max-w-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ OUR MISSION ═══════════════════════════════ */}
      <section id="mission" className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.025]" />
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-20"
            style={{
              background: "radial-gradient(ellipse, rgba(165,45,10,0.6) 0%, rgba(100,15,130,0.5) 50%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="landing-fade">
            <p className="text-sm font-medium text-orange-400 mb-6 uppercase tracking-widest">Our Mission</p>
            <blockquote className="text-3xl lg:text-4xl font-semibold text-white leading-snug mb-8">
              "We built narla because shared living<br className="hidden lg:block" />
              <span className="text-white/55"> shouldn't feel like a second job."</span>
            </blockquote>
            <p className="text-white/50 text-lg leading-relaxed max-w-2xl mx-auto">
              Managing a shared apartment is full of friction: forgotten chores, split bills that never get settled,
              fridges full of mystery food. narla was built to remove that friction entirely, using AI to keep
              everyone aligned without the awkward conversations.
            </p>
          </div>

          <div
            className="grid grid-cols-3 gap-4 mt-14 landing-fade"
            style={{ transitionDelay: "0.2s" }}
          >
            {[
              { value: "5",  label: "Core modules" },
              { value: "AI", label: "Powered by Claude" },
              { value: "∞",  label: "Shared living, simplified" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="p-6 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-sm"
              >
                <p className="text-4xl font-bold text-white mb-1">{value}</p>
                <p className="text-sm text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ ABOUT US ══════════════════════════════════ */}
      <section id="about" className="py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="landing-fade">
              <p className="text-sm font-medium text-emerald-400 mb-3 uppercase tracking-widest">About Us</p>
              <h2 className="text-4xl font-bold text-white mb-6">Built with purpose</h2>
              <p className="text-white/60 text-lg leading-relaxed mb-5">
                narla was born out of a real problem. As students sharing apartments, we experienced firsthand how
                messy shared living can get: unpaid bills, uneven chores, and the constant mental overhead of
                coordinating with roommates.
              </p>
              <p className="text-white/45 leading-relaxed">
                We're a mission-driven startup combining real-time collaboration technology with AI to build the
                operating system for modern shared living. narla isn't just an app. It's a commitment to making
                co-habitation actually enjoyable.
              </p>
            </div>

            <div className="landing-fade grid grid-cols-2 gap-4" style={{ transitionDelay: "0.15s" }}>
              {[
                { icon: Sparkles,    title: "AI at the core",      desc: "Every feature is enhanced by Claude, Anthropic's AI." },
                { icon: Zap,         title: "Real-time sync",       desc: "All data updates instantly across every device in your home." },
                { icon: Users,       title: "Built for roommates",  desc: "Designed from day one for the multi-person living experience." },
                { icon: CheckSquare, title: "5 core modules",       desc: "Chores, bills, inventory, groceries, and AI insights in one place." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.07] transition-colors">
                  <Icon className="w-5 h-5 text-white/50 mb-3" />
                  <p className="font-medium text-white text-sm mb-1">{title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ CTA BAND ══════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center landing-fade">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to simplify your home?
          </h2>
          <p className="text-white/50 text-lg mb-9">
            Join narla and transform the way your household works together.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-white/65 text-white text-base font-semibold shadow-[0_0_22px_rgba(255,255,255,0.18)] hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_42px_rgba(255,255,255,0.42)] transition-all duration-300"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════ FOOTER ════════════════════════════════════ */}
      <footer className="border-t border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/narla-logo.png" alt="narla" width={90} height={45} className="w-auto h-8 opacity-50" />
            <span className="text-white/30 text-sm">The apartment co-pilot</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            {navLinks.map(({ label, href }) => (
              <a key={href} href={href} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                {label}
              </a>
            ))}
            <Link href="/sign-in" className="text-sm text-white/30 hover:text-white/60 transition-colors">
              Log In
            </Link>
            <Link href="/sign-up" className="text-sm text-white/30 hover:text-white/60 transition-colors">
              Sign Up
            </Link>
          </div>
          <p className="text-sm text-white/20">© 2025 narla. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
