"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center glass border-0 rounded-2xl shadow-apple">
        <CardHeader>
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full rounded-xl gap-2">
              <Home className="w-4 h-4" />
              Go home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
