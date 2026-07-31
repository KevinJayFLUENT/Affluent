import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAnimatedNumber } from "../hooks.js";
import CompanyLogo from "./CompanyLogo.jsx";
import { DueBadge, dueStatus } from "./MyDay.jsx";
import { Zap, Gauge, CalendarClock, ClipboardList, ChevronDown, ChevronUp } from "./Icons.jsx";

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
export function Sparkline({ points = [] }) {
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
  { key: "rank", label: "#", get: (t) => -t.scores.likelihood,
    tip: "Rank by likelihood to transact — re-ranks live as scores move." },
  { key: "company", label: "Account", get: (t) => t.company,
    tip: "The acquisition target. A catalyst tag means an external event just reversed the risk keeping this deal stuck." },
  { key: "stage", label: "Stage", get: (t) => t.details?.stage || t.stage,
    tip: "Where the account sits in our outreach funnel." },
  { key: "nexttouch", label: "Next Touch", get: (t) => t.nextTouch?.due || "9999",
    tip: "The agent-prescribed date for the next contact, based on the seller's archetype. Don't miss it — and don't jump it." },
  { key: "owner", label: "Owner", get: (t) => t.details?.accountOwner || t.owner.name,
    tip: "The Fluent deal lead who owns this account." },
  { key: "exclusivity", label: "Exclusivity", get: (t) => t.details?.exclusivity?.status || "None",
    tip: "Exclusivity is assigned to the Account Owner for 6 months. Status flips Active → Expiring Soon → Expired on its own as the end date approaches." },
  { key: "revenue", label: "Revenue", get: (t) => t.financials.revenue,
    tip: "Trailing-twelve-month revenue (estimated where not disclosed)." },
  { key: "ebitda", label: "EBITDA %", get: (t) => t.financials.ebitdaMargin,
    tip: "Profitability margin — quality of earnings at a glance." },
  { key: "arr", label: "ARR %", get: (t) => t.financials.arrPct,
    tip: "Share of revenue that recurs. Higher ARR mix supports a higher multiple." },
  { key: "close", label: "Close", get: (t) => t.scores.close,
    tip: "Probability of reaching a signed close, driven by how many path-to-transact blockers are still open. Click the meter in the account for the breakdown." },
  { key: "likelihood", label: "Likelihood", get: (t) => t.scores.likelihood,
    tip: "0–100 likelihood the owner transacts at all — read from the conversation history plus enrichment signals. The trend line shows its movement." },
  { key: "signals", label: "Signals", get: null,
    tip: "Enrichment findings from web, CRM, and broker channels, each with its score impact. Click +N or the arrow to see all of an account's signals." },
];

function KpiTile({ icon, label, value, tone, onClick, tip, active }) {
  return (
    <div className={`kpi ${onClick ? "kpi-click" : ""} ${active ? "kpi-active" : ""}`} onClick={onClick}>
      <span className={`kpi-icon kpi-${tone || "neutral"}`}>{icon}</span>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
      </div>
      {tip && <div className="kpi-tip">{tip}</div>}
    </div>
  );
}

// Exclusivity status chip — status is computed server-side from the record's
// dates, so it flips on its own as time passes.
function ExclusivityCell({ exclusivity }) {
  const status = exclusivity?.status;
  if (!status || status === "None") return <span className="muted">—</span>;
  const cls = status === "Active" ? "exc-active" : status === "Expiring Soon" ? "exc-expiring" : "exc-expired";
  return (
    <span className={`exc-chip ${cls}`} title={`${exclusivity.owner} · ${exclusivity.startDate} → ${exclusivity.endDate}`}>
      {status}
      <span className="exc-date">{exclusivity.endDate}</span>
    </span>
  );
}

function OwnerCell({ name }) {
  if (!name) return <span className="muted">—</span>;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="owner-cell" title={name}>
      <span className="owner-avatar">{initials}</span>
      <span className="owner-name">{name.split(" ")[0]}</span>
    </span>
  );
}

