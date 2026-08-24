"use client";

import * as React from "react";
import { CalendarDaysIcon, LogInIcon, LogOutIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarSummary } from "@/app/actions/calendar";

export function KpiStrip({
  summary,
  loading,
}: {
  summary: CalendarSummary | null;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KpiCard
        loading={loading}
        title="Today's occupancy"
        icon={<CalendarDaysIcon className="size-4" />}
        primary={
          summary
            ? `${summary.occupiedToday} / ${summary.totalRooms}`
            : "—"
        }
        secondary={
          summary
            ? `${summary.availableToday} available · ${summary.outOfServiceToday} out of service`
            : "Loading…"
        }
      />
      <KpiCard
        loading={loading}
        title="Arrivals today"
        icon={<LogInIcon className="size-4" />}
        primary={summary ? String(summary.arrivalsToday) : "—"}
        secondary="Guests checking in"
      />
      <KpiCard
        loading={loading}
        title="Departures today"
        icon={<LogOutIcon className="size-4" />}
        primary={summary ? String(summary.departuresToday) : "—"}
        secondary="Guests checking out"
      />
    </div>
  );
}

function KpiCard({
  title,
  primary,
  secondary,
  icon,
  loading,
}: {
  title: string;
  primary: string;
  secondary: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 text-xs uppercase tracking-wide">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {loading ? <Skeleton className="h-7 w-20" /> : primary}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-3 w-40" />
        ) : (
          <p className="text-xs text-muted-foreground">{secondary}</p>
        )}
      </CardContent>
    </Card>
  );
}