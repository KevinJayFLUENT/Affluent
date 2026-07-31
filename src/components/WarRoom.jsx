import React, { useEffect, useRef, useState } from "react";
import { analyzeTarget, executeAction, simulateReply, generateBrief } from "../api.js";
import { useAnimatedNumber } from "../hooks.js";
import AccountDetails from "./AccountDetails.jsx";
import CompanyLogo from "./CompanyLogo.jsx";
import { DueBadge } from "./MyDay.jsx";
import {
  Zap, ArrowUpRight, ArrowDownLeft, Check, X, FastForward, Mail,
  ChevronDown, ChevronUp, Play, TrendingUp, RotateCcw,
} from "./Icons.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// First sentence = the headline; the rest goes behind "More".
function splitLead(text = "") {
  const m = text.match(/^(.+?[.!?])\s+(.+)$/s);
  return m ? [m[1], m[2]] : [text, null];
}

function Meter({ label, value, sub, tone, onClick, hint }) {
  const display = useAnimatedNumber(value, 1300);
  const prevRef = useRef(value);
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    const d = value - prevRef.current;
    if (d !== 0) {
      prevRef.current = value;
      setDelta(d);
      const t = setTimeout(() => setDelta(null), 6000);
      return () => clearTimeout(t);
    }
  }, [value]);
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className={`meter ${delta !== null ? "meter-flash" : ""}`} onClick={onClick} title="Click for factor breakdown">
      {delta !== null && (
        <span className={`meter-delta ${delta > 0 ? "pos" : "neg"}`}>
          {delta > 0 ? "+" : ""}{delta} {delta > 0 ? "▲" : "▼"}
        </span>
      )}
      <div className="meter-gauge">
        <svg viewBox="0 0 120 120">
          <circle className="meter-track" cx="60" cy="60" r={r} />
          <circle
            className={`meter-fill meter-${tone}`}
            cx="60"
            cy="60"
            r={r}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - display / 100)}
          />
        </svg>
        <div className="meter-num-overlay">{display}</div>
      </div>
      <div className="meter-label">{label}</div>
      {sub && <div className="meter-sub">{sub}</div>}
      {hint && <div className="meter-hint">{hint}</div>}
    </div>
  );
}

function Panel({ title, tag, children, tone }) {
  return (
    <section className={`panel ${tone ? `panel-${tone}` : ""}`}>
      <div className="panel-head">
        <h3>{title}</h3>
        {tag && <span className="panel-tag">{tag}</span>}
      </div>
      {children}
    </section>
  );
}

// Headline-first panel: one punchy line, detail behind a toggle.
function Insight({ title, tag, tone, headline, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel title={title} tag={tag} tone={tone}>
      <div className="insight-headline">{headline}</div>
      {children && (
        <>
          <button className="insight-more" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? "Less" : "More detail"}
          </button>
          {open && <div className="insight-detail">{children}</div>}
        </>
      )}
    </Panel>
  );
}

function Factor({ s, conv }) {
  return (
    <div className={`factor ${conv ? "factor-conv" : ""}`} title={s.detail}>
      <div className="factor-top">
        <span className="factor-label">{s.label}</span>
        <span className={`factor-contrib ${s.contribution >= 0 ? "pos" : "neg"}`}>
          {s.contribution > 0 ? `+${s.contribution}` : s.contribution || "±0"}
        </span>
      </div>
      <div className="factor-value">{s.value}</div>
      <div className="factor-src">
        source: {conv ? "conversation history" : s.source === "web" ? "web enrichment" : s.source === "broker" ? "broker channel" : "CRM history"}
      </div>
    </div>
  );
}

const isOpenBlocker = (b) => b.status === "blocked" || b.status === "pending";

