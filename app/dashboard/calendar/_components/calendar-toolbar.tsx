"use client";

import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CalendarRoomType } from "@/app/actions/calendar";

export type CalendarFilters = {
  roomTypeId: string | "ALL";
  floor: string | "ALL";
};

export function CalendarToolbar({
  fromIso,
  weekEndIso,
  filters,
  roomTypes,
  floors,
  onChangeFrom,
  onChangeFilters,
  onRefresh,
  refreshing,
}: {
  fromIso: string;
  weekEndIso: string;
  filters: CalendarFilters;
  roomTypes: CalendarRoomType[];
  floors: number[];
  onChangeFrom: (next: string) => void;
  onChangeFilters: (next: CalendarFilters) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const fromDate = parseIso(fromIso);
  const endDate = parseIso(weekEndIso);

  const goPrev = () => {
    const next = new Date(fromDate);
    next.setUTCDate(next.getUTCDate() - 7);
    onChangeFrom(toIsoDate(next));
  };
  const goNext = () => {
    const next = new Date(fromDate);
    next.setUTCDate(next.getUTCDate() + 7);
    onChangeFrom(toIsoDate(next));
  };
  const goToday = () => {
    onChangeFrom(toIsoDate(new Date()));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous week"
          onClick={goPrev}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goToday}
          className="px-2 text-xs"
        >
          Today
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next week"
          onClick={goNext}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div className="text-sm font-medium">
        Week of {formatRange(fromDate, endDate)}
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Select
        value={filters.roomTypeId}
        onValueChange={(value) =>
          onChangeFilters({ ...filters, roomTypeId: value })
        }
      >
        <SelectTrigger size="sm" className="min-w-40">
          <SelectValue placeholder="Room type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ALL">All room types</SelectItem>
            {roomTypes.map((roomType) => (
              <SelectItem key={roomType.id} value={roomType.id}>
                {roomType.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={filters.floor}
        onValueChange={(value) => onChangeFilters({ ...filters, floor: value })}
      >
        <SelectTrigger size="sm" className="min-w-32">
          <SelectValue placeholder="Floor" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ALL">All floors</SelectItem>
            {floors.map((floor) => (
              <SelectItem key={floor} value={String(floor)}>
                Floor {floor}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="ml-auto"
      >
        <RefreshCwIcon
          className={refreshing ? "size-4 animate-spin" : "size-4"}
        />
        Refresh
      </Button>
    </div>
  );
}

function parseIso(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRange(from: Date, to: Date): string {
  const sameMonth = from.getUTCMonth() === to.getUTCMonth();
  const fromLabel = formatDay(from);
  const toLabel = formatDay(to);
  if (sameMonth) {
    return `${formatMonth(from)} ${from.getUTCDate()} – ${to.getUTCDate()}, ${from.getUTCFullYear()}`;
  }
  return `${fromLabel} – ${toLabel}, ${to.getUTCFullYear()}`;
}

function formatDay(date: Date): string {
  return `${formatMonth(date)} ${date.getUTCDate()}`;
}

function formatMonth(date: Date): string {
  return MONTH_NAMES[date.getUTCMonth()] ?? "";
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];