"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  BookOpen,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface AnalyticsData {
  weeklyData: { week: string; plannedMinutes: number; completedMinutes: number }[];
  thisWeek: {
    plannedMinutes: number;
    completedMinutes: number;
    sessionsCount: number;
    completedCount: number;
  };
  statusCounts: { not_started: number; in_progress: number; done: number };
  upcomingAssignments: {
    id: string;
    title: string;
    courseName: string;
    dueAt: string | null;
    status: string;
  }[];
  courseBreakdown: { name: string; total: number; completed: number; effort: number }[];
  totals: {
    assignments: number;
    plannedHours: number;
    completedHours: number;
    completionRate: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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

  if (!data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Failed to load analytics.
      </div>
    );
  }

  const maxWeeklyMinutes = Math.max(
    ...data.weeklyData.map((w) => Math.max(w.plannedMinutes, w.completedMinutes)),
    60,
  );

  const totalAssignments =
    data.statusCounts.not_started + data.statusCounts.in_progress + data.statusCounts.done;
  const completionPct =
    totalAssignments > 0
      ? Math.round((data.statusCounts.done / totalAssignments) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track your study progress and habits</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Planned",
            value: `${data.totals.plannedHours}h`,
            icon: Clock,
            color: "from-blue-500 to-blue-600",
          },
          {
            label: "Completed Study",
            value: `${data.totals.completedHours}h`,
            icon: CheckCircle2,
            color: "from-green-500 to-green-600",
          },
          {
            label: "Session Rate",
            value: `${data.totals.completionRate}%`,
            icon: TrendingUp,
            color: "from-purple-500 to-purple-600",
          },
          {
            label: "Assignments Done",
            value: `${data.statusCounts.done}/${totalAssignments}`,
            icon: Target,
            color: "from-orange-500 to-orange-600",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Study Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Weekly Study Hours</h2>
              <p className="text-sm text-muted-foreground">Last 4 weeks</p>
            </div>
          </div>

          <div className="space-y-4">
            {data.weeklyData.map((week) => (
              <div key={week.week} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{week.week}</span>
                  <span className="text-foreground font-medium">
                    {Math.round(week.completedMinutes / 60 * 10) / 10}h /
                    {" "}{Math.round(week.plannedMinutes / 60 * 10) / 10}h
                  </span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="h-full bg-green-500 rounded-l-full transition-all duration-500"
                      style={{
                        width: `${(week.completedMinutes / maxWeeklyMinutes) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-blue-500/30 transition-all duration-500"
                      style={{
                        width: `${((week.plannedMinutes - week.completedMinutes) / maxWeeklyMinutes) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500/30 inline-block" />
              Remaining
            </span>
          </div>
        </motion.div>

        {/* Assignment Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Assignment Progress</h2>
              <p className="text-sm text-muted-foreground">{completionPct}% complete</p>
            </div>
          </div>

          {/* Progress ring */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-secondary"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(completionPct / 100) * 352} 352`}
                  strokeLinecap="round"
                  className="text-green-500 transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{completionPct}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: "Not Started", count: data.statusCounts.not_started, color: "bg-muted-foreground" },
              { label: "In Progress", count: data.statusCounts.in_progress, color: "bg-yellow-500" },
              { label: "Done", count: data.statusCounts.done, color: "bg-green-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-muted-foreground">{item.label}</span>
                </span>
                <span className="font-medium text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Course Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">By Course</h2>
              <p className="text-sm text-muted-foreground">Assignments per course</p>
            </div>
          </div>

          {data.courseBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No courses yet. Sync Canvas to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {data.courseBreakdown.map((course) => {
                const pct = course.total > 0 ? Math.round((course.completed / course.total) * 100) : 0;
                return (
                  <div key={course.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium truncate">{course.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {course.completed}/{course.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {course.effort > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ~{Math.round(course.effort / 60 * 10) / 10}h estimated effort
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Upcoming Workload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Upcoming (7 days)</h2>
                <p className="text-sm text-muted-foreground">
                  {data.upcomingAssignments.length} assignments
                </p>
              </div>
            </div>
          </div>

          {data.upcomingAssignments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nothing due in the next 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.upcomingAssignments.map((a) => {
                const daysLeft = a.dueAt ? differenceInDays(new Date(a.dueAt), new Date()) : null;
                return (
                  <Link
                    key={a.id}
                    href={`/assignments/${a.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.courseName}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p
                        className={`text-xs font-medium ${
                          daysLeft === 0
                            ? "text-red-500"
                            : daysLeft === 1
                              ? "text-orange-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {daysLeft === 0
                          ? "Today"
                          : daysLeft === 1
                            ? "Tomorrow"
                            : `${daysLeft}d`}
                      </p>
                      {a.dueAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.dueAt), "MMM d")}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-2 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* This Week Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">This Week Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {Math.round(data.thisWeek.plannedMinutes / 60 * 10) / 10}h
            </p>
            <p className="text-sm text-muted-foreground">Planned</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Math.round(data.thisWeek.completedMinutes / 60 * 10) / 10}h
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{data.thisWeek.sessionsCount}</p>
            <p className="text-sm text-muted-foreground">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {data.thisWeek.sessionsCount > 0
                ? Math.round(
                    (data.thisWeek.completedCount / data.thisWeek.sessionsCount) * 100,
                  )
                : 0}
              %
            </p>
            <p className="text-sm text-muted-foreground">Follow-through</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
