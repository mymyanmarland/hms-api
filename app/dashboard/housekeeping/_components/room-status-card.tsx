"use client";

import * as React from "react";
import {
  BedIcon,
  UsersIcon,
  SparklesIcon,
  WrenchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================
// TYPES
// ============================================

type RoomStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "CLEANING" | "MAINTENANCE" | "OUT_OF_ORDER";

type RoomData = {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  notes: string | null;
  roomType: {
    name: string;
    basePrice: string;
    bedConfig: string | null;
  };
  currentGuest: {
    bookingId: string;
    guestName: string;
    checkOutDate: string | null;
  } | null;
};

// ============================================
// CONSTANTS
// ============================================

type StatusConfig = {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  badgeClass: string;
};

const STATUS_CONFIG: Record<RoomStatus, StatusConfig> = {
  AVAILABLE: {
    label: "Available",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircleIcon,
    badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  OCCUPIED: {
    label: "Occupied",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    icon: UsersIcon,
    badgeClass: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300 dark:border-blue-500/30",
  },
  DIRTY: {
    label: "Dirty",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    icon: SparklesIcon,
    badgeClass: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300 dark:border-amber-500/30",
  },
  CLEANING: {
    label: "Cleaning",
    color: "text-violet-700 dark:text-violet-300",
    bgColor: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
    icon: SparklesIcon,
    badgeClass: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300 dark:border-violet-500/30",
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    icon: WrenchIcon,
    badgeClass: "bg-orange-500/15 text-orange-800 border-orange-500/30 dark:text-orange-300 dark:border-orange-500/30",
  },
  OUT_OF_ORDER: {
    label: "Out of Order",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    icon: AlertTriangleIcon,
    badgeClass: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300 dark:border-red-500/30",
  },
};

// Available status transitions for quick actions
const QUICK_ACTIONS: Record<RoomStatus, RoomStatus[]> = {
  AVAILABLE: ["MAINTENANCE", "OUT_OF_ORDER"],
  OCCUPIED: ["MAINTENANCE", "OUT_OF_ORDER"],
  DIRTY: ["CLEANING"],
  CLEANING: ["AVAILABLE", "DIRTY"],
  MAINTENANCE: ["AVAILABLE", "OUT_OF_ORDER"],
  OUT_OF_ORDER: ["AVAILABLE", "MAINTENANCE"],
};

const STATUS_LABELS: Record<RoomStatus, string> = {
  AVAILABLE: "Mark Available",
  OCCUPIED: "Mark Occupied",
  DIRTY: "Mark Dirty",
  CLEANING: "Mark Cleaning",
  MAINTENANCE: "Mark Maintenance",
  OUT_OF_ORDER: "Mark Out of Order",
};

// ============================================
// COMPONENT
// ============================================

interface RoomStatusCardProps {
  room: RoomData;
  onUpdateStatus: (roomId: string, status: RoomStatus) => void;
}

export function RoomStatusCard({ room, onUpdateStatus }: RoomStatusCardProps) {
  const config = STATUS_CONFIG[room.status];
  const Icon = config.icon;
  const quickActions = QUICK_ACTIONS[room.status] ?? [];

  return (
    <div className={cn("relative flex flex-col rounded-lg border p-4 transition-shadow hover:shadow-md", config.bgColor)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-full p-1.5", config.bgColor)}>
            <Icon className={cn("size-4", config.color)} />
          </div>
          <div>
            <h3 className="font-semibold">Room {room.number}</h3>
            <p className="text-xs text-muted-foreground">
              {room.roomType.name} · Floor {room.floor}
            </p>
          </div>
        </div>

        {/* Status Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Current status indicator */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Badge className={cn("shrink-0 text-xs", config.badgeClass)}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">Current</span>
            </div>

            <DropdownMenuSeparator />

            {/* Quick status transitions */}
            {quickActions.map((newStatus) => {
              const targetConfig = STATUS_CONFIG[newStatus];
              const TargetIcon = targetConfig.icon;
              return (
                <DropdownMenuItem
                  key={newStatus}
                  onSelect={() => onUpdateStatus(room.id, newStatus)}
                  className="gap-2"
                >
                  <TargetIcon className="size-4 text-muted-foreground" />
                  <span>{STATUS_LABELS[newStatus]}</span>
                </DropdownMenuItem>
              );
            })}

            {/* "Change Status" option for all */}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-muted-foreground">
              <ChevronRightIcon className="size-4" />
              <span>Change to any status...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Room Info */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {room.roomType.bedConfig && (
          <Badge variant="outline" className="text-xs">
            <BedIcon className="mr-1 size-3" />
            {room.roomType.bedConfig}
          </Badge>
        )}
        {room.currentGuest && (
          <Badge variant="outline" className="text-xs">
            <UsersIcon className="mr-1 size-3" />
            {room.currentGuest.guestName}
          </Badge>
        )}
      </div>

      {/* Notes */}
      {room.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {room.notes}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <Badge className={cn("text-xs", config.badgeClass)}>
          {config.label}
        </Badge>
        {room.currentGuest?.checkOutDate && (
          <span className="text-xs text-muted-foreground">
            Out: {room.currentGuest.checkOutDate}
          </span>
        )}
      </div>
    </div>
  );
}
