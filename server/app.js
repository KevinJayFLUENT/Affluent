import express from "express";
import { PATTERN_LIBRARY } from "./data/targets.js";
import {
  state, getTarget, rankedTargets, applyAction, markEnriched, resetState,
  ensureReady, persist, persistNow, addAccount,
} from "./state.js";
import { analyzeTarget, rescoreAfterAction, writeDigest, prepMeetingBrief, aiAvailable } from "./claude.js";
import { computeConversationSignals, conversationSummaryLine } from "./conversation.js";
import { withStatus } from "./exclusivity.js";
import { buildAccount, enrichAccount } from "./accounts.js";
import { analysisFingerprint, analysisState, flagInboundActivity } from "./analysis.js";
import { synthesizeActivity, validateRecords } from "./synthesize.js";
import { accountRows, FIELD_CATALOG } from "./insights/derive.js";
import { applyFilters, humanizeFilter } from "./insights/engine.js";
import insightsRouter from "./insights/routes.js";

// Response decoration: computed conversation indicators, live exclusivity
// status (derived from dates, never stored), and the intelligence-cache state
// (fresh / stale / none — compared against the stored analysis fingerprint).
const withConversation = (t) => ({
  ...t,
  conversationSignals: computeConversationSignals(t),
  analysisState: analysisState(t),
  details: t.details ? { ...t.details, exclusivity: withStatus(t.details.exclusivity) } : t.details,
});

const app = express();
app.use(express.json());

// Hydrate the working set from the persistent store (and run the one-time
// seed migration) before any route touches state.
app.use("/api", (req, res, next) => {
  ensureReady().then(() => next(), next);
});

// Insights: persistent Reports & Dashboards (prompt-built, refresh live).
app.use("/api/insights", insightsRouter);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Board ────────────────────────────────────────────────────────────────
app.get("/api/targets", (req, res) => {
  res.json({
    targets: rankedTargets().map(withConversation),
    log: state.log,
    tasks: state.tasks,
    digest: state.digest || null,
    ai: aiAvailable(),
  });
});

// ── Task done-toggle (My Day) ────────────────────────────────────────────
app.post("/api/task", (req, res) => {
  const task = state.tasks.find((t) => t.id === req.body?.taskId);
  if (!task) return res.status(404).json({ error: "unknown task" });
  task.done = Boolean(req.body?.done);
  persist();
  res.json({ ok: true, task });
});

// ── Weekly portfolio sweep digest ────────────────────────────────────────
app.post("/api/digest", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  // Optional owner scope: sweep one deal lead's book, or the whole house.
  const owner = req.body?.owner || null;
  const pool = owner
    ? state.targets.filter((t) => (t.details?.accountOwner || t.owner.name) === owner)
    : state.targets;
  if (!pool.length) return res.status(400).json({ error: `no accounts owned by ${owner}` });
  const snapshot = pool.map((t) => ({
    company: t.company,
    stage: t.stage,
    scores: t.scores,
    nextTouch: t.nextTouch,
    catalyst: t.signals.some((s) => s.catalyst),
    daysSinceLastActivity: t.activity.length
      ? Math.round((Date.now() - new Date(t.activity[t.activity.length - 1].date)) / 86400000)
      : null,
    openBlockers: t.blockers.filter((b) => b.status === "blocked" || b.status === "pending").length,
  }));

  const dueSoon = pool.filter((t) => t.nextTouch && t.nextTouch.due <= today);
  const catalysts = pool.filter((t) => t.signals.some((s) => s.catalyst));
  const top = [...pool].sort((a, b) => b.scores.likelihood - a.scores.likelihood)[0];

  let digest = null;
  if (aiAvailable()) {
    try {
      digest = await writeDigest({ today, ownerScope: owner || "entire book", accounts: snapshot }, PATTERN_LIBRARY);
      digest.source = "claude-opus-5";
    } catch (err) {
      console.error("digest fallback:", err.message);
    }
  }
  if (!digest) {
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const dueThisWeek = pool.filter((t) => t.nextTouch && t.nextTouch.due > today && t.nextTouch.due <= weekAhead);
    digest = {
      headline: `${catalysts.length} catalyst${catalysts.length === 1 ? "" : "s"} active · ${dueSoon.length} touch${dueSoon.length === 1 ? "" : "es"} due or overdue`,
      summary:
        `${top.company} leads the board at ${top.scores.likelihood}` +
        (dueSoon.length ? `; ${dueSoon.map((t) => t.company.split(" ")[0]).join(" and ")} need${dueSoon.length === 1 ? "s" : ""} action before deals die quietly` : "; the book is on cadence") +
        `.`,
      priorities: [
        ...dueSoon.map((t) => ({
          company: t.company,
          action: t.nextTouch.action,
          why: t.nextTouch.reason,
          urgency: "now",
        })),
        ...(catalysts.length && !dueSoon.some((t) => t.id === catalysts[0].id)
          ? [{
              company: catalysts[0].company,
              action: "Act on the catalyst before a rival reads the same news",
              why: catalysts[0].signals.find((s) => s.catalyst)?.detail || "Catalyst active.",
              urgency: "now",
            }]
          : []),
        ...dueThisWeek.map((t) => ({
          company: t.company,
          action: t.nextTouch.action,
          why: t.nextTouch.reason,
          urgency: "this-week",
        })),
      ].slice(0, 4),
      source: "cached",
    };
  }
  digest.generatedAt = new Date().toISOString();
  digest.ownerScope = owner || "all";
  state.digest = digest;
  persist();
  res.json({ digest });
});

