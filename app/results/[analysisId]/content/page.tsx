"use client";

import * as React from "react";
import Link from "next/link";
import { useAppStore } from "../../../state/store";
import { useToast } from "../../../state/toast";
import {
  Button,
  Card,
  CardTitle,
  Pill,
  Textarea,
} from "../../../components/ui";

export default function ContentFromResultsPage({
  params,
}: {
  params: { analysisId: string };
}) {
  const { analysisId } = params;
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

  if (!analysis) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create marketing content
        </h1>
        <div className="rounded-md border border-dashed border-zinc-200 p-6 text-sm text-zinc-600">
          Analysis not found. Go back to the{" "}
          <Link
            href="/analysis"
            className="font-semibold text-blue-700 hover:underline"
          >
            analysis page
          </Link>{" "}
          and run a project first.
        </div>
      </div>
    );
  }

  const selectedCompetitors = analysis.competitorIds
    .map((id) => competitors.find((c) => c.id === id))
    .filter(Boolean) as {
    id: number;
    name: string;
    website_url?: string | null;
  }[];

  function toggleChannel(id: string) {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

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
    try {
      const res = await fetch(
        "https://itsabbas-ataie.app.n8n.cloud/webhook/9ab24b1d-7785-43a3-9c20-907e18ba31c5",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "social_content_from_results",
            analysis: {
              id: analysis.id,
              name: analysis.name,
              createdAt: analysis.createdAt,
              parameters: analysis.parameters,
            },
            channels,
            prompt,
            competitors: selectedCompetitors.map((c) => ({
              id: c.id,
              name: c.name,
              website_url: c.website_url ?? null,
            })),
            // You can later extend this to include full results + insights
          }),
        }
      );

      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      if (contentType.includes("application/json")) {
        const data = await res.json();
        setResponseText(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setResponseText(text);
      }

      toast.push({
        type: "success",
        message:
          "Content generated from analysis. You can refine or copy it below.",
      });
    } catch (e) {
      console.error("Failed to call social content webhook", e);
      toast.push({
        type: "error",
        message: "Could not reach the content endpoint.",
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
          <Pill color="blue">Analysis: {analysis.name}</Pill>
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
