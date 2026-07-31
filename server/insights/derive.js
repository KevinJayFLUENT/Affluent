// Insights derivation layer.
//
// The dashboard/report engine never touches the raw target shape directly — it
// operates on a flat "account row" of exactly the fields a report can filter,
// segment, and display. This keeps the query engine simple and, critically,
// means every dashboard filter maps to a REAL, inspectable account field
// (the drill-down panel shows these field names back to the user).
//
// nbaType and ownershipType are DERIVED from live CRM attributes here rather
// than stored on the seed records — so the classification stays in one place
// and reflects the account as it currently is (post-enrichment, post-action).

const DAY = 86400000;

const COUNTRY_NAMES = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  UK: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
};

// Tier-1 geographies for the "Country in Tier-1 geos" style filter.
export const TIER1_COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia"];

function lastActivityDate(t) {
  const dates = (t.activity || []).map((a) => a.date).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function signalText(t) {
  return (t.signals || [])
    .map((s) => `${s.label || ""} ${s.value || ""} ${s.detail || ""}`)
    .join(" ")
    .toLowerCase();
}

// Ownership structure, read off enrichment + CRM fields.
export function ownershipType(t) {
  const funding = (t.details?.scraping?.fundingStatus || "").toLowerCase();
  const parent = t.details?.parentCompany || "";
  if (/pe[_-]?backed/.test(funding) || /\bfund\b|partners|capital|equity/i.test(parent)) return "PE-owned";
  if (parent && parent.trim()) return "Corporate-owned";
  if (/bootstrapped/.test(funding)) return "Founder-owned";
  return "Independent";
}

// Next Best Action archetype, derived from the record. Order encodes priority:
// a live catalyst on a dead deal is a Re-engage before anything else.
export function classifyNba(t) {
  const d = t.details || {};
  const owns = ownershipType(t);
  const text = signalText(t);
  const hasCatalyst = (t.signals || []).some((s) => s.catalyst);
  const closedLost = (d.opportunities || []).some((o) => /closed\s*lost/i.test(o.stage || ""));
  const age = t.owner?.age || 0;
  const successionScore = d.scraping?.successionScore || 0;

  const distress = /downgrade|covenant|default|distress|debt matur|liquidity|going concern|margin (deteriorat|declin|compress)/.test(text);
  const divestiture = /divest|carve[-\s]?out|10-?k|spin[-\s]?off|non[-\s]?core|earnings call/.test(text);
  const peExit = /fund (vintage|life|clock)|hold period|end of hold|exit clock|distribution pressure/.test(text);

  // 1. Dead deal + fresh external catalyst → reactivate.
  if (closedLost && hasCatalyst) return "Re-engage";
  // 2. Visible financial stress opening a time-boxed window.
  if (distress) return "Distressed";
  // 3. Corporate parent shedding a non-core unit.
  if (owns === "Corporate-owned" && divestiture) return "Divestiture";
  // 4. Sponsor approaching the end of a typical hold.
  if (owns === "PE-owned" && (peExit || true)) return "Exit-Timing";
  // 5. Aging founder, no successor, never run a process.
  if (owns === "Founder-owned" && (age >= 55 || successionScore >= 70)) return "Founder-Succession";
  // Otherwise not yet actionable (cold / pre-intent seeds).
  return null;
}

// Priority band off the live likelihood score — drives the "High-Priority NBAs" KPI.
function priorityBand(score) {
  if (score >= 60) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

// The canonical flat account row. `today` is injected so every row in a single
// refresh shares one clock (and tests can pin it).
export function accountRow(t, today = new Date()) {
  const last = lastActivityDate(t);
  const current = t.scores?.likelihood ?? 0;
  const original = t.scoreHistory && t.scoreHistory[0] != null ? t.scoreHistory[0] : current;
  const cc = (t.details?.scraping?.hqCountry || "").toUpperCase();

  return {
    id: t.id,
    company: t.company,
    vertical: t.vertical || "—",
    brand: t.brand || null,
    country: COUNTRY_NAMES[cc] || t.details?.scraping?.hqCountry || "—",
    accountOwner: t.details?.accountOwner || "—",
    leadOwner: t.details?.leadOwner || "—",
    stage: t.details?.stage || t.stage || "—",
    ownershipType: ownershipType(t),
    nbaType: classifyNba(t),
    priority: priorityBand(current),
    score: current,
    currentScore: current,
    originalScore: original,
    scoreDelta: current - original,
    closeScore: t.scores?.close ?? 0,
    catalystFlag: (t.signals || []).some((s) => s.catalyst),
    exclusivityStatus: t.details?.exclusivity?.status || "None",
    lastActivityDate: last,
    daysSinceActivity: last ? Math.round((today - new Date(last)) / DAY) : null,
    triggerInDays: t.nextTouch?.due ? Math.round((new Date(t.nextTouch.due) - today) / DAY) : null,
    nextAction: t.nextTouch?.action || null,
    nextTouchDue: t.nextTouch?.due || null,
    // Accounts re-scored during the enrichment sweep this session count as
    // "re-scored this quarter" for the catalyst KPI.
    rescoredAt: t.enriched ? today.toISOString() : null,
    tier1: TIER1_COUNTRIES.includes(COUNTRY_NAMES[cc] || ""),
  };
}

export function accountRows(targets, today = new Date()) {
  return targets.map((t) => accountRow(t, today));
}

// Field catalog — the single source of truth for which fields exist, their
// type, and a human label. Used to (a) validate LLM-generated specs and
// (b) render the filter-logic panel in the drill-down.
export const FIELD_CATALOG = {
  company: { label: "Company Name", type: "string" },
  vertical: { label: "Vertical", type: "string" },
  country: { label: "Country", type: "string" },
  accountOwner: { label: "Account Owner", type: "string" },
  leadOwner: { label: "Lead Owner", type: "string" },
  stage: { label: "Stage", type: "string" },
  ownershipType: { label: "Ownership Type", type: "enum", values: ["Founder-owned", "PE-owned", "Corporate-owned", "Independent"] },
  nbaType: { label: "Next Best Action", type: "enum", values: ["Re-engage", "Exit-Timing", "Divestiture", "Founder-Succession", "Distressed"] },
  priority: { label: "NBA Priority", type: "enum", values: ["High", "Medium", "Low"] },
  score: { label: "Current Score", type: "number" },
  currentScore: { label: "Current Score", type: "number" },
  originalScore: { label: "Original Score", type: "number" },
  scoreDelta: { label: "Score Change", type: "number" },
  closeScore: { label: "Close Probability", type: "number" },
  catalystFlag: { label: "Catalyst Active", type: "boolean" },
  exclusivityStatus: { label: "Exclusivity Status", type: "string" },
  lastActivityDate: { label: "Last Activity", type: "date" },
  daysSinceActivity: { label: "Days Without Engagement", type: "number" },
  triggerInDays: { label: "Time to Trigger (days)", type: "number" },
  rescoredAt: { label: "Last Re-scored", type: "date" },
  tier1: { label: "Tier-1 Geography", type: "boolean" },
  nextAction: { label: "Next Action", type: "string" },
};

export const KNOWN_FIELDS = Object.keys(FIELD_CATALOG);

export function fieldLabel(field) {
  return FIELD_CATALOG[field]?.label || field;
}