// One clean button per row: count + net impact. Click to expand the full
// signal list; each expanded signal explains itself on hover.
function SignalCell({ target, expanded, onToggle }) {
  if (!target.enriched) return <span className="chip chip-scan">scanning…</span>;
  const net = target.signals.reduce((s, x) => s + x.contribution, 0);
  const hasCatalyst = target.signals.some((s) => s.catalyst);
  return (
    <button
      className={`sig-btn ${expanded ? "open" : ""}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {hasCatalyst && <Zap size={11} style={{ color: "#d97706" }} />}
      {target.signals.length} signal{target.signals.length === 1 ? "" : "s"}
      <b className={net >= 0 ? "pos" : "neg"}>{net > 0 ? `+${net}` : net || "±0"}</b>
      {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
    </button>
  );
}

// Full signal list, shown as an expanded row — hover any signal for its story.
function SignalDetailRow({ target, colSpan }) {
  const sorted = [...target.signals].sort(
    (a, b) => (b.catalyst ? 1 : 0) - (a.catalyst ? 1 : 0) || Math.abs(b.contribution) - Math.abs(a.contribution)
  );
  return (
    <tr className="signal-detail-row">
      <td colSpan={colSpan}>
        <div className="signal-chips">
          {sorted.map((s, i) => (
            <span
              key={s.id}
              className={`chip sig-chip ${s.contribution > 0 ? "chip-pos" : s.contribution < 0 ? "chip-neg" : ""} ${s.catalyst ? "chip-catalyst" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {s.catalyst && <Zap size={11} />}
              {s.label}
              <b>{s.contribution > 0 ? `+${s.contribution}` : s.contribution || "±0"}</b>
              <span className="sig-tip">
                <b>{s.value}</b>
                <div>{s.detail}</div>
                <div className="sig-tip-src">
                  Source: {s.source === "web" ? "web enrichment" : s.source === "broker" ? "broker channel" : "CRM history"}
                </div>
              </span>
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

export default function Board({ targets, sweepStatus, tasks, onOpen, onGoMyDay, onNew }) {
  const [sort, setSort] = useState({ key: "rank", dir: 1 });
  const [query, setQuery] = useState("");
  const [catalystOnly, setCatalystOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [colFilters, setColFilters] = useState({});
  const setCF = (key, value) => setColFilters((f) => ({ ...f, [key]: value || undefined }));
  const activeFilterCount = Object.values(colFilters).filter(Boolean).length + (catalystOnly ? 1 : 0);

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
    if (catalystOnly) out = out.filter((t) => t.enriched && t.signals.some((s) => s.catalyst));
    const f = colFilters;
    if (f.company) out = out.filter((t) => (t.company + " " + t.vertical).toLowerCase().includes(f.company.toLowerCase()));
    if (f.stage) out = out.filter((t) => (t.details?.stage || t.stage) === f.stage);
    if (f.owner) out = out.filter((t) => (t.details?.accountOwner || t.owner.name) === f.owner);
    if (f.exclusivity) out = out.filter((t) => (t.details?.exclusivity?.status || "None") === f.exclusivity);
    if (f.nexttouch) {
      out = out.filter((t) => {
        const s = t.nextTouch ? dueStatus(t.nextTouch.due) : null;
        return f.nexttouch === "due" ? s === "overdue" || s === "today" : s === f.nexttouch;
      });
    }
    if (f.revenue) out = out.filter((t) => t.financials.revenue >= parseFloat(f.revenue));
    if (f.ebitda) out = out.filter((t) => t.financials.ebitdaMargin >= parseFloat(f.ebitda));
    if (f.arr) out = out.filter((t) => t.financials.arrPct >= parseFloat(f.arr));
    if (f.close) out = out.filter((t) => t.scores.close >= parseFloat(f.close));
    if (f.likelihood) out = out.filter((t) => t.scores.likelihood >= parseFloat(f.likelihood));
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
  }, [targets, sort, query, catalystOnly, colFilters]);

  const distinct = (get) => [...new Set(targets.map(get).filter(Boolean))].sort();
  const stages = distinct((t) => t.details?.stage || t.stage);
  const owners = distinct((t) => t.details?.accountOwner || t.owner.name);

  return (
    <div className="board">
      <div className="board-header">
        <div>
          <h1>Pipeline</h1>
          <p className="board-sub">
            {sweepStatus === "running" && (
              <span className="sweep-live"><span className="dot pulse" /> Agent enrichment sweep running — scanning web, funding, hiring & broker signals…</span>
            )}
            {sweepStatus === "done" && `${targets.length} accounts · ranked by likelihood to transact · signals current as of today`}
            {sweepStatus === "idle" && "Loading pipeline…"}
          </p>
        </div>
        {onNew && (
          <button className="primary-btn" onClick={onNew} title="Create a new account — the agent enriches it on save">
            + New
          </button>
        )}
      </div>

      {targets.length > 0 && (
        <div className="kpi-strip">
          <KpiTile
            icon={<Gauge size={17} />}
            tone="blue"
            label="Avg likelihood"
            value={Math.round(targets.reduce((s, t) => s + t.scores.likelihood, 0) / targets.length)}
            tip="Average likelihood-to-transact across the pipeline, out of 100. Driven by conversation history + enrichment signals."
          />
          <KpiTile
            icon={<Zap size={17} />}
            tone="amber"
            label="Catalysts active"
            value={targets.filter((t) => t.enriched && t.signals.some((s) => s.catalyst)).length}
            onClick={() => setCatalystOnly(!catalystOnly)}
            active={catalystOnly}
            tip="A catalyst is an external event — a regulation reversal, a competitor exiting, a funding shift — that removes the specific risk keeping a deal stuck. It's the strongest revival signal in the book. Click to filter the list."
          />
          <KpiTile
            icon={<CalendarClock size={17} />}
            tone={targets.some((t) => t.nextTouch && dueStatus(t.nextTouch.due) !== "upcoming") ? "red" : "neutral"}
            label="Touches due"
            value={targets.filter((t) => t.nextTouch && dueStatus(t.nextTouch.due) !== "upcoming").length}
            onClick={onGoMyDay}
            tip="Accounts at or past their agent-prescribed next-touch date. Click to open Mission Control."
          />
          <KpiTile
            icon={<ClipboardList size={17} />}
            tone="neutral"
            label="Open tasks"
            value={tasks.filter((t) => !t.done).length}
            onClick={onGoMyDay}
            tip="Follow-ups the agent created from approved actions. Click to open Mission Control."
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
        <button
          className={`filter-toggle ${showFilters || activeFilterCount ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters{activeFilterCount > 0 && <span className="nav-badge">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <button className="insight-more" onClick={() => { setColFilters({}); setCatalystOnly(false); }}>
            Clear
          </button>
        )}
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
                >
                  {c.label}
                  {sort.key === c.key && <span className="sort-arrow">{sort.dir === 1 ? " ▲" : " ▼"}</span>}
                  {c.tip && (
                    <div className="th-tip">
                      {c.tip}
                      {c.get && <div className="th-tip-sort">Click to sort</div>}
                    </div>
                  )}
                </th>
              ))}
            </tr>
            {showFilters && (
              <tr className="filter-row">
                <th />
                <th><input className="col-filter" placeholder="Contains…" value={colFilters.company || ""} onChange={(e) => setCF("company", e.target.value)} /></th>
                <th>
                  <select className="col-filter" value={colFilters.stage || ""} onChange={(e) => setCF("stage", e.target.value)}>
                    <option value="">Any</option>
                    {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </th>
                <th>
                  <select className="col-filter" value={colFilters.nexttouch || ""} onChange={(e) => setCF("nexttouch", e.target.value)}>
                    <option value="">Any</option>
                    <option value="due">Due or overdue</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </th>
                <th>
                  <select className="col-filter" value={colFilters.owner || ""} onChange={(e) => setCF("owner", e.target.value)}>
                    <option value="">Any</option>
                    {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </th>
                <th>
                  <select className="col-filter" value={colFilters.exclusivity || ""} onChange={(e) => setCF("exclusivity", e.target.value)}>
                    <option value="">Any</option>
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Expired">Expired</option>
                    <option value="None">None</option>
                  </select>
                </th>
                <th><input className="col-filter" type="number" placeholder="≥ $M" value={colFilters.revenue || ""} onChange={(e) => setCF("revenue", e.target.value)} /></th>
                <th><input className="col-filter" type="number" placeholder="≥ %" value={colFilters.ebitda || ""} onChange={(e) => setCF("ebitda", e.target.value)} /></th>
                <th><input className="col-filter" type="number" placeholder="≥ %" value={colFilters.arr || ""} onChange={(e) => setCF("arr", e.target.value)} /></th>
                <th><input className="col-filter" type="number" placeholder="≥" value={colFilters.close || ""} onChange={(e) => setCF("close", e.target.value)} /></th>
                <th><input className="col-filter" type="number" placeholder="≥" value={colFilters.likelihood || ""} onChange={(e) => setCF("likelihood", e.target.value)} /></th>
                <th>
                  <select className="col-filter" value={catalystOnly ? "catalyst" : ""} onChange={(e) => setCatalystOnly(e.target.value === "catalyst")}>
                    <option value="">Any</option>
                    <option value="catalyst">Catalyst</option>
                  </select>
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((t) => {
              const hasCatalyst = t.enriched && t.signals.some((s) => s.catalyst);
              return (
                <React.Fragment key={t.id}>
                <tr
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
                  <td><OwnerCell name={t.details?.accountOwner || t.owner.name} /></td>
                  <td><ExclusivityCell exclusivity={t.details?.exclusivity} /></td>
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
                    <SignalCell
                      target={t}
                      expanded={expandedId === t.id}
                      onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    />
                  </td>
                </tr>
                {expandedId === t.id && t.enriched && (
                  <SignalDetailRow target={t} colSpan={COLUMNS.length} />
                )}
                </React.Fragment>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={COLUMNS.length} className="cell-empty">
                  {query ? `No accounts match "${query}"` : catalystOnly ? "No accounts with an active catalyst" : "No accounts"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
