import { NextRequest, NextResponse } from "next/server";
import { getSocialContent } from "@/app/lib/social-content-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await getSocialContent(id);
    if (!record) {
      return NextResponse.json(
        { detail: "Content not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(record, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("GET /api/social-content/[id]", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
