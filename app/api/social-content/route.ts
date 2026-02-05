import { NextRequest, NextResponse } from "next/server";
import { createSocialContent } from "@/app/lib/social-content-store";

export const runtime = "nodejs";

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
        { status: 400 }
      );
    }
    if (content === undefined) {
      return NextResponse.json(
        { detail: "content is required" },
        { status: 400 }
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
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("POST /api/social-content", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
