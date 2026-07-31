// Activity Synthesizer: paste raw interaction logs, get structured activity.
//
// Agents bring accounts with years of history in Word docs, CRM exports, and
// meeting notes. This module turns that free text into activity records
// matching the EXACT schema the timeline, sentiment arc, and conversation.js
// indicators already consume (see the seeded Vantage 38-touch history):
//
//   { date: "YYYY-MM-DD", rep, type: email|call|meeting|linkedin,
//     direction: "in"|"out", subject, note, body?, contact?, sentiment:
//     positive|warm|neutral|negative|none }
//
// Two paths, one output shape:
//   - Claude (structured JSON only, validated and re-checked server-side)
//   - a deterministic parser (date-anchored splitting + keyword heuristics)
//     so the flow demos offline — clearly good-enough rather than perfect.
//
// Records with unparseable dates are FLAGGED into `issues`, never guessed.

import { aiAvailable, createWithFallbackModels, extractJson, MODEL_NAME } from "./claude.js";

const CURRENT_USER = "Kevin Jay";
const TYPES = ["email", "call", "meeting", "linkedin"];
const SENTIMENTS = ["positive", "warm", "neutral", "negative", "none"];

// ── Claude synthesis ────────────────────────────────────────────────────────

const SYNTH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["records", "issues"],
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "direction", "type", "rep", "contact", "subject", "note", "sentiment"],
        properties: {
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "ISO date. If the source gives no parseable full date, put the entry in issues instead — never guess." },
          direction: { type: "string", enum: ["in", "out"], description: "in = FROM the target company to us (a reply, an inbound call); out = we reached out" },
          type: { type: "string", enum: TYPES },
          rep: { type: "string", description: `Our-side person. First-person entries ("I sent…", "I called…") map to the current user: ${CURRENT_USER}.` },
          contact: { anyOf: [{ type: "string" }, { type: "null" }], description: "Person at the target company, if named. null when the entry names no one." },
          subject: { type: "string", description: "Short subject line. PRESERVE sequence codes from the source (E1/E2/E3, RCE, LI, IB-RCC, C1, M1…) as a bracketed prefix, e.g. \"[E2] - Follow-up on intro\"." },
          note: { type: "string", description: "One-line summary of what happened, in the CRM's clipped note style." },
          body: { anyOf: [{ type: "string" }, { type: "null" }], description: "Longer narrative/email text when the source has it; else null." },
          sentiment: { type: "string", enum: SENTIMENTS, description: "none = outbound that got no reply. A redirect (e.g. 'we've engaged a banker') is negative." },
        },
      },
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "reason"],
        properties: {
          text: { type: "string", description: "The source snippet that couldn't be converted" },
          reason: { type: "string" },
        },
      },
    },
  },
};

async function claudeSynthesize(rawText, context) {
  const response = await createWithFallbackModels({
    model: MODEL_NAME,
    max_tokens: 8000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SYNTH_SCHEMA } },
    system:
      "You are the activity synthesizer of TCan Express, an M&A CRM. An agent pasted raw interaction history " +
      "(from Word docs, CRM exports, or notes) and you convert it into structured activity records for the timeline. " +
      "Rules: one record per interaction — a single date can have several. Dates must be real ISO dates found in or unambiguously " +
      "derivable from the text; entries whose date can't be parsed go to issues with the snippet, never guessed. " +
      `First-person narration ("I emailed…") is the current CRM user, ${context.currentUser}; other our-side names stay as written. ` +
      "direction=in for anything FROM the target side (replies, inbound calls, 'CEO wrote back…'), including negative replies — " +
      "a reply saying they engaged a banker or aren't interested is direction=in with sentiment=negative. " +
      "sentiment=none is reserved for outbound touches that got no response. Preserve sequence codes (E1, RCE2, LI, IB-RCC, C1…) " +
      "in the subject as a bracketed prefix exactly like the CRM's convention. Keep notes clipped and factual; put longer quoted " +
      "text in body. Do not invent interactions that are not in the source.",
    messages: [
      {
        role: "user",
        content:
          `Target company: ${context.company || "(unknown)"}\nCurrent CRM user: ${context.currentUser}\nToday's date: ${new Date().toISOString().slice(0, 10)}\n\n` +
          `RAW PASTED HISTORY:\n${rawText}`,
      },
    ],
  });
  return extractJson(response);
}

// ── Deterministic offline parser ────────────────────────────────────────────

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

