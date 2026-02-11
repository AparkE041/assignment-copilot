"use client";

import { useCallback, useEffect, useMemo, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import type { View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";
import { Sparkles, CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const DnDCalendar = withDragAndDrop(Calendar);
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const VIEW_LABELS: Partial<Record<View, string>> = {
  month: "Month",
  week: "Week",
  day: "Day",
  agenda: "Agenda",
  work_week: "Work Week",
};

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    kind: "session" | "availability";
    sessionId?: string;
    assignmentId?: string;
    courseName?: string;
    completed?: boolean;
    source?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Context to pass toggle function into event component                */
/* ------------------------------------------------------------------ */
const ToggleCtx = createContext<(event: CalendarEvent) => void>(() => {});

/* ------------------------------------------------------------------ */
/* Custom event component with inline complete toggle button           */
/* ------------------------------------------------------------------ */
function EventComponent({ event }: { event: CalendarEvent }) {
  const toggle = useContext(ToggleCtx);
  const isSession = event.resource?.kind === "session";
  const completed = event.resource?.completed;

  if (!isSession) {
    return <span className="truncate">{event.title}</span>;
  }

  return (
    <div className="flex items-center gap-1 w-full min-w-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          toggle(event);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
          completed
            ? "bg-white/90 border-white/90"
            : "border-white/60 hover:border-white hover:bg-white/20"
        }`}
        title={completed ? "Mark incomplete" : "Mark complete"}
      >
        {completed && <Check className="w-3 h-3 text-green-600" />}
      </button>
      <span className="truncate">{event.title}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Custom toolbar – matches app buttons and spacing                    */
/* ------------------------------------------------------------------ */
function CalendarToolbar({
  label,
  view,
  views,
  onNavigate,
  onView,
}: {
  label: string;
  view: View;
  views: View[];
  onNavigate: (action: string) => void;
  onView: (view: View) => void;
}) {
  const viewList = views.length > 0 ? views : (["month", "week", "day", "agenda"] as View[]);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => onNavigate("PREV")}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl px-4 font-semibold text-foreground min-w-[140px]"
          onClick={() => onNavigate("TODAY")}
        >
          {label}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => onNavigate("NEXT")}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
        {viewList.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/80"
            }`}
          >
            {VIEW_LABELS[v] ?? v}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CalendarView({
  events: initialEvents,
  availabilityEvents = [],
  emptyState,
}: {
  events: CalendarEvent[];
  availabilityEvents?: CalendarEvent[];
  emptyState?: {
    title: string;
    description: string;
    ctaHref: string;
    ctaLabel: string;
  } | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  /* ---- toggle session complete ---- */
  const toggleComplete = useCallback(
    async (event: CalendarEvent) => {
      if (!event.resource || event.resource.kind !== "session" || !event.resource.sessionId) {
        return;
      }
      const sessionId = event.resource?.sessionId ?? event.id;
      const newCompleted = !event.resource?.completed;
      setError(null);

      // Optimistic update
      setEvents((previousEvents) => {
        const nextEvents = previousEvents.map((e) =>
          e.id === event.id
            ? { ...e, resource: { ...e.resource!, completed: newCompleted } }
            : e
        );

        void fetch(`/api/plan/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: newCompleted }),
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error("Failed to update session status.");
            }
          })
          .catch((err) => {
            setEvents(previousEvents);
            setError(err instanceof Error ? err.message : "Failed to update session status.");
          });

        return nextEvents;
      });
    },
    [],
  );

  /* ---- drag-and-drop reschedule ---- */
  const handleEventDrop = useCallback(
    async (args: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
      const e = args.event;
      if (!e.resource || e.resource.kind !== "session" || !e.resource.sessionId) return;
      const start = typeof args.start === "string" ? new Date(args.start) : args.start;
      const end = typeof args.end === "string" ? new Date(args.end) : args.end;
      const sessionId = e.resource?.sessionId ?? e.id;
      setError(null);

      const previousEvents = events;
      setEvents((prev) =>
        prev.map((event) =>
          event.id === e.id
            ? { ...event, start, end }
            : event
        )
      );

      const res = await fetch(`/api/plan/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString() }),
      });
      if (!res.ok) {
        setEvents(previousEvents);
        setError("Failed to reschedule session.");
        return;
      }
      router.refresh();
    },
    [events, router],
  );

  /* ---- click → open assignment ---- */
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (!event.resource || event.resource.kind !== "session") return;
      const assignmentId = event.resource?.assignmentId;
      if (assignmentId) {
        router.push(`/assignments/${assignmentId}`);
      }
    },
    [router],
  );

  /* ---- custom event styling ---- */
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    if (event.resource?.kind !== "session") {
      return {
        className: "rbc-event--availability",
        style: { cursor: "default" } as React.CSSProperties,
      };
    }
    const completed = event.resource?.completed;
    return {
      className: completed ? "rbc-event--completed" : "",
      style: { cursor: "pointer" } as React.CSSProperties,
    };
  }, []);

  /* ---- custom tooltip ---- */
  const tooltipAccessor = useCallback(
    (event: CalendarEvent) => {
      if (event.resource?.kind === "availability") {
        const time = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;
        return `Busy\n${time}`;
      }
      const course = event.resource?.courseName ?? "";
      const time = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;
      const status = event.resource?.completed ? "Completed" : "Scheduled";
      return `${event.title}${course ? `\n${course}` : ""}\n${time}\n${status}`;
    },
    [],
  );

  /* ---- formats ---- */
  const formats = useMemo(
    () => ({
      eventTimeRangeFormat: () => "",
      dayHeaderFormat: "EEEE, MMMM d",
      dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
    }),
    [],
  );

  const components = useMemo(
    () => ({
      toolbar: CalendarToolbar,
      event: EventComponent,
    }),
    [],
  );

  /* ---- empty state ---- */
  if (events.length === 0 && availabilityEvents.length === 0) {
    return (
      <div className="glass rounded-2xl shadow-apple border-0 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 flex items-center justify-center mb-5 shadow-apple">
            <CalendarDays className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
            {emptyState?.title ?? "No work sessions yet"}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
            {emptyState?.description ??
              "Use Draft auto-plan above to schedule work across your available days. Sync Canvas first so assignments with due dates are available."}
          </p>
          <Link href={emptyState?.ctaHref ?? "/dashboard"}>
            <Button variant="outline" className="rounded-xl gap-2">
              <Sparkles className="w-4 h-4" />
              {emptyState?.ctaLabel ?? "Go to Dashboard"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ToggleCtx.Provider value={toggleComplete}>
      <div className="glass rounded-2xl shadow-apple overflow-hidden border-0 hover:shadow-apple-lg transition-shadow">
        {error && (
          <div className="px-4 pt-4">
            <FormMessage type="error">{error}</FormMessage>
          </div>
        )}
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border/50 text-xs text-muted-foreground">
            <span>Click event to open assignment, check to complete, drag to reschedule</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary shrink-0" />
                Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-cyan-400/80 shrink-0" />
                Busy
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500 shrink-0" />
                Completed
              </span>
            </div>
        </div>

        <div className="h-[680px] min-h-[420px] px-4 pb-4 [&_.rbc-toolbar]:!flex [&_.rbc-toolbar]:!flex-wrap [&_.rbc-toolbar]:!gap-3 [&_.rbc-toolbar]:!py-3 [&_.rbc-toolbar]:!px-0 [&_.rbc-toolbar]:!border-0 [&_.rbc-toolbar]:!mb-0">
          {/* @ts-expect-error react-big-calendar types don't match drag-and-drop wrapper */}
          <DnDCalendar
            localizer={localizer}
            events={events}
            backgroundEvents={availabilityEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onEventDrop={handleEventDrop}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            backgroundEventPropGetter={() => ({
              className: "rbc-availability-bg",
            })}
            tooltipAccessor={tooltipAccessor}
            formats={formats}
            components={components}
            views={["month", "week", "day", "agenda"]}
            defaultView="week"
            step={30}
            timeslots={2}
            scrollToTime={new Date(1970, 0, 1, 8, 0, 0)}
            draggableAccessor={(event: CalendarEvent) => event.resource?.kind === "session"}
            resizable
            popup
            selectable={false}
          />
        </div>
      </div>
    </ToggleCtx.Provider>
  );
}
