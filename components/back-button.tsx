"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /**
   * The URL to navigate to when the back button is clicked.
   * If not provided, it will fall back to the browser's history.
   */
  href?: string;
  /**
   * Label text for the button. Defaults to "Back".
   */
  label?: string;
  /**
   * Optional className to apply additional styles.
   */
  className?: string;
}

export function BackButton({
  href,
  label = "Back",
  className,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <ArrowLeftIcon className="size-4" />
      <span>{label}</span>
    </Button>
  );
}
