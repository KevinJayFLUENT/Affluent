// Prompt → dashboard spec.
//
// Rather than have the model emit a raw spec (fragile: it can invent fields,
// ops, or malformed filter values), Claude interprets the natural-language
// prompt into CONSTRAINED CHOICES from a fixed menu — which row/column
// dimension, which KPIs, which scope. Code then assembles a guaranteed-valid
// spec from those choices. The exact same assembler backs the no-AI fallback,
// so an offline demo produces the same shape as a live one.

import { aiAvailable, createWithFallbackModels, extractJson, MODEL_NAME } from "../claude.js";
import { distinctValues } from "./engine.js";

const QUARTER_START = "2026-07-01";

// ── The menu ────────────────────────────────────────────────────────────────

// Dimensions that can segment the grid. Categorical dims enumerate values
// (fixed enums, or distinct-from-data snapshotted at build time); bucket dims
// carry preset numeric/date ranges.
const DIMENSIONS = {
  nbaType: { label: "Next Best Action", kind: "categorical", values: ["Re-engage", "Exit-Timing", "Divestiture", "Founder-Succession", "Distressed"] },
  ownershipType: { label: "Ownership Type", kind: "categorical", values: ["Founder-owned", "PE-owned", "Corporate-owned", "Independent"] },
  priority: { label: "NBA Priority", kind: "categorical", values: ["High", "Medium", "Low"] },
  exclusivityStatus: { label: "Exclusivity Status", kind: "categorical", values: ["Active", "Expiring Soon", "Expired", "None"] },
  stage: { label: "Stage", kind: "categorical", dynamic: true },
  accountOwner: { label: "Account Owner", kind: "categorical", dynamic: true },
  country: { label: "Country", kind: "categorical", dynamic: true },
  triggerInDays: {
    label: "Time to Trigger",
    kind: "buckets",
    cols: [
      { label: "Trigger ≤ 30 days", op: "lte", value: 30 },
      { label: "31–90 days", op: "between", value: [31, 90] },
      { label: "91–180 days", op: "between", value: [91, 180] },
      { label: "> 180 days", op: "gt", value: 180 },
    ],
  },
  daysSinceActivity: {
    label: "Days Without Engagement",
    kind: "buckets",
    cols: [
      { label: "30+ days w/o engagement", op: "gte", value: 30 },
      { label: "60+ days", op: "gte", value: 60 },
      { label: "90+ days", op: "gte", value: 90 },
      { label: "365+ days", op: "gte", value: 365 },
    ],
  },
  scoreDelta: {
    label: "Score Movement",
    kind: "buckets",
    cols: [
      { label: "Declined", op: "lt", value: 0 },
      { label: "No change", op: "eq", value: 0 },
      { label: "Up 1–9", op: "between", value: [1, 9] },
      { label: "Up 10+", op: "gte", value: 10 },
    ],
  },
  score: {
    label: "Current Score",
    kind: "buckets",
    cols: [
      { label: "Cold (< 45)", op: "lt", value: 45 },
      { label: "Watch (45–59)", op: "between", value: [45, 59] },
      { label: "Warm (60–74)", op: "between", value: [60, 74] },
      { label: "Prime (75+)", op: "gte", value: 75 },
    ],
  },
};

const ROW_DIMS = ["nbaType", "ownershipType", "priority", "stage", "accountOwner", "country", "exclusivityStatus"];
const COL_DIMS = ["triggerInDays", "daysSinceActivity", "scoreDelta", "score", "priority"];

const KPI_DEFS = {
  totalActive: { label: "Total Active Opportunities", filters: [] },
  totalQualified: { label: "Total Qualified Accounts", filters: [] },
  catalystRescores: {
    label: "Catalyst-Triggered Re-scores (This Quarter)",
    filters: [
      { field: "catalystFlag", op: "isTrue" },
      { field: "rescoredAt", op: "gte", value: QUARTER_START },
    ],
  },
  highPriority: { label: "High-Priority NBAs", filters: [{ field: "priority", op: "eq", value: "High" }] },
  neverContacted: { label: "Never Contacted", filters: [{ field: "lastActivityDate", op: "isNull" }] },
  stale90: { label: "Stale > 90 Days", filters: [{ field: "daysSinceActivity", op: "gt", value: 90 }] },
  overdue: { label: "Touches Due or Overdue", filters: [{ field: "triggerInDays", op: "lte", value: 0 }] },
  founderDeals: { label: "Founder-Owned Accounts", filters: [{ field: "ownershipType", op: "eq", value: "Founder-owned" }] },
};
const KPI_KEYS = Object.keys(KPI_DEFS);

