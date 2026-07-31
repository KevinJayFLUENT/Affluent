// New-account creation + AI enrichment.
//
// Flow (mirrors the existing enrichment-sweep pattern):
//   1. POST /api/accounts          → skeleton record written to the DB
//      immediately (exclusivity auto-assigned to the chosen owner, 6 months
//      from today). The row appears in the Pipeline in "scanning…" state.
//   2. POST /api/accounts/:id/enrich → Claude fills the Enrichment (Scraping)
//      Information section — the exact 20-field schema every seeded account
//      carries — plus financial estimates, an owner read, and 2–4 scored
//      signals. Structured JSON only, validated and clamped server-side.
//      Without an API key, a deterministic mock derived from the inputs runs
//      instead, so the flow demos identically offline.
//
// After enrichment the account is indistinguishable from a migrated one: it
// ranks on the board, opens a full War Room (a cached analysis is generated so
// even offline the room is never empty), and flows into digest and Insights.

import { aiAvailable, createWithFallbackModels, extractJson, MODEL_NAME } from "./claude.js";
import { newExclusivity } from "./exclusivity.js";

const iso = (d = new Date()) => d.toISOString().slice(0, 10);

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "account"
  );
}

// Deterministic pseudo-randomness from the company name — the offline mock
// must produce stable, plausible values across calls and restarts.
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const BRAND_COLORS = ["#3b5bdb", "#0b7285", "#5f3dc4", "#9a3412", "#b45309", "#2b8a3e", "#364fc7", "#1e4a8a"];

function initialsOf(name) {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w));
  return ((words[0]?.[0] || "?") + (words[1]?.[0] || "")).toUpperCase();
}

const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// ── Skeleton record ─────────────────────────────────────────────────────────

