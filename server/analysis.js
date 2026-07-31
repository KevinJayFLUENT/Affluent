// Cached Intelligence: analyze once, refresh on demand or on notable change.
//
// A stored analysis carries a FINGERPRINT of the inputs it was computed from.
// Staleness is decided by comparing that fingerprint to the account's current
// state at read time — so invalidation needs no event bookkeeping and can't
// drift out of sync with reality. The "something notable" rules:
//
//   1. New activity (count or latest entry changed) — and if the new activity
//      includes an INBOUND touch, the analysisAutoRefresh flag is set so the
//      next open re-analyzes automatically (a reply is the highest-signal
//      event in the system).
//   2. An approved action executed (blocker statuses change).
//   3. Enrichment surfaced a new signal or catalyst (signal set changed).
//   4. Stage changed.
//   5. Likelihood or close probability moved ≥5 points from any source.
//
// Routine events — opening/closing the account, navigation, page refresh,
// task toggles, the exclusivity countdown — touch none of these inputs and
// therefore never invalidate.

const STALE_SCORE_DELTA = 5;

export function analysisFingerprint(target) {
  const acts = target.activity || [];
  const last = acts[acts.length - 1];
  return {
    activityCount: acts.length,
    lastActivityKey: last ? `${last.date}|${last.direction || ""}|${(last.subject || last.note || "").slice(0, 60)}` : "",
    likelihood: target.scores?.likelihood ?? 0,
    close: target.scores?.close ?? 0,
    stage: target.details?.stage || target.stage || "",
    signalKey: (target.signals || []).map((s) => s.id).sort().join(","),
    catalystCount: (target.signals || []).filter((s) => s.catalyst).length,
    blockerKey: (target.blockers || []).map((b) => `${b.id}:${b.status}`).join(","),
  };
}

// none  — no stored analysis: run the full analysis on open (existing beat).
// fresh — render the stored analysis instantly; no SSE, no skeletons.
// stale — render stored + "Update available" affordance; auto-refresh only
//         when the invalidation came from inbound activity.
export function analysisState(target) {
  if (!target.analysisCache) return { status: "none" };
  const stored = target.analysisMeta?.fingerprint;
  if (!stored) {
    // Pre-Phase-4 cache without a fingerprint — treat as stale, manual refresh.
    return { status: "stale", reasons: ["analysis predates change tracking"], autoRefresh: false, analyzedAt: target.analysisMeta?.generatedAt || null };
  }
  const cur = analysisFingerprint(target);
  const reasons = [];
  if (cur.activityCount !== stored.activityCount || cur.lastActivityKey !== stored.lastActivityKey)
    reasons.push("new activity logged");
  if (cur.blockerKey !== stored.blockerKey) reasons.push("action executed — blockers moved");
  if (cur.signalKey !== stored.signalKey || cur.catalystCount !== stored.catalystCount)
    reasons.push("enrichment surfaced new signals");
  if (cur.stage !== stored.stage) reasons.push("stage changed");
  if (
    Math.abs(cur.likelihood - stored.likelihood) >= STALE_SCORE_DELTA ||
    Math.abs(cur.close - stored.close) >= STALE_SCORE_DELTA
  )
    reasons.push(`scores moved ≥${STALE_SCORE_DELTA} points`);

  if (!reasons.length) {
    return { status: "fresh", analyzedAt: target.analysisMeta.generatedAt, source: target.analysisMeta.source };
  }
  return {
    status: "stale",
    reasons,
    autoRefresh: !!target.analysisAutoRefresh,
    analyzedAt: target.analysisMeta.generatedAt,
    source: target.analysisMeta.source,
  };
}

// Mark that inbound activity arrived — the one invalidation that auto-runs.
export function flagInboundActivity(target) {
  target.analysisAutoRefresh = true;
}