const FILTER_BAR_FIELDS = ["country", "accountOwner", "leadOwner", "priority", "nbaType", "ownershipType", "stage", "exclusivityStatus"];

const BASE_SCOPES = {
  activeNbaOnly: [
    { field: "stage", op: "notContains", value: "Acquired" },
    { field: "nbaType", op: "notNull" },
  ],
  allActive: [{ field: "stage", op: "notContains", value: "Acquired" }],
  all: [],
};

// ── Assembler ────────────────────────────────────────────────────────────────

function segmentsFor(dimKey, rows) {
  const dim = DIMENSIONS[dimKey];
  if (!dim) return [];
  if (dim.kind === "buckets") return dim.cols;
  const values = dim.dynamic ? distinctValues(rows, dimKey) : dim.values;
  return values.map((v) => ({ label: String(v), op: "eq", value: v }));
}

function buildSpecFromChoices(choices, rows) {
  const rowDim = ROW_DIMS.includes(choices.rowDimension) ? choices.rowDimension : "nbaType";
  const colDim = COL_DIMS.includes(choices.colDimension) ? choices.colDimension : "triggerInDays";

  const kpiKeys = (choices.kpis || []).filter((k) => KPI_KEYS.includes(k)).slice(0, 3);
  while (kpiKeys.length < 3) {
    const fill = ["totalActive", "catalystRescores", "highPriority"][kpiKeys.length];
    if (!kpiKeys.includes(fill)) kpiKeys.push(fill);
    else break;
  }

  const filterBarFields = (choices.filterBarFields || ["country", "accountOwner", "priority"])
    .filter((f) => FILTER_BAR_FIELDS.includes(f))
    .slice(0, 3);

  const baseFilters = BASE_SCOPES[choices.baseScope] || BASE_SCOPES.allActive;

  // Row segments: categorical rows serialize to their value; bucket rows keep
  // the {label,op,value} descriptor. Both are understood by the engine.
  const rowSegments = segmentsFor(rowDim, rows).map((s) =>
    DIMENSIONS[rowDim].kind === "buckets" ? s : s.value
  );
  const colSegments = segmentsFor(colDim, rows);

  const reportColumns = [
    "country",
    "company",
    "accountOwner",
    "lastActivityDate",
    rowDim === "score" || colDim === "score" ? "score" : "score",
    colDim === "daysSinceActivity" ? "daysSinceActivity" : colDim === "scoreDelta" ? "scoreDelta" : "triggerInDays",
  ].filter((v, i, a) => a.indexOf(v) === i);

  return {
    name: choices.name || "Untitled Dashboard",
    description: choices.description || "",
    filterBar: filterBarFields.map((f) => ({ field: f, label: DIMENSIONS[f]?.label || FIELD_LABELS[f] || f })),
    baseFilters,
    kpis: kpiKeys.map((k) => ({ id: `kpi-${k}`, label: KPI_DEFS[k].label, filters: KPI_DEFS[k].filters })),
    grid: { rowField: rowDim, rows: rowSegments, colField: colDim, cols: colSegments },
    reportColumns,
  };
}

const FIELD_LABELS = {
  country: "Country",
  accountOwner: "Account Owner",
  leadOwner: "Lead Owner",
  priority: "NBA Priority",
  nbaType: "Next Best Action",
  ownershipType: "Ownership Type",
  stage: "Stage",
};

// ── Heuristic (no-AI) choice picker ──────────────────────────────────────────

function heuristicChoices(prompt) {
  const p = (prompt || "").toLowerCase();
  const has = (re) => re.test(p);

  // Explicit "by X" / dimension phrases win first; NBA and ownership are the
  // headline segmentations so they precede the weaker priority/owner cues.
  let rowDimension = "nbaType";
  if (has(/\bnba\b|next best|by action|action type|thesis/)) rowDimension = "nbaType";
  else if (has(/exclusiv/)) rowDimension = "exclusivityStatus";
  else if (has(/ownership|owner[- ]?type|founder[- ]?owned|pe[- ]?owned|structure|who owns/)) rowDimension = "ownershipType";
  else if (has(/\bstage\b|pipeline|funnel/)) rowDimension = "stage";
  else if (has(/by (rep|account owner)|\bper rep\b|account owner/)) rowDimension = "accountOwner";
  else if (has(/geograph|\bcountry\b|region|\bgeo\b/)) rowDimension = "country";
  else if (has(/by priority|priority (band|tier|bucket)/)) rowDimension = "priority";

  let colDimension = "triggerInDays";
  if (has(/stale|without engage|days? without|no engagement|cold|dormant|staleness/)) colDimension = "daysSinceActivity";
  else if (has(/score (change|movement|delta)|re-?rate|re-?scor|movement/)) colDimension = "scoreDelta";
  else if (has(/trigger|urgen|time[- ]?to|window|clock/)) colDimension = "triggerInDays";
  else if (has(/\bscore\b|quality|band/)) colDimension = "score";

  let kpis = ["totalActive", "catalystRescores", "highPriority"];
  if (has(/stale|never contact|engage/)) kpis = ["totalActive", "neverContacted", "stale90"];
  else if (has(/overdue|due/)) kpis = ["totalActive", "overdue", "highPriority"];

  const baseScope = rowDimension === "nbaType" ? "activeNbaOnly" : "allActive";
  return {
    rowDimension,
    colDimension,
    kpis,
    filterBarFields: ["country", "accountOwner", rowDimension === "nbaType" ? "priority" : "nbaType"],
    baseScope,
    name: titleFromPrompt(prompt),
    description: `Generated from prompt: "${(prompt || "").trim()}". Re-evaluates against the live account base on every open.`,
  };
}

