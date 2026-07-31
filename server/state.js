// Deal state, backed by the persistent store (server/store.js).
//
// The working set lives in memory so route logic stays synchronous; every
// mutation calls persist(), which write-behinds the whole document to the
// configured backend (JSON file locally, Upstash on deploys, memory fallback).
//
// The database is the single source of truth. server/data/targets.js is only
// the one-time seed/migration source: on first run (or when the seed content is
// bumped) the six demo companies are written into the DB as ordinary records
// — origin: "seed" — and from then on they're editable and re-scorable through
// exactly the same code paths as user-created accounts (origin: "user").

import { seedTargets } from "./data/targets.js";
import { loadDb, persistDb, persistDbNow, emptyDb, storageMode } from "./store.js";
import { newExclusivity } from "./exclusivity.js";

// Seed identity is a fingerprint of the seed CONTENT, so any edit to
// targets.js re-migrates the demo records on next boot automatically —
// user-created accounts and saved insights definitions are always preserved.
// Bump the prefix to force a re-migration even without a content change.
const SEED_PREFIX = "v1:";

function seedFingerprint() {
  const json = JSON.stringify(seedTargets());
  let h = 0;
  for (let i = 0; i < json.length; i++) h = (h * 31 + json.charCodeAt(i)) | 0;
  return SEED_PREFIX + (h >>> 0).toString(36);
}

// Staggered exclusivity backfill for the migrated demo accounts — tied to each
// account's existing owner, dated off real moments in their histories, and
// chosen to demo all three statuses (relative to the demo window, Jul 2026):
// Expired (Vantage, Solenta) · Expiring Soon (Novaris) · Active (the rest).
const SEED_EXCLUSIVITY = {
  vantage: { owner: "Kevin Jay", startDate: "2025-04-18" }, // → 2025-10-18 · Expired
  novaris: { owner: "Kevin Jay", startDate: "2026-02-19" }, // → 2026-08-19 · Expiring Soon
  merritt: { owner: "Kevin Jay", startDate: "2026-06-25" }, // → 2026-12-25 · Active
  solenta: { owner: "Priya Raman", startDate: "2025-09-18" }, // → 2026-03-18 · Expired
  hartline: { owner: "Kevin Jay", startDate: "2026-04-22" }, // → 2026-10-22 · Active
  plexa: { owner: "Dana Whitfield", startDate: "2026-07-02" }, // → 2027-01-02 · Active
};

const withHistory = (t) => ({ ...t, scoreHistory: [t.scores.likelihood] });

function buildSeedAccount(t) {
  const account = withHistory(t);
  account.origin = "seed";
  const ex = SEED_EXCLUSIVITY[t.id];
  if (ex) {
    account.details = {
      ...account.details,
      exclusivity: { ...newExclusivity(ex.owner, ex.startDate), challengeStatus: account.details?.exclusivity?.challengeStatus || "None" },
    };
  }
  return account;
}

// The in-memory working set. Object identity is stable (imported directly all
// over app.js); contents are hydrated from the store by ensureReady().
export const state = {
  targets: [],
  log: [],
  tasks: [],
  digest: null,
  // Insights definitions (managed by server/insights/store.js)
  dashboards: [],
  reports: [],
  refreshedAt: {},
};

let seedVersion = "";

function toDb() {
  return {
    ...emptyDb(),
    seedVersion,
    accounts: state.targets,
    log: state.log,
    tasks: state.tasks,
    digest: state.digest || null,
    dashboards: state.dashboards,
    reports: state.reports,
    refreshedAt: state.refreshedAt,
  };
}

// Debounced write-behind of the full working set.
export const persist = () => persistDb(toDb());
// Immediate durable write — for creations the client depends on.
export const persistNow = () => persistDbNow(toDb());

let readyPromise = null;

// Hydrate the working set from the store; migrate seeds on first run or when
// the seed version was bumped. Idempotent — every route awaits this.
export function ensureReady() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

