/**
 * Helpers for building NextRequest instances in API route tests.
 */
import { NextRequest } from "next/server";

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
}

export function makeRequest(url = "http://localhost:3000/test", options: RequestOptions = {}) {
  const { method = "GET", headers = {}, body, searchParams } = options;
  const finalUrl = new URL(url);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) finalUrl.searchParams.set(k, v);
  }
  const init: RequestInit = { method, headers: new Headers(headers) };
  if (body !== undefined) {
    init.headers = new Headers(headers);
    init.headers.set("content-type", "application/json");
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  // Cast to bypass the stricter NextRequest.RequestInit which forbids `null` on `signal`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(finalUrl, init as any);
}
