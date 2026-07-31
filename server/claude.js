// Claude API wrapper. Real reasoning via claude-opus-5 with structured JSON
// output; every caller has a cached fallback so the demo never stalls.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5";

export const aiAvailable = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["likelihoodNarrative", "relationshipRead", "archetype", "revivalRadar", "recommendedAction"],
  properties: {
    likelihoodNarrative: { type: "string" },
    relationshipRead: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "touchVolume", "sentimentArc", "wentColdWhen", "wentColdWhy", "ownerMood"],
      properties: {
        summary: { type: "string" },
        touchVolume: { type: "string" },
        sentimentArc: { type: "string" },
        wentColdWhen: { type: "string" },
        wentColdWhy: { type: "string" },
        ownerMood: { type: "string" },
      },
    },
    archetype: {
      type: "object",
      additionalProperties: false,
      required: ["label", "description", "whatToExpect", "nextBehavior", "flashpoints", "dealTwin"],
      properties: {
        label: { type: "string" },
        description: { type: "string" },
        whatToExpect: { type: "string" },
        nextBehavior: { type: "string" },
        flashpoints: { type: "array", items: { type: "string" } },
        dealTwin: { type: "string" },
      },
    },
    revivalRadar: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["catalyst", "source", "whyItChangesTheMath"],
          properties: {
            catalyst: { type: "string" },
            source: { type: "string" },
            whyItChangesTheMath: { type: "string" },
          },
        },
      ],
    },
    recommendedAction: {
      type: "object",
      additionalProperties: false,
      required: ["title", "rationale", "artifactType", "artifact"],
      properties: {
        title: { type: "string" },
        rationale: { type: "string" },
        artifactType: { type: "string", enum: ["email", "memo", "task"] },
        artifact: { type: "string" },
      },
    },
  },
};

export const MODEL_NAME = MODEL;
export { client as anthropicClient };

export async function createWithFallbackModels(params) {
  // Prefer server-side refusal fallbacks (recommended default for opus-5 code);
  // if the beta isn't accepted, retry as a plain request.
  try {
    return await client.beta.messages.create({
      ...params,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (err?.status === 400) return client.messages.create(params);
    throw err;
  }
}

export function extractJson(response) {
  if (response.stop_reason === "refusal") throw new Error("Model refused request");
  if (response.stop_reason === "max_tokens") throw new Error("Response truncated at max_tokens");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("No text block in response");
  return JSON.parse(text);
}

// Full War Room analysis for one target. Throws on any failure — caller
// falls back to target.cachedAnalysis.
export async function analyzeTarget(target, patternLibrary, conversationSignals = []) {
  const response = await createWithFallbackModels({
    model: MODEL,
    // Headroom so the JSON never truncates; concision is enforced in the
    // prompt instead (truncated JSON fails parsing and wastes the call).
    max_tokens: 6000,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system:
      "You are the intelligence engine of TCan Express, an M&A CRM for a vertical-software acquirer (Valsoft-style). " +
      "The CRM user is Kevin Jay, Corp Dev deal lead — he appears in the activity history where he was involved; drafts are written in his voice and must be consistent with his prior relationship with the seller (never claim to be a stranger if he has met them). " +
      "You read the full history and signals of ONE acquisition target and produce a tailored play — never a generic playbook. " +
      "The conversationIndicators were computed from the logged email/call history (reply rate, inbound recency, reconnect campaigns, escalation depth, sentiment trajectory, silence pattern) — treat them as primary evidence for likelihood-to-transact and reference the specific numbers. " +
      "Every prediction must cite the matching historical analog from the pattern library (in the dealTwin field and woven into whatToExpect). " +
      "Be specific, use names, dates, and numbers from the record. Write like a sharp deal partner briefing a colleague: confident, concrete, no filler. " +
      "BE CONCISE: narrative fields 1-3 sentences each; whatToExpect and dealTwin max 3 sentences; the artifact complete but tight (an email under 180 words). Total output well under 2500 tokens. " +
      "The recommendedAction.artifact must be a complete, ready-to-send draft (email/memo/task text). " +
      "revivalRadar: only non-null if the record shows a specific external catalyst event; explain why it changes the deal math. " +
      "\n\n" + patternLibrary,
    messages: [
      {
        role: "user",
        content:
          "Analyze this acquisition target and return the JSON analysis.\n\nTARGET RECORD:\n" +
          JSON.stringify(
            {
              company: target.company,
              vertical: target.vertical,
              stage: target.stage,
              owner: target.owner,
              financials: target.financials,
              currentScores: target.scores,
              conversationIndicators: conversationSignals,
              enrichmentSignals: target.signals,
              accountDetails: target.details,
              blockers: target.blockers.map(({ id, label, status, detail }) => ({ id, label, status, detail })),
              activityHistory: target.activity,
            },
            null,
            2
          ) +
          "\n\nToday's date: " + new Date().toISOString().slice(0, 10),
      },
    ],
  });
  return extractJson(response);
}

const DIGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "priorities"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    priorities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["company", "action", "why", "urgency"],
        properties: {
          company: { type: "string" },
          action: { type: "string" },
          why: { type: "string" },
          urgency: { type: "string", enum: ["now", "this-week", "watch"] },
        },
      },
    },
  },
};