export function buildAccount(input, existingIds = new Set()) {
  const name = input.companyName.trim();
  let id = slugify(name);
  while (existingIds.has(id)) id = `${slugify(name)}-${Math.floor(Math.random() * 1000)}`;

  const owner = input.accountOwner || "Kevin Jay";
  const today = iso();
  const city = (input.hqCity || "").trim();
  const country = (input.hqCountry || "").trim();
  const location = [city, country].filter(Boolean).join(", ") || "—";
  const employees = Number(input.employeeCount) || null;

  const due = new Date();
  due.setDate(due.getDate() + 14);

  return {
    id,
    company: name,
    vertical: input.industry?.trim() || "Vertical software",
    location,
    brand: { color: BRAND_COLORS[hashCode(name) % BRAND_COLORS.length], initials: initialsOf(name) },
    stage: "New — Unworked",
    origin: "user",
    createdAt: new Date().toISOString(),
    owner: {
      name: "Unknown",
      title: "Owner",
      age: null,
      tenure: null,
      profile: "Awaiting enrichment — founder profile is inferred on the first sweep.",
    },
    financials: { revenue: 0, ebitdaMargin: 0, arrPct: 0, employees: employees || 0, note: "Pre-enrichment — estimates land with the sweep" },
    scores: { likelihood: 25, close: 8 },
    scoreHistory: [25],
    enriched: false,
    blockers: [
      {
        id: "b1",
        closeWeight: 4,
        label: "No relationship exists",
        status: "pending",
        detail: "Zero touches. Long game: be known before they're ready.",
        action: { id: `act-intro-${id}`, label: "Draft founder-to-operator intro (no deal talk)", artifactType: "email" },
      },
    ],
    signals: [],
    activity: [],
    nextTouch: { due: iso(due), action: `First-touch intro to ${name}`, reason: "New account — establish contact before a banker does." },
    details: {
      leadOwner: owner,
      accountOwner: owner,
      industry: input.industry?.trim() || null,
      yearEstablished: null,
      domain: (input.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "") || null,
      linkedin: (input.linkedinUrl || "").replace(/^https?:\/\//, "") || null,
      employees,
      parentCompany: null,
      leadSource: "Manual — New account",
      firstEmailDate: null,
      responded: "No contact yet",
      interest: "Tier 3",
      responseType: null,
      trueRelation: "No",
      ndaIssued: "No",
      stage: "New — Unworked",
      address: location !== "—" ? location : null,
      recurringRevenue: null,
      revenues: null,
      nextSteps: "Founder-to-operator intro, no deal talk",
      // Exclusivity auto-assigned to the Account Owner: starts on creation,
      // runs 6 months. Status is computed from the dates at read time.
      exclusivity: newExclusivity(owner, today),
      scraping: {},
      systemInfo: { createdBy: owner, createdDate: today, lastModifiedBy: owner, lastModifiedDate: today },
      ownerHistory: [],
      opportunities: [],
      notes: [],
    },
    cachedAnalysis: null,
  };
}

// ── Enrichment schema (Claude) ──────────────────────────────────────────────

const ENRICHMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scraping", "vertical", "financials", "ownerRead", "signals"],
  properties: {
    scraping: {
      type: "object",
      additionalProperties: false,
      required: [
        "employeeCountBest", "revenueBestUsd", "industry", "fundingStatus", "hqCity", "hqCountry",
        "successionScore", "acquisitionFitScore", "acquisitionFitBand", "foundedYear",
        "llmIsVms", "llmVertical", "llmSubVertical", "llmTargetCustomer", "matchConfidence",
        "revenueModel", "llmRevenueModel", "llmConfidence", "websiteDescription", "llmProductSummary",
      ],
      properties: {
        employeeCountBest: { type: "integer", minimum: 1 },
        revenueBestUsd: { type: "string", description: 'Formatted like "$5,700,000"' },
        industry: { type: "string" },
        fundingStatus: { type: "string", enum: ["bootstrapped_likely", "pe_backed", "vc_backed", "corporate_owned", "unknown"] },
        hqCity: { type: "string" },
        hqCountry: { type: "string", description: "ISO-2 code, e.g. US" },
        successionScore: { type: "integer", minimum: 0, maximum: 100 },
        acquisitionFitScore: { type: "integer", minimum: 0, maximum: 100 },
        acquisitionFitBand: { type: "string", enum: ["high", "medium", "low"] },
        foundedYear: { type: "integer", minimum: 1950, maximum: 2026 },
        llmIsVms: { type: "string", enum: ["yes", "no", "uncertain"] },
        llmVertical: { type: "string" },
        llmSubVertical: { type: "string" },
        llmTargetCustomer: { type: "string" },
        matchConfidence: { type: "integer", minimum: 0, maximum: 100 },
        revenueModel: { type: "string" },
        llmRevenueModel: { type: "string", enum: ["saas_subscription", "license_maintenance", "mixed", "services_heavy", "unknown"] },
        llmConfidence: { type: "integer", minimum: 0, maximum: 100 },
        websiteDescription: { type: "string" },
        llmProductSummary: { type: "string" },
      },
    },
    vertical: { type: "string", description: "Short vertical descriptor, e.g. 'LIMS for water testing labs'" },
    financials: {
      type: "object",
      additionalProperties: false,
      required: ["revenueM", "ebitdaMargin", "arrPct", "employees", "note"],
      properties: {
        revenueM: { type: "number", minimum: 0.1 },
        ebitdaMargin: { type: "integer", minimum: -20, maximum: 60 },
        arrPct: { type: "integer", minimum: 0, maximum: 100 },
        employees: { type: "integer", minimum: 1 },
        note: { type: "string" },
      },
    },
    ownerRead: {
      type: "object",
      additionalProperties: false,
      required: ["title", "ageEstimate", "tenureEstimate", "profile"],
      properties: {
        title: { type: "string" },
        ageEstimate: { type: "integer", minimum: 25, maximum: 85 },
        tenureEstimate: { type: "integer", minimum: 0, maximum: 50 },
        profile: { type: "string", description: "2 sentences; make clear this is inferred, not confirmed" },
      },
    },
    signals: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "contribution", "detail"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          contribution: { type: "integer", minimum: -4, maximum: 4 },
          detail: { type: "string" },
        },
      },
    },
  },
};

async function claudeEnrichment(input) {
  const response = await createWithFallbackModels({
    model: MODEL_NAME,
    max_tokens: 1800,
    output_config: { effort: "low", format: { type: "json_schema", schema: ENRICHMENT_SCHEMA } },
    system:
      "You are the enrichment engine of TCan Express, an M&A CRM for a vertical-software acquirer. " +
      "A deal lead just created a new prospect account from minimal details. Produce the enrichment record a web-scraping + LLM pipeline would: " +
      "plausible, internally consistent values for EVERY field in the schema. Where the inputs are thin, infer conservatively and LOWER the " +
      "confidence fields (llmConfidence, matchConfidence) to reflect it; never leave fields empty. Revenue should be consistent with employee " +
      "count for the industry (roughly $100–250k/employee for software). Signals are enrichment findings a sweep might surface for a cold " +
      "account (capital structure, hiring, founder tenure, vertical consolidation) with small score contributions (-2..+4). " +
      "This is a demo system — fabricating plausible data is the intended behavior, but keep it believable and unspectacular.",
    messages: [
      {
        role: "user",
        content:
          "New account details as entered:\n" +
          JSON.stringify(
            {
              companyName: input.companyName,
              linkedinUrl: input.linkedinUrl || null,
              website: input.website || null,
              industry: input.industry || null,
              employeeCount: input.employeeCount || null,
              hqCity: input.hqCity || null,
              hqCountry: input.hqCountry || null,
            },
            null,
            2
          ) +
          `\n\nToday's date: ${iso()}`,
      },
    ],
  });
  return extractJson(response);
}

