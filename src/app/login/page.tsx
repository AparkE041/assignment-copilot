"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Github,
  Chrome,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

type OAuthProvider = {
  id: string;
  name: string;
};

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [twoFactorManualKey, setTwoFactorManualKey] = useState("");
  const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState("");
  const [isPreparingTwoFactor, setIsPreparingTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const router = useRouter();

  useEffect(() => {
    getProviders()
      .then((providers) => {
        const list = Object.values(providers ?? {})
          .filter((provider) => provider.id !== "credentials")
          .map((provider) => ({ id: provider.id, name: provider.name }));
        setOauthProviders(list);
      })
      .catch(() => setOauthProviders([]));
  }, []);

  const prepareTwoFactorSetup = useCallback(async (emailForSetup: string) => {
    setIsPreparingTwoFactor(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForSetup.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate 2FA setup.");
      }

      setTwoFactorSecret(typeof data.secret === "string" ? data.secret : "");
      setTwoFactorManualKey(
        typeof data.manualEntryKey === "string" ? data.manualEntryKey : ""
      );
      setTwoFactorOtpAuthUrl(
        typeof data.otpauthUrl === "string" ? data.otpauthUrl : ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate 2FA setup.");
      setTwoFactorSecret("");
      setTwoFactorManualKey("");
      setTwoFactorOtpAuthUrl("");
    } finally {
      setIsPreparingTwoFactor(false);
    }
  }, []);

  useEffect(() => {
    if (isSignUp && !twoFactorSecret && !isPreparingTwoFactor) {
      void prepareTwoFactorSetup(email);
    }
  }, [email, isPreparingTwoFactor, isSignUp, prepareTwoFactorSetup, twoFactorSecret]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    const normalizedTwoFactorCode = twoFactorCode.replace(/\D/g, "").slice(0, 6);

    if (isSignUp) {
      if (!twoFactorSecret) {
        setError("2FA setup is not ready. Please regenerate and try again.");
        setIsLoading(false);
        return;
      }
      if (normalizedTwoFactorCode.length !== 6) {
        setError("Enter the 6-digit code from your authenticator app.");
        setIsLoading(false);
        return;
      }

      // Register new user
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            twoFactorEnabled: true,
            twoFactorSecret,
            twoFactorCode: normalizedTwoFactorCode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create account");
          setIsLoading(false);
          return;
        }

        setSuccess("Account created! Signing you in...");

        // Auto sign in after registration
        const result = await signIn("credentials", {
          email,
          password,
          twoFactorCode: normalizedTwoFactorCode,
          redirect: false,
        });

        if (result?.error) {
          setError("Account created but sign-in failed. Please try signing in.");
          setIsLoading(false);
          return;
        }

        router.push("/onboarding");
      } catch {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } else {
      // Sign in existing user
      const result = await signIn("credentials", {
        email,
        password,
        twoFactorCode: normalizedTwoFactorCode || undefined,
        redirect: false,
      });

      setIsLoading(false);

      if (result?.error) {
        setError("Invalid email, password, or 2FA code.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleOAuthSignIn(providerId: string) {
    setError(null);
    setSuccess(null);
    setTwoFactorCode("");
    await signIn(providerId, { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Assignment Copilot
              </h1>
              <p className="text-sm text-muted-foreground">
                Your academic companion
              </p>
            </div>
          </Link>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-3xl p-8 shadow-apple-lg">
            {/* Toggle */}
            <div className="flex p-1 bg-secondary rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                  setSuccess(null);
                  setTwoFactorCode("");
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  !isSignUp
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                  setSuccess(null);
                  setTwoFactorCode("");
                  if (!twoFactorSecret) {
                    void prepareTwoFactorSetup(email);
                  }
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isSignUp
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? "signup" : "signin"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-6"
              >
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  {isSignUp ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-muted-foreground">
                  {isSignUp
                    ? "Start your journey to better academic planning"
                    : "Sign in to continue your academic journey"}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required={isSignUp}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isSignUp && (
                <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          2FA Setup (Required)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Scan the QR code with Google Authenticator, 1Password, Authy, or Apple Passwords.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void prepareTwoFactorSetup(email)}
                      disabled={isPreparingTwoFactor}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPreparingTwoFactor ? "animate-spin" : ""}`} />
                      Regenerate
                    </button>
                  </div>

                  {twoFactorOtpAuthUrl && (
                    <div className="flex justify-center">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(twoFactorOtpAuthUrl)}`}
                        alt="2FA QR code"
                        width={180}
                        height={180}
                        className="rounded-xl border border-border bg-white p-2"
                      />
                    </div>
                  )}

                  {twoFactorManualKey && (
                    <p className="text-xs text-muted-foreground break-all">
                      Manual key:{" "}
                      <span className="font-mono text-foreground">{twoFactorManualKey}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={8}
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {isSignUp && "Must be at least 8 characters"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  2FA Code {isSignUp ? "(Required)" : "(if enabled)"}
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) =>
                      setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    required={isSignUp}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {isSignUp
                    ? "Enter the current 6-digit authenticator code to finish signup."
                    : "Only needed if your account has two-factor authentication enabled."}
                </p>
              </div>

              {/* Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={
                  isLoading ||
                  (isSignUp &&
                    (isPreparingTwoFactor ||
                      !twoFactorSecret ||
                      twoFactorCode.replace(/\D/g, "").length !== 6))
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                ) : (
                  <>
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {oauthProviders.length > 0 && (
              <div className="mt-6">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="absolute inset-x-0 h-px bg-border" />
                  <span className="relative px-3 text-xs uppercase tracking-wide text-muted-foreground bg-[color:var(--glass-background)]">
                    Or continue with
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {oauthProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => void handleOAuthSignIn(provider.id)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-white/40 dark:bg-black/20 py-2.5 text-sm font-medium text-foreground hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
                    >
                      {provider.id === "github" ? (
                        <Github className="w-4 h-4" />
                      ) : provider.id === "google" ? (
                        <Chrome className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Continue with {provider.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