// Weekly portfolio sweep digest. Throws on failure; caller builds a
// deterministic fallback from the same stats.
export async function writeDigest(portfolio, patternLibrary) {
  const response = await createWithFallbackModels({
    model: MODEL,
    max_tokens: 1500,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: DIGEST_SCHEMA },
    },
    system:
      "You are the intelligence engine of TCan Express, an M&A CRM. Write the weekly portfolio sweep for Kevin Jay (Corp Dev deal lead). " +
      "It must be scannable in ten seconds. Output: " +
      "headline — one punchy line, max 10 words (e.g. 'One catalyst burning, two touches overdue'). " +
      "summary — EXACTLY ONE sentence: the net read of the book this week. " +
      "priorities — 3 to 4 items, most urgent first. Each: company (EXACTLY matching an account name from the input), " +
      "action (imperative, max 12 words — what to do), why (1-2 sentences shown on hover: the reasoning, citing the record and the pattern-library analog), " +
      "urgency ('now' = due/overdue or a cooling catalyst, 'this-week' = time-boxed soon, 'watch' = don't touch yet but monitor). " +
      "No filler anywhere — every word must earn its place.\n\n" + patternLibrary,
    messages: [{ role: "user", content: JSON.stringify(portfolio) }],
  });
  return extractJson(response);
}

const BRIEF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["meetingContext", "objective", "relationshipRecap", "talkingPoints", "landmines", "theAsk"],
  properties: {
    meetingContext: { type: "string" },
    objective: { type: "string" },
    relationshipRecap: { type: "string" },
    talkingPoints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["point", "why"],
        properties: { point: { type: "string" }, why: { type: "string" } },
      },
    },
    landmines: { type: "array", items: { type: "string" } },
    theAsk: { type: "string" },
  },
};

// One-page pre-meeting brief. Throws on failure; caller assembles a
// fallback from the cached analysis.
export async function prepMeetingBrief(target, patternLibrary, conversationSignals = []) {
  const response = await createWithFallbackModels({
    model: MODEL,
    max_tokens: 2500,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: BRIEF_SCHEMA },
    },
    system:
      "You are the intelligence engine of TCan Express, an M&A CRM. Write a pre-meeting brief for Kevin Jay (Corp Dev deal lead) " +
      "ahead of the next scheduled touch with this acquisition target. He'll read it in the car — make every line earn its place. " +
      "meetingContext: what this meeting is and why now (1-2 sentences). objective: the single thing to walk out with. " +
      "relationshipRecap: 2-3 sentences of history that matter in the room. talkingPoints: 3-4, each with a one-line why. " +
      "landmines: specific things NOT to say or do with this seller, drawn from the record and archetype. " +
      "theAsk: exactly how to close the meeting. Ground everything in names, dates, and numbers from the record; cite the " +
      "pattern-library analog where it sharpens a point. BE CONCISE — total under 1200 tokens.\n\n" + patternLibrary,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          company: target.company,
          owner: target.owner,
          stage: target.stage,
          scores: target.scores,
          upcomingTouch: target.nextTouch,
          nextPlannedAction: target.recommendedOverride || target.cachedAnalysis?.recommendedAction?.title,
          conversationIndicators: conversationSignals,
          enrichmentSignals: target.signals,
          blockers: target.blockers.map(({ label, status, detail }) => ({ label, status, detail })),
          activityHistory: target.activity,
          today: new Date().toISOString().slice(0, 10),
        }),
      },
    ],
  });
  return extractJson(response);
}

const ACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rescoreRationale", "traceLines", "nextTask"],
  properties: {
    rescoreRationale: { type: "string" },
    traceLines: { type: "array", items: { type: "string" } },
    nextTask: { type: "string" },
  },
};

// Real re-scoring reasoning after an approved action (score deltas themselves
// are deterministic — see state.js). Throws on failure; caller uses fallback.
export async function rescoreAfterAction(target, action, newScores, patternLibrary) {
  const response = await createWithFallbackModels({
    model: MODEL,
    max_tokens: 1500,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ACT_SCHEMA },
    },
    system:
      "You are the agent inside an M&A CRM. An action was just approved and executed for a target. " +
      "Return: rescoreRationale (2-3 sentences, why the scores moved, citing the pattern library analog), " +
      "traceLines (3-5 short present-tense agent log lines, e.g. 'Logging outbound email to CRM'), " +
      "nextTask (one concrete follow-up task with timing, consistent with the seller archetype — e.g. for silent founders, do NOT chase early)." +
      "\n\n" + patternLibrary,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          company: target.company,
          ownerProfile: target.owner,
          stage: target.stage,
          actionExecuted: action,
          scoresBefore: target.scores,
          scoresAfter: newScores,
        }),
      },
    ],
  });
  return extractJson(response);
}