// ── Deterministic mock enrichment (no API key) ─────────────────────────────

function mockEnrichment(input) {
  const name = input.companyName.trim();
  const h = hashCode(name);
  const industry = input.industry?.trim() || "Vertical Software";
  const employees = Number(input.employeeCount) || 12 + (h % 70);
  const revPerHead = 120000 + (h % 90000);
  const revenue = employees * revPerHead;
  const foundedYear = 1996 + (h % 27);
  const age = 38 + (h % 30);
  const successionScore = age >= 58 ? 55 + (h % 40) : 10 + (h % 40);
  const fitScore = 42 + (h % 46);
  // Thin inputs → lower confidence, mirroring what the live model is told.
  const provided = ["linkedinUrl", "website", "industry", "employeeCount", "hqCity", "hqCountry"].filter((k) => input[k]).length;
  const confidence = 48 + provided * 6 + (h % 8);

  const sub = industry.toLowerCase().replace(/\s*software\s*$/i, "").trim() || "niche operations";

  const signals = [
    {
      label: "Capital drought",
      value: "No outside capital found",
      contribution: 2,
      detail: "No funding events surfaced in the sweep — consistent with a bootstrapped operator and no investor exit pressure.",
    },
    successionScore >= 55
      ? {
          label: "Succession pressure",
          value: `Founder est. ${age}, ~${Math.min(2026 - foundedYear, 40)} yrs at the helm`,
          contribution: 3,
          detail: "Tenure and age inferred from public records; no visible successor in leadership listings.",
        }
      : {
          label: "Still growing",
          value: "Hiring activity detected",
          contribution: -1,
          detail: "Open roles suggest a founder mid-curve — rarely a seller this year.",
        },
    {
      label: "Quiet in a consolidating vertical",
      value: `${1 + (h % 3)} peer acquisition${h % 3 ? "s" : ""} in 24 months`,
      contribution: 1,
      detail: "Peers in the segment have been trading — waiting gets riskier for the owner every quarter.",
    },
  ];

  return {
    scraping: {
      employeeCountBest: employees,
      revenueBestUsd: money(revenue),
      industry,
      fundingStatus: "bootstrapped_likely",
      hqCity: input.hqCity?.trim() || "—",
      hqCountry: (input.hqCountry?.trim() || "US").slice(0, 2).toUpperCase(),
      successionScore,
      acquisitionFitScore: fitScore,
      acquisitionFitBand: fitScore >= 70 ? "high" : fitScore >= 55 ? "medium" : "low",
      foundedYear,
      llmIsVms: /software|saas|tech|platform|systems/i.test(industry) ? "yes" : "uncertain",
      llmVertical: sub.toLowerCase(),
      llmSubVertical: `${sub.toLowerCase()} operations software`,
      llmTargetCustomer: `small and mid-size ${sub.toLowerCase()} operators`,
      matchConfidence: Math.min(100, confidence + 15),
      revenueModel: "SaaS / Subscription",
      llmRevenueModel: "saas_subscription",
      llmConfidence: Math.min(95, confidence),
      websiteDescription: `${name} provides ${sub.toLowerCase()} software for operators in its niche.`,
      llmProductSummary: `${name} appears to offer workflow, billing, and record-keeping tools for ${sub.toLowerCase()} businesses. (Inferred — thin public footprint.)`,
    },
    vertical: `${sub} software`,
    financials: {
      revenueM: Math.round(revenue / 100000) / 10,
      ebitdaMargin: 10 + (h % 22),
      arrPct: 55 + (h % 40),
      employees,
      note: "Estimated from web signals — treat as directional",
    },
    ownerRead: {
      title: "Founder & CEO",
      ageEstimate: age,
      tenureEstimate: Math.min(2026 - foundedYear, 40),
      profile: `Inferred profile: founder-operator, ~${2026 - foundedYear} years in, no public exit signals. Classification is provisional until first contact.`,
    },
    signals,
  };
}

// ── Validation + application ────────────────────────────────────────────────

const clamp = (n, lo, hi, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : fallback;
};

