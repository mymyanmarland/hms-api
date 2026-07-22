import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const handler = auth.handler(request);
  return handler;
};

export const POST = async (request: NextRequest) => {
  const handler = auth.handler(request);
  return handler;
};
