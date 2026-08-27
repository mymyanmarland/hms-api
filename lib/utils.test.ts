import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class names into a single string", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values (false, null, undefined, 0, '')", () => {
    expect(cn("foo", false, null, undefined, 0, "", "bar")).toBe("foo bar");
  });

  it("supports conditional class names", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
  });

  it("resolves Tailwind conflicts (later class wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("supports arrays of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("supports object-based class names (clsx syntax)", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });

  it("returns an empty string when given no inputs", () => {
    expect(cn()).toBe("");
  });
});