function titleFromPrompt(prompt) {
  const clean = (prompt || "").replace(/^(build|show|make|create|give me|i want)\s+(me\s+)?(a\s+)?(dashboard|report|grid)?/i, "").trim();
  const words = clean.split(/\s+/).slice(0, 7).join(" ");
  const title = (words || "Custom Dashboard").replace(/[.:,;]+$/, "");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// ── Public API ────────────────────────────────────────────────────────────────

const CHOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "rowDimension", "colDimension", "kpis", "filterBarFields", "baseScope"],
  properties: {
    name: { type: "string", description: "Short dashboard title, 2-6 words" },
    description: { type: "string", description: "One sentence on what this dashboard shows and that it refreshes live" },
    rowDimension: { type: "string", enum: ROW_DIMS, description: "How to segment the grid ROWS" },
    colDimension: { type: "string", enum: COL_DIMS, description: "How to segment the grid COLUMNS (urgency / staleness / score movement)" },
    kpis: { type: "array", items: { type: "string", enum: KPI_KEYS }, description: "Exactly 3 KPI tiles, most important first" },
    filterBarFields: { type: "array", items: { type: "string", enum: FILTER_BAR_FIELDS }, description: "Up to 3 fields for the top scoping filter bar" },
    baseScope: { type: "string", enum: Object.keys(BASE_SCOPES), description: "activeNbaOnly = only accounts with an NBA; allActive = all non-acquired; all = everything" },
  },
};

async function claudeChoices(prompt) {
  const response = await createWithFallbackModels({
    model: MODEL_NAME,
    max_tokens: 700,
    output_config: { effort: "low", format: { type: "json_schema", schema: CHOICE_SCHEMA } },
    system:
      "You are the reporting engine of TCan Express, an M&A CRM for a vertical-software acquirer. " +
      "An analyst describes a dashboard they want in plain English. Translate it into a structured configuration by choosing from the fixed menus in the schema — do NOT invent fields. " +
      "The CRM's thesis is Next Best Action (NBA): every account carries an NBA type (Re-engage, Exit-Timing, Divestiture, Founder-Succession, Distressed), an ownership type, a live likelihood score (with an original vs current delta), a catalyst flag, days-without-engagement, and a time-to-trigger. " +
      "Pick the rowDimension and colDimension that best match the analyst's intent (e.g. 'NBA thesis' → rows nbaType; 'stale relationships' → cols daysSinceActivity; 'score movement / re-scores' → cols scoreDelta; 'exit timing / PE hold' → rows ownershipType). " +
      "Choose exactly 3 KPIs that a deal lead would want at the top, most important first. Write a crisp name and a one-sentence description.",
    messages: [{ role: "user", content: `Dashboard request: ${prompt}` }],
  });
  return extractJson(response);
}

export async function generateDashboardSpec(prompt, rows) {
  let choices;
  let source = "cached";
  if (aiAvailable()) {
    try {
      choices = await claudeChoices(prompt);
      source = "claude-opus-5";
    } catch (err) {
      console.error("dashboard generate fallback:", err.message);
    }
  }
  if (!choices) choices = heuristicChoices(prompt);
  // Always let the heuristic supply a good title/description if the model was terse.
  if (!choices.name) choices.name = titleFromPrompt(prompt);
  if (!choices.description) choices.description = heuristicChoices(prompt).description;

  const spec = buildSpecFromChoices(choices, rows);
  spec.prompt = prompt;
  spec.generatedBy = source;
  return spec;
}
