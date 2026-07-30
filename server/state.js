// In-memory deal state. Seeded once per server run; mutated by enrich/act.
import { seedTargets } from "./data/targets.js";

export const state = {
  targets: seedTargets(),
  log: [], // global activity log entries written by agent actions
  tasks: [],
};

export function resetState() {
  state.targets = seedTargets();
  state.log = [];
  state.tasks = [];
}

export const getTarget = (id) => state.targets.find((t) => t.id === id);

export function rankedTargets() {
  return [...state.targets].sort((a, b) => b.scores.likelihood - a.scores.likelihood);
}

// Deterministic effects of approving an action — the demo must be predictable.
// Claude supplies the reasoning narrative; this supplies the state change.
const ACTION_EFFECTS = {
  "act-reengage": { targetId: "vantage", likelihood: +17, close: +12, blockerId: "b1" },
  "act-structure": { targetId: "vantage", likelihood: +2, close: +4, blockerId: "b2" },
  "act-broker": { targetId: "vantage", likelihood: +3, close: +3, blockerId: "b3" },
  "act-visit": { targetId: "vantage", likelihood: +1, close: +2, blockerId: "b4" },
};

export function applyAction(targetId, actionId) {
  const target = getTarget(targetId);
  const effect = ACTION_EFFECTS[actionId];
  if (!target || !effect || effect.targetId !== targetId) return null;

  const before = { ...target.scores };
  target.scores.likelihood = Math.min(99, target.scores.likelihood + effect.likelihood);
  target.scores.close = Math.min(99, target.scores.close + effect.close);

  const blocker = target.blockers.find((b) => b.id === effect.blockerId);
  if (blocker) blocker.status = "in-motion";

  return { target, before, after: { ...target.scores }, blocker };
}

export function markEnriched(targetId) {
  const target = getTarget(targetId);
  if (!target || target.enriched) return target;
  target.enriched = true;
  const delta = target.signals.reduce((sum, s) => sum + s.contribution, 0);
  target.scores.likelihood = Math.max(1, Math.min(99, target.scores.likelihood + delta));
  return target;
}
