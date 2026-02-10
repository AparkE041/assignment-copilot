"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap,
  Brain,
  Calendar,
  Clock,
  Target,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Study Assistant",
    description: "Get guidance on assignments without cheating. Learn better with personalized help.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Auto-plan work sessions around your classes and free time. Never miss a deadline.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Clock,
    title: "Smart Deadlines",
    description: "Track assignment due dates and never miss a deadline with visual countdowns.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Target,
    title: "Progress Tracking",
    description: "Visualize your workload across all courses. Stay on top of your academic game.",
    color: "from-orange-500 to-amber-500",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground text-[15px]">Assignment Copilot</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium tracking-wide uppercase mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered • Built for students
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-5"
            >
              Your academic{" "}
              <span className="text-primary">co-pilot</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Plan, track, and get AI help on your assignments. Sync with Canvas,
              auto-schedule work sessions, and learn smarter.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="px-6 py-3 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Learn more
              </Link>
            </motion.div>

            {/* Hero Preview */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-14"
            >
              <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="aspect-[16/10] bg-muted/30 flex flex-col items-center justify-center gap-6 p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center">
                      <GraduationCap className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Assignment Copilot</p>
                      <p className="text-sm text-muted-foreground">Dashboard</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-28 h-20 rounded-lg bg-background border border-border" />
                    <div className="w-28 h-20 rounded-lg bg-background border border-border" />
                    <div className="w-28 h-20 rounded-lg bg-background border border-border hidden sm:block" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/80">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
              Everything you need to excel
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
              Tools for students to manage coursework, deadlines, and study time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/80">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Get started in minutes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect Canvas",
                description: "Link your Canvas account to sync courses and assignments.",
              },
              {
                step: "2",
                title: "Set your schedule",
                description: "Import availability or use defaults to plan work sessions.",
              },
              {
                step: "3",
                title: "Stay on track",
                description: "Use AI help and track progress in one place.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="text-center"
              >
                <div className="text-2xl font-semibold text-primary mb-3">{item.step}</div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/80">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-muted/30 px-6 py-12"
          >
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Sync Canvas, plan work sessions, and get AI help—all in one place.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground text-sm">Assignment Copilot</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Assignment Copilot. Built for Belmont University students.
          </p>
        </div>
      </footer>
    </div>
  );
}