async function init() {
  const db = await loadDb();
  state.targets = db.accounts || [];
  state.log = db.log || [];
  state.tasks = db.tasks || [];
  state.digest = db.digest || null;
  state.dashboards = db.dashboards || [];
  state.reports = db.reports || [];
  state.refreshedAt = db.refreshedAt || {};
  seedVersion = db.seedVersion || "";

  const fingerprint = seedFingerprint();
  if (seedVersion !== fingerprint || !state.targets.length) {
    migrateSeeds();
    seedVersion = fingerprint;
    await persistNow();
    console.log(`state: migrated ${seedTargets().length} seed accounts into the ${storageMode()} store (seed ${fingerprint})`);
  } else {
    console.log(`state: hydrated ${state.targets.length} accounts from the ${storageMode()} store`);
  }
}

// Replace seed-origin records with fresh seeds; user-created records survive.
function migrateSeeds() {
  const seedIds = new Set(seedTargets().map((t) => t.id));
  const userAccounts = state.targets.filter((t) => t.origin === "user" && !seedIds.has(t.id));
  state.targets = [...seedTargets().map(buildSeedAccount), ...userAccounts];
}

// ⟲ Demo reset: restore the demo companies to their original seeded state but
// preserve user-created accounts and saved Insights definitions. Log/task
// entries tied to demo accounts are cleared with them.
export function resetState() {
  const seedIds = new Set(seedTargets().map((t) => t.id));
  const isUserEntry = (e) => e.targetId && !seedIds.has(e.targetId);
  migrateSeeds();
  state.log = state.log.filter(isUserEntry);
  state.tasks = state.tasks.filter(isUserEntry);
  state.digest = null;
  persist();
}

export const getTarget = (id) => state.targets.find((t) => t.id === id);

export function rankedTargets() {
  return [...state.targets].sort((a, b) => b.scores.likelihood - a.scores.likelihood);
}

// Add a newly created account to the working set (caller persists).
export function addAccount(account) {
  state.targets.push(account);
  return account;
}

