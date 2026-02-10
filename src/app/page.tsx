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
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-foreground">Assignment Copilot</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              Powered by AI • Built for Students
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6"
            >
              Your Academic{" "}
              <span className="text-gradient-vibrant">Co-Pilot</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Plan, track, and get AI help on your assignments. Sync with Canvas,
              auto-schedule work sessions, and learn smarter.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/login"
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all"
              >
                Learn More
              </Link>
            </motion.div>

            {/* Hero Image / Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-16 relative"
            >
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30" />
                <div className="relative glass rounded-3xl p-2 shadow-2xl">
                  <div className="bg-background rounded-2xl overflow-hidden aspect-[16/10]">
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-background p-8 flex items-center justify-center">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <GraduationCap className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-foreground">Assignment Copilot</h3>
                            <p className="text-sm text-muted-foreground">Dashboard Preview</p>
                          </div>
                        </div>
                        <div className="flex gap-4 justify-center">
                          <div className="w-32 h-24 rounded-xl bg-card shadow-sm" />
                          <div className="w-32 h-24 rounded-xl bg-card shadow-sm" />
                          <div className="w-32 h-24 rounded-xl bg-card shadow-sm hidden sm:block" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to{" "}
              <span className="text-gradient">excel</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools designed specifically for students to manage
              their academic workload with ease.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.color} rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500`} />
                <div className="relative glass rounded-2xl p-6 hover-lift">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and take control of your academic life.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Canvas",
                description: "Link your Belmont Canvas account to automatically sync courses and assignments.",
              },
              {
                step: "02",
                title: "Set Your Schedule",
                description: "Import your availability or let us help you find the best times to study.",
              },
              {
                step: "03",
                title: "Stay on Track",
                description: "Get AI-powered assistance and track your progress effortlessly.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-gradient mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative px-8 py-16 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Sync Canvas, plan work sessions, and get AI help on assignments—
                all in one place.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-foreground font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Assignment Copilot</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Assignment Copilot. Built for Belmont University students.
          </p>
        </div>
      </footer>
    </div>
  );
}
