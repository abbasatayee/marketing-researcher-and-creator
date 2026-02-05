"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, Input, Pill } from "../components/ui";
import { getDefaultParameters, useAppStore } from "../state/store";
import type { AnalysisParameters } from "../state/types";
import { useToast } from "../state/toast";

const PARAMS: Array<{ key: keyof AnalysisParameters; label: string }> = [
  { key: "pricing", label: "Pricing strategy" },
  { key: "features", label: "Product features" },
  { key: "marketing", label: "Marketing messaging" },
  { key: "audience", label: "Target audience" },
  { key: "techStack", label: "Technology stack" },
  { key: "content", label: "Content strategy" },
  { key: "social", label: "Social media presence" },
  { key: "reviews", label: "Customer reviews / sentiment" },
];

export default function AnalysisPage() {
  const router = useRouter();
  const toast = useToast();
  const {
    competitors,
    selectedCompetitorIds,
    createAnalysisDraft,
    completeMockAnalysis,
    analyses,
  } = useAppStore();

  const [name, setName] = React.useState("New competitor analysis");
  const [params, setParams] = React.useState<AnalysisParameters>(() =>
    getDefaultParameters()
  );

  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const selected = competitors.filter((c) =>
    selectedCompetitorIds.includes(c.id)
  );

  function toggleParam(k: keyof AnalysisParameters) {
    setParams((p) => ({ ...p, [k]: !p[k] }));
  }

  async function run() {
    if (!selectedCompetitorIds.length) {
      toast.push({
        type: "error",
        message: "Select competitors first (go to Competitors page).",
      });
      return;
    }
    if (Object.values(params).every((v) => !v)) {
      toast.push({
        type: "error",
        message: "Pick at least one analysis parameter.",
      });
      return;
    }

    const id = createAnalysisDraft({
      name: name.trim() || "Competitor analysis",
      competitorIds: selectedCompetitorIds,
      parameters: params,
    });

    // Notify external workflow (n8n) when an analysis is started
    try {
      await fetch(
        "https://itsabbas-ataie.app.n8n.cloud/webhook-test/e9964a2f-c642-49bb-8397-6dc9e48f13c8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            name: name.trim() || "Competitor analysis",
            competitorIds: selectedCompetitorIds,
            parameters: params,
          }),
        }
      );
    } catch (e) {
      console.error("Failed to call analysis webhook", e);
    }

    setRunning(true);
    setProgress(10);
    toast.push({
      type: "info",
      message: "Analysis started (example data mode)",
    });

    // Simulate progress; later you can replace with FastAPI status polling.
    const steps = [18, 30, 45, 60, 78, 90];
    for (const p of steps) {
      await wait(500);
      setProgress(p);
    }
    await wait(700);
    completeMockAnalysis(id);
    setProgress(100);
    setRunning(false);
    toast.push({ type: "success", message: "Analysis completed" });
    router.push(`/results/${id}`);
  }

  const last = analyses[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Run Analysis
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Choose what to compare, then generate a results page with charts and
            differentiation insights.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          {last && (
            <Pill color={last.status === "completed" ? "emerald" : "blue"}>
              Latest: {last.status}
            </Pill>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Configuration</CardTitle>
          <div className="mt-4 space-y-4">
            <Input
              label="Analysis name"
              value={name}
              onChange={setName}
              placeholder="Q1 competitor analysis"
            />

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Parameters
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PARAMS.map((p) => (
                  <label
                    key={p.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 focus-within:ring-2 focus-within:ring-blue-500"
                  >
                    <input
                      type="checkbox"
                      checked={params[p.key]}
                      onChange={() => toggleParam(p.key)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="no-print">
              <Button onClick={() => void run()} disabled={running}>
                {running ? "Running analysis..." : "Run Analysis"}
              </Button>
            </div>

            {running && (
              <div
                aria-label="Analysis progress"
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-800">Working…</span>
                  <span className="text-zinc-600">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  This is a demo progress indicator. When connected to FastAPI,
                  this can poll the real analysis status.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Selected competitors</CardTitle>
          <p className="mt-2 text-sm text-zinc-500">
            Selected on the Competitors page:
          </p>
          <div className="mt-3 space-y-2">
            {selected.length ? (
              selected.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border border-zinc-200 p-2"
                >
                  <div className="text-sm font-semibold text-zinc-900">
                    {c.name}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {c.website_url
                      ? c.website_url.replace(/^https?:\/\//, "")
                      : "No website"}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-zinc-200 p-4 text-sm text-zinc-600">
                None selected yet. Go to the Competitors page and pick at least
                one.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}
