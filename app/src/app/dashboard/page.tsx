"use client";

import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          loading console…
        </div>
      }
    >
      <DashboardShell />
    </Suspense>
  );
}