// ── Enrichment sweep (one target) ────────────────────────────────────────
// Returns cached signals + score delta. Deterministic and instant so the
// board sweep never stalls; the UI paces the chip reveal.
app.post("/api/enrich", (req, res) => {
  const target = getTarget(req.body?.targetId);
  if (!target) return res.status(404).json({ error: "unknown target" });
  const before = target.scores.likelihood;
  markEnriched(target.id);
  res.json({
    targetId: target.id,
    signals: target.signals,
    before,
    after: target.scores.likelihood,
    catalyst: target.signals.some((s) => s.catalyst),
  });
});

// ── War Room analysis (SSE) ──────────────────────────────────────────────
// Streams agent-trace steps while the real Claude call runs; ends with the
// full analysis JSON. Falls back to the target's cached analysis on failure.
app.post("/api/analyze", async (req, res) => {
  const target = getTarget(req.body?.targetId);
  if (!target) return res.status(404).json({ error: "unknown target" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Serve the cached analysis instantly unless a re-run was requested —
  // every uncached open is a fresh (slow, billable) model call.
  if (target.analysisCache && !req.body?.force) {
    const meta = target.analysisMeta || {};
    send("trace", { text: `Restoring analysis from cache (${meta.source || "cached"}, generated ${meta.generatedAt ? new Date(meta.generatedAt).toLocaleTimeString() : "earlier"})` });
    send("trace", { text: "Use ↻ Re-analyze for a fresh read of the record" });
    send("analysis", { targetId: target.id, analysis: target.analysisCache, meta, target });
    return res.end();
  }

  const conversationSignals = computeConversationSignals(target);

  // Snapshot the input fingerprint (and the auto-refresh flag) NOW — the
  // model prompt serializes the record at this moment, so anything that
  // mutates the account mid-run must read as a NEW change against this
  // analysis, not get absorbed into it.
  const inputFingerprint = analysisFingerprint(target);
  const autoRefreshAtStart = !!target.analysisAutoRefresh;

  // Kick off the real analysis immediately; trace steps pace alongside it.
  let analysisSource = "cached";
  const analysisPromise = aiAvailable()
    ? analyzeTarget(target, PATTERN_LIBRARY, conversationSignals)
        .then((a) => {
          analysisSource = "claude-opus-5";
          return a;
        })
        .catch((err) => {
          console.error("analyze fallback:", err.message);
          return target.cachedAnalysis;
        })
    : Promise.resolve(target.cachedAnalysis);

  const touches = target.activity.length;
  const unanswered = target.activity.filter((a) => a.sentiment === "none").length;
  const reps = new Set(target.activity.map((a) => a.rep)).size;
  const steps = [
    `Loading CRM record for ${target.company} — ${touches} activities, ${reps} rep(s)`,
    `Reading multi-year history → ${unanswered} of ${touches} touches went unanswered`,
    ...conversationSignals.slice(0, 4).map(
      (s) => `Conversation: ${s.label} → ${s.value} (${s.contribution >= 0 ? "+" : ""}${s.contribution})`
    ),
    conversationSummaryLine(conversationSignals),
    `Scanning enrichment signals → ${target.signals.length} active signals`,
    ...target.signals.slice(0, 3).map(
      (s) =>
        `${s.source === "web" ? "Web" : s.source === "broker" ? "Broker channel" : "CRM"}: ${s.label} → ${
          s.contribution >= 0 ? "+" : ""
        }${s.contribution} likelihood`
    ),
    `Matching against deal-twin pattern library (7 analogs)`,
    `Classifying seller archetype from sentiment arc…`,
    `Drafting recommended action…`,
  ];

  try {
    for (const step of steps) {
      send("trace", { text: step });
      await sleep(400 + Math.random() * 150);
    }
    send("trace", { text: "Synthesizing analysis (claude-opus-5)…" });
    const analysis = await analysisPromise;
    const meta = {
      generatedAt: new Date().toISOString(),
      source: analysisSource,
      // Inputs this analysis was computed from (snapshotted at run START, when
      // the record was serialized into the prompt) — staleness is decided by
      // comparing this fingerprint to the account's live state at read time.
      fingerprint: inputFingerprint,
    };
    target.analysisCache = analysis;
    target.analysisMeta = meta;
    // Consume the auto-refresh flag only if it was set when this run started;
    // an inbound touch landing mid-run must still trigger the next refresh.
    if (autoRefreshAtStart) target.analysisAutoRefresh = false;
    persist();
    send("trace", { text: "Analysis complete — rendering War Room" });
    send("analysis", { targetId: target.id, analysis, meta, target });
  } catch (err) {
    console.error("analyze stream error:", err.message);
    send("analysis", { targetId: target.id, analysis: target.cachedAnalysis, meta: null, target });
  }
  res.end();
});

// ── Execute an approved action ───────────────────────────────────────────
app.post("/api/act", async (req, res) => {
  const { targetId, actionId, actionLabel, artifact } = req.body || {};
  const target = getTarget(targetId);
  if (!target) return res.status(404).json({ error: "unknown target" });

  // Snapshot scores before mutation so Claude sees the true before/after.
  const scoresBefore = { ...target.scores };
  const result = applyAction(targetId, actionId);
  if (!result) return res.status(400).json({ error: "unknown action" });

  let reasoning = null;
  if (aiAvailable()) {
    try {
      reasoning = await rescoreAfterAction(
        { ...target, scores: scoresBefore },
        { id: actionId, label: actionLabel, artifact },
        result.after,
        PATTERN_LIBRARY
      );
    } catch (err) {
      console.error("act fallback:", err.message);
    }
  }
  if (!reasoning) {
    reasoning = {
      rescoreRationale: `Action executed. Likelihood ${result.before.likelihood}→${result.after.likelihood}, close probability ${result.before.close}→${result.after.close}. Consistent with the matching deal-twin analog: momentum actions on this archetype historically preceded re-engagement.`,
      traceLines: [
        `Executing: ${actionLabel || actionId}`,
        "Writing activity to CRM timeline",
        "Updating blocker status → In Motion",
        "Re-scoring likelihood & close probability",
        "Re-ranking board",
      ],
      nextTask: `Follow up on "${actionLabel || actionId}" per archetype cadence — do not chase early.`,
    };
  }

  const logEntry = {
    id: `log-${Date.now()}`,
    date: new Date().toISOString(),
    targetId,
    company: target.company,
    text: actionLabel || actionId,
    detail: reasoning.rescoreRationale,
  };
  state.log.unshift(logEntry);

  const task = {
    id: `task-${Date.now()}`,
    targetId,
    company: target.company,
    text: reasoning.nextTask,
    done: false,
  };
  state.tasks.unshift(task);

  // Also write it into the target's own activity timeline
  const activityEntry = {
    date: new Date().toISOString().slice(0, 10),
    rep: "Agent (approved by Kevin Jay)",
    type: "action",
    sentiment: "positive",
    note: actionLabel || actionId,
  };
  target.activity.push(activityEntry);
  persist();

  res.json({
    before: result.before,
    after: result.after,
    blockerId: result.blocker?.id,
    reasoning,
    logEntry,
    task,
    activityEntry,
    board: rankedTargets().map((t) => ({ id: t.id, likelihood: t.scores.likelihood })),
  });
});

// ── Simulated inbound reply (scripted demo event) ───────────────────────
// Fires the target's predicted reply after its prerequisite action ran.
// The prediction coming true on screen is the payoff of the demo.
app.post("/api/simulate", (req, res) => {
  const target = getTarget(req.body?.targetId);
  const sim = target?.simulatedReply;
  if (!target || !sim) return res.status(404).json({ error: "no simulated event for target" });
  if (target.replySimulated) return res.status(400).json({ error: "already simulated" });

  const prereq = target.blockers.find((b) => b.action?.id === sim.requiresAction);
  if (prereq && prereq.status !== "in-motion") {
    return res.status(400).json({ error: "prerequisite action not yet executed" });
  }

  const before = { ...target.scores };
  target.scores.likelihood = Math.min(99, target.scores.likelihood + sim.effects.likelihood);
  target.scores.close = Math.min(99, target.scores.close + sim.effects.close);
  target.scoreHistory.push(target.scores.likelihood);

  const resolved = target.blockers.find((b) => b.id === sim.effects.resolveBlockerId);
  if (resolved) resolved.status = "resolved";

  target.activity.push(sim.reply);
  // Inbound reply = highest-signal event: the stored analysis auto-refreshes
  // on next open (the in-room payoff panels render live as before).
  flagInboundActivity(target);
  target.replySimulated = true;
  target.predictionOutcome = sim.predictionCheck;
  target.recommendedOverride = sim.nextRecommendedAction;
  if (sim.nextTouch) target.nextTouch = { ...sim.nextTouch };

  const logEntry = {
    id: `log-${Date.now()}`,
    date: new Date().toISOString(),
    targetId: target.id,
    company: target.company,
    text: `Inbound reply from ${target.owner.name} — archetype prediction confirmed`,
    detail: sim.reply.note,
  };
  state.log.unshift(logEntry);

  const task = {
    id: `task-${Date.now()}`,
    targetId: target.id,
    company: target.company,
    text: sim.nextTask,
    done: false,
  };
  state.tasks.unshift(task);
  persist();

  res.json({
    before,
    after: { ...target.scores },
    reply: sim.reply,
    predictionCheck: sim.predictionCheck,
    traceLines: sim.traceLines,
    resolvedBlockerId: resolved?.id,
    recommendedOverride: sim.nextRecommendedAction,
    logEntry,
    task,
  });
});

// ── Meeting prep brief ───────────────────────────────────────────────────
// One-pager ahead of the next touch. Live Claude when available; otherwise
// assembled deterministically from the cached analysis.
app.post("/api/brief", async (req, res) => {
  const target = getTarget(req.body?.targetId);
  if (!target) return res.status(404).json({ error: "unknown target" });

  let brief = null;
  if (aiAvailable()) {
    try {
      brief = await prepMeetingBrief(target, PATTERN_LIBRARY, computeConversationSignals(target));
      brief.source = "claude-opus-5";
    } catch (err) {
      console.error("brief fallback:", err.message);
    }
  }
  if (!brief) {
    const a = target.cachedAnalysis;
    const firstSentence = (s = "") => (s.match(/^.+?[.!?](?=\s|$)/s) || [s])[0];
    brief = {
      meetingContext: target.nextTouch
        ? `${target.nextTouch.action}. ${target.nextTouch.reason}`
        : `Next touch with ${target.owner.name} — ${target.stage}.`,
      objective: (target.recommendedOverride || a.recommendedAction).title,
      relationshipRecap: a.relationshipRead.summary,
      talkingPoints: [
        ...(a.revivalRadar
          ? [{ point: a.revivalRadar.catalyst, why: firstSentence(a.revivalRadar.whyItChangesTheMath) }]
          : []),
        { point: `What to expect from ${target.owner.name.split(" ")[0]}`, why: firstSentence(a.archetype.whatToExpect) },
        { point: "Owner mood going in", why: firstSentence(a.relationshipRead.ownerMood) },
        { point: "The precedent", why: firstSentence(a.archetype.dealTwin) },
      ].slice(0, 4),
      landmines: a.archetype.flashpoints.map((f) => ({ rule: f, detail: null })),
      theAsk: (target.recommendedOverride || a.recommendedAction).rationale,
      source: "cached",
    };
  }
  brief.generatedAt = new Date().toISOString();
  target.meetingBrief = brief;
  persist();
  res.json({ brief });
});

// ── New account: create immediately, enrich as a second pass ─────────────
app.post("/api/accounts", async (req, res) => {
  const input = req.body || {};
  if (!input.companyName || !String(input.companyName).trim()) {
    return res.status(400).json({ error: "companyName is required" });
  }
  const dup = state.targets.find(
    (t) => t.company.toLowerCase() === String(input.companyName).trim().toLowerCase()
  );
  if (dup) return res.status(409).json({ error: `An account named "${dup.company}" already exists` });

  const account = buildAccount(input, new Set(state.targets.map((t) => t.id)));
  addAccount(account);

  const logEntry = {
    id: `log-${Date.now()}`,
    date: new Date().toISOString(),
    targetId: account.id,
    company: account.company,
    text: `Account created by ${account.details.accountOwner}`,
    detail: `Exclusivity assigned to ${account.details.exclusivity.owner} through ${account.details.exclusivity.endDate}. Enrichment sweep queued.`,
  };
  state.log.unshift(logEntry);

  await persistNow(); // durable before the client sees it
  res.json({ target: withConversation(account), logEntry });
});

// AI enrichment pass for a newly created account: fills the full scraping
// schema + signals, then /api/enrich (the standard sweep) applies the score
// deltas so the UI treatment is identical to seeded accounts.
app.post("/api/accounts/:id/enrich", async (req, res) => {
  const target = getTarget(req.params.id);
  if (!target) return res.status(404).json({ error: "unknown account" });
  if (target.origin !== "user") return res.status(400).json({ error: "seeded accounts use /api/enrich" });

  const input = {
    companyName: target.company,
    linkedinUrl: target.details.linkedin,
    website: target.details.domain,
    industry: target.details.industry,
    employeeCount: target.details.employees,
    hqCity: req.body?.hqCity || target.details.address?.split(",")[0],
    hqCountry: req.body?.hqCountry,
    ...req.body,
  };

  try {
    const { source } = await enrichAccount(target, input);
    const before = target.scores.likelihood;
    markEnriched(target.id); // applies signal contributions — same pipeline as seeds
    await persistNow();
    res.json({
      target: withConversation(target),
      signals: target.signals,
      before,
      after: target.scores.likelihood,
      catalyst: target.signals.some((s) => s.catalyst),
      source,
    });
  } catch (err) {
    console.error("account enrich error:", err.message);
    res.status(500).json({ error: "enrichment failed", detail: err.message });
  }
});

// ── Activity Synthesizer ──────────────────────────────────────────────────
// Step 1: synthesize — raw pasted text → structured records + flagged issues.
// Nothing is written; the client shows an editable review table.
app.post("/api/activity/synthesize", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  if (text.length > 60000) return res.status(400).json({ error: "paste is too large (60k char limit)" });
  const target = req.body?.targetId ? getTarget(req.body.targetId) : null;
  try {
    const result = await synthesizeActivity(text, { company: target?.company });
    res.json(result);
  } catch (err) {
    console.error("synthesize error:", err.message);
    res.status(500).json({ error: "synthesis failed", detail: err.message });
  }
});

// Step 2: commit — validated records are appended to the account's activity
// (kept date-sorted), the conversation indicators recompute on read, and the
// intelligence cache invalidates via the fingerprint. Inbound records also
// set the auto-refresh flag — a reply is the highest-signal event.
app.post("/api/activity/commit", async (req, res) => {
  const target = getTarget(req.body?.targetId);
  if (!target) return res.status(404).json({ error: "unknown target" });

  const { records, issues } = validateRecords(req.body?.records, {});
  if (!records.length) return res.status(400).json({ error: "no valid records to add", issues });

  target.activity = [...target.activity, ...records].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
  const hasInbound = records.some((r) => r.direction === "in");
  if (hasInbound) flagInboundActivity(target);

  const logEntry = {
    id: `log-${Date.now()}`,
    date: new Date().toISOString(),
    targetId: target.id,
    company: target.company,
    text: `${records.length} activit${records.length === 1 ? "y" : "ies"} synthesized from pasted history`,
    detail: `${records.filter((r) => r.direction === "in").length} inbound · ${records.filter((r) => r.direction === "out").length} outbound. Conversation indicators and intelligence recompute from the updated log.`,
  };
  state.log.unshift(logEntry);

  await persistNow();
  res.json({
    target: withConversation(target),
    added: records.length,
    hasInbound,
    issues,
    logEntry,
  });
});

// ── Generic query: execute a filter definition against the live store ────
// One code path for Insights widgets, drill-downs, and anything else that
// needs "accounts matching these conditions, plus aggregates".
app.post("/api/query", (req, res) => {
  const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];
  const bad = filters.find((f) => !f?.field || !FIELD_CATALOG[f.field]);
  if (bad) return res.status(400).json({ error: `unknown field: ${bad?.field}` });

  const rows = accountRows(state.targets, new Date());
  const matched = applyFilters(rows, filters);
  const avg = (get) => (matched.length ? Math.round(matched.reduce((s, r) => s + (get(r) || 0), 0) / matched.length) : 0);

  res.json({
    total: matched.length,
    filters: filters.map((f) => ({ ...f, text: humanizeFilter(f) })),
    aggregates: {
      avgLikelihood: avg((r) => r.currentScore),
      avgClose: avg((r) => r.closeScore),
      catalysts: matched.filter((r) => r.catalystFlag).length,
      netScoreChange: matched.reduce((s, r) => s + (r.scoreDelta || 0), 0),
    },
    accounts: matched,
    generatedAt: new Date().toISOString(),
  });
});

// ── AI diagnostics: tiny live call, returns ok or the real error ─────────
app.get("/api/aicheck", async (req, res) => {
  if (!aiAvailable()) return res.json({ ok: false, error: "no ANTHROPIC_API_KEY in env" });
  try {
    if (req.query.full) {
      // Replicate the real analyze call end-to-end on any target.
      const target = getTarget(typeof req.query.full === "string" && getTarget(req.query.full) ? req.query.full : "plexa");
      const analysis = await analyzeTarget(target, PATTERN_LIBRARY, computeConversationSignals(target));
      return res.json({ ok: true, mode: `full-analyze:${target.id}`, archetype: analysis?.archetype?.label });
    }
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const r = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    res.json({ ok: true, reply: r.content.find((b) => b.type === "text")?.text, model: r.model });
  } catch (err) {
    res.json({
      ok: false,
      status: err?.status,
      error: String(err?.message || err).slice(0, 800),
      type: err?.error?.error?.type,
    });
  }
});

// ── Demo reset (rehearse the 60-second path repeatedly) ─────────────────
app.post("/api/reset", (req, res) => {
  resetState();
  res.json({ ok: true });
});

export default app;
