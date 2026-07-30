import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAnimatedNumber } from "../hooks.js";
import CompanyLogo from "./CompanyLogo.jsx";
import { DueBadge, dueStatus } from "./MyDay.jsx";
import { Zap, Gauge, CalendarClock, ClipboardList } from "./Icons.jsx";

function scoreTone(v) {
  if (v >= 70) return "hot";
  if (v >= 50) return "warm";
  return "cool";
}

function Score({ value }) {
  const display = useAnimatedNumber(value, 1100);
  return <span className={`row-score ${scoreTone(display)}`}>{display}</span>;
}

// Tiny score-history trend line.
function Sparkline({ points = [] }) {
  if (points.length < 2) return <span className="spark spark-flat" />;
  const W = 52, H = 18, p = 2.5;
  const min = Math.min(...points), max = Math.max(...points);
  const range = Math.max(2, max - min);
  const xy = points.map((v, i) => [
    p + (i * (W - 2 * p)) / (points.length - 1),
    H - p - ((v - min) / range) * (H - 2 * p),
  ]);
  const up = points[points.length - 1] >= points[0];
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg className="spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={xy.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke={up ? "#15803d" : "#b91c1c"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <circle cx={lx} cy={ly} r="2.2" fill={up ? "#15803d" : "#b91c1c"} />
    </svg>
  );
}

const COLUMNS = [
  { key: "rank", label: "#", get: (t) => -t.scores.likelihood },
  { key: "company", label: "Account", get: (t) => t.company },
  { key: "stage", label: "Stage", get: (t) => t.details?.stage || t.stage },
  { key: "nexttouch", label: "Next Touch", get: (t) => t.nextTouch?.due || "9999" },
  { key: "owner", label: "Owner", get: (t) => t.owner.name },
  { key: "revenue", label: "Revenue", get: (t) => t.financials.revenue },
  { key: "ebitda", label: "EBITDA %", get: (t) => t.financials.ebitdaMargin },
  { key: "arr", label: "ARR %", get: (t) => t.financials.arrPct },
  { key: "close", label: "Close", get: (t) => t.scores.close },
  { key: "likelihood", label: "Likelihood", get: (t) => t.scores.likelihood },
  { key: "signals", label: "Signals", get: null },
];

