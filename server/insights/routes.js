// Insights API — persistent Reports & Dashboards.
//
// Every read recomputes against the LIVE deal state (state.targets), so a saved
// dashboard opened a week later reflects the current CRM without re-prompting.
// The stored object is the SPEC; the numbers are always fresh.

import express from "express";
import { state } from "../state.js";
import { accountRows, FIELD_CATALOG } from "./derive.js";
import { computeKpi, computeGrid, distinctValues, filterBarToFilters, buildReport, applyFilters } from "./engine.js";
import { generateDashboardSpec } from "./generate.js";
import * as store from "./store.js";
import { aiAvailable } from "../claude.js";

const router = express.Router();

// Snapshot of every account as a flat row, using one shared clock per request.
const currentRows = () => accountRows(state.targets, new Date());

// Parse filter-bar selections from the query string (?field=value).
function readSelections(query, filterBar) {
  const sel = {};
  for (const fb of filterBar || []) {
    if (query[fb.field] != null) sel[fb.field] = query[fb.field];
  }
  return sel;
}

// Build the filter-bar option lists from the live account base.
function filterBarOptions(filterBar, rows) {
  return (filterBar || []).map((fb) => ({
    field: fb.field,
    label: fb.label,
    options: distinctValues(rows, fb.field),
  }));
}

// Evaluate a dashboard spec against rows scoped by base + filter-bar selections.
function evaluateDashboard(dashboard, rows, selections) {
  const scopeFilters = [
    ...(dashboard.baseFilters || []),
    ...filterBarToFilters(dashboard.filterBar, selections),
  ];
  const scoped = applyFilters(rows, scopeFilters);
  const kpis = (dashboard.kpis || []).map((k) => computeKpi(scoped, k));
  const grid = computeGrid(scoped, dashboard.grid);
  return { kpis, grid, scopedCount: scoped.length };
}

// ── List everything (gallery) ───────────────────────────────────────────────
router.get("/dashboards", (req, res) => {
  res.json({
    dashboards: store.listDashboards().map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      prompt: d.prompt,
      seeded: !!d.seeded,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
      lastRefreshedAt: d.lastRefreshedAt,
      rowField: d.grid?.rowField,
      colField: d.grid?.colField,
    })),
    reports: store.listReports(),
    ai: aiAvailable(),
    fields: FIELD_CATALOG,
  });
});

// ── Open one dashboard: spec + freshly computed data ────────────────────────
router.get("/dashboards/:id", (req, res) => {
  const dashboard = store.getDashboard(req.params.id);
  if (!dashboard) return res.status(404).json({ error: "unknown dashboard" });

  const rows = currentRows();
  const selections = readSelections(req.query, dashboard.filterBar);
  const { kpis, grid } = evaluateDashboard(dashboard, rows, selections);
  const refreshedAt = store.touchRefresh(dashboard.id);

  res.json({
    dashboard,
    data: { kpis, grid },
    filterBar: filterBarOptions(dashboard.filterBar, rows),
    selections,
    refreshedAt,
    totalAccounts: rows.length,
  });
});

// ── Build a new dashboard from a prompt (Claude-powered) ─────────────────────
router.post("/dashboards", async (req, res) => {
  const prompt = (req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const rows = currentRows();
    const spec = await generateDashboardSpec(prompt, rows);
    const saved = store.createDashboard(spec);
    res.json({ dashboard: saved, generatedBy: spec.generatedBy });
  } catch (err) {
    console.error("dashboard create error:", err.message);
    res.status(500).json({ error: "failed to build dashboard", detail: err.message });
  }
});

// ── Explicit refresh (bumps the as-of timestamp) ────────────────────────────
router.post("/dashboards/:id/refresh", (req, res) => {
  const dashboard = store.getDashboard(req.params.id);
  if (!dashboard) return res.status(404).json({ error: "unknown dashboard" });
  const refreshedAt = store.touchRefresh(dashboard.id);
  const rows = currentRows();
  const selections = req.body?.selections || {};
  const { kpis, grid } = evaluateDashboard(dashboard, rows, selections);
  res.json({ data: { kpis, grid }, refreshedAt });
});

router.delete("/dashboards/:id", (req, res) => {
  const result = store.deleteDashboard(req.params.id);
  if (!result.ok && result.reason === "seeded")
    return res.status(400).json({ error: "seeded dashboards cannot be deleted" });
  res.json(result);
});

// ── Drill-down report for a widget (View Report) ────────────────────────────
// Body: { dashboardId, widget: {type, kpiId|row|col}, selections, columns }
router.post("/report", (req, res) => {
  const { dashboardId, widget, selections, columns } = req.body || {};
  const dashboard = store.getDashboard(dashboardId);
  if (!dashboard) return res.status(404).json({ error: "unknown dashboard" });

  const rows = currentRows();
  const report = buildReport(rows, dashboard, widget || {}, selections || {}, columns);
  res.json({
    ...report,
    dashboardId,
    dashboardName: dashboard.name,
    widget: widget || {},
    generatedAt: new Date().toISOString(),
  });
});

// ── Save a drill-down as a standalone report object ─────────────────────────
router.post("/reports", (req, res) => {
  const { name, dashboardId, widget, selections, columns } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const saved = store.createReport({ name, dashboardId, widget: widget || {}, selections: selections || {}, columns: columns || null });
  res.json({ report: saved });
});

router.get("/reports/:id", (req, res) => {
  const saved = store.getReport(req.params.id);
  if (!saved) return res.status(404).json({ error: "unknown report" });
  const dashboard = saved.dashboardId ? store.getDashboard(saved.dashboardId) : null;
  const rows = currentRows();
  const report = dashboard
    ? buildReport(rows, dashboard, saved.widget, saved.selections, saved.columns)
    : { filters: [], columns: [], accounts: [], total: 0 };
  res.json({ saved, ...report, generatedAt: new Date().toISOString() });
});

router.delete("/reports/:id", (req, res) => {
  res.json(store.deleteReport(req.params.id));
});

export default router;
