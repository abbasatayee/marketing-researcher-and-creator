import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";

// Prefer a project-local `.data` folder in development,
// but fall back to the OS temp directory on read-only/serverless filesystems.
let DATA_DIR = path.join(process.cwd(), ".data");
let FILE_PATH = path.join(DATA_DIR, "perplexity-results.json");

export type StoredPerplexityResult = {
  id: number;
  created_at: string;
  // Store the raw JSON we receive from Perplexity under `data`
  data: unknown;
};

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // If we can't write next to the code (e.g. /var/task on serverless),
    // fall back to a writable temp directory.
    DATA_DIR = path.join(os.tmpdir(), "research-app-data");
    FILE_PATH = path.join(DATA_DIR, "perplexity-results.json");
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readResults(): Promise<StoredPerplexityResult[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeResults(items: StoredPerplexityResult[]) {
  await ensureDataDir();
  await writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function listPerplexityResults(options: {
  skip?: number;
  limit?: number;
}): Promise<{ items: StoredPerplexityResult[]; total: number }> {
  let items = await readResults();
  const total = items.length;
  const skip = Math.max(0, options.skip ?? 0);
  const limit = Math.max(1, Math.min(1000, options.limit ?? 100));
  items = items.slice(skip, skip + limit);
  return { items, total };
}

export async function createPerplexityResult(
  data: unknown
): Promise<StoredPerplexityResult> {
  const items = await readResults();
  const nextId =
    items.length === 0 ? 1 : Math.max(...items.map((c) => c.id)) + 1;
  const now = new Date().toISOString();
  const record: StoredPerplexityResult = {
    id: nextId,
    created_at: now,
    data,
  };
  items.push(record);
  await writeResults(items);
  return record;
}
