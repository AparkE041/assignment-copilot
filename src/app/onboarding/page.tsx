"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Brain,
  Clock,
  Target,
} from "lucide-react";

const steps = [
  {
    id: "welcome",
    title: "Welcome to Assignment Copilot",
    description: "Your intelligent companion for academic success",
    icon: Sparkles,
  },
  {
    id: "features",
    title: "What you can do",
    description: "Discover powerful features designed for students",
    icon: BookOpen,
  },
  {
    id: "canvas",
    title: "Connect to Canvas",
    description: "Sync your courses and assignments automatically",
    icon: GraduationCap,
  },
  {
    id: "complete",
    title: "You're all set!",
    description: "Start managing your academic life with ease",
    icon: CheckCircle2,
  },
];

const features = [
  {
    icon: Brain,
    title: "AI Assistant",
    description: "Get help understanding assignments without getting answers",
    color: "bg-purple-500",
  },
  {
    icon: Calendar,
    title: "Smart Planning",
    description: "Auto-schedule work sessions around your availability",
    color: "bg-blue-500",
  },
  {
    icon: Clock,
    title: "Reminders",
    description: "Never miss a deadline with smart notifications",
    color: "bg-green-500",
  },
  {
    icon: Target,
    title: "Track Progress",
    description: "Monitor your completion status across all courses",
    color: "bg-orange-500",
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasToken, setCanvasToken] = useState("");
  const router = useRouter();
  const { update } = useSession();

  async function completeOnboarding() {
    setIsLoading(true);
    try {
      // Save Canvas token if provided
      if (canvasToken.trim()) {
        await fetch("/api/canvas/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: canvasToken.trim() }),
        });
      }

      // Mark onboarding as complete
      await fetch("/api/user/onboarded", { method: "POST" });

      // Update session
      await update({ hasOnboarded: true });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 20, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-secondary z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <div className="glass rounded-3xl p-8 md:p-12 shadow-apple-lg">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-8 bg-primary"
                        : index < currentStep
                        ? "bg-primary/50"
                        : "bg-secondary"
                    }`}
                  />
                ))}
              </div>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg"
              >
                <StepIcon className="w-10 h-10 text-white" />
              </motion.div>

              {/* Title & Description */}
              <h1 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3">
                {steps[currentStep].title}
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                {steps[currentStep].description}
              </p>

              {/* Step content */}
              <div className="mb-8">
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium mb-6">
                      <Sparkles className="w-4 h-4" />
                      Let&apos;s get you set up in just a few steps
                    </div>
                  </motion.div>
                )}

                {currentStep === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div
                          className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-3`}
                        >
                          <feature.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Canvas Personal Access Token (Optional)
                      </label>
                      <input
                        type="text"
                        value={canvasToken}
                        onChange={(e) => setCanvasToken(e.target.value)}
                        placeholder="Paste your Canvas token here"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        You can skip this and add it later in Settings. To get a token,
                        go to Canvas → Settings → Approved Integrations → New Access Token
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      Skip for now →
                    </button>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to go!
                    </div>
                    <p className="text-muted-foreground">
                      You&apos;ll be redirected to your dashboard where you can start
                      managing your assignments.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    currentStep === 0
                      ? "opacity-0 cursor-default"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>

                <motion.button
                  onClick={nextStep}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                  ) : (
                    <>
                      {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