// A date at the START of a line (allowing list bullets) — the anchor that
// begins a new entry. Prevents mid-text date REFERENCES ("…referencing our
// 2021-03-15 intro email") from re-dating or fabricating records.
function findLeadingDate(text) {
  const head = text.replace(/^[\s\-–—•*>]+/, "").slice(0, 24);
  const m =
    head.match(/^(\d{4}-\d{2}-\d{2})\b/) ||
    head.match(/^(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})\b/) ||
    head.match(/^([A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/) ||
    head.match(/^(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\.?,?\s+\d{4})\b/);
  return m ? findDate(m[1]) : null;
}

// Does this line READ like the start of a new interaction entry (vs. a
// narrative continuation that merely mentions a date)?
const ENTRY_VERBS =
  /\b(sent|emailed|e-mailed|mailed|called|phoned|rang|met|left|tried|replied|responded|wrote|reached out|followed up|pinged|messaged|connected|invited|visited|spoke)\b/i;

// Find a full date in a chunk of text. Returns "YYYY-MM-DD" or null.
function findDate(text) {
  let m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // 12/31/2024 or 31/12/2024 (assume M/D/Y; swap if month>12)
  m = text.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})\b/);
  if (m) {
    let [, a, b, y] = m;
    let mo = Number(a), da = Number(b);
    if (mo > 12 && da <= 12) [mo, da] = [da, mo];
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31)
      return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
  }
  // "March 4, 2024" / "Mar 4 2024"
  m = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  }
  // "4 March 2024"
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return null;
}

const hasWord = (text, re) => re.test(text);

function classifyDirection(text) {
  if (/\bIB\b|inbound|\b(replied|responded|wrote back|reached out to us|called us|got back|came back|their (ceo|cfo|founder).{0,30}(said|wrote|called)|received (a|an) (reply|email|call|note))/i.test(text))
    return "in";
  return "out";
}

function classifyType(text) {
  if (hasWord(text, /\blinkedin\b|\bli\d*\b|inmail|connection request/i)) return "linkedin";
  if (hasWord(text, /\b(call|called|phone|voicemail|rang|spoke (with|to)|dial(l?ed|ing)?\b)/i)) return "call";
  if (hasWord(text, /\b(meeting|met\b|visit|dinner|lunch|coffee|conference|trade show|booth|on[- ]?site|demo day|chat(ted)?\b)/i)) return "meeting";
  return "email";
}

function classifySentiment(text, direction) {
  if (/\b(not interested|no interest|declined|pass(ed)? on|banker|engaged\b.{0,50}\b(partners|advisors|advisory|capital|bank)|run(ning)? a (sale |sell-side )?process|direct (anything|inquiries|questions|further)|do not contact|unsubscribe|angry|walked away|went dark after|stop contacting)/i.test(text))
    return "negative";
  if (/\b(very positive|enthusiastic|agreed to|signed|wants to (meet|talk|explore)|invited|great (call|meeting)|interested in (a|an|selling|exploring))/i.test(text))
    return "positive";
  if (/\b(friendly|polite|open to|curious|thanked|cordial|warm)/i.test(text)) return "warm";
  if (direction === "out" && /\b(no (reply|response|answer)|never heard|nothing back|unanswered|no follow[- ]?up received)/i.test(text))
    return "none";
  if (direction === "out" && !/\b(said|told|answered|discussed|agreed|confirmed)/i.test(text)) return "none";
  return "neutral";
}

function findCode(text) {
  const m = text.match(/\b(IB[- ]?RCC|RCE ?\d*|E\d+|LI ?\d*|C\d+|M\d+)\b/);
  return m ? m[1].replace(/\s+/g, "") : null;
}

function findContact(text) {
  // "with Jane Doe", "from Bob Smith", "CEO Marta Ruiz", "Gina Torres replied"
  const m =
    text.match(/\b(?:with|from|to|met|reply from|response from)\s+(?:the\s+)?(?:CEO|CFO|COO|founder|president|owner|assistant|manager)?\s*([A-Z][a-z]+ [A-Z][a-zA-Z-]+)\b/) ||
    text.match(/\b(?:CEO|CFO|COO|founder|president|owner|assistant|manager)\s+([A-Z][a-z]+ [A-Z][a-zA-Z-]+)\b/) ||
    text.match(/\b([A-Z][a-z]+ [A-Z][a-zA-Z-]+)\s+(?:replied|responded|wrote|asked|answered|called (?:us|back))/);
  return m ? m[1] : null;
}

