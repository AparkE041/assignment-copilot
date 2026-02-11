"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Library,
  Calendar,
  Settings,
  LogOut,
  BarChart3,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", shortLabel: "Classes", icon: Library },
  { href: "/assignments", label: "Assignments", shortLabel: "Tasks", icon: BookOpen },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", shortLabel: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

interface AppNavProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground hidden sm:block">
              Assignment Copilot
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50">
              <Avatar size="default" className="shadow-sm">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback>
                  {user.name?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground font-medium">
                {user.name || user.email}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden -mx-4 px-3 border-t border-border bg-background/85 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-1 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-medium transition-all active:scale-95 ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="truncate w-full text-center">{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
