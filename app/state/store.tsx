"use client";

import * as React from "react";
import type {
  AnalysisParameters,
  AnalysisRun,
  AppState,
  Competitor,
} from "./types";
import {
  DEFAULT_PARAMETERS,
  MOCK_COMPETITORS,
  makeMockAnalysis,
} from "./mockData";
import { BACKEND_ENABLED } from "../lib/config";
import { listCompetitors } from "../lib/api";
import { mapApiCompetitorToStore } from "../lib/mappers";

type Action =
  | { type: "competitor/add"; payload: Omit<Competitor, "id"> }
  | { type: "competitor/bulkAdd"; payload: Omit<Competitor, "id">[] }
  | { type: "competitor/replaceAll"; payload: { items: Competitor[] } }
  | {
      type: "competitor/update";
      payload: { id: number; patch: Partial<Omit<Competitor, "id">> };
    }
  | { type: "competitor/delete"; payload: { id: number } }
  | { type: "competitor/selectToggle"; payload: { id: number } }
  | { type: "competitor/selectAll"; payload: { ids: number[] } }
  | {
      type: "analysis/createDraft";
      payload: {
        id: string;
        name: string;
        competitorIds: number[];
        parameters: AnalysisParameters;
      };
    }
  | { type: "analysis/setActive"; payload: { id: string | null } }
  | { type: "analysis/completeMock"; payload: { id: string } };

const initialState: AppState = {
  competitors: MOCK_COMPETITORS,
  analyses: [
    // pre-seed one sample analysis so users see the results UI immediately
    makeMockAnalysis("Sample analysis (example data)", [1, 2, 3]),
  ],
  selectedCompetitorIds: [1, 2],
  activeAnalysisId: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "competitor/add": {
      const nextId = (state.competitors[0]?.id ?? 0) + 1;
      const competitor: Competitor = { id: nextId, ...action.payload };
      return {
        ...state,
        competitors: [competitor, ...state.competitors],
      };
    }
    case "competitor/bulkAdd": {
      const base = state.competitors[0]?.id ?? 0;
      const created = action.payload.map((c, i) => ({
        id: base + i + 1,
        ...c,
      }));
      return {
        ...state,
        competitors: [...created, ...state.competitors],
      };
    }
    case "competitor/replaceAll": {
      const nextIds = new Set(action.payload.items.map((c) => c.id));
      return {
        ...state,
        competitors: action.payload.items,
        selectedCompetitorIds: state.selectedCompetitorIds.filter((id) =>
          nextIds.has(id)
        ),
      };
    }
    case "competitor/update": {
      return {
        ...state,
        competitors: state.competitors.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.patch } : c
        ),
      };
    }
    case "competitor/delete": {
      const next = state.competitors.filter((c) => c.id !== action.payload.id);
      return {
        ...state,
        competitors: next,
        selectedCompetitorIds: state.selectedCompetitorIds.filter(
          (id) => id !== action.payload.id
        ),
      };
    }
    case "competitor/selectToggle": {
      const id = action.payload.id;
      const selected = state.selectedCompetitorIds.includes(id);
      return {
        ...state,
        selectedCompetitorIds: selected
          ? state.selectedCompetitorIds.filter((x) => x !== id)
          : [...state.selectedCompetitorIds, id],
      };
    }
    case "competitor/selectAll": {
      return { ...state, selectedCompetitorIds: action.payload.ids };
    }
    case "analysis/createDraft": {
      const run: AnalysisRun = {
        id: action.payload.id,
        name: action.payload.name,
        createdAt: new Date().toISOString(),
        status: "running",
        competitorIds: action.payload.competitorIds,
        parameters: action.payload.parameters,
      };
      return {
        ...state,
        analyses: [run, ...state.analyses],
        activeAnalysisId: run.id,
      };
    }
    case "analysis/setActive": {
      return { ...state, activeAnalysisId: action.payload.id };
    }
    case "analysis/completeMock": {
      const run = state.analyses.find((a) => a.id === action.payload.id);
      if (!run) return state;
      const completed = makeMockAnalysis(run.name, run.competitorIds);
      completed.id = run.id;
      completed.parameters = run.parameters;
      return {
        ...state,
        analyses: state.analyses.map((a) => (a.id === run.id ? completed : a)),
      };
    }
    default:
      return state;
  }
}

type AppStoreContextValue = AppState & {
  addCompetitor: (c: Omit<Competitor, "id">) => void;
  bulkAddCompetitors: (items: Omit<Competitor, "id">[]) => void;
  replaceCompetitors: (items: Competitor[]) => void;
  updateCompetitorLocal: (
    id: number,
    patch: Partial<Omit<Competitor, "id">>
  ) => void;
  deleteCompetitorLocal: (id: number) => void;
  toggleSelectedCompetitor: (id: number) => void;
  selectAllCompetitors: (ids: number[]) => void;
  createAnalysisDraft: (args: {
    name: string;
    competitorIds: number[];
    parameters: AnalysisParameters;
  }) => string;
  completeMockAnalysis: (id: string) => void;
  setActiveAnalysisId: (id: string | null) => void;
};

const AppStoreContext = React.createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  // Global sync: if backend is enabled, load competitors once so sidebar + pages reflect FastAPI
  React.useEffect(() => {
    if (!BACKEND_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listCompetitors();
        if (!cancelled) {
          dispatch({
            type: "competitor/replaceAll",
            payload: { items: data.items.map(mapApiCompetitorToStore) },
          });
        }
      } catch (e) {
        console.error("Failed to auto-load competitors from backend", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When backend is disabled, hydrate competitors from the local JSON-backed API
  React.useEffect(() => {
    if (BACKEND_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/competitors");
        if (!res.ok) return;
        const data = (await res.json()) as { items?: any[] };
        if (!cancelled && data.items && data.items.length) {
          dispatch({
            type: "competitor/replaceAll",
            payload: {
              items: data.items.map((c: any) => mapApiCompetitorToStore(c)),
            },
          });
        }
      } catch (e) {
        console.error("Failed to load competitors from local API", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AppStoreContextValue = React.useMemo(
    () => ({
      ...state,
      addCompetitor: (c) => dispatch({ type: "competitor/add", payload: c }),
      bulkAddCompetitors: (items) =>
        dispatch({ type: "competitor/bulkAdd", payload: items }),
      replaceCompetitors: (items) =>
        dispatch({ type: "competitor/replaceAll", payload: { items } }),
      updateCompetitorLocal: (id, patch) =>
        dispatch({ type: "competitor/update", payload: { id, patch } }),
      deleteCompetitorLocal: (id) =>
        dispatch({ type: "competitor/delete", payload: { id } }),
      toggleSelectedCompetitor: (id) =>
        dispatch({ type: "competitor/selectToggle", payload: { id } }),
      selectAllCompetitors: (ids) =>
        dispatch({ type: "competitor/selectAll", payload: { ids } }),
      createAnalysisDraft: ({ name, competitorIds, parameters }) => {
        const id = String(Date.now());
        dispatch({
          type: "analysis/createDraft",
          payload: {
            id,
            name: name || "Competitor analysis",
            competitorIds,
            parameters,
          },
        });
        return id;
      },
      completeMockAnalysis: (id) =>
        dispatch({ type: "analysis/completeMock", payload: { id } }),
      setActiveAnalysisId: (id) =>
        dispatch({ type: "analysis/setActive", payload: { id } }),
    }),
    [state]
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = React.useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

export function getDefaultParameters(): AnalysisParameters {
  return { ...DEFAULT_PARAMETERS };
}
