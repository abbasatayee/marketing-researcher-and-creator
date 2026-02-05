import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";

// Prefer a project-local `.data` folder in development,
// but fall back to the OS temp directory on read-only/serverless filesystems.
let DATA_DIR = path.join(process.cwd(), ".data");
let FILE_PATH = path.join(DATA_DIR, "competitors.json");

export type StoredCompetitor = {
  id: number;
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
  status: string;
  created_at: string;
  updated_at: string;
};

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // If we can't write next to the code (e.g. /var/task on serverless),
    // fall back to a writable temp directory.
    DATA_DIR = path.join(os.tmpdir(), "research-app-data");
    FILE_PATH = path.join(DATA_DIR, "competitors.json");
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readCompetitors(): Promise<StoredCompetitor[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeCompetitors(items: StoredCompetitor[]) {
  await ensureDataDir();
  await writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function listCompetitors(options: {
  skip?: number;
  limit?: number;
  status?: string;
}): Promise<{ items: StoredCompetitor[]; total: number }> {
  let items = await readCompetitors();
  const total = items.length;
  if (options.status) {
    items = items.filter((c) => c.status === options.status);
  }
  const skip = Math.max(0, options.skip ?? 0);
  const limit = Math.max(1, Math.min(1000, options.limit ?? 100));
  items = items.slice(skip, skip + limit);
  return { items, total };
}

export async function createCompetitor(
  body: Omit<StoredCompetitor, "id" | "created_at" | "updated_at">
): Promise<StoredCompetitor> {
  const items = await readCompetitors();
  const nextId =
    items.length === 0 ? 1 : Math.max(...items.map((c) => c.id)) + 1;
  const now = new Date().toISOString();
  const competitor: StoredCompetitor = {
    id: nextId,
    name: body.name,
    website_url: body.website_url ?? null,
    twitter_url: body.twitter_url ?? null,
    instagram_url: body.instagram_url ?? null,
    facebook_url: body.facebook_url ?? null,
    reddit_url: body.reddit_url ?? null,
    discord_url: body.discord_url ?? null,
    industry: body.industry ?? null,
    description: body.description ?? null,
    logo_url: body.logo_url ?? null,
    status: body.status ?? "active",
    created_at: now,
    updated_at: now,
  };
  items.push(competitor);
  await writeCompetitors(items);
  return competitor;
}
