import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface FormMessageProps {
  type?: "success" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}

export function FormMessage({ type = "info", children, className }: FormMessageProps) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const styles = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-muted-foreground",
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex items-start gap-2 text-sm",
        styles[type],
        className
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
