import { NextRequest, NextResponse } from "next/server";
import { listCompetitors, createCompetitor } from "@/app/lib/competitors-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
    const limit = Math.min(
      1000,
      Math.max(1, Number(searchParams.get("limit")) || 100)
    );
    const status = searchParams.get("status") ?? undefined;
    const result = await listCompetitors({ skip, limit, status });
    return NextResponse.json(result, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("GET /api/competitors", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

type CreateBody = {
  name: string;
  website_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  reddit_url?: string | null;
  discord_url?: string | null;
  industry?: string | null;
  description?: string | null;
  logo_url?: string | null;
  status?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBody;
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { detail: "name is required and must be a string" },
        { status: 400 }
      );
    }
    const competitor = await createCompetitor({
      name: body.name,
      website_url: body.website_url,
      twitter_url: body.twitter_url,
      instagram_url: body.instagram_url,
      facebook_url: body.facebook_url,
      reddit_url: body.reddit_url,
      discord_url: body.discord_url,
      industry: body.industry,
      description: body.description,
      logo_url: body.logo_url,
      status: body.status ?? "active",
    });
    return NextResponse.json(competitor, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("POST /api/competitors", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
