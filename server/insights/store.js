// Persistence for saved dashboards and reports.
//
// Definitions only — a saved dashboard/report stores its title, layout, and
// each widget's query/filter definition, NEVER a snapshot of results. Every
// open re-evaluates against the live account base.
//
// Phase 3: definitions live in the central database (server/store.js) next to
// the accounts, so a dashboard built today reopens next week on any backend
// (JSON file locally, Upstash on deploys). Seeded defaults stay in code and
// are always present; user-created objects are ordinary DB records.

import { state, persist } from "../state.js";
import { SEED_DASHBOARDS } from "./defaults.js";

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

// ── Dashboards ────────────────────────────────────────────────────────────

export function listDashboards() {
  const userDashboards = state.dashboards.filter((d) => !SEED_DASHBOARDS.some((s) => s.id === d.id));
  const all = [...SEED_DASHBOARDS, ...userDashboards];
  return all.map((d) => ({ ...d, lastRefreshedAt: state.refreshedAt[d.id] || d.createdAt }));
}

export function getDashboard(id) {
  const d = [...SEED_DASHBOARDS, ...state.dashboards].find((x) => x.id === id);
  if (!d) return null;
  return { ...d, lastRefreshedAt: state.refreshedAt[id] || d.createdAt };
}

export function createDashboard(spec) {
  const now = new Date().toISOString();
  const dashboard = {
    ...spec,
    id: spec.id && !spec.id.startsWith("dash-") ? `dash-${spec.id}` : spec.id || uid("dash"),
    seeded: false,
    createdBy: spec.createdBy || "Kevin Jay",
    createdAt: now,
  };
  state.dashboards.unshift(dashboard);
  state.refreshedAt[dashboard.id] = now;
  persist();
  return { ...dashboard, lastRefreshedAt: now };
}

// Stamp a refresh. Works for seeded and user dashboards alike.
export function touchRefresh(id) {
  const now = new Date().toISOString();
  state.refreshedAt[id] = now;
  persist();
  return now;
}

export function deleteDashboard(id) {
  if (SEED_DASHBOARDS.some((s) => s.id === id)) return { ok: false, reason: "seeded" };
  const before = state.dashboards.length;
  state.dashboards = state.dashboards.filter((d) => d.id !== id);
  delete state.refreshedAt[id];
  persist();
  return { ok: state.dashboards.length < before };
}

// ── Saved reports ───────────────────────────────────────────────────────────

export function listReports() {
  return state.reports.map((r) => ({ ...r, lastRefreshedAt: state.refreshedAt[r.id] || r.createdAt }));
}

export function getReport(id) {
  const r = state.reports.find((x) => x.id === id);
  if (!r) return null;
  return { ...r, lastRefreshedAt: state.refreshedAt[id] || r.createdAt };
}

export function createReport(report) {
  const now = new Date().toISOString();
  const saved = {
    ...report,
    id: uid("rpt"),
    createdBy: report.createdBy || "Kevin Jay",
    createdAt: now,
  };
  state.reports.unshift(saved);
  state.refreshedAt[saved.id] = now;
  persist();
  return { ...saved, lastRefreshedAt: now };
}

export function deleteReport(id) {
  const before = state.reports.length;
  state.reports = state.reports.filter((r) => r.id !== id);
  delete state.refreshedAt[id];
  persist();
  return { ok: state.reports.length < before };
}
