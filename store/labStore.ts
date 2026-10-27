"use client";
import { create } from "zustand";
import type {
  AnalyzeResponse,
  CompositeResponse,
  MeasureLog,
  Metrics,
  Template,
  CaptureRules,
  Vec3,
} from "@/lib/ai/types";
export const defaultRules: CaptureRules = {
  minWidth: 0.35,
  maxWidth: 0.6,
  centerTolerance: 0.1,
  maxAngle: 10,
  maxBlink: 0.3,
  minBrightness: 80,
  stableMs: 800,
};
type State = {
  mock: boolean;
  apiUrl: string;
  templateId: string;
  templates: Template[];
  testerNote: string;
  photo: Blob | null;
  photoSize: { w: number; h: number } | null;
  photoLandmarks: Vec3[];
  analyze: AnalyzeResponse | null;
  composite: CompositeResponse | null;
  errors: { analyze?: string; composite?: string };
  busy: boolean;
  logs: MeasureLog[];
  metrics: Metrics;
  rules: CaptureRules;
  settings: {
    smoothing: boolean;
    blend: "normal" | "screen" | "multiply";
    showLandmarks: boolean;
    showMesh: boolean;
    stamp: "type" | "star" | "planet" | "glitter";
  };
  health: "idle" | "checking" | "ok" | "error";
  models: Record<string, string>;
  connectionError: string | null;
  set: (value: Partial<State>) => void;
  setMetrics: (value: Partial<Metrics>) => void;
  addLog: (row: MeasureLog) => void;
  setSettings: (value: Partial<State["settings"]>) => void;
};
export const useLabStore = create<State>((set) => ({
  mock: process.env.NEXT_PUBLIC_AI_MOCK !== "false",
  apiUrl: "",
  templateId: "past_city",
  templates: [],
  testerNote: "",
  photo: null,
  photoSize: null,
  photoLandmarks: [],
  analyze: null,
  composite: null,
  errors: {},
  busy: false,
  logs: [],
  rules: defaultRules,
  health: "idle",
  models: {},
  connectionError: null,
  metrics: {
    fps: 0,
    inference: 0,
    faces: 0,
    analyzeMs: null,
    compositeMs: null,
    warnings: [],
    error: null,
    server: {},
  },
  settings: {
    smoothing: true,
    blend: "normal",
    showLandmarks: false,
    showMesh: false,
    stamp: "type",
  },
  set: (v) => set(v),
  setMetrics: (v) => set((s) => ({ metrics: { ...s.metrics, ...v } })),
  addLog: (row) => set((s) => ({ logs: [...s.logs, row] })),
  setSettings: (v) => set((s) => ({ settings: { ...s.settings, ...v } })),
}));
