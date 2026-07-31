// Conversation intelligence: parses the logged interaction history
// (emails/calls/meetings, Salesforce-style) into scored indicators of
// likelihood-to-transact. These are the "read the history" half of the
// factor model; enrichment signals are the "read the world" half.

const SENTIMENT_VALUE = { positive: 2, warm: 1, neutral: 0, none: -0.5, negative: -2 };
const DAY = 86400000;

// ── Live sell-side process detection ────────────────────────────────────────
// The strongest read the history can produce: the seller has engaged a
// banker/advisor and a formal process is underway (or we've been invited into
// it). At that point the owner has already decided to transact — likelihood
// is effectively certain; the remaining contest is whether WE win the deal,
// which is the close-probability side of the model.
//
// Patterns are deliberately phrase-level, with a negation guard: "No bankers.
// Come to Boise" (Ray Delgado) must NOT read as a live process.
const PROCESS_NEGATION = /\bno bankers?\b|\bwithout (a )?banker\b|\bnot (running|in) a process\b|\bnever run a process\b/i;
const PROCESS_PATTERNS = [
  // "engaged an advisor, Kaizen Equity Partners, to handle a potential transaction"
  /\bengaged\b[^.]{0,80}\b(advisors?|bankers?|partners)\b[^.]{0,80}\b(handle|run|manage|lead|explore)\b/i,
  // "we were invited to join the process"
  /\b(invited|asked)\b[^.]{0,50}\b(join|participate in)\b[^.]{0,40}\bprocess\b/i,
  // "engaged X to run a process" / "running a sell-side process"
  /\brun(ning)?\s+a\s+(sale\s+|sell[- ]?side\s+)?process\b/i,
  /\bsell[- ]?side process\b|\bbanker[- ]?led process\b|\bformal (sale )?process\b/i,
  // "direct anything further to them" (redirect to the seller's advisor)
  /\bdirect (anything|inquiries|questions|further)\b[^.]{0,50}\bto (them|him|her|the (banker|advisor))/i,
];

export function detectLiveProcess(activity = []) {
  for (const a of activity) {
    const text = `${a.subject || ""} ${a.note || ""} ${a.body || ""}`;
    if (PROCESS_NEGATION.test(text)) continue;
    if (PROCESS_PATTERNS.some((re) => re.test(text))) return true;
  }
  return false;
}