// Coerce whatever came back (model or mock) into the exact scraping schema —
// the single place that guarantees new accounts match seeded ones field-for-field.
function sanitizeEnrichment(raw, input) {
  const mock = mockEnrichment(input); // reference values for any gap
  const s = raw?.scraping || {};
  const m = mock.scraping;
  const str = (v, fb) => (typeof v === "string" && v.trim() ? v.trim() : fb);

  const scraping = {
    employeeCountBest: clamp(s.employeeCountBest, 1, 200000, m.employeeCountBest),
    revenueBestUsd: str(s.revenueBestUsd, m.revenueBestUsd),
    industry: str(s.industry, m.industry),
    fundingStatus: str(s.fundingStatus, m.fundingStatus),
    hqCity: str(s.hqCity, m.hqCity),
    hqCountry: str(s.hqCountry, m.hqCountry).slice(0, 2).toUpperCase(),
    successionScore: clamp(s.successionScore, 0, 100, m.successionScore),
    acquisitionFitScore: clamp(s.acquisitionFitScore, 0, 100, m.acquisitionFitScore),
    acquisitionFitBand: ["high", "medium", "low"].includes(s.acquisitionFitBand) ? s.acquisitionFitBand : m.acquisitionFitBand,
    foundedYear: clamp(s.foundedYear, 1950, 2026, m.foundedYear),
    llmIsVms: ["yes", "no", "uncertain"].includes(s.llmIsVms) ? s.llmIsVms : m.llmIsVms,
    llmVertical: str(s.llmVertical, m.llmVertical),
    llmSubVertical: str(s.llmSubVertical, m.llmSubVertical),
    llmTargetCustomer: str(s.llmTargetCustomer, m.llmTargetCustomer),
    matchConfidence: clamp(s.matchConfidence, 0, 100, m.matchConfidence),
    revenueModel: str(s.revenueModel, m.revenueModel),
    llmRevenueModel: str(s.llmRevenueModel, m.llmRevenueModel),
    llmConfidence: clamp(s.llmConfidence, 0, 100, m.llmConfidence),
    websiteDescription: str(s.websiteDescription, m.websiteDescription),
    llmProductSummary: str(s.llmProductSummary, m.llmProductSummary),
  };

  const f = raw?.financials || {};
  const financials = {
    revenue: Number.isFinite(Number(f.revenueM)) ? Math.max(0.1, Number(f.revenueM)) : mock.financials.revenueM,
    ebitdaMargin: clamp(f.ebitdaMargin, -20, 60, mock.financials.ebitdaMargin),
    arrPct: clamp(f.arrPct, 0, 100, mock.financials.arrPct),
    employees: clamp(f.employees, 1, 200000, scraping.employeeCountBest),
    note: str(f.note, mock.financials.note),
  };

  const o = raw?.ownerRead || {};
  const ownerRead = {
    title: str(o.title, mock.ownerRead.title),
    ageEstimate: clamp(o.ageEstimate, 25, 85, mock.ownerRead.ageEstimate),
    tenureEstimate: clamp(o.tenureEstimate, 0, 50, mock.ownerRead.tenureEstimate),
    profile: str(o.profile, mock.ownerRead.profile),
  };

  let signals = Array.isArray(raw?.signals) ? raw.signals : mock.signals;
  signals = signals
    .filter((sig) => sig && sig.label && sig.value)
    .slice(0, 4)
    .map((sig, i) => ({
      id: `s-enr-${i}`,
      label: String(sig.label),
      value: String(sig.value),
      contribution: clamp(sig.contribution, -4, 4, 1),
      source: "web",
      detail: String(sig.detail || "Surfaced by the enrichment sweep."),
    }));
  if (!signals.length) signals = mock.signals.map((sig, i) => ({ id: `s-enr-${i}`, source: "web", ...sig }));

  return { scraping, vertical: str(raw?.vertical, mock.vertical), financials, ownerRead, signals };
}

