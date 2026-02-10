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
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass border-0 rounded-2xl shadow-apple">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            We encountered an error loading this page. Please try again.
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
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl gap-2">
                <Home className="w-4 h-4" />
                Go home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
