"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardTitle } from "../../../../components/ui";

const POLL_INTERVAL_MS = 2500;
const GIVE_UP_MS = 3 * 60 * 1000; // 3 minutes

type Item = {
  id: string;
  analysisId: string;
  content: unknown;
  source?: string;
  created_at: string;
};

export default function ContentWaitingPage() {
  const params = useParams();
  const analysisId = params?.analysisId as string | undefined;
  const router = useRouter();
  const startedAt = React.useRef(Date.now());
  const gaveUpRef = React.useRef(false);
  const [gaveUp, setGaveUp] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        gaveUpRef.current = true;
        setGaveUp(true);
      }
    }, GIVE_UP_MS);

    function schedulePoll() {
      if (cancelled || gaveUpRef.current) return;
      window.setTimeout(() => void runPoll(), POLL_INTERVAL_MS);
    }

    async function runPoll() {
      if (cancelled || gaveUpRef.current) return;
      try {
        const res = await fetch(
          `/api/social-content?analysisId=${encodeURIComponent(analysisId)}`
        );
        if (!res.ok) {
          schedulePoll();
          return;
        }
        const data = (await res.json()) as { items: Item[] };
        const items = data.items ?? [];
        const afterStart = items.filter(
          (i) => new Date(i.created_at).getTime() > startedAt.current
        );
        const newest = afterStart.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        if (newest && !cancelled) {
          router.replace(`/results/${analysisId}/content/view/${newest.id}`);
          return;
        }
      } catch {
        // ignore
      }
      schedulePoll();
    }

    runPoll();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [analysisId, router]);

  if (!analysisId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Waiting for content</h1>
        <p className="text-sm text-zinc-600">Missing analysis ID. <Link href="/" className="text-blue-700 hover:underline">Go to Dashboard</Link>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Generating your content
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          We’re creating your marketing content. This page will update when it’s
          ready.
        </p>
      </header>

      <Card className="flex flex-col items-center justify-center py-16">
        <CardTitle className="sr-only">Loading</CardTitle>
        {!gaveUp ? (
          <>
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600"
              aria-hidden
            />
            <p className="mt-4 text-sm font-medium text-zinc-700">
              Checking for new content…
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              This usually takes a short time. We’ll redirect you when it’s
              ready.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700">
              Still generating
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Content can take a few minutes. You can go back and try again or
              check the view page later if your workflow saved content.
            </p>
            <div className="mt-6 flex gap-2">
              <Link href={`/results/${analysisId}/content`}>
                <Button variant="secondary">Back to create content</Button>
              </Link>
              <Link href={`/results/${analysisId}`}>
                <Button variant="ghost">Back to results</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