function FactorModal({ target, analysis, mode, onClose }) {
  const openBlockers = target.blockers.filter(isOpenBlocker);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === "close" ? "Close Probability — Blocker Breakdown" : "Likelihood to Transact — Factor Breakdown"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {mode === "close" ? (
          <>
            <p className="modal-narrative">
              Close probability sits at {target.scores.close} because {openBlockers.length} of {target.blockers.length} path-to-transact
              items are still open. Each item below shows what putting it in motion adds. Resolving all of them would lift close
              probability by +{openBlockers.reduce((s, b) => s + (b.closeWeight || 0), 0)} points — the rest is execution and the seller's timeline.
            </p>
            <div className="factor-group-title">Path-to-transact items and their weight</div>
            <div className="factors">
              {target.blockers.map((b) => {
                const applied = b.status === "in-motion" || b.status === "resolved";
                return (
                  <div key={b.id} className={`factor ${applied ? "" : "factor-conv"}`} title={b.detail}>
                    <div className="factor-top">
                      <span className="factor-label">{b.label}</span>
                      <span className={`factor-contrib ${applied ? "pos" : "neg"}`}>
                        {applied ? `+${b.closeWeight || 0} applied` : `+${b.closeWeight || 0} if resolved`}
                      </span>
                    </div>
                    <div className="factor-value">{b.detail}</div>
                    <div className="factor-src">
                      status: {b.status === "in-motion" ? "in motion — already reflected in the score" : b.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {analysis && <p className="modal-narrative">{analysis.likelihoodNarrative}</p>}
            <div className="modal-cols">
              <div>
                <div className="factor-group-title">
                  Conversation indicators — read from {target.activity.length} logged interactions
                </div>
                <div className="factors">
                  {(target.conversationSignals || []).map((s) => <Factor key={s.id} s={s} conv />)}
                </div>
              </div>
              <div>
                <div className="factor-group-title">Enrichment signals — sweep deltas</div>
                <div className="factors">
                  {target.enriched ? target.signals.map((s) => <Factor key={s.id} s={s} />) : <div className="muted">Awaiting enrichment sweep…</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BriefModal({ target, brief, loading, onClose, onRegenerate }) {
  const [openPoints, setOpenPoints] = useState({});
  const [fullOpen, setFullOpen] = useState(false);
  const togglePoint = (i) => setOpenPoints((p) => ({ ...p, [i]: !p[i] }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Meeting Brief — {target.company}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {loading && (
          <div className="analyzing" style={{ border: "none", boxShadow: "none" }}>
            <div className="spinner" />
            <div>Agent preparing the brief from {target.activity.length} logged interactions…</div>
          </div>
        )}
        {brief && !loading && (
          <div className="brief">
            {/* The scan layer: objective, points, landmines */}
            <div className="brief-objective">
              <label>Walk out with</label>
              {brief.objective}
            </div>

            <div className="brief-section">
              <label>Talking points — tap a point for the why</label>
              <div className="brief-points-list">
                {brief.talkingPoints.map((tp, i) => (
                  <div key={i} className={`brief-point ${openPoints[i] ? "open" : ""}`} onClick={() => togglePoint(i)}>
                    <span className="brief-point-num">{i + 1}</span>
                    <div className="brief-point-body">
                      <div className="brief-point-title">{tp.point}</div>
                      {openPoints[i] && <div className="brief-point-why">{tp.why}</div>}
                    </div>
                    {openPoints[i] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="brief-section">
              <label>Landmines — do not touch</label>
              <ul className="brief-landmines">
                {brief.landmines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>

            {/* The depth layer: context, recap, closing */}
            <button className="insight-more" onClick={() => setFullOpen(!fullOpen)}>
              {fullOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {fullOpen ? "Hide full brief" : "Full brief — context, relationship, closing"}
            </button>
            {fullOpen && (
              <div className="brief-full">
                <div className="brief-section">
                  <label>Why this meeting, why now</label>
                  <p>{brief.meetingContext}</p>
                </div>
                <div className="brief-section">
                  <label>Relationship in one breath</label>
                  <p>{brief.relationshipRecap}</p>
                </div>
                <div className="brief-ask">
                  <label>Closing the meeting</label>
                  {brief.theAsk}
                </div>
              </div>
            )}

            <div className="brief-meta">
              Generated {new Date(brief.generatedAt).toLocaleTimeString()} · {brief.source === "cached" ? "cached intelligence" : brief.source}
              <button className="insight-more" style={{ marginLeft: 12, padding: 0 }} onClick={onRegenerate}>↻ Regenerate</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const sentimentColor = {
  positive: "#15803d",
  warm: "#d97706",
  neutral: "#9ca3af",
  negative: "#b91c1c",
  none: "#e5e7eb",
};

// The relationship at a glance: every touch as a dot on a time axis,
// colored by sentiment. Silence reads as empty space.
function SentimentArc({ activity }) {
  if (activity.length < 3) return null;
  const W = 300, H = 46, pad = 8, base = 26;
  const t0 = new Date(activity[0].date + "T00:00:00").getTime();
  const t1 = Math.max(Date.now(), new Date(activity[activity.length - 1].date + "T00:00:00").getTime());
  const x = (d) => pad + ((new Date(d + "T00:00:00").getTime() - t0) / (t1 - t0)) * (W - 2 * pad);

  const years = [];
  for (let y = new Date(t0).getFullYear() + 1; y <= new Date(t1).getFullYear(); y++) {
    years.push(y);
  }

  return (
    <svg className="arc" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1={pad} y1={base} x2={W - pad} y2={base} stroke="#e5e7eb" strokeWidth="1.5" />
      {years.map((y) => {
        const xp = x(`${y}-01-01`);
        return (
          <g key={y}>
            <line x1={xp} y1={base - 4} x2={xp} y2={base + 4} stroke="#d6d9de" strokeWidth="1" />
            <text x={xp} y={H - 4} textAnchor="middle" fontSize="7.5" fill="#9ca3af">{y}</text>
          </g>
        );
      })}
      {activity.map((a, i) => {
        const isMeeting = a.type === "meeting";
        const isInbound = a.direction === "in";
        const r = isMeeting ? 5 : isInbound ? 4 : 2.8;
        const cy = base - (isMeeting ? 10 : isInbound ? 7 : 4);
        return (
          <g key={i}>
            <line x1={x(a.date)} y1={base} x2={x(a.date)} y2={cy} stroke="#e5e7eb" strokeWidth="1" />
            <circle
              cx={x(a.date)}
              cy={cy}
              r={r}
              fill={sentimentColor[a.sentiment] || "#e5e7eb"}
              stroke={isMeeting || isInbound ? "#fff" : "none"}
              strokeWidth={isMeeting || isInbound ? 1.2 : 0}
            >
              <title>{`${a.date} · ${a.subject || a.type} (${a.sentiment})`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function TimelineItem({ a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tl-item">
      <span className="tl-dot" style={{ background: sentimentColor[a.sentiment] || "#c9ced6" }} />
      <div style={{ minWidth: 0 }}>
        <div className="tl-meta">
          <span className={`tl-dir ${a.direction === "in" ? "in" : "out"}`}>
            {a.direction === "in" ? <ArrowDownLeft size={9} /> : <ArrowUpRight size={9} />} {a.direction === "in" ? "IN" : "OUT"}
          </span>{" "}
          {a.date} · {a.rep} · {a.type}
        </div>
        {a.subject && <div className="tl-subject">{a.subject}</div>}
        <div className="tl-note">{a.note}</div>
        {a.body && (
          <>
            <button className="tl-read" onClick={() => setOpen(!open)}>
              {open ? <><ChevronUp size={12} /> Hide email</> : <><Mail size={12} /> Read email</>}
            </button>
            {open && <div className="tl-body">{a.body}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default function WarRoom({ target, onBack, patchTarget, onActionExecuted }) {
  const [trace, setTrace] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [tab, setTab] = useState("intelligence");
  const [factorModal, setFactorModal] = useState(null); // null | "likelihood" | "close"
  const [briefOpen, setBriefOpen] = useState(false);
  const [brief, setBrief] = useState(target.meetingBrief || null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executedActions, setExecutedActions] = useState([]);
  const [rescoreNote, setRescoreNote] = useState(null);
  const traceBodyRef = useRef(null);
  const started = useRef(false);

  const [analysisMeta, setAnalysisMeta] = useState(target.analysisMeta || null);

  function runAnalysis(force) {
    if (force) {
      setAnalysis(null);
      setTrace([]);
    }
    analyzeTarget(target.id, {
      onTrace: (t) => setTrace((prev) => [...prev, t.text]),
      onAnalysis: (payload) => {
        setAnalysis(payload.analysis);
        setAnalysisMeta(payload.meta || null);
        patchTarget(target.id, { analysisCache: payload.analysis, analysisMeta: payload.meta || null });
      },
    }, force).catch(() => setAnalysis(target.cachedAnalysis));
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runAnalysis(false);
  }, [target.id]);

  // Auto-scroll ONLY the trace panel's own scrollbar — never the page.
  useEffect(() => {
    const el = traceBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trace]);

  async function approve(action, artifact) {
    if (executing || executedActions.includes(action.id)) return;
    setExecuting(true);
    setTrace((prev) => [...prev, `Approval received → executing: ${action.label}`]);
    const result = await executeAction({
      targetId: target.id,
      actionId: action.id,
      actionLabel: action.label,
      artifact,
    });
    for (const line of result.reasoning.traceLines) {
      setTrace((prev) => [...prev, line]);
      await sleep(550);
    }
    patchTarget(target.id, {
      scores: result.after,
      scoreHistory: [...(target.scoreHistory || []), result.after.likelihood],
      blockers: target.blockers.map((b) =>
        b.id === result.blockerId ? { ...b, status: "in-motion" } : b
      ),
    });
    setRescoreNote(result.reasoning.rescoreRationale);
    setTrace((prev) => [
      ...prev,
      `Likelihood ${result.before.likelihood} → ${result.after.likelihood} · Close ${result.before.close} → ${result.after.close}`,
    ]);
    setExecutedActions((prev) => [...prev, action.id]);
    onActionExecuted(result);
    setExecuting(false);
  }

  const blockedCount = target.blockers.filter(isOpenBlocker).length;
  const primaryBlocker = target.blockers.find(
    (b) => isOpenBlocker(b) && b.action && !executedActions.includes(b.action.id)
  );

  // Scripted demo event: available once the prerequisite action is in motion.
  const sim = target.simulatedReply;
  const simPrereq = sim && target.blockers.find((b) => b.action?.id === sim.requiresAction);
  const simAvailable = sim && !target.replySimulated && simPrereq && simPrereq.status === "in-motion";

  // After the reply, the server prescribes the next play (e.g. book the visit).
  const override = target.recommendedOverride;
  const overrideBlocker =
    override &&
    target.blockers.find(
      (b) => b.action?.id === override.actionId && isOpenBlocker(b) && !executedActions.includes(b.action.id)
    );

  async function simulate() {
    if (executing) return;
    setExecuting(true);
    const result = await simulateReply(target.id);
    if (result.error) { setExecuting(false); return; }
    setTrace((prev) => [...prev, `— ${sim.daysLater} days later —`]);
    for (const line of result.traceLines) {
      setTrace((prev) => [...prev, line]);
      await sleep(600);
    }
    patchTarget(target.id, {
      scores: result.after,
      scoreHistory: [...(target.scoreHistory || []), result.after.likelihood],
      activity: [...target.activity, result.reply],
      blockers: target.blockers.map((b) =>
        b.id === result.resolvedBlockerId ? { ...b, status: "resolved" } : b
      ),
      replySimulated: true,
      predictionOutcome: result.predictionCheck,
      recommendedOverride: result.recommendedOverride,
    });
    setRescoreNote(
      `Reply received ${sim.daysLater} days after outreach — archetype prediction confirmed. Likelihood ${result.before.likelihood}→${result.after.likelihood}, close ${result.before.close}→${result.after.close}.`
    );
    setTrace((prev) => [
      ...prev,
      `Likelihood ${result.before.likelihood} → ${result.after.likelihood} · Close ${result.before.close} → ${result.after.close}`,
    ]);
    onActionExecuted(result);
    setExecuting(false);
  }

  async function openBrief(regenerate = false) {
    setBriefOpen(true);
    if (brief && !regenerate) return;
    setBriefLoading(true);
    try {
      const result = await generateBrief(target.id);
      setBrief(result.brief);
      patchTarget(target.id, { meetingBrief: result.brief });
    } finally {
      setBriefLoading(false);
    }
  }

  const [relLead] = analysis ? splitLead(analysis.relationshipRead.summary) : [""];
  const [archLead, archRest] = analysis ? splitLead(analysis.archetype.whatToExpect) : ["", null];

  return (
    <div className="warroom">
      <div className="wr-header">
        <button className="back-btn" onClick={onBack}>← Board</button>
        <CompanyLogo target={target} size={46} />
        <div className="wr-title">
          <h1>{target.company}</h1>
          <span className="wr-stage">{target.stage}</span>
        </div>
        <div className="wr-owner">
          <div className="wr-owner-name">{target.owner.name}, {target.owner.age}</div>
          <div className="wr-owner-sub">{target.owner.title} · {target.owner.tenure} yrs · {target.location}</div>
        </div>
        <button className="brief-btn" onClick={() => openBrief(false)} title="One-page pre-meeting brief for the next touch">
          Prep brief
        </button>
      </div>

      {/* Highlights band — key fields at a glance, Salesforce-style */}
      <div className="highlights">
        <div className="hl-field">
          <label>Stage</label>
          <div>{target.details?.stage || target.stage}</div>
        </div>
        <div className="hl-field">
          <label>Likelihood</label>
          <div className="hl-strong">{target.scores.likelihood}</div>
        </div>
        <div className="hl-field">
          <label>Close Prob.</label>
          <div className="hl-strong">{target.scores.close}</div>
        </div>
        <div className="hl-field hl-wide">
          <label>Next Touch</label>
          <div className="hl-touch">
            {target.nextTouch ? (
              <>
                <DueBadge due={target.nextTouch.due} />
                <span className="hl-touch-action">{target.nextTouch.action}</span>
              </>
            ) : "—"}
          </div>
        </div>
        <div className="hl-field">
          <label>Owner</label>
          <div>{target.details?.accountOwner || "—"}</div>
        </div>
        <div className="hl-field">
          <label>NDA</label>
          <div>{target.details?.ndaIssued || "No"}</div>
        </div>
      </div>

      {briefOpen && (
        <BriefModal
          target={target}
          brief={brief}
          loading={briefLoading}
          onClose={() => setBriefOpen(false)}
          onRegenerate={() => openBrief(true)}
        />
      )}

      {factorModal && (
        <FactorModal target={target} analysis={analysis} mode={factorModal} onClose={() => setFactorModal(null)} />
      )}

      <div className="wr-grid">
        {/* ── Left: meters + activity ── */}
        <div className="wr-left">
          <div className="meter-row">
            <Meter
              label="Likelihood to Transact"
              value={target.scores.likelihood}
              tone="primary"
              hint="▾ Factor breakdown"
              onClick={() => setFactorModal("likelihood")}
            />
            <Meter
              label="Close Probability"
              value={target.scores.close}
              tone="secondary"
              sub={`${blockedCount} open blocker${blockedCount === 1 ? "" : "s"}`}
              hint="▾ Blocker breakdown"
              onClick={() => setFactorModal("close")}
            />
          </div>
          {rescoreNote && <div className="rescore-note"><TrendingUp size={13} /> {rescoreNote}</div>}

          {simAvailable && (
            <div className="demo-sim">
              <div>
                <div className="demo-sim-title">Demo control</div>
                <div className="demo-sim-text">Advance the clock and play the predicted reply.</div>
              </div>
              <button className="demo-sim-btn" disabled={executing} onClick={simulate}>
                <FastForward size={13} /> {sim.daysLater} days later
              </button>
            </div>
          )}

          <Panel title="Activity" tag={`${target.activity.length} touches · all logged`}>
            {target.activity.length >= 3 && (
              <div className="arc-wrap">
                <SentimentArc activity={target.activity} />
                <div className="arc-legend">
                  <span><i style={{ background: "#15803d" }} /> positive</span>
                  <span><i style={{ background: "#d97706" }} /> warm</span>
                  <span><i style={{ background: "#b91c1c" }} /> negative</span>
                  <span><i style={{ background: "#e5e7eb" }} /> no reply</span>
                  <span className="arc-legend-note">large dots = meetings & inbound</span>
                </div>
              </div>
            )}
            <div className="timeline">
              {(() => {
                const items = [...target.activity].reverse();
                let lastMonth = null;
                return items.map((a, i) => {
                  const month = new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
                  const header = month !== lastMonth ? month : null;
                  lastMonth = month;
                  return (
                    <React.Fragment key={i}>
                      {header && <div className="tl-month">{header}</div>}
                      <TimelineItem a={a} />
                    </React.Fragment>
                  );
                });
              })()}
              {!target.activity.length && <div className="muted">No history — cold target.</div>}
            </div>
          </Panel>
        </div>

        {/* ── Center: intelligence ── */}
        <div className="wr-center">
          <div className="tab-bar">
            <button className={`tab ${tab === "intelligence" ? "active" : ""}`} onClick={() => setTab("intelligence")}>
              Intelligence
            </button>
            <button className={`tab ${tab === "details" ? "active" : ""}`} onClick={() => setTab("details")}>
              Account Details
            </button>
            {tab === "intelligence" && analysis && (
              <span className="tab-meta">
                {analysisMeta?.source === "claude-opus-5" ? "live analysis" : "cached analysis"}
                {analysisMeta?.generatedAt && ` · ${new Date(analysisMeta.generatedAt).toLocaleTimeString()}`}
                <button className="insight-more" style={{ padding: 0, marginLeft: 10 }} onClick={() => runAnalysis(true)}>
                  <RotateCcw size={11} /> Re-analyze
                </button>
              </span>
            )}
          </div>

          {tab === "details" && <AccountDetails target={target} />}

          {tab === "intelligence" && (
            <>
              {!analysis && (
                <>
                  <div className="analyzing">
                    <div className="spinner" />
                    <div>Agent reading {target.activity.length} logged interactions…</div>
                  </div>
                  <div className="panel skel-panel">
                    <div className="skel skel-line" style={{ width: "34%" }} />
                    <div className="skel skel-line" style={{ width: "92%" }} />
                    <div className="skel skel-line" style={{ width: "78%" }} />
                    <div className="skel skel-btn" />
                  </div>
                  <div className="panel skel-panel">
                    <div className="skel skel-line" style={{ width: "26%" }} />
                    <div className="skel skel-row" />
                    <div className="skel skel-row" />
                    <div className="skel skel-row" />
                  </div>
                  <div className="panel skel-panel">
                    <div className="skel skel-line" style={{ width: "30%" }} />
                    <div className="skel skel-line" style={{ width: "95%" }} />
                    <div className="skel skel-line" style={{ width: "62%" }} />
                  </div>
                </>
              )}

              {/* 0. The payoff: prediction vs. reality (after simulated reply) */}
              {target.predictionOutcome && (
                <Panel title="Prediction vs. Reality" tag="archetype confirmed" tone="catalyst">
                  <div className="pred-rows">
                    {target.predictionOutcome.map((p, i) => (
                      <div key={i} className="pred-row">
                        <span className="pred-hit">{p.hit ? <Check size={11} /> : <X size={11} />}</span>
                        <div>
                          <div className="pred-predicted">{p.predicted}</div>
                          <div className="pred-actual">{p.actual}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* 1. The point: what to do next */}
              {analysis && override && overrideBlocker && (
                <Panel title="Next Best Action" tag="review & approve" tone="action">
                  <div className="action-title">{override.title}</div>
                  <p>{override.rationale}</p>
                  <button className="insight-more" onClick={() => setDraftOpen(!draftOpen)}>
                    {draftOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {draftOpen ? "Hide plan" : "View plan"}
                  </button>
                  {draftOpen && <pre className="artifact">{override.artifact}</pre>}
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      disabled={executing}
                      onClick={() => approve(overrideBlocker.action, override.artifact)}
                    >
                      {executing ? "Executing…" : <><Check size={13} /> Review & Approve</>}
                    </button>
                    <span className="action-note">Simulated send · state changes are real</span>
                  </div>
                </Panel>
              )}

              {/* Original recommended action — only while nothing has been executed yet */}
              {analysis && !(override && overrideBlocker) && primaryBlocker && executedActions.length === 0 && (
                <Panel title="Next Best Action" tag="review & approve" tone="action">
                  <div className="action-title">{analysis.recommendedAction.title}</div>
                  <p>{analysis.recommendedAction.rationale}</p>
                  <button className="insight-more" onClick={() => setDraftOpen(!draftOpen)}>
                    {draftOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {draftOpen ? "Hide draft" : "View drafted email"}
                  </button>
                  {draftOpen && <pre className="artifact">{analysis.recommendedAction.artifact}</pre>}
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      disabled={executing}
                      onClick={() => approve(primaryBlocker.action, analysis.recommendedAction.artifact)}
                    >
                      {executing ? "Executing…" : <><Check size={13} /> Review & Approve</>}
                    </button>
                    <span className="action-note">Simulated send · state changes are real</span>
                  </div>
                </Panel>
              )}

              {/* After the first execution, the next open blocker speaks for itself */}
              {analysis && !(override && overrideBlocker) && primaryBlocker && executedActions.length > 0 && (
                <Panel title="Next Best Action" tag="review & approve" tone="action">
                  <div className="action-title">{primaryBlocker.action.label}</div>
                  <p>{primaryBlocker.detail}</p>
                  <div className="action-buttons">
                    <button className="approve-btn" disabled={executing} onClick={() => approve(primaryBlocker.action, null)}>
                      {executing ? "Executing…" : <><Check size={13} /> Review & Approve</>}
                    </button>
                    <span className="action-note">Simulated execution · state changes are real</span>
                  </div>
                </Panel>
              )}

              {analysis && !primaryBlocker && !(override && overrideBlocker) && (
                <Panel title="Next Best Action" tone="action">
                  <p className="muted">All actions are in motion. Agent is monitoring for the reply window — next check-in task is on the board.</p>
                </Panel>
              )}

              {/* 2. What stands between us and a transaction */}
              {analysis && (
                <Panel title="Path to Transact" tag={`${blockedCount} open`}>
                  <div className="blockers">
                    {target.blockers.map((b, i) => (
                      <div key={b.id} className={`blocker blocker-${b.status}`}>
                        <div className="blocker-row">
                          <span className="blocker-num">{i + 1}</span>
                          <div className="blocker-body">
                            <div className="blocker-label">{b.label}</div>
                            <div className="blocker-detail">{b.detail}</div>
                          </div>
                          <span className={`status-pill ${b.status}`}>
                            {b.status === "in-motion" ? "In Motion" : b.status === "resolved" ? "Resolved" : b.status === "blocked" ? "Blocked" : "Pending"}
                          </span>
                        </div>
                        {b.action && isOpenBlocker(b) && !executedActions.includes(b.action.id) && (
                          <button className="blocker-action" disabled={executing} onClick={() => approve(b.action, null)}>
                            <Play size={9} /> {b.action.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* 3. Compact insights — headline + expand */}
              {analysis?.revivalRadar && (
                <Insight
                  title="Revival Radar"
                  tag="catalyst"
                  tone="catalyst"
                  headline={<><Zap size={13} style={{ color: "#d97706" }} /> {analysis.revivalRadar.catalyst}</>}
                >
                  <p>{analysis.revivalRadar.whyItChangesTheMath}</p>
                  <p className="rr-src">Source: {analysis.revivalRadar.source}</p>
                </Insight>
              )}

              {analysis && (
                <Insight
                  title="Relationship Read"
                  tag="from logged history"
                  headline={relLead}
                >
                  <div className="kv-grid">
                    <div><label>Touch volume</label>{analysis.relationshipRead.touchVolume}</div>
                    <div><label>Went cold</label>{analysis.relationshipRead.wentColdWhen}</div>
                    <div className="kv-full"><label>Sentiment arc</label>{analysis.relationshipRead.sentimentArc}</div>
                    <div className="kv-full"><label>Why it went cold</label>{analysis.relationshipRead.wentColdWhy}</div>
                    <div className="kv-full"><label>Owner mood</label>{analysis.relationshipRead.ownerMood}</div>
                  </div>
                </Insight>
              )}

              {analysis && (
                <Insight
                  title={`Seller Archetype — ${analysis.archetype.label}`}
                  tag="what to expect"
                  headline={archLead}
                >
                  {archRest && <p>{archRest}</p>}
                  <div className="expect-box">
                    <label>Predicted next behavior</label>
                    <p>{analysis.archetype.nextBehavior}</p>
                  </div>
                  <div className="flashpoints">
                    <label>Emotional flashpoints — do not touch</label>
                    <ul>{analysis.archetype.flashpoints.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                  <div className="dealtwin">
                    <label>Deal twin</label>
                    <p>{analysis.archetype.dealTwin}</p>
                  </div>
                </Insight>
              )}
            </>
          )}
        </div>

        {/* ── Right: agent trace ── */}
        <div className="wr-right">
          <div className="trace">
            <div className="trace-head">
              <span className="dot pulse" /> Agent Trace
            </div>
            <div className="trace-body" ref={traceBodyRef}>
              {trace.map((line, i) => (
                <div key={i} className="trace-line">
                  <span className="trace-time">{String(i + 1).padStart(2, "0")}</span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
