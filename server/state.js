// In-memory deal state. Seeded once per server run; mutated by enrich/act.
import { seedTargets } from "./data/targets.js";

// Each target tracks its likelihood history so the UI can draw trends.
const withHistory = (t) => ({ ...t, scoreHistory: [t.scores.likelihood] });

export const state = {
  targets: seedTargets().map(withHistory),
  log: [], // global activity log entries written by agent actions
  tasks: [],
};

export function resetState() {
  state.targets = seedTargets().map(withHistory);
  state.log = [];
  state.tasks = [];
  state.digest = null;
}

export const getTarget = (id) => state.targets.find((t) => t.id === id);

export function rankedTargets() {
  return [...state.targets].sort((a, b) => b.scores.likelihood - a.scores.likelihood);
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
};

export function applyAction(targetId, actionId) {
  const target = getTarget(targetId);
  const effect = ACTION_EFFECTS[actionId];
  if (!target || !effect || effect.targetId !== targetId) return null;

  const before = { ...target.scores };
  target.scores.likelihood = Math.min(99, target.scores.likelihood + effect.likelihood);
  target.scores.close = Math.min(99, target.scores.close + effect.close);
  target.scoreHistory.push(target.scores.likelihood);

  const blocker = target.blockers.find((b) => b.id === effect.blockerId);
  if (blocker) blocker.status = "in-motion";
  if (effect.nextTouch) target.nextTouch = { ...effect.nextTouch };

  return { target, before, after: { ...target.scores }, blocker };
}

export function markEnriched(targetId) {
  const target = getTarget(targetId);
  if (!target || target.enriched) return target;
  target.enriched = true;
  const delta = target.signals.reduce((sum, s) => sum + s.contribution, 0);
  target.scores.likelihood = Math.max(1, Math.min(99, target.scores.likelihood + delta));
  target.scoreHistory.push(target.scores.likelihood);
  return target;
}
