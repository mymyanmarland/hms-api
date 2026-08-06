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
import {
  inviteAdminSchema,
  type InviteAdminInput,
} from "@/lib/validations/admin";
import { inviteAdminAction } from "@/app/actions/admin";

export function InviteAdminDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  // Derive the inner form's key directly from `open`. Whenever the dialog
  // opens we mount a fresh body so its server-error state and react-hook-form
  // instance are guaranteed to be clean — without any effects or setState.
  const innerKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <InviteAdminFormBody
            key={innerKey}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InviteAdminFormBody({
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
    setError,
    formState: { errors },
  } = useForm<InviteAdminInput>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: undefined,
      temporaryPassword: "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await inviteAdminAction({
        ...data,
        phone: data.phone?.trim() ? data.phone : undefined,
      });
      if (result.success) {
        toast.success("Admin invited");
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof InviteAdminInput, {
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
        <DialogTitle>Invite a new admin</DialogTitle>
        <DialogDescription>
          They will receive an email with their temporary password.
        </DialogDescription>
      </DialogHeader>

      {serverError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      <Field
        id="name"
        label="Full name"
        error={errors.name?.message}
        input={<Input id="name" autoComplete="name" {...register("name")} />}
      />
      <Field
        id="email"
        label="Email"
        error={errors.email?.message}
        input={
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        }
      />
      <Field
        id="phone"
        label="Phone (optional)"
        error={errors.phone?.message}
        input={
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            {...register("phone")}
          />
        }
      />
      <Field
        id="temporaryPassword"
        label="Temporary password"
        hint="At least 12 characters with uppercase, lowercase, a number, and a symbol."
        error={errors.temporaryPassword?.message}
        input={
          <Input
            id="temporaryPassword"
            type="text"
            autoComplete="new-password"
            {...register("temporaryPassword")}
          />
        }
      />

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
              Sending invite...
            </>
          ) : (
            "Send invite"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  input,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}