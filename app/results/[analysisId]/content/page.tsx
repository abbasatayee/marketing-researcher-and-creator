"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "../../../state/store";
import { useToast } from "../../../state/toast";
import {
  Button,
  Card,
  CardTitle,
  Pill,
  Textarea,
} from "../../../components/ui";

export default function ContentFromResultsPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params?.analysisId as string | undefined;
  const toast = useToast();
  const { analyses, competitors } = useAppStore();

  const analysis = analyses.find((a) => a.id === analysisId) ?? analyses[0];
  const [prompt, setPrompt] = React.useState("");
  const [channels, setChannels] = React.useState<string[]>([
    "facebook",
    "twitter",
    "linkedin",
    "email",
  ]);
  const [loading, setLoading] = React.useState(false);
  const [responseText, setResponseText] = React.useState<string | null>(null);
  const [savedViewUrl, setSavedViewUrl] = React.useState<string | null>(null);

  // When analysis is missing from store we still allow generate with minimal payload (analysisId from URL).
  const selectedCompetitors = analysis
    ? (analysis.competitorIds
        .map((id) => competitors.find((c) => c.id === id))
        .filter(Boolean) as {
        id: number;
        name: string;
        website_url?: string | null;
      }[])
    : [];

  if (!analysisId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create marketing content
        </h1>
        <div className="rounded-md border border-dashed border-zinc-200 p-6 text-sm text-zinc-600">
          Missing analysis ID in the URL. Go back to{" "}
          <Link
            href="/"
            className="font-semibold text-blue-700 hover:underline"
          >
            Dashboard
          </Link>{" "}
          or run an analysis first.
        </div>
      </div>
    );
  }

  function toggleChannel(id: string) {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function copyBlock(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    toast.push({ type: "success", message: `${label} copied` });
  }

  const payloadPrompt = prompt.trim() || "(empty)";
  const payloadChannels = channels.join(", ");
  const payloadAnalysis = analysis
    ? JSON.stringify(
        {
          id: analysis.id,
          name: analysis.name,
          createdAt: analysis.createdAt,
          parameters: analysis.parameters,
        },
        null,
        2
      )
    : JSON.stringify(
        {
          id: analysisId,
          name: "Analysis",
          createdAt: new Date().toISOString(),
          parameters: {
            pricing: true,
            features: true,
            marketing: true,
            audience: true,
            techStack: true,
            content: true,
            social: true,
            reviews: true,
          },
        },
        null,
        2
      );
  const payloadCompetitors = JSON.stringify(
    selectedCompetitors.map((c) => ({
      id: c.id,
      name: c.name,
      website_url: c.website_url ?? null,
    })),
    null,
    2
  );

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.push({
        type: "error",
        message: "Add a short brief or goal for this campaign.",
      });
      return;
    }
    setLoading(true);
    setResponseText(null);
    setSavedViewUrl(null);
    try {
      const payload = {
        type: "social_content_from_results",
        analysis: analysis
          ? {
              id: analysis.id,
              name: analysis.name,
              createdAt: analysis.createdAt,
              parameters: analysis.parameters,
            }
          : {
              id: analysisId,
              name: "Analysis",
              createdAt: new Date().toISOString(),
              parameters: {
                pricing: true,
                features: true,
                marketing: true,
                audience: true,
                techStack: true,
                content: true,
                social: true,
                reviews: true,
              },
            },
        channels,
        prompt,
        competitors: selectedCompetitors.map((c) => ({
          id: c.id,
          name: c.name,
          website_url: c.website_url ?? null,
        })),
      };
      const res = await fetch("/api/trigger-content-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      toast.push({
        type: "success",
        message: "Content is being generated. Taking you to the view…",
      });
      router.push(`/results/${analysisId}/content/waiting`);
      return;
    } catch (e) {
      console.error("Failed to call social content webhook", e);
      toast.push({
        type: "error",
        message: "Could not start the content workflow.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create content from this analysis
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Use your competitor analysis to brief AI and generate channel-ready
            marketing content.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Pill color="blue">Analysis: {analysis?.name ?? analysisId}</Pill>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Step 1 · Describe what you want</CardTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Tell the system what this campaign should achieve. This will be
            sent, together with the analysis context, to your automation
            endpoint.
          </p>
          <div className="mt-4">
            <Textarea
              label="What should this project achieve?"
              value={prompt}
              onChange={setPrompt}
              rows={6}
              placeholder="Example: Create a social campaign that positions Vibseek as the fastest way for electronic music producers to discover human-made sounds, compared to the competitors in this analysis."
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Link href={`/results/${analysisId}`}>
              <Button variant="ghost">Back to results</Button>
            </Link>
            <Button
              variant="primary"
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? "Generating content..." : "Generate content"}
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Channels</CardTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Choose where you plan to publish. This is passed to your webhook as
            a hint.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {[
              { id: "facebook", label: "Facebook" },
              { id: "twitter", label: "X / Twitter" },
              { id: "linkedin", label: "LinkedIn" },
              { id: "instagram", label: "Instagram" },
              { id: "email", label: "Email newsletter" },
            ].map((ch) => {
              const checked = channels.includes(ch.id);
              return (
                <label
                  key={ch.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChannel(ch.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{ch.label}</span>
                </label>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="lg:col-span-3">
        <CardTitle>Request payload (copyable)</CardTitle>
        <p className="mt-2 text-sm text-zinc-500">
          What will be sent to the workflow. Copy each part separately.
        </p>
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-3 py-2">
              <span className="text-xs font-medium text-zinc-600">Prompt / brief</span>
              <Button
                variant="ghost"
                onClick={() => copyBlock(payloadPrompt, "Prompt")}
              >
                Copy
              </Button>
            </div>
            <pre className="max-h-32 overflow-auto p-3 font-mono text-xs text-zinc-800 whitespace-pre-wrap wrap-break-word">
              {payloadPrompt}
            </pre>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-3 py-2">
              <span className="text-xs font-medium text-zinc-600">Channels</span>
              <Button
                variant="ghost"
                onClick={() => copyBlock(payloadChannels, "Channels")}
              >
                Copy
              </Button>
            </div>
            <pre className="max-h-20 overflow-auto p-3 font-mono text-xs text-zinc-800">
              {payloadChannels}
            </pre>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-3 py-2">
              <span className="text-xs font-medium text-zinc-600">Analysis</span>
              <Button
                variant="ghost"
                onClick={() => copyBlock(payloadAnalysis, "Analysis")}
              >
                Copy
              </Button>
            </div>
            <pre className="max-h-40 overflow-auto p-3 font-mono text-xs text-zinc-800 whitespace-pre">
              {payloadAnalysis}
            </pre>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-3 py-2">
              <span className="text-xs font-medium text-zinc-600">Competitors</span>
              <Button
                variant="ghost"
                onClick={() => copyBlock(payloadCompetitors, "Competitors")}
              >
                Copy
              </Button>
            </div>
            <pre className="max-h-40 overflow-auto p-3 font-mono text-xs text-zinc-800 whitespace-pre">
              {payloadCompetitors}
            </pre>
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <CardTitle>URL to put the content (for your workflow)</CardTitle>
        <p className="mt-2 text-sm text-zinc-500">
          In n8n, after generating content, POST it to this endpoint. The
          response will include a{" "}
          <code className="rounded bg-zinc-100 px-1">viewUrl</code> to display
          the content to the user.
        </p>
        <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800">
          <div className="font-semibold text-zinc-600">
            POST{" "}
            {typeof window !== "undefined"
              ? `${window.location.origin}/api/social-content`
              : "[origin]/api/social-content"}
          </div>
          <div className="mt-2 text-zinc-700">
            Body:{" "}
            <code>{`{ "analysisId": "${analysisId}", "content": "…" }`}</code>
          </div>
          <div className="mt-2 text-zinc-600">
            Response: <code>{`{ "id", "viewUrl", "createdAt" }`}</code> — open{" "}
            <code>viewUrl</code> in the app to show the content.
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          View URL pattern:{" "}
          <code className="rounded bg-zinc-100 px-1">
            /results/[analysisId]/content/view/[id]
          </code>
        </p>
      </Card>

      {savedViewUrl && (
        <Card className="lg:col-span-3 border-blue-200 bg-blue-50/50">
          <CardTitle>View saved content</CardTitle>
          <p className="mt-2 text-sm text-zinc-600">
            Content was saved. Open this link to display it later:
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={savedViewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open content
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(savedViewUrl);
                toast.push({ type: "success", message: "View URL copied" });
              }}
            >
              Copy link
            </Button>
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-600 break-all">
            {savedViewUrl}
          </p>
        </Card>
      )}

      <Card className="lg:col-span-3">
        <div className="flex items-center justify-between">
          <CardTitle>Generated content (raw response)</CardTitle>
          {responseText && (
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(responseText);
                toast.push({ type: "success", message: "Response copied" });
              }}
            >
              Copy
            </Button>
          )}
        </div>
        <div className="mt-3">
          {responseText ? (
            <pre className="max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800">
              {responseText}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">
              Run a generation first. The raw response from your webhook will
              appear here so you can copy or refine it.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
