"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useAppStore } from "../state/store";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={[
        "block rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
        active ? "bg-blue-50 text-blue-700" : "text-zinc-700 hover:bg-zinc-100",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { competitors, analyses } = useAppStore();
  const lastAnalysisDate =
    analyses.length > 0 ? new Date(analyses[0].createdAt) : null;
  const insightsCount = analyses[0]?.insights?.length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 flex-shrink-0 border-r border-zinc-200 bg-white px-6 py-8 md:block">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Powered by Vibseek
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
              Vibseek Insights
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Turn competitor research into content-ready insights for your
              sound discovery brand.
            </p>
            <a
              href="https://www.vibseek.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center text-xs font-semibold text-blue-700 hover:underline"
            >
              Learn more about Vibseek
            </a>
          </div>

          <nav className="space-y-1">
            <NavItem href="/" label="Dashboard" />
            <NavItem href="/competitors" label="Competitors" />
            <NavItem href="/analysis" label="Run Analysis" />
          </nav>

          <div className="mt-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Quick stats
            </div>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-600">Competitors tracked</dt>
                <dd className="font-semibold text-zinc-900">
                  {competitors.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-600">Last analysis</dt>
                <dd className="font-semibold text-zinc-900">
                  {lastAnalysisDate
                    ? lastAnalysisDate.toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-600">Key insights</dt>
                <dd className="font-semibold text-blue-700">{insightsCount}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
