"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  BedIcon,
  UsersIcon,
  SparklesIcon,
  WrenchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { updateRoomStatusSchema, type UpdateRoomStatusInput } from "@/lib/validations/room-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  description: string;
  icon: React.ElementType;
};

const STATUS_MAP: Record<RoomStatus, StatusConfig> = {
  AVAILABLE: {
    label: "Available",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    description: "Room is ready for new guests to check in",
    icon: CheckCircleIcon,
  },
  OCCUPIED: {
    label: "Occupied",
    color: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    description: "Room currently has a guest checked in",
    icon: UsersIcon,
  },
  DIRTY: {
    label: "Dirty",
    color: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
    description: "Guest has checked out, room needs cleaning",
    icon: SparklesIcon,
  },
  CLEANING: {
    label: "Cleaning",
    color: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
    description: "Housekeeping is actively cleaning the room",
    icon: SparklesIcon,
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "bg-orange-500/15 text-orange-800 border-orange-500/30 dark:text-orange-300",
    description: "Room is under repair or maintenance work",
    icon: WrenchIcon,
  },
  OUT_OF_ORDER: {
    label: "Out of Order",
    color: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300",
    description: "Room is out of service completely",
    icon: AlertTriangleIcon,
  },
};

const STATUS_OPTIONS: Array<{ value: RoomStatus; label: string; color: string }> = [
  { value: "AVAILABLE", label: "Available", color: "bg-emerald-500" },
  { value: "OCCUPIED", label: "Occupied", color: "bg-blue-500" },
  { value: "DIRTY", label: "Dirty", color: "bg-amber-500" },
  { value: "CLEANING", label: "Cleaning", color: "bg-violet-500" },
  { value: "MAINTENANCE", label: "Maintenance", color: "bg-orange-500" },
  { value: "OUT_OF_ORDER", label: "Out of Order", color: "bg-red-500" },
];

// ============================================
// COMPONENT
// ============================================

interface RoomStatusDialogProps {
  room: RoomData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: RoomStatus) => Promise<void>;
  isLoading?: boolean;
}

export function RoomStatusDialog({
  room,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RoomStatusDialogProps) {
  const currentConfig = STATUS_MAP[room.status];

  const form = useForm<UpdateRoomStatusInput>({
    resolver: zodResolver(updateRoomStatusSchema),
    defaultValues: {
      roomId: room.id,
      status: room.status,
      notes: "",
    },
  });

  const selectedStatus = form.watch("status") as RoomStatus;
  const selectedConfig = selectedStatus ? STATUS_MAP[selectedStatus] : null;
  const SelectedIcon = selectedConfig?.icon ?? CheckCircleIcon;

  const handleSubmit = async (values: UpdateRoomStatusInput) => {
    if (values.status === room.status) {
      onOpenChange(false);
      return;
    }
    await onConfirm(values.status);
    onOpenChange(false);
  };

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        roomId: room.id,
        status: room.status,
        notes: "",
      });
    }
  }, [open, room.id, room.status, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedIcon className="size-5 text-muted-foreground" />
            Change Room Status
          </DialogTitle>
          <DialogDescription>
            Update the status for Room {room.number} ({room.roomType.name}, Floor {room.floor})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={void form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <div className={cn("rounded-full p-2", currentConfig.color)}>
                <currentConfig.icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Current Status</p>
                <p className={cn("text-xs font-semibold", currentConfig.color)}>
                  {currentConfig.label}
                </p>
              </div>
              {room.currentGuest && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">
                    <UsersIcon className="mr-1 inline size-3" />
                    {room.currentGuest.guestName}
                  </p>
                  {room.currentGuest.checkOutDate && (
                    <p className="text-xs text-muted-foreground">
                      <ClockIcon className="mr-1 inline size-3" />
                      Out: {room.currentGuest.checkOutDate}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Status Selector */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a new status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => {
                        const config = STATUS_MAP[opt.value];
                        const Icon = config.icon;
                        const isCurrent = opt.value === room.status;
                        return (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={isCurrent}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn("size-2 rounded-full", opt.color)} />
                              <span className={cn(isCurrent && "text-muted-foreground")}>
                                {opt.label}
                              </span>
                              {isCurrent && (
                                <span className="text-xs text-muted-foreground">(current)</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Status Preview */}
            {selectedConfig && selectedStatus !== room.status && (
              <div className={cn("flex items-start gap-3 rounded-lg border p-3", selectedConfig.color)}>
                <SelectedIcon className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{selectedConfig.label}</p>
                  <p className="text-xs opacity-80">{selectedConfig.description}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <span className="inline-flex items-center gap-1.5">
                      <FileTextIcon className="size-3.5 text-muted-foreground" />
                      Notes (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Add a note about this status change..."
                      rows={3}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warning for occupied rooms */}
            {room.status === "OCCUPIED" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="font-medium">Guest currently in room</p>
                <p className="mt-0.5 text-xs">
                  Changing the status while a guest is checked in will not automatically
                  check them out. Use the Front Desk to process check-out first.
                </p>
              </div>
            )}

            {/* Warning for taking available rooms out of service */}
            {(selectedStatus === "MAINTENANCE" || selectedStatus === "OUT_OF_ORDER") &&
              room.status === "AVAILABLE" && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300">
                  <p className="font-medium">Taking room out of service</p>
                  <p className="mt-0.5 text-xs">
                    This room will no longer appear as available for new bookings.
                    Make sure no upcoming reservations need this room.
                  </p>
                </div>
              )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || selectedStatus === room.status}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
