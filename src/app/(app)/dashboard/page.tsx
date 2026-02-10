"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Target,
  Library,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { NotificationManager } from "@/components/notification-manager";
import { FormMessage } from "@/components/ui/form-message";

interface DashboardData {
  assignments: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    course: { name: string };
    localState: { status: string } | null;
  }>;
  plannedSessions: Array<{
    id: string;
    startAt: string;
    endAt: string;
    assignment: {
      id: string;
      title: string;
      course: { name: string };
    };
  }>;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    urgent: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/canvas/sync", { method: "POST" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMessage({
          type: "error",
          text: result.error ?? "Sync failed. Please verify your Canvas connection.",
        });
        return;
      }

      setSyncMessage({
        type: "success",
        text: `Sync complete: ${result.assignmentsCreated ?? 0} new, ${result.assignmentsUpdated ?? 0} updated assignments.`,
      });
      await fetchDashboard();
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Sync failed.",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  const urgentAssignments = data?.assignments.filter((a) => {
    if (!a.dueAt) return false;
    const daysUntil = differenceInDays(new Date(a.dueAt), new Date());
    return daysUntil <= 3 && daysUntil >= 0;
  }) || [];

  const todaySessions = data?.plannedSessions.filter((s) => {
    const sessionDate = new Date(s.startAt);
    const today = new Date();
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  }) || [];

  return (
    <div className="space-y-8">
      {/* Notification prompt */}
      <NotificationManager />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            className="rounded-xl gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Canvas"}
          </Button>
          {syncMessage && <FormMessage type={syncMessage.type}>{syncMessage.text}</FormMessage>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Assignments",
            value: data?.stats.total || 0,
            icon: BookOpen,
            color: "from-blue-500 to-blue-600",
          },
          {
            label: "Completed",
            value: data?.stats.completed || 0,
            icon: CheckCircle2,
            color: "from-green-500 to-green-600",
          },
          {
            label: "In Progress",
            value: data?.stats.inProgress || 0,
            icon: Target,
            color: "from-orange-500 to-orange-600",
          },
          {
            label: "Urgent",
            value: data?.stats.urgent || 0,
            icon: AlertCircle,
            color: "from-red-500 to-red-600",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Today&apos;s Sessions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your planned work sessions
                </p>
              </div>
            </div>
            <Link
              href="/calendar"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-medium mb-2">
                No sessions planned for today
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Plan work sessions to stay on track.
              </p>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium transition-colors"
              >
                Plan a session <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/assignments/${session.assignment.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {session.assignment.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.assignment.course.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(session.startAt), "h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.endAt), "h:mm a")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Urgent Assignments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Urgent Assignments
                </h2>
                <p className="text-sm text-muted-foreground">Due within 3 days</p>
              </div>
            </div>
            <Link
              href="/assignments"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {urgentAssignments.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-foreground font-medium mb-2">
                All caught up!
              </p>
              <p className="text-sm text-muted-foreground">
                No urgent assignments due in the next 3 days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentAssignments.slice(0, 5).map((assignment) => {
                const daysLeft = assignment.dueAt
                  ? differenceInDays(new Date(assignment.dueAt), new Date())
                  : null;

                return (
                  <Link
                    key={assignment.id}
                    href={`/assignments/${assignment.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        daysLeft === 0
                          ? "bg-red-500"
                          : daysLeft === 1
                          ? "bg-orange-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {assignment.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.course.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          daysLeft === 0
                            ? "text-red-500"
                            : daysLeft === 1
                            ? "text-orange-500"
                            : "text-yellow-600"
                        }`}
                      >
                        {daysLeft === 0
                          ? "Today"
                          : daysLeft === 1
                          ? "Tomorrow"
                          : `${daysLeft} days`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.dueAt
                          ? format(new Date(assignment.dueAt), "MMM d")
                          : "-"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: "Classes",
            description: "View courses and syllabi",
            href: "/classes",
            icon: Library,
            color: "from-indigo-500 to-blue-500",
          },
          {
            title: "Assignments",
            description: "See your complete assignment list",
            href: "/assignments",
            icon: BookOpen,
            color: "from-blue-500 to-cyan-500",
          },
          {
            title: "Calendar",
            description: "Plan and manage your sessions",
            href: "/calendar",
            icon: Calendar,
            color: "from-purple-500 to-pink-500",
          },
          {
            title: "Settings",
            description: "Canvas and preferences",
            href: "/settings",
            icon: Target,
            color: "from-green-500 to-emerald-500",
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all hover:shadow-lg"
          >
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
            >
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">{action.title}</p>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
