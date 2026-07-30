import React from "react";
import { useAnimatedNumber } from "../hooks.js";

function scoreTone(v) {
  if (v >= 70) return "hot";
  if (v >= 50) return "warm";
  return "cool";
}

function TargetCard({ target, rank, onOpen }) {
  const likelihood = useAnimatedNumber(target.scores.likelihood, 1100);
  const hasCatalyst = target.enriched && target.signals.some((s) => s.catalyst);

  return (
    <div
      className={`card ${hasCatalyst ? "card-catalyst" : ""}`}
      onClick={() => onOpen(target.id)}
    >
      {hasCatalyst && <div className="catalyst-banner">⚡ Catalyst detected</div>}
      <div className="card-head">
        <div>
          <div className="card-company">{target.company}</div>
          <div className="card-vertical">{target.vertical}</div>
        </div>
        <div className={`card-score ${scoreTone(likelihood)}`}>
          <div className="card-score-num">{likelihood}</div>
          <div className="card-score-label">likelihood</div>
        </div>
      </div>

      <div className="card-meta">
        <span>#{rank} · {target.stage}</span>
      </div>

      <div className="card-fin">
        <span>${target.financials.revenue.toFixed(1)}M rev</span>
        <span>{target.financials.ebitdaMargin}% EBITDA</span>
        <span>{target.financials.arrPct}% ARR</span>
      </div>

      <div className="chip-row">
        {target.enriched ? (
          target.signals.map((s, i) => (
            <span
              key={s.id}
              className={`chip ${s.contribution > 0 ? "chip-pos" : s.contribution < 0 ? "chip-neg" : ""} ${
                s.catalyst ? "chip-catalyst" : ""
              }`}
              style={{ animationDelay: `${i * 140}ms` }}
              title={s.detail}
            >
              {s.label}
              <b>{s.contribution > 0 ? `+${s.contribution}` : s.contribution || "±0"}</b>
            </span>
          ))
        ) : (
          <span className="chip chip-scan">scanning…</span>
        )}
      </div>
    </div>
  );
}

export default function Board({ targets, sweepStatus, tasks, onOpen }) {
  const ranked = [...targets].sort((a, b) => b.scores.likelihood - a.scores.likelihood);

  return (
    <div className="board">
      <div className="board-header">
        <div>
          <h1>Core Account · Likelihood to Transact</h1>
          <p className="board-sub">
            {sweepStatus === "running" && (
              <span className="sweep-live"><span className="dot pulse" /> Agent enrichment sweep running — scanning web, funding, hiring & broker signals…</span>
            )}
            {sweepStatus === "done" && "Enrichment sweep complete · signals current as of today"}
            {sweepStatus === "idle" && "Loading pipeline…"}
          </p>
        </div>
        {tasks.length > 0 && (
          <div className="task-strip">
            <div className="task-strip-title">Agent tasks ({tasks.length})</div>
            <div className="task-strip-item">☐ {tasks[0].text}</div>
          </div>
        )}
      </div>

      <div className="card-grid">
        {ranked.map((t, i) => (
          <TargetCard key={t.id} target={t} rank={i + 1} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
