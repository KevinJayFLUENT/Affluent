// Declarative query engine over flat account rows.
//
// A dashboard is data, not code: filters, KPIs, and grid segments are all
// {field, op, value} predicates evaluated here. The same evaluator powers the
// KPI tiles, every grid cell, and the drill-down report — so a number on a
// tile and the account list behind it can never disagree.

import { fieldLabel, FIELD_CATALOG } from "./derive.js";

const toTime = (v) => (v == null ? null : new Date(v).getTime());
const isDateField = (field) => FIELD_CATALOG[field]?.type === "date";

// Evaluate one predicate against one row.
export function matchFilter(row, f) {
  if (!f || !f.field) return true;
  const raw = row[f.field];
  const op = f.op || "eq";
  const val = f.value;

  switch (op) {
    case "eq":
      return String(raw) === String(val);
    case "ne":
      return String(raw) !== String(val);
    case "in":
      return Array.isArray(val) && val.map(String).includes(String(raw));
    case "notIn":
      return Array.isArray(val) && !val.map(String).includes(String(raw));
    case "notNull":
      return raw !== null && raw !== undefined && raw !== "";
    case "isNull":
      return raw === null || raw === undefined || raw === "";
    case "isTrue":
      return raw === true;
    case "isFalse":
      return raw === false || raw === null || raw === undefined;
    case "contains":
      return String(raw ?? "").toLowerCase().includes(String(val ?? "").toLowerCase());
    case "notContains":
      return !String(raw ?? "").toLowerCase().includes(String(val ?? "").toLowerCase());
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (raw === null || raw === undefined) return false;
      const a = isDateField(f.field) ? toTime(raw) : Number(raw);
      const b = isDateField(f.field) ? toTime(val) : Number(val);
      if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) return false;
      if (op === "gt") return a > b;
      if (op === "gte") return a >= b;
      if (op === "lt") return a < b;
      return a <= b;
    }
    case "between": {
      if (raw === null || raw === undefined || !Array.isArray(val)) return false;
      const a = isDateField(f.field) ? toTime(raw) : Number(raw);
      const lo = isDateField(f.field) ? toTime(val[0]) : Number(val[0]);
      const hi = isDateField(f.field) ? toTime(val[1]) : Number(val[1]);
      return a >= lo && a <= hi;
    }
    default:
      return true;
  }
}

export function applyFilters(rows, filters = []) {
  if (!filters.length) return rows;
  return rows.filter((row) => filters.every((f) => matchFilter(row, f)));
}