export function computeConversationSignals(target, today = new Date()) {
  const acts = [...(target.activity || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!acts.length) {
    return [
      {
        id: "c-none",
        label: "No interaction history",
        value: "0 logged touches — cold account",
        contribution: 0,
        source: "conversation",
        detail: "Nothing to read yet. Score rests entirely on enrichment signals.",
      },
    ];
  }

  const signals = [];
  const emails = acts.filter((a) => a.type === "email");
  const outbound = emails.filter((a) => a.direction !== "in");
  const inbound = emails.filter((a) => a.direction === "in");
  const spanYears = (new Date(acts[acts.length - 1].date) - new Date(acts[0].date)) / (365 * DAY);

  // 1. Reply rate
  const replyRate = outbound.length ? Math.round((inbound.length / outbound.length) * 100) : 0;
  signals.push({
    id: "c-reply",
    label: "Reply rate",
    value: `${inbound.length} inbound / ${outbound.length} outbound emails (${replyRate}%)`,
    contribution: replyRate >= 50 ? 4 : replyRate >= 25 ? 2 : replyRate > 0 ? 1 : -3,
    source: "conversation",
    detail: `Across ${acts.length} logged touches over ${spanYears.toFixed(1)} years.`,
  });

  // 2. Inbound recency — has the target spoken recently?
  const lastIn = [...acts].reverse().find((a) => a.direction === "in");
  if (lastIn) {
    const daysSince = Math.round((today - new Date(lastIn.date)) / DAY);
    signals.push({
      id: "c-recency",
      label: "Last inbound",
      value: `${daysSince} days ago (${lastIn.date})`,
      contribution: daysSince <= 30 ? 4 : daysSince <= 120 ? 2 : daysSince <= 270 ? 0 : -4,
      source: "conversation",
      detail: `Most recent word FROM the target: "${(lastIn.subject || lastIn.note).slice(0, 80)}"`,
    });
  } else {
    signals.push({
      id: "c-recency",
      label: "Last inbound",
      value: "Never — one-way outreach so far",
      contribution: -3,
      source: "conversation",
      detail: "The target has never initiated or replied in writing.",
    });
  }

  // 3. Reconnect campaigns absorbed (RCE sequences) without opt-out
  const campaigns = acts.filter((a) => /\[RCE1\]/i.test(a.subject || "")).length;
  if (campaigns > 0) {
    const optedOut = acts.some((a) => /unsubscribe|do not contact|stop contacting/i.test(a.note || ""));
    signals.push({
      id: "c-campaigns",
      label: "Reconnect campaigns",
      value: `${campaigns} RCE campaign${campaigns > 1 ? "s" : ""} run — ${optedOut ? "opt-out on file" : "no opt-out ever"}`,
      contribution: optedOut ? -5 : 1,
      source: "conversation",
      detail: optedOut
        ? "Target has explicitly asked to stop — hard negative."
        : "Silence without an opt-out keeps the door open — silent founders rarely say yes OR no.",
    });
  }

  // 4. Escalation depth — how far up the ladder did this ever get?
  const hadMeeting = acts.some((a) => a.type === "meeting");
  const hadWarmCall = acts.some((a) => a.type === "call" && ["warm", "positive"].includes(a.sentiment));
  signals.push({
    id: "c-escalation",
    label: "Escalation depth",
    value: hadMeeting ? "Reached in-person meetings" : hadWarmCall ? "Reached warm live calls" : "Never past cold outreach",
    contribution: hadMeeting ? 3 : hadWarmCall ? 2 : -1,
    source: "conversation",
    detail: hadMeeting
      ? "Proven willingness to sit across a table — the strongest historical predictor of eventual close."
      : hadWarmCall
      ? "Live conversation achieved; meeting is the next rung."
      : "All touches were one-way. No demonstrated engagement.",
  });

  // 5. Sentiment trajectory — direction of the relationship
  const scored = acts.filter((a) => a.sentiment in SENTIMENT_VALUE);
  if (scored.length >= 4) {
    const half = Math.floor(scored.length / 2);
    const avg = (arr) => arr.reduce((s, a) => s + SENTIMENT_VALUE[a.sentiment], 0) / arr.length;
    const drift = avg(scored.slice(half)) - avg(scored.slice(0, half));
    const trend = drift > 0.4 ? "warming" : drift < -0.4 ? "cooling" : "flat";
    signals.push({
      id: "c-trajectory",
      label: "Sentiment trajectory",
      value: `${trend} (${drift >= 0 ? "+" : ""}${drift.toFixed(1)} across the arc)`,
      contribution: trend === "warming" ? 3 : trend === "cooling" ? -2 : 0,
      source: "conversation",
      detail: "Weighted read of logged sentiment, first half vs second half of the relationship.",
    });
  }

  // 6. Longest silence — resilience of the thread
  let longestGap = 0;
  for (let i = 1; i < acts.length; i++) {
    longestGap = Math.max(longestGap, (new Date(acts[i].date) - new Date(acts[i - 1].date)) / DAY);
  }
  const tailGap = Math.round((today - new Date(acts[acts.length - 1].date)) / DAY);
  signals.push({
    id: "c-silence",
    label: "Silence pattern",
    value: `Longest gap ${Math.round(longestGap)}d · ${tailGap}d since last touch`,
    contribution: tailGap > 180 ? -2 : tailGap > 90 ? -1 : 0,
    source: "conversation",
    detail:
      longestGap > 365
      ? "This relationship has already survived a year-plus gap once — silence here is not death."
      : "No extreme gaps in the record.",
  });

  // 7. Live sell-side process — trumps everything else the history says.
  // Shown first in the factor breakdown: it is why likelihood floors at 100
  // the moment we act to join (see applyAction in state.js).
  if (detectLiveProcess(acts)) {
    signals.unshift({
      id: "c-process",
      label: "Live transaction process",
      value: "Seller engaged a banker — formal process underway",
      contribution: +10,
      source: "conversation",
      detail:
        "The owner has already decided to transact — likelihood is effectively certain, and floors at 100 once we act to join the process. The open question is whether WE win it: that contest lives in the close-probability breakdown.",
    });
  }

  return signals;
}

export function conversationSummaryLine(signals) {
  const total = signals.reduce((s, x) => s + x.contribution, 0);
  return `Parsed interaction history → ${signals.length} conversation indicators, net ${total >= 0 ? "+" : ""}${total} on likelihood`;
}
