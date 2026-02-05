import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";

let DATA_DIR = path.join(process.cwd(), ".data");
let FILE_PATH = path.join(DATA_DIR, "social-content.json");

export type StoredSocialContent = {
  id: string;
  analysisId: string;
  content: unknown;
  source?: string;
  created_at: string;
};

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    DATA_DIR = path.join(os.tmpdir(), "research-app-data");
    FILE_PATH = path.join(DATA_DIR, "social-content.json");
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readAll(): Promise<StoredSocialContent[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StoredSocialContent[]) {
  await ensureDataDir();
  await writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

function nextId(): string {
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createSocialContent(entry: {
  analysisId: string;
  content: unknown;
  source?: string;
}): Promise<StoredSocialContent> {
  const items = await readAll();
  const id = nextId();
  const now = new Date().toISOString();
  const record: StoredSocialContent = {
    id,
    analysisId: entry.analysisId,
    content: entry.content,
    source: entry.source,
    created_at: now,
  };
  items.push(record);
  await writeAll(items);
  return record;
}

export async function getSocialContent(
  id: string
): Promise<StoredSocialContent | null> {
  const items = await readAll();
  return items.find((x) => x.id === id) ?? null;
}

export async function listByAnalysis(
  analysisId: string
): Promise<StoredSocialContent[]> {
  const items = await readAll();
  return items.filter((x) => x.analysisId === analysisId);
}
