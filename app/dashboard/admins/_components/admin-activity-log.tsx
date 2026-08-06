"use client";

import * as React from "react";
import useSWR from "swr";
import { HistoryIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
  target: { id: string; name: string; email: string } | null;
  metadata: Record<string, unknown> | null;
};

type AuditResponse = {
  data: AuditEntry[];
  nextCursor: string | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to load activity log");
  }
  return res.json() as Promise<AuditResponse>;
};

function formatAction(action: string): string {
  switch (action) {
    case "INVITE":
      return "Invited";
    case "UPDATE":
      return "Updated";
    case "DEACTIVATE":
      return "Deactivated";
    case "REACTIVATE":
      return "Reactivated";
    case "RESET_PASSWORD":
      return "Reset password";
    case "DELETE":
      return "Deleted";
    default:
      return action;
  }
}

export function AdminActivityLog() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AuditResponse>(
    "/api/admin-audit-log",
    fetcher,
    { revalidateOnFocus: false },
  );

  const entries = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4" />
          <CardTitle className="text-base">Admin activity log</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isValidating}
        >
          <RefreshCwIcon
            className={isValidating ? "size-4 animate-spin" : "size-4"}
          />
          <span className="hidden lg:inline">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message ?? "Failed to load activity log."}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No admin activity yet. Invites, updates, and resets will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatAction(entry.action)}</Badge>
                    <span className="font-medium">
                      {entry.actor?.name ?? "Unknown actor"}
                    </span>
                    {entry.target ? (
                      <>
                        <span className="text-muted-foreground">on</span>
                        <span className="font-medium">{entry.target.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.target.email}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {entry.metadata ? (
                    <code className="mt-1 max-w-full overflow-hidden text-ellipsis text-xs text-muted-foreground">
                      {JSON.stringify(entry.metadata)}
                    </code>
                  ) : null}
                </div>
                <time className="text-xs text-muted-foreground sm:text-right">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}