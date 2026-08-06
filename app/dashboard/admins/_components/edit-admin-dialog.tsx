"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateAdminSchema,
  type UpdateAdminInput,
} from "@/lib/validations/admin";
import { updateAdminAction } from "@/app/actions/admin";
import type { AdminRow } from "./admins-view";

export function EditAdminDialog({
  admin,
  open,
  onOpenChange,
  onSuccess,
}: {
  admin: AdminRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  // Derive the inner form's key directly from the props we depend on. When
  // the dialog opens (or the target admin changes) we mount a fresh body so
  // its server-error state and react-hook-form instance are guaranteed clean.
  const innerKey = open ? `${admin.id}:${admin.userId}` : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <EditAdminFormBody
            key={innerKey}
            admin={admin}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditAdminFormBody({
  admin,
  onOpenChange,
  onSuccess,
}: {
  admin: AdminRow;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateAdminInput>({
    resolver: zodResolver(updateAdminSchema),
    defaultValues: {
      staffId: admin.id,
      userId: admin.userId,
      name: admin.name,
      email: admin.email,
      phone: admin.phone ?? undefined,
      isActive: admin.isActive,
    },
  });

  const isActive = watch("isActive");

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateAdminAction({
        ...data,
        phone: data.phone?.trim() ? data.phone : undefined,
      });
      if (result.success) {
        toast.success("Admin updated");
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof UpdateAdminInput, {
              message: messages[0],
            });
          }
        }
        if (result.error) setServerError(result.error);
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit admin</DialogTitle>
            <DialogDescription>
              Update profile information and access status.
            </DialogDescription>
          </DialogHeader>

          {serverError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {serverError}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Full name</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name?.message ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" {...register("email")} />
            {errors.email?.message ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-phone">Phone (optional)</Label>
            <Input id="edit-phone" type="tel" {...register("phone")} />
            {errors.phone?.message ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <Checkbox
              checked={isActive}
              onCheckedChange={(checked) =>
                setValue("isActive", checked === true, { shouldDirty: true })
              }
            />
            <span className="flex flex-col">
              <span className="font-medium">Active</span>
              <span className="text-xs text-muted-foreground">
                Inactive admins cannot sign in.
              </span>
            </span>
          </label>

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
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
  );
}