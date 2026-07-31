// Seeded default dashboards. These ship in code so the Insights tab always has
// live content on a fresh boot (even before anyone builds one from a prompt),
// and so the flagship "NBA Command Center" is guaranteed present for the demo.
//
// A dashboard is a pure declarative spec — the engine evaluates it against the
// LIVE account base every time it's opened, so these never hold stale numbers.

// Quarter start relative to the demo's "today" (2026-07-31). Kept as a literal
// so the seed is deterministic and reviewable.
const QUARTER_START = "2026-07-01";

export const SEED_DASHBOARDS = [
  {
    id: "dash-nba-command",
    name: "NBA Command Center",
    description:
      "Every tracked account by Next Best Action type and time-to-trigger urgency. Built once from a prompt; refreshes against the live account base on every open.",
    prompt:
      "Build a dashboard around our Next Best Action thesis: KPI tiles for total active opportunities, catalyst-triggered re-scores this quarter, and high-priority NBAs; then a grid of NBA type against time-to-trigger urgency buckets.",
    createdBy: "Kevin Jay",
    seeded: true,
    createdAt: "2026-07-30T14:05:00.000Z",
    filterBar: [
      { field: "country", label: "Country" },
      { field: "accountOwner", label: "Account Owner" },
      { field: "priority", label: "NBA Priority" },
    ],
    // Applied to every widget: only live deals that carry an NBA classification.
    baseFilters: [
      { field: "stage", op: "notContains", value: "Acquired" },
      { field: "nbaType", op: "notNull" },
    ],
    kpis: [
      { id: "kpi-active", label: "Total Active Opportunities", filters: [] },
      {
        id: "kpi-catalyst",
        label: "Catalyst-Triggered Re-scores (This Quarter)",
        filters: [
          { field: "catalystFlag", op: "isTrue" },
          { field: "rescoredAt", op: "gte", value: QUARTER_START },
        ],
      },
      { id: "kpi-high", label: "High-Priority NBAs", filters: [{ field: "priority", op: "eq", value: "High" }] },
    ],
    grid: {
      rowField: "nbaType",
      rows: ["Re-engage", "Exit-Timing", "Divestiture", "Founder-Succession", "Distressed"],
      colField: "triggerInDays",
      cols: [
        { label: "Trigger ≤ 30 days", op: "lte", value: 30 },
        { label: "31–90 days", op: "between", value: [31, 90] },
        { label: "91–180 days", op: "between", value: [91, 180] },
        { label: "> 180 days", op: "gt", value: 180 },
      ],
    },
    reportColumns: ["country", "company", "accountOwner", "lastActivityDate", "score", "scoreDelta", "triggerInDays"],
  },

  {
    id: "dash-ownership-staleness",
    name: "Ownership × Engagement Staleness",
    description:
      "Accounts by ownership structure against how long they've gone without engagement — the general form of the Salesforce staleness grid, on our fields. Spots relationships going quiet before they die.",
    prompt:
      "Show me accounts by ownership type against days without engagement so we can spot stale relationships before they go cold.",
    createdBy: "Kevin Jay",
    seeded: true,
    createdAt: "2026-07-30T20:15:00.000Z",
    filterBar: [
      { field: "country", label: "Country" },
      { field: "accountOwner", label: "Account Owner" },
      { field: "nbaType", label: "Next Best Action" },
    ],
    baseFilters: [{ field: "stage", op: "notContains", value: "Acquired" }],
    kpis: [
      { id: "kpi-total", label: "Total Qualified Accounts", filters: [] },
      { id: "kpi-never", label: "Never Contacted", filters: [{ field: "lastActivityDate", op: "isNull" }] },
      {
        id: "kpi-stale",
        label: "Stale > 90 Days",
        filters: [{ field: "daysSinceActivity", op: "gt", value: 90 }],
      },
    ],
    grid: {
      rowField: "ownershipType",
      rows: ["Founder-owned", "PE-owned", "Corporate-owned", "Independent"],
      colField: "daysSinceActivity",
      cols: [
        { label: "30+ days w/o engagement", op: "gte", value: 30 },
        { label: "60+ days", op: "gte", value: 60 },
        { label: "90+ days", op: "gte", value: 90 },
        { label: "365+ days", op: "gte", value: 365 },
      ],
    },
    reportColumns: ["country", "company", "accountOwner", "ownershipType", "lastActivityDate", "daysSinceActivity"],
  },
];