// Offline-safe War Room analysis so a brand-new account always renders a full
// room. Live /api/analyze replaces this on first open when a key is present.
function buildCachedAnalysis(account, enr) {
  const first = account.details.accountOwner;
  const fit = enr.scraping.acquisitionFitScore;
  const succession = enr.scraping.successionScore;
  const archetypeLabel = succession >= 55 ? "Pre-intent Founder (succession watch)" : "Cold / Pre-intent Founder";
  return {
    likelihoodNarrative:
      `${account.company} scores ${account.scores.likelihood} — a seed, not a deal. Fit ${fit}/100 (${enr.scraping.acquisitionFitBand}) on the ` +
      `${enr.scraping.llmVertical} map with ${enr.scraping.llmConfidence}% enrichment confidence. ` +
      (succession >= 55
        ? `Succession pressure (${succession}/100) is the number to watch: the play is to be the known quantity when the owner's clock strikes.`
        : `No visible exit intent yet — the play is cheap option value: be known years before the moment comes.`),
    relationshipRead: {
      summary: "No history — blank slate. That's an asset: no bad process to live down.",
      touchVolume: "0 touches",
      sentimentArc: "N/A",
      wentColdWhen: "N/A",
      wentColdWhy: "N/A",
      ownerMood: "Unknown. Enrichment suggests heads-down operator energy.",
    },
    archetype: {
      label: archetypeLabel,
      description: `${enr.ownerRead.profile}`,
      whatToExpect:
        "Expect a polite deflection to any deal-shaped outreach. Relationship-first contact (operator content, a conference coffee) keeps the door open without spending credibility.",
      nextBehavior:
        succession >= 55
          ? "Watch for successor hires, slowing product cadence, or estate-planning signals — any of these starts the clock."
          : "Keeps building. Watch for senior departures, growth deceleration, or first institutional capital talk.",
      flashpoints: ["Deal-shaped first touch", "Valuation talk of any kind"],
      dealTwin:
        "Mirrors our nurture pattern: cold vertical founders we met 3+ years before intent closed at above-average rates because we were the known quantity when the moment came.",
    },
    revivalRadar: null,
    recommendedAction: {
      title: "Founder-to-operator intro — no deal talk",
      rationale: "Cheapest option value on the board: one warm email now buys first-call position years from now.",
      artifactType: "email",
      artifact:
        `Subject: ${account.vertical} — from someone who collects vertical SaaS stories\n\n` +
        `Hi,\n\nI lead acquisitions at Fluent — we own and grow niche software companies (we never flip them). Not writing to pitch anything: ` +
        `${account.company} keeps coming up when operators in the space talk software, and I wanted to know the person behind it.\n\n` +
        `If a coffee ever makes sense, I'm a good source of war stories on scaling vertical SaaS — if nothing else.\n\n${first.split(" ")[0]}`,
    },
  };
}

// Run the enrichment pass and apply it to the account IN PLACE (does not
// apply the signal score deltas — that stays with /api/enrich, the same
// pipeline every seeded account goes through, so the UI sweep is identical).
export async function enrichAccount(account, input) {
  let raw = null;
  let source = "mock";
  if (aiAvailable()) {
    try {
      raw = await claudeEnrichment(input);
      source = "claude-opus-5";
    } catch (err) {
      console.error("account enrichment fallback:", err.message);
    }
  }
  const enr = sanitizeEnrichment(raw, input);

  account.vertical = enr.vertical;
  account.financials = {
    revenue: enr.financials.revenue,
    ebitdaMargin: enr.financials.ebitdaMargin,
    arrPct: enr.financials.arrPct,
    employees: enr.financials.employees,
    note: enr.financials.note,
  };
  account.owner = {
    name: "Unknown (inferred owner)",
    title: enr.ownerRead.title,
    age: enr.ownerRead.ageEstimate,
    tenure: enr.ownerRead.tenureEstimate,
    profile: enr.ownerRead.profile,
  };
  account.signals = enr.signals;
  account.details.scraping = enr.scraping;
  // The enrichment Industry must always MATCH the Company Information
  // Industry: the user-entered value wins; otherwise both take the enriched one.
  if (account.details.industry) enr.scraping.industry = account.details.industry;
  else account.details.industry = enr.scraping.industry;
  account.details.yearEstablished = enr.scraping.foundedYear;
  account.details.employees = enr.scraping.employeeCountBest;
  account.details.revenues = `${enr.financials.revenue.toFixed(1)}M (est.)`;
  account.details.recurringRevenue = `$${(enr.financials.revenue * (enr.financials.arrPct / 100)).toFixed(1)}M ARR (est.)`;
  account.details.systemInfo.lastModifiedDate = iso();

  // Baseline likelihood from fit; the sweep (/api/enrich) then applies the
  // signal contributions on top, exactly like a seeded account.
  const base = 20 + Math.round(enr.scraping.acquisitionFitScore / 8);
  account.scores.likelihood = base;
  account.scores.close = 8 + Math.round(enr.scraping.acquisitionFitScore / 25);
  account.scoreHistory = [base];
  account.cachedAnalysis = buildCachedAnalysis(account, enr);
  account.enrichmentSource = source;
  return { account, source };
}
