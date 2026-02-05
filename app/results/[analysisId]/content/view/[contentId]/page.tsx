"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Card, CardTitle } from "../../../../components/ui";

type Stored = {
  id: string;
  analysisId: string;
  content: unknown;
  source?: string;
  created_at: string;
};

export default function ViewContentPage({
  params,
}: {
  params: { analysisId: string; contentId: string };
}) {
  const { analysisId, contentId } = params;
  const [item, setItem] = React.useState<Stored | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/social-content/${contentId}`);
        if (!res.ok) {
          if (!cancelled) setError("Content not found.");
          return;
        }
        const data = (await res.json()) as Stored;
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) setError("Failed to load content.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-zinc-600">{error ?? "Not found."}</p>
        <Link href={`/results/${analysisId}/content`}>
          <Button variant="secondary">Back to create content</Button>
        </Link>
      </div>
    );
  }

  const content =
    typeof item.content === "string"
      ? item.content
      : JSON.stringify(item.content, null, 2);
  const isJson = typeof item.content !== "string";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Generated content
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Saved {new Date(item.created_at).toLocaleString()}
            {item.source ? ` · ${item.source}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(content);
            }}
          >
            Copy
          </Button>
          <Link href={`/results/${analysisId}/content`}>
            <Button variant="secondary">Create more</Button>
          </Link>
          <Link href={`/results/${analysisId}`}>
            <Button variant="ghost">Back to results</Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardTitle>Content</CardTitle>
        <div className="mt-3">
          {isJson ? (
            <pre className="max-h-[70vh] overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 whitespace-pre-wrap">
              {content}
            </pre>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-800 whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
