import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function getBaseDir() {
  // Store one file per id under .data/perplexity-results/
  return path.join(process.cwd(), ".data", "perplexity-results");
}

async function ensureDir() {
  await mkdir(getBaseDir(), { recursive: true });
}

function getFilePath(id: string) {
  return path.join(getBaseDir(), `${id}.json`);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await ensureDir();
    const filePath = getFilePath(id);
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(
      {
        id,
        data,
      },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    // If file doesn't exist or can't be read, return 404
    return NextResponse.json(
      { detail: "Result not found for this id." },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await ensureDir();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { detail: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const filePath = getFilePath(id);
    await writeFile(filePath, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json(
      {
        id,
        saved: true,
      },
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("PUT /api/perplexity-results/[id]", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Treat POST the same as PUT for convenience
  return PUT(request, context);
}
