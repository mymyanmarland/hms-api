"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UsersIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGroupBookingSchema, type CreateGroupBookingInput } from "@/lib/validations/group-booking";

export function CreateGroupDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const innerKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {open ? (
          <CreateGroupFormBody
            key={innerKey}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateGroupFormBody({
  onOpenChange,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateGroupBookingInput>({
    resolver: zodResolver(createGroupBookingSchema),
    defaultValues: {
      groupName: "",
      groupType: "CORPORATE",
      contactName: "",
      contactEmail: "",
      contactPhone: undefined,
      contactCompany: undefined,
      roomsBlocked: 5,
      discountPercent: 0,
      discountNotes: undefined,
      depositRequired: false,
      depositAmount: undefined,
      depositDueDate: undefined,
      bookingCutoffDate: undefined,
      releaseDate: undefined,
      notes: undefined,
      internalNotes: undefined,
      arrivalInfo: undefined,
      departureInfo: undefined,
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/group-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("Group booking created successfully");
          reset();
          onOpenChange(false);
          onSuccess?.();
        } else if (result.fieldErrors) {
          setServerError(result.error ?? "Validation error");
        } else if (result.error) {
          setServerError(result.error);
        }
      } catch {
        setServerError("Failed to create group booking. Please try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UsersIcon className="size-5" />
          Create Group Booking
        </DialogTitle>
        <DialogDescription>
          Create a block reservation for corporate events, weddings, or tour groups.
        </DialogDescription>
      </DialogHeader>

      {serverError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Group Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              placeholder="e.g., Acme Corp Annual Meeting"
              {...register("groupName")}
            />
            {errors.groupName && (
              <p className="text-xs text-destructive">{errors.groupName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="groupType">Group Type *</Label>
            <Select
              onValueChange={(value) =>
                setValue("groupType", value as CreateGroupBookingInput["groupType"])
              }
              defaultValue="CORPORATE"
            >
              <SelectTrigger id="groupType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CORPORATE">Corporate</SelectItem>
                <SelectItem value="WEDDING">Wedding</SelectItem>
                <SelectItem value="TOUR">Tour</SelectItem>
                <SelectItem value="SPORTS">Sports</SelectItem>
                <SelectItem value="GOVERNMENT">Government</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="roomsBlocked">Rooms Blocked *</Label>
          <Input
            id="roomsBlocked"
            type="number"
            min={1}
            max={100}
            {...register("roomsBlocked", { valueAsNumber: true })}
          />
          {errors.roomsBlocked && (
            <p className="text-xs text-destructive">{errors.roomsBlocked.message}</p>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Contact Person</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              placeholder="John Smith"
              {...register("contactName")}
            />
            {errors.contactName && (
              <p className="text-xs text-destructive">{errors.contactName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactEmail">Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="john@example.com"
              {...register("contactEmail")}
            />
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="+1 234 567 8900"
              {...register("contactPhone")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactCompany">Company</Label>
            <Input
              id="contactCompany"
              placeholder="Acme Corporation"
              {...register("contactCompany")}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Discount Settings</h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id="hasDiscount"
            checked={Number(watch("discountPercent")) > 0}
            onCheckedChange={(checked) =>
              setValue("discountPercent", checked ? 10 : 0)
            }
          />
          <Label htmlFor="hasDiscount" className="font-normal">
            Apply group discount
          </Label>
        </div>
        {Number(watch("discountPercent")) > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discountPercent">Discount Percentage</Label>
            <Input
              id="discountPercent"
              type="number"
              min={0}
              max={100}
              {...register("discountPercent", { valueAsNumber: true })}
            />
            {errors.discountPercent && (
              <p className="text-xs text-destructive">{errors.discountPercent.message}</p>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Deposit</h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id="depositRequired"
            checked={watch("depositRequired")}
            onCheckedChange={(checked) =>
              setValue("depositRequired", checked as boolean)
            }
          />
          <Label htmlFor="depositRequired" className="font-normal">
            Require deposit
          </Label>
        </div>
        {watch("depositRequired") && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depositAmount">Deposit Amount</Label>
            <Input
              id="depositAmount"
              type="number"
              min={0}
              step={0.01}
              {...register("depositAmount", { valueAsNumber: true })}
            />
          </div>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Special requirements or notes..."
          {...register("notes")}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Group"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