function heuristicSynthesize(rawText, context) {
  const records = [];
  const issues = [];

  // Split into entry chunks. A line starts a new entry when it leads with a
  // date, or when it reads like an interaction ("I sent … on June 30, 2023")
  // and contains one. Narrative lines that merely REFERENCE a date ("he
  // mentioned the 2021-03-15 intro email") attach to the previous entry.
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n");
  const chunks = [];
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const startsEntry =
      findLeadingDate(trimmed) || (findDate(trimmed) && (ENTRY_VERBS.test(trimmed) || !current));
    if (startsEntry) {
      if (current) chunks.push(current);
      current = trimmed;
    } else if (current) {
      current += "\n" + trimmed;
    } else {
      current = trimmed; // leading undated text — will be flagged
    }
  }
  if (current) chunks.push(current);

  for (const chunk of chunks) {
    // The entry's own date leads the line; fall back to any date only for
    // narrative-style entries ("I sent a note on June 30, 2023 …").
    const date = findLeadingDate(chunk) || findDate(chunk);
    if (!date) {
      issues.push({ text: chunk.slice(0, 160), reason: "No parseable date — add one and re-synthesize, or enter manually" });
      continue;
    }
    const direction = classifyDirection(chunk);
    const type = classifyType(chunk);
    const code = findCode(chunk);
    const contact = findContact(chunk);

    // Subject: text after the leading date token, first sentence-ish, code-prefixed.
    const DATE_TOKEN =
      /^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.]\d{1,2}[\/.]\d{4}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\.?,?\s+\d{4})\s*[:—–-]*\s*/;
    const afterDate = chunk.replace(DATE_TOKEN, "").replace(/\s+/g, " ").trim();
    let subject = (afterDate || chunk).split(/(?<=[.!?])\s/)[0].slice(0, 90).replace(/[.,;:]+$/, "");
    if (code && !subject.includes(code)) subject = `[${code}] - ${subject}`;

    const body = chunk.includes("\n") ? chunk.split("\n").slice(1).join("\n").trim() || null : null;

    records.push({
      date,
      direction,
      type,
      rep: context.currentUser,
      contact,
      subject: subject || `${type} touch`,
      note: (afterDate || chunk).slice(0, 200),
      body,
      sentiment: classifySentiment(chunk, direction),
    });
  }

  return { records, issues };
}

// ── Validation (both paths run through this) ───────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A date is real only if it round-trips: "2024-02-30" parses in JS (rolls to
// Mar 1) but is an impossible calendar date and must be flagged, not guessed.
function isRealDate(date) {
  if (!ISO_DATE.test(date)) return false;
  const d = new Date(date + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

function coerceSentiment(s) {
  const v = String(s || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (["noreply", "none", "noresponse", "silent"].includes(v)) return "none";
  return SENTIMENTS.includes(v) ? v : null;
}

// Re-check every record server-side; invalid ones become issues rather than
// silently-fixed rows. Returns { records (date-ascending), issues }.
export function validateRecords(rawRecords, context = {}) {
  const records = [];
  const issues = [];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  for (const r of Array.isArray(rawRecords) ? rawRecords : []) {
    const label = (r?.subject || r?.note || JSON.stringify(r) || "").slice(0, 120);
    if (!r || typeof r !== "object") continue;
    const date = String(r.date || "").trim();
    if (!isRealDate(date)) {
      issues.push({ text: label, reason: `Unparseable or impossible date "${r.date}"` });
      continue;
    }
    const d = new Date(date + "T00:00:00");
    if (d < new Date("1990-01-01") || d > maxDate) {
      issues.push({ text: label, reason: `Date ${date} is out of range` });
      continue;
    }
    const direction = String(r.direction || "").toLowerCase() === "in" ? "in" : "out";
    const type = TYPES.includes(String(r.type || "").toLowerCase()) ? String(r.type).toLowerCase() : "email";
    const sentiment = coerceSentiment(r.sentiment) || (direction === "out" ? "none" : "neutral");
    records.push({
      date,
      direction,
      type,
      rep: String(r.rep || "").trim() || context.currentUser || CURRENT_USER,
      contact: r.contact ? String(r.contact).trim() : null,
      subject: String(r.subject || "").trim() || `${type} touch`,
      note: String(r.note || "").trim() || String(r.subject || "").trim() || "—",
      ...(r.body ? { body: String(r.body).trim() } : {}),
      sentiment,
      synthesized: true, // provenance marker; harmless to downstream consumers
    });
  }

  records.sort((a, b) => a.date.localeCompare(b.date));
  return { records, issues };
}

// ── Public entry point ──────────────────────────────────────────────────────

export async function synthesizeActivity(rawText, context = {}) {
  const ctx = { currentUser: context.currentUser || CURRENT_USER, company: context.company };
  let raw = null;
  let source = "heuristic";
  if (aiAvailable()) {
    try {
      raw = await claudeSynthesize(rawText, ctx);
      source = "claude-opus-5";
    } catch (err) {
      console.error("synthesize fallback:", err.message);
    }
  }
  if (!raw) raw = heuristicSynthesize(rawText, ctx);

  const { records, issues } = validateRecords(raw.records, ctx);
  return { records, issues: [...(raw.issues || []), ...issues], source };
}
