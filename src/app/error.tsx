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
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-apple">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">Application Error</CardTitle>
            <CardDescription>
              We&apos;re sorry, but something went wrong. Please try again or
              contact support if the problem persists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error.message && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-3 text-sm text-red-700 dark:text-red-300 font-mono">
                {error.message}
              </div>
            )}
            <Button onClick={reset} className="w-full rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </body>
    </html>
  );
}
