"use client";

import * as React from "react";
import {
  PlaneLandingIcon,
  PlaneTakeoffIcon,
  UsersIcon,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import { ArrivalsList } from "./_components/arrivals-list";
import { DeparturesList } from "./_components/departures-list";
import { InHouseList } from "./_components/in-house-list";

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function FrontdeskPage() {
  const [date, setDate] = React.useState<string>(toIsoDate(new Date()));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <BackButton href="/dashboard" label="Back to Dashboard" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Front Desk</h1>
            <p className="text-sm text-muted-foreground">
              Manage guest arrivals, departures, and in-house operations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i - 3);
                  const iso = toIsoDate(d);
                  return (
                    <SelectItem key={iso} value={iso}>
                      {d.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="arrivals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="arrivals" className="gap-2">
            <PlaneLandingIcon className="size-4" />
            Arrivals
          </TabsTrigger>
          <TabsTrigger value="in-house" className="gap-2">
            <UsersIcon className="size-4" />
            In-House
          </TabsTrigger>
          <TabsTrigger value="departures" className="gap-2">
            <PlaneTakeoffIcon className="size-4" />
            Departures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="mt-6">
          <ArrivalsList date={date} />
        </TabsContent>

        <TabsContent value="in-house" className="mt-6">
          <InHouseList />
        </TabsContent>

        <TabsContent value="departures" className="mt-6">
          <DeparturesList date={date} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