// Deterministic effects of approving an action — the demo must be predictable.
// Claude supplies the reasoning narrative; this supplies the state change.
const ACTION_EFFECTS = {
  "act-reengage": { targetId: "vantage", likelihood: +17, close: +12, blockerId: "b1",
    nextTouch: { due: "2026-08-13", action: "Silence window — do NOT touch Ray before this date", reason: "Silent-founder pattern: a second email inside two weeks confirms his 'they're desperate' prior." } },
  "act-structure": { targetId: "vantage", likelihood: +2, close: +4, blockerId: "b2" },
  "act-broker": { targetId: "vantage", likelihood: +3, close: +3, blockerId: "b3" },
  "act-visit": { targetId: "vantage", likelihood: +1, close: +2, blockerId: "b4" },
  "act-preempt": { targetId: "novaris", likelihood: +6, close: +8, blockerId: "b1",
    nextTouch: { due: "2026-10-15", action: "Hold Copper Gate to the post-Q3 hour", reason: "Pre-empt signal sent; the sponsor named the window." } },
  "act-marks": { targetId: "novaris", likelihood: +1, close: +3, blockerId: "b2" },
  "act-nda": { targetId: "merritt", likelihood: +6, close: +8, blockerId: "b1",
    nextTouch: { due: "2026-08-04", action: "Check with Doc that Ray Hutchins got the NDA summary", reason: "Give the lawyer a week with the plain-English summary, then a gentle nudge." } },
  "act-fin": { targetId: "merritt", likelihood: +2, close: +5, blockerId: "b2" },
  "act-meet": { targetId: "merritt", likelihood: +3, close: +5, blockerId: "b3",
    nextTouch: { due: "2026-08-07", action: "Tulsa dinner with Doc and Cole", reason: "Family dinner before any paper — the referred-seller pattern." } },
  "act-annual": { targetId: "solenta", likelihood: +5, close: +6, blockerId: "b1",
    nextTouch: { due: "2026-09-16", action: "Send the scheduled anniversary note (drafted, queued)", reason: "His date. Sending early resets his trust clock." } },
  "act-founderdinner": { targetId: "solenta", likelihood: +2, close: +4, blockerId: "b2" },
  "act-erie": { targetId: "hartline", likelihood: +9, close: +7, blockerId: "b1",
    nextTouch: { due: "2026-08-11", action: "Erie shop visit — booked", reason: "Shop tour + lunch. Bring nothing. Talk castings, not price." } },
  "act-arr": { targetId: "hartline", likelihood: +1, close: +3, blockerId: "b2" },
  "act-intro": { targetId: "plexa", likelihood: +4, close: +3, blockerId: "b1",
    nextTouch: { due: "2026-09-08", action: "Coffee with Jess Okafor at Dockside Expo", reason: "Intro sent; conference coffee is the natural follow-through." } },
  "act-kestrel-proof": { targetId: "kestrel", likelihood: +5, close: +7, blockerId: "b1",
    nextTouch: { due: "2026-08-14", action: "Follow up once Susan has called the references", reason: "Give her a week to check; qualifying founders do their homework fast." } },
  "act-kestrel-call": { targetId: "kestrel", likelihood: +2, close: +5, blockerId: "b2" },
  "act-orbita-coffee": { targetId: "orbita", likelihood: +2, close: +3, blockerId: "b1",
    nextTouch: { due: "2026-11-18", action: "Next quarterly coffee with Carlos", reason: "Split-partner cadence: present, patient, no pressure." } },
  "act-orbita-cto": { targetId: "orbita", likelihood: +3, close: +4, blockerId: "b2" },
  "act-brightspan-call": { targetId: "brightspan", likelihood: +6, close: +8, blockerId: "b1",
    nextTouch: { due: "2026-08-07", action: "Thursday call with Marie — distribution framing", reason: "Channel-shock window: engagement decays as she patches the reseller gap." } },
  "act-brightspan-frame": { targetId: "brightspan", likelihood: +2, close: +4, blockerId: "b2" },
  "act-cobalt-recap": { targetId: "cobalt", likelihood: +5, close: +6, blockerId: "b1",
    nextTouch: { due: "2026-09-15", action: "Hand Ray the recap one-pager at Comfortech", reason: "In person, direct to Ray — not through the investor channel." } },
  "act-cobalt-direct": { targetId: "cobalt", likelihood: +3, close: +4, blockerId: "b2" },
};

export function applyAction(targetId, actionId) {
  const target = getTarget(targetId);
  if (!target) return null;

  // Scripted demo effects when we have them; otherwise a generic effect so
  // user-created accounts run through the identical approve→rescore path.
  let effect = ACTION_EFFECTS[actionId];
  if (effect && effect.targetId !== targetId) return null;
  if (!effect) {
    const owningBlocker = target.blockers?.find((b) => b.action?.id === actionId);
    if (!owningBlocker) return null;
    effect = {
      targetId,
      likelihood: +5,
      close: Math.max(3, Math.min(8, owningBlocker.closeWeight || 4)),
      blockerId: owningBlocker.id,
    };
  }

  const before = { ...target.scores };
  target.scores.likelihood = Math.min(99, target.scores.likelihood + effect.likelihood);
  target.scores.close = Math.min(99, target.scores.close + effect.close);
  target.scoreHistory.push(target.scores.likelihood);

  const blocker = target.blockers.find((b) => b.id === effect.blockerId);
  if (blocker) blocker.status = "in-motion";
  if (effect.nextTouch) target.nextTouch = { ...effect.nextTouch };

  persist();
  return { target, before, after: { ...target.scores }, blocker };
}

export function markEnriched(targetId) {
  const target = getTarget(targetId);
  if (!target || target.enriched) return target;
  target.enriched = true;
  const delta = target.signals.reduce((sum, s) => sum + s.contribution, 0);
  target.scores.likelihood = Math.max(1, Math.min(99, target.scores.likelihood + delta));
  target.scoreHistory.push(target.scores.likelihood);
  persist();
  return target;
}
