import React, { useEffect, useRef, useState } from "react";
import { analyzeTarget, executeAction } from "../api.js";
import { useAnimatedNumber } from "../hooks.js";
import AccountDetails from "./AccountDetails.jsx";
import CompanyLogo from "./CompanyLogo.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// First sentence = the headline; the rest goes behind "More".
function splitLead(text = "") {
  const m = text.match(/^(.+?[.!?])\s+(.+)$/s);
  return m ? [m[1], m[2]] : [text, null];
}

function Meter({ label, value, sub, tone, onClick, hint }) {
  const display = useAnimatedNumber(value, 1300);
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className="meter" onClick={onClick} title="Click for factor breakdown">
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
            {open ? "▴ Less" : "▾ More detail"}
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

function FactorModal({ target, analysis, mode, onClose }) {
  const openBlockers = target.blockers.filter((b) => b.status !== "in-motion");
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
              {target.blockers.map((b) => (
                <div key={b.id} className={`factor ${b.status === "in-motion" ? "" : "factor-conv"}`} title={b.detail}>
                  <div className="factor-top">
                    <span className="factor-label">{b.label}</span>
                    <span className={`factor-contrib ${b.status === "in-motion" ? "pos" : "neg"}`}>
                      {b.status === "in-motion" ? `+${b.closeWeight || 0} applied` : `+${b.closeWeight || 0} if resolved`}
                    </span>
                  </div>
                  <div className="factor-value">{b.detail}</div>
                  <div className="factor-src">
                    status: {b.status === "in-motion" ? "in motion — already reflected in the score" : b.status}
                  </div>
                </div>
              ))}
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

const sentimentColor = {
  positive: "#2e844a",
  warm: "#dd7a01",
  neutral: "#8a8f98",
  negative: "#ba0517",
  none: "#c9ced6",
};

function TimelineItem({ a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tl-item">
      <span className="tl-dot" style={{ background: sentimentColor[a.sentiment] || "#c9ced6" }} />
      <div style={{ minWidth: 0 }}>
        <div className="tl-meta">
          <span className={`tl-dir ${a.direction === "in" ? "in" : "out"}`}>
            {a.direction === "in" ? "↙ IN" : "↗ OUT"}
          </span>{" "}
          {a.date} · {a.rep} · {a.type}
        </div>
        {a.subject && <div className="tl-subject">{a.subject}</div>}
        <div className="tl-note">{a.note}</div>
        {a.body && (
          <>
            <button className="tl-read" onClick={() => setOpen(!open)}>
              {open ? "▴ Hide email" : "✉ Read email"}
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
  const [draftOpen, setDraftOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executedActions, setExecutedActions] = useState([]);
  const [rescoreNote, setRescoreNote] = useState(null);
  const traceBodyRef = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    analyzeTarget(target.id, {
      onTrace: (t) => setTrace((prev) => [...prev, t.text]),
      onAnalysis: (payload) => setAnalysis(payload.analysis),
    }).catch(() => setAnalysis(target.cachedAnalysis));
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

  const blockedCount = target.blockers.filter((b) => b.status !== "in-motion").length;
  const primaryBlocker = target.blockers.find(
    (b) => b.status !== "in-motion" && b.action && !executedActions.includes(b.action.id)
  );

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
      </div>

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
          {rescoreNote && <div className="rescore-note">↑ {rescoreNote}</div>}

          <Panel title="Activity" tag={`${target.activity.length} touches · all logged`}>
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
          </div>

          {tab === "details" && <AccountDetails target={target} />}

          {tab === "intelligence" && (
            <>
              {!analysis && (
                <div className="analyzing">
                  <div className="spinner" />
                  <div>Agent reading {target.activity.length} logged interactions…</div>
                </div>
              )}

              {/* 1. The point: what to do next */}
              {analysis && primaryBlocker && (
                <Panel title="Next Best Action" tag="review & approve" tone="action">
                  <div className="action-title">{analysis.recommendedAction.title}</div>
                  <p>{analysis.recommendedAction.rationale}</p>
                  <button className="insight-more" onClick={() => setDraftOpen(!draftOpen)}>
                    {draftOpen ? "▴ Hide draft" : "▾ View drafted email"}
                  </button>
                  {draftOpen && <pre className="artifact">{analysis.recommendedAction.artifact}</pre>}
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      disabled={executing}
                      onClick={() => approve(primaryBlocker.action, analysis.recommendedAction.artifact)}
                    >
                      {executing ? "Executing…" : "✓ Review & Approve"}
                    </button>
                    <span className="action-note">Simulated send · state changes are real</span>
                  </div>
                </Panel>
              )}

              {analysis && !primaryBlocker && (
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
                            {b.status === "in-motion" ? "In Motion" : b.status === "blocked" ? "Blocked" : "Pending"}
                          </span>
                        </div>
                        {b.action && b.status !== "in-motion" && !executedActions.includes(b.action.id) && (
                          <button className="blocker-action" disabled={executing} onClick={() => approve(b.action, null)}>
                            ▸ {b.action.label}
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
                  headline={`⚡ ${analysis.revivalRadar.catalyst}`}
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