function KpiTile({ icon, label, value, tone, onClick }) {
  return (
    <div className={`kpi ${onClick ? "kpi-click" : ""}`} onClick={onClick}>
      <span className={`kpi-icon kpi-${tone || "neutral"}`}>{icon}</span>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

export default function Board({ targets, sweepStatus, tasks, onOpen, onGoMyDay }) {
  const [sort, setSort] = useState({ key: "rank", dir: 1 });
  const [query, setQuery] = useState("");

  // FLIP: rows glide to their new position when the ranking changes.
  const rowRefs = useRef(new Map());
  const prevTops = useRef(new Map());
  useLayoutEffect(() => {
    rowRefs.current.forEach((el, id) => {
      if (!el || !el.isConnected) return;
      const top = el.getBoundingClientRect().top;
      const prev = prevTops.current.get(id);
      if (prev !== undefined && Math.abs(prev - top) > 2) {
        el.animate(
          [{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }],
          { duration: 550, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        );
      }
      prevTops.current.set(id, top);
    });
  });

  function toggleSort(col) {
    if (!col.get) return;
    setSort((s) => (s.key === col.key ? { key: col.key, dir: -s.dir } : { key: col.key, dir: 1 }));
  }

  const ranked = useMemo(
    () => [...targets].sort((a, b) => b.scores.likelihood - a.scores.likelihood),
    [targets]
  );
  const rankOf = (t) => ranked.indexOf(t) + 1;

  const rows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[0];
    const q = query.trim().toLowerCase();
    let out = [...targets];
    if (q) {
      out = out.filter((t) =>
        [t.company, t.vertical, t.stage, t.owner.name, t.details?.industry]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    out.sort((a, b) => {
      const av = col.get(a);
      const bv = col.get(b);
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return cmp * sort.dir;
    });
    return out;
  }, [targets, sort, query]);

  return (
    <div className="board">
      <div className="board-header">
        <div>
          <h1>Accounts · Likelihood to Transact</h1>
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

      {targets.length > 0 && (
        <div className="kpi-strip">
          <KpiTile
            icon={<Gauge size={17} />}
            tone="blue"
            label="Avg likelihood"
            value={Math.round(targets.reduce((s, t) => s + t.scores.likelihood, 0) / targets.length)}
          />
          <KpiTile
            icon={<Zap size={17} />}
            tone="amber"
            label="Catalysts active"
            value={targets.filter((t) => t.enriched && t.signals.some((s) => s.catalyst)).length}
          />
          <KpiTile
            icon={<CalendarClock size={17} />}
            tone={targets.some((t) => t.nextTouch && dueStatus(t.nextTouch.due) !== "upcoming") ? "red" : "neutral"}
            label="Touches due"
            value={targets.filter((t) => t.nextTouch && dueStatus(t.nextTouch.due) !== "upcoming").length}
            onClick={onGoMyDay}
          />
          <KpiTile
            icon={<ClipboardList size={17} />}
            tone="neutral"
            label="Open tasks"
            value={tasks.filter((t) => !t.done).length}
            onClick={onGoMyDay}
          />
        </div>
      )}

      <div className="list-toolbar">
        <input
          className="list-filter"
          placeholder="Filter accounts — company, stage, industry, owner…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="list-count">{rows.length} of {targets.length} account{targets.length === 1 ? "" : "s"}</span>
      </div>

      <div className="list-wrap">
        <table className="account-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={c.get ? "sortable" : ""}
                  onClick={() => toggleSort(c)}
                  title={c.get ? "Click to sort" : undefined}
                >
                  {c.label}
                  {sort.key === c.key && <span className="sort-arrow">{sort.dir === 1 ? " ▲" : " ▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const hasCatalyst = t.enriched && t.signals.some((s) => s.catalyst);
              return (
                <tr
                  key={t.id}
                  ref={(el) => rowRefs.current.set(t.id, el)}
                  className={`account-row ${hasCatalyst ? "row-catalyst" : ""}`}
                  onClick={() => onOpen(t.id)}
                >
                  <td className="cell-rank">{rankOf(t)}</td>
                  <td>
                    <div className="cell-account">
                      <CompanyLogo target={t} size={34} />
                      <div>
                        <div className="cell-company">
                          {t.company}
                          {hasCatalyst && <span className="catalyst-tag"><Zap size={10} /> Catalyst</span>}
                        </div>
                        <div className="cell-vertical">{t.vertical}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-dim">{t.details?.stage || t.stage}</td>
                  <td className="cell-touch" title={t.nextTouch ? `${t.nextTouch.action} — ${t.nextTouch.reason}` : undefined}>
                    {t.nextTouch ? (
                      <>
                        <DueBadge due={t.nextTouch.due} />
                        <div className="cell-touch-action">{t.nextTouch.action}</div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="cell-dim">{t.owner.name}</td>
                  <td className="cell-num">${t.financials.revenue.toFixed(1)}M</td>
                  <td className="cell-num">{t.financials.ebitdaMargin}%</td>
                  <td className="cell-num">{t.financials.arrPct}%</td>
                  <td className="cell-num"><Score value={t.scores.close} /></td>
                  <td className="cell-num">
                    <div className="score-with-trend">
                      <Score value={t.scores.likelihood} />
                      <Sparkline points={t.scoreHistory} />
                    </div>
                  </td>
                  <td className="cell-signals">
                    {t.enriched ? (
                      <div className="chip-row" style={{ marginTop: 0, minHeight: 0 }}>
                        {t.signals.map((s, i) => (
                          <span
                            key={s.id}
                            className={`chip ${s.contribution > 0 ? "chip-pos" : s.contribution < 0 ? "chip-neg" : ""} ${s.catalyst ? "chip-catalyst" : ""}`}
                            style={{ animationDelay: `${i * 140}ms` }}
                            title={s.detail}
                          >
                            {s.label}
                            <b>{s.contribution > 0 ? `+${s.contribution}` : s.contribution || "±0"}</b>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="chip chip-scan">scanning…</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={COLUMNS.length} className="cell-empty">No accounts match "{query}"</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