// Distinct non-empty values for a field — feeds the filter-bar dropdowns.
export function distinctValues(rows, field) {
  const seen = new Set();
  for (const r of rows) {
    const v = r[field];
    if (v !== null && v !== undefined && v !== "") seen.add(v);
  }
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

// The filter-bar selections (a map of field -> value) become equality filters.
export function filterBarToFilters(filterBar = [], selections = {}) {
  return filterBar
    .filter((fb) => selections[fb.field] != null && selections[fb.field] !== "" && selections[fb.field] !== "__all__")
    .map((fb) => ({ field: fb.field, op: "eq", value: selections[fb.field] }));
}

// A grid column (or KPI) is itself a predicate; a grid row is either a
// categorical value (eq) or a {label, op, value} range descriptor.
function rowPredicate(rowField, rowSpec) {
  if (rowSpec && typeof rowSpec === "object") {
    return { field: rowField, op: rowSpec.op, value: rowSpec.value };
  }
  return { field: rowField, op: "eq", value: rowSpec };
}

function colPredicate(colField, colSpec) {
  return { field: colField, op: colSpec.op, value: colSpec.value };
}

function rowLabel(rowSpec) {
  return rowSpec && typeof rowSpec === "object" ? rowSpec.label : String(rowSpec);
}
function rowValue(rowSpec) {
  return rowSpec && typeof rowSpec === "object" ? rowSpec.value : rowSpec;
}

// Compute a KPI count against the scoped rows.
export function computeKpi(scopedRows, kpi) {
  const rows = applyFilters(scopedRows, kpi.filters || []);
  return { id: kpi.id, label: kpi.label, value: rows.length, format: kpi.format || "count" };
}

// Compute the full 2D grid. Returns row objects with per-column cell counts,
// plus row totals; also column totals and a grand total.
export function computeGrid(scopedRows, grid) {
  if (!grid || !grid.rowField) return null;
  const rows = (grid.rows || []).map((rowSpec) => {
    const rPred = rowPredicate(grid.rowField, rowSpec);
    const rowRows = applyFilters(scopedRows, [rPred]);
    const cells = (grid.cols || []).map((colSpec) => {
      const cPred = colPredicate(grid.colField, colSpec);
      const value = applyFilters(rowRows, [cPred]).length;
      return { label: colSpec.label, value };
    });
    return {
      label: rowLabel(rowSpec),
      value: rowValue(rowSpec),
      total: rowRows.length,
      cells,
    };
  });

  const colTotals = (grid.cols || []).map((colSpec, i) =>
    rows.reduce((sum, r) => sum + (r.cells[i]?.value || 0), 0)
  );
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return {
    rowField: grid.rowField,
    colField: grid.colField,
    cols: (grid.cols || []).map((c) => c.label),
    rows,
    colTotals,
    grandTotal,
  };
}

// Given a dashboard + a widget descriptor, resolve the complete ordered filter
// chain that defines the underlying report. This is what both computes the
// report account list AND is shown, humanized, in the right-hand panel.
export function resolveWidgetFilters(dashboard, widget = {}, filterBarSelections = {}) {
  const filters = [];
  for (const f of dashboard.baseFilters || []) filters.push({ ...f, origin: "base" });
  for (const f of filterBarToFilters(dashboard.filterBar, filterBarSelections))
    filters.push({ ...f, origin: "scope" });

  if (widget.type === "kpi") {
    const kpi = (dashboard.kpis || []).find((k) => k.id === widget.kpiId);
    for (const f of kpi?.filters || []) filters.push({ ...f, origin: "widget" });
  } else if (widget.type === "cell" || widget.type === "grid-row" || widget.type === "grid-col") {
    const grid = dashboard.grid;
    if (grid) {
      if (widget.type === "cell" || widget.type === "grid-row") {
        const rowSpec = (grid.rows || []).find((r) => String(rowValue(r)) === String(widget.row));
        if (rowSpec != null) filters.push({ ...rowPredicate(grid.rowField, rowSpec), origin: "widget" });
      }
      if (widget.type === "cell" || widget.type === "grid-col") {
        const colSpec = (grid.cols || []).find((c) => c.label === widget.col);
        if (colSpec) filters.push({ ...colPredicate(grid.colField, colSpec), origin: "widget" });
      }
    }
  }
  return filters;
}

// Human-readable rendering of a predicate for the filter-logic panel.
export function humanizeFilter(f) {
  const label = fieldLabel(f.field);
  const v = f.value;
  const list = Array.isArray(v) ? v.join(", ") : v;
  switch (f.op) {
    case "eq":
      return `${label} equals ${v}`;
    case "ne":
      return `${label} is not ${v}`;
    case "in":
      return `${label} in [${list}]`;
    case "notIn":
      return `${label} not in [${list}]`;
    case "notNull":
      return `${label} is set`;
    case "isNull":
      return `${label} is empty`;
    case "isTrue":
      return `${label} is true`;
    case "isFalse":
      return `${label} is false`;
    case "contains":
      return `${label} contains "${v}"`;
    case "notContains":
      return `${label} does not contain "${v}"`;
    case "gt":
      return `${label} > ${v}`;
    case "gte":
      return `${label} ≥ ${v}`;
    case "lt":
      return `${label} < ${v}`;
    case "lte":
      return `${label} ≤ ${v}`;
    case "between":
      return `${label} between ${v?.[0]} and ${v?.[1]}`;
    default:
      return `${label} ${f.op} ${list}`;
  }
}

// Build the drill-down report: scoped account list + resolved, humanized
// filter rows. `columns` are field ids from the dashboard's reportColumns.
export function buildReport(rows, dashboard, widget, filterBarSelections, columns) {
  const filters = resolveWidgetFilters(dashboard, widget, filterBarSelections);
  const matched = applyFilters(rows, filters);
  const cols = (columns || dashboard.reportColumns || ["company", "accountOwner", "lastActivityDate", "score"]).filter(
    (c) => FIELD_CATALOG[c]
  );
  return {
    filters: filters.map((f) => ({
      field: f.field,
      label: fieldLabel(f.field),
      op: f.op,
      value: f.value,
      origin: f.origin || "widget",
      text: humanizeFilter(f),
    })),
    columns: cols.map((c) => ({ field: c, label: fieldLabel(c) })),
    accounts: matched.map((r) => {
      const out = { id: r.id, brand: r.brand };
      for (const c of cols) out[c] = r[c];
      return out;
    }),
    total: matched.length,
  };
}
