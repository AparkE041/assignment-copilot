"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AssignmentErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Assignment detail error:", error);
  }, [error]);

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to assignments
      </Link>

      <Card className="glass border-0 rounded-2xl shadow-apple">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Failed to load assignment</CardTitle>
          <CardDescription>
            We couldn&apos;t load this assignment. It may have been deleted or
            you may not have access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={reset}
              className="flex-1 rounded-xl gap-2"
              variant="default"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
            <Link href="/assignments" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to list
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
