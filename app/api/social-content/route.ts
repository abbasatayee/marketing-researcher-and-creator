import { NextRequest, NextResponse } from "next/server";
import {
  createSocialContent,
  listByAnalysis,
} from "@/app/lib/social-content-store";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * Allow CORS preflight so n8n or other origins can POST.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/social-content?analysisId=xxx
 * Returns { items } for polling (e.g. waiting page).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("analysisId");
    if (!analysisId) {
      return NextResponse.json(
        { detail: "analysisId query is required" },
        { status: 400 }
      );
    }
    const items = await listByAnalysis(analysisId);
    return NextResponse.json(
      { items },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("GET /api/social-content", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social-content
 * Body: { analysisId: string, content: string | object, source?: string }
 * Returns: { id, viewUrl, createdAt }
 *
 * Use this URL in your n8n workflow: after generating content, POST it here.
 * Then open viewUrl in the app to display the content to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const analysisId = body.analysisId;
    const content = body.content;
    const source = body.source;

    if (!analysisId || typeof analysisId !== "string") {
      return NextResponse.json(
        { detail: "analysisId (string) is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (content === undefined) {
      return NextResponse.json(
        { detail: "content is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const record = await createSocialContent({
      analysisId,
      content,
      source,
    });

    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const viewUrl = `${base}/results/${analysisId}/content/view/${record.id}`;

    return NextResponse.json(
      {
        id: record.id,
        viewUrl,
        createdAt: record.created_at,
      },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  } catch (e) {
    console.error("POST /api/social-content", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
