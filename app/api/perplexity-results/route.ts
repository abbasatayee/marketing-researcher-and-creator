import { NextRequest, NextResponse } from "next/server";
import {
  listPerplexityResults,
  createPerplexityResult,
} from "@/app/lib/perplexity-results-store";

// Ensure this runs on the Node.js runtime so we can use the filesystem.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
    const limit = Math.min(
      1000,
      Math.max(1, Number(searchParams.get("limit")) || 100)
    );
    const result = await listPerplexityResults({ skip, limit });
    return NextResponse.json(result, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("GET /api/perplexity-results", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Accept any valid JSON body and store it verbatim under `data`.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { detail: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const saved = await createPerplexityResult(body);
    return NextResponse.json(saved, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/perplexity-results", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
