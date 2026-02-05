"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, CardTitle } from "../../../../../components/ui";
import { useToast } from "../../../../../state/toast";

type Stored = {
  id: string;
  analysisId: string;
  content: unknown;
  source?: string;
  created_at: string;
};

const CHANNEL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  x_twitter: "X / Twitter",
  linkedin: "LinkedIn",
  email_newsletter: "Email newsletter",
};

function isChannelContent(
  c: unknown
): c is Record<string, Record<string, string | string[] | undefined>> {
  if (!c || typeof c !== "object" || Array.isArray(c)) return false;
  const keys = Object.keys(c);
  if (!keys.length) return false;
  const known = ["facebook", "x_twitter", "linkedin", "email_newsletter"];
  return keys.some((k) => known.includes(k));
}

function CopyableBlock({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (text: string, label: string) => void;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50/50">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-3 py-2">
        <span className="text-xs font-medium text-zinc-600">{label}</span>
        <Button variant="ghost" onClick={() => onCopy(value, label)}>
          Copy
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto p-3 font-mono text-xs text-zinc-800 whitespace-pre-wrap wrap-break-word">
        {value}
      </pre>
    </div>
  );
}

function ChannelCard({
  channelKey,
  data,
  onCopy,
}: {
  channelKey: string;
  data: Record<string, string | string[] | undefined>;
  onCopy: (text: string, label: string) => void;
}) {
  const label = CHANNEL_LABELS[channelKey] ?? channelKey;
  const fieldLabels: Record<string, string> = {
    post_copy: "Post copy",
    tweet_copy: "Tweet",
    subject_line: "Subject line",
    preview_text: "Preview text",
    email_body: "Email body",
    cta: "CTA",
    hashtags: "Hashtags",
  };
  const order = [
    "post_copy",
    "tweet_copy",
    "subject_line",
    "preview_text",
    "email_body",
    "cta",
    "hashtags",
  ];
  const entries = order.filter((key) => {
    const v = data[key];
    return (
      v !== undefined &&
      v !== null &&
      (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "")
    );
  });

  return (
    <Card>
      <CardTitle>{label}</CardTitle>
      <div className="mt-3 space-y-3">
        {entries.map((key) => {
          const raw = data[key];
          const value = Array.isArray(raw)
            ? raw.join(" ")
            : typeof raw === "string"
            ? raw
            : "";
          return (
            <CopyableBlock
              key={key}
              label={fieldLabels[key] ?? key}
              value={value}
              onCopy={onCopy}
            />
          );
        })}
      </div>
    </Card>
  );
}

export default function ViewContentPage() {
  const params = useParams();
  const toast = useToast();
  const analysisId = params?.analysisId as string | undefined;
  const contentId = params?.contentId as string | undefined;
  const [item, setItem] = React.useState<Stored | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleCopy = React.useCallback(
    (text: string, label: string) => {
      void navigator.clipboard.writeText(text);
      toast.push({ type: "success", message: `${label} copied` });
    },
    [toast]
  );

  React.useEffect(() => {
    if (!contentId) {
      setLoading(false);
      setError("Content ID is missing.");
      return;
    }
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

  if (!analysisId || !contentId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-zinc-600">
          Missing analysis or content ID in the URL.
        </p>
        <Link href="/">
          <Button variant="secondary">Dashboard</Button>
        </Link>
      </div>
    );
  }

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
        {analysisId && (
          <Link href={`/results/${analysisId}/content`}>
            <Button variant="secondary">Back to create content</Button>
          </Link>
        )}
      </div>
    );
  }

  const content =
    typeof item.content === "string"
      ? item.content
      : JSON.stringify(item.content, null, 2);
  const isJson = typeof item.content !== "string";
  const channelContent = isChannelContent(item.content)
    ? (item.content as Record<
        string,
        Record<string, string | string[] | undefined>
      >)
    : null;

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
        <div className="flex flex-wrap gap-2">
          {!channelContent && (
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(content);
                toast.push({ type: "success", message: "Content copied" });
              }}
            >
              Copy all
            </Button>
          )}
          <Link href={`/results/${analysisId}/content`}>
            <Button variant="secondary">Create more</Button>
          </Link>
          <Link href={`/results/${analysisId}`}>
            <Button variant="ghost">Back to results</Button>
          </Link>
        </div>
      </header>

      {channelContent ? (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {Object.entries(channelContent).map(([key, data]) => (
            <ChannelCard
              key={key}
              channelKey={key}
              data={data as Record<string, string | string[] | undefined>}
              onCopy={handleCopy}
            />
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
