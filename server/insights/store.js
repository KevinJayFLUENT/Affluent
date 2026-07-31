// Persistence for saved dashboards and reports.
//
// The whole point of the Insights feature is that a dashboard is a SAVED
// OBJECT, not a one-off chat answer: build it once from a prompt, reopen it a
// week later, and it re-evaluates against the current CRM. So specs must
// outlive a single request.
//
// Model: seeded defaults live in code (always present); user-created objects
// are persisted to a JSON file so they survive a local server restart. On a
// read-only serverless filesystem the write is best-effort and the object
// still lives in module memory for the warm instance — consistent with how the
// rest of this prototype keeps deal state.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SEED_DASHBOARDS } from "./defaults.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "dashboards.store.json");

// In-memory state, hydrated from disk once at boot.
const mem = {
  userDashboards: [], // created from prompts
  reports: [], // saved drill-downs
  refreshedAt: {}, // id -> ISO string, tracked for seeded + user alike
};

function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    // Back-compat: an older format persisted a bare array of dashboards.
    if (Array.isArray(parsed)) {
      mem.userDashboards = parsed.filter((d) => d && !d.seeded && !SEED_DASHBOARDS.some((s) => s.id === d.id));
    } else if (parsed && typeof parsed === "object") {
      mem.userDashboards = (parsed.dashboards || []).filter((d) => d && !SEED_DASHBOARDS.some((s) => s.id === d.id));
      mem.reports = parsed.reports || [];
      mem.refreshedAt = parsed.refreshedAt || {};
    }
  } catch (err) {
    console.error("insights store load failed (starting empty):", err.message);
  }
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify({ version: 1, dashboards: mem.userDashboards, reports: mem.reports, refreshedAt: mem.refreshedAt }, null, 2)
    );
  } catch (err) {
    // Serverless read-only FS or similar — keep running from memory.
    console.error("insights store persist skipped:", err.message);
  }
}

load();

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

// ── Dashboards ────────────────────────────────────────────────────────────

export function listDashboards() {
  const all = [...SEED_DASHBOARDS, ...mem.userDashboards];
  return all.map((d) => ({ ...d, lastRefreshedAt: mem.refreshedAt[d.id] || d.createdAt }));
}

export function getDashboard(id) {
  const d = [...SEED_DASHBOARDS, ...mem.userDashboards].find((x) => x.id === id);
  if (!d) return null;
  return { ...d, lastRefreshedAt: mem.refreshedAt[id] || d.createdAt };
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
  mem.userDashboards.unshift(dashboard);
  mem.refreshedAt[dashboard.id] = now;
  persist();
  return { ...dashboard, lastRefreshedAt: now };
}

// Stamp a refresh. Works for seeded and user dashboards alike.
export function touchRefresh(id) {
  const now = new Date().toISOString();
  mem.refreshedAt[id] = now;
  persist();
  return now;
}

export function deleteDashboard(id) {
  if (SEED_DASHBOARDS.some((s) => s.id === id)) return { ok: false, reason: "seeded" };
  const before = mem.userDashboards.length;
  mem.userDashboards = mem.userDashboards.filter((d) => d.id !== id);
  delete mem.refreshedAt[id];
  persist();
  return { ok: mem.userDashboards.length < before };
}

// ── Saved reports ───────────────────────────────────────────────────────────

export function listReports() {
  return mem.reports.map((r) => ({ ...r, lastRefreshedAt: mem.refreshedAt[r.id] || r.createdAt }));
}

export function getReport(id) {
  const r = mem.reports.find((x) => x.id === id);
  if (!r) return null;
  return { ...r, lastRefreshedAt: mem.refreshedAt[id] || r.createdAt };
}

export function createReport(report) {
  const now = new Date().toISOString();
  const saved = {
    ...report,
    id: uid("rpt"),
    createdBy: report.createdBy || "Kevin Jay",
    createdAt: now,
  };
  mem.reports.unshift(saved);
  mem.refreshedAt[saved.id] = now;
  persist();
  return { ...saved, lastRefreshedAt: now };
}

export function deleteReport(id) {
  const before = mem.reports.length;
  mem.reports = mem.reports.filter((r) => r.id !== id);
  delete mem.refreshedAt[id];
  persist();
  return { ok: mem.reports.length < before };
}
