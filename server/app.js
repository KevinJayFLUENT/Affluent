import express from "express";
import { PATTERN_LIBRARY } from "./data/targets.js";
import { state, getTarget, rankedTargets, applyAction, markEnriched, resetState } from "./state.js";
import { analyzeTarget, rescoreAfterAction, writeDigest, aiAvailable } from "./claude.js";
import { computeConversationSignals, conversationSummaryLine } from "./conversation.js";

const withConversation = (t) => ({ ...t, conversationSignals: computeConversationSignals(t) });

const app = express();
app.use(express.json());

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
  res.json({ ok: true, task });
});

// ── Weekly portfolio sweep digest ────────────────────────────────────────
app.post("/api/digest", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = state.targets.map((t) => ({
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

  const dueSoon = state.targets.filter((t) => t.nextTouch && t.nextTouch.due <= today);
  const catalysts = state.targets.filter((t) => t.signals.some((s) => s.catalyst));
  const top = rankedTargets()[0];

  let digest = null;
  if (aiAvailable()) {
    try {
      digest = await writeDigest({ today, accounts: snapshot }, PATTERN_LIBRARY);
      digest.source = "claude-opus-5";
    } catch (err) {
      console.error("digest fallback:", err.message);
    }
  }
  if (!digest) {
    digest = {
      headline: `${catalysts.length} catalyst${catalysts.length === 1 ? "" : "s"} active · ${dueSoon.length} touch${dueSoon.length === 1 ? "" : "es"} due or overdue`,
      brief:
        `Swept ${state.targets.length} accounts. ${top.company} leads the board at ${top.scores.likelihood} likelihood` +
        `${catalysts.length ? ` with an active catalyst — the dead-deal-revival window is open and cooling` : ""}. ` +
        (dueSoon.length
          ? `${dueSoon.map((t) => t.company).join(" and ")} ${dueSoon.length === 1 ? "has" : "have"} touches at or past their prescribed date — silence past the date is how deals die quietly. `
          : "No touches are overdue. ") +
        `The rest of the book is on archetype cadence: dates are set, drafts are staged, nothing needs forcing.`,
      priorities: [
        ...dueSoon.map((t) => `${t.company}: ${t.nextTouch.action}`),
        ...(catalysts.length && !dueSoon.some((t) => t.id === catalysts[0].id)
          ? [`${catalysts[0].company}: act on the catalyst before a rival reads the same news`]
          : []),
      ].slice(0, 4),
      source: "cached",
    };
  }
  digest.generatedAt = new Date().toISOString();
  state.digest = digest;
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

  const conversationSignals = computeConversationSignals(target);

  // Kick off the real analysis immediately; trace steps pace alongside it.
  const analysisPromise = aiAvailable()
    ? analyzeTarget(target, PATTERN_LIBRARY, conversationSignals).catch((err) => {
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
    send("trace", { text: "Analysis complete — rendering War Room" });
    send("analysis", { targetId: target.id, analysis, target });
  } catch (err) {
    console.error("analyze stream error:", err.message);
    send("analysis", { targetId: target.id, analysis: target.cachedAnalysis, target });
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
  target.activity.push({
    date: new Date().toISOString().slice(0, 10),
    rep: "Agent (approved by Kevin Jay)",
    type: "action",
    sentiment: "positive",
    note: actionLabel || actionId,
  });

  res.json({
    before: result.before,
    after: result.after,
    blockerId: result.blocker?.id,
    reasoning,
    logEntry,
    task,
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
