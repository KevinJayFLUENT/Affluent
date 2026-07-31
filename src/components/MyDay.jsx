import React, { useEffect, useRef, useState } from "react";
import CompanyLogo from "./CompanyLogo.jsx";
import { Sparkline } from "./Board.jsx";
import { RotateCcw, Play, ChevronDown, ChevronUp, Check, ArrowUpRight } from "./Icons.jsx";

const TODAY = new Date().toISOString().slice(0, 10);
const DAY = 86400000;

export function dueStatus(due) {
  if (!due) return null;
  if (due < TODAY) return "overdue";
  if (due === TODAY) return "today";
  return "upcoming";
}

export function DueBadge({ due }) {
  const status = dueStatus(due);
  if (!status) return <span className="muted">—</span>;
  const label =
    status === "overdue" ? "Overdue" : status === "today" ? "Today" : new Date(due + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return <span className={`due-badge due-${status}`}>{label}</span>;
}

function daysUntil(due) {
  return Math.round((new Date(due + "T00:00:00") - new Date(TODAY + "T00:00:00")) / DAY);
}

function relativeTime(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
}

// Generic donut: [{label, value, color}] with side legend. Pure SVG.
function Donut({ data, centerLabel }) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="muted">No data.</p>;
  const R = 30, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-row">
      <svg viewBox="0 0 84 84" width="84" height="84" role="img">
        <title>{centerLabel}</title>
        {slices.map((d) => {
          const len = (d.value / total) * C;
          const seg = (
            <circle
              key={d.label}
              cx="42" cy="42" r={R}
              fill="none" stroke={d.color} strokeWidth="13"
              strokeDasharray={`${Math.max(0.5, len - (slices.length > 1 ? 2 : 0))} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 42 42)"
            />
          );
          offset += len;
          return seg;
        })}
        <text x="42" y="40" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f2937">{total}</text>
        <text x="42" y="52" textAnchor="middle" fontSize="7.5" fill="#9ca3af">{centerLabel}</text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div key={d.label} className="donut-leg">
            <i style={{ background: d.color }} />
            <span>{d.label}</span>
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// Book analytics: predictive charts computed client-side from the scoped
// accounts. Plain SVG, no libraries — deterministic and safe.
function BookCharts({ accounts }) {
  const rows = [...accounts].sort((a, b) => b.scores.likelihood - a.scores.likelihood);
  if (!rows.length) return <p className="muted">No accounts in this book.</p>;
  const W = 330, L = 6, R = 36;
  const barW = W - L - R;
  const rowH = 32, H1 = rows.length * rowH + 4;
  const touch = rows.filter((t) => t.nextTouch).sort((a, b) => a.nextTouch.due.localeCompare(b.nextTouch.due));
  const H2 = touch.length * 24 + 32;
  const tx = (d) => {
    const dd = Math.max(0, Math.min(92, daysUntil(d)));
    return 100 + (dd / 92) * (W - 108);
  };
  const dotColor = (d) => {
    const s = dueStatus(d);
    return s === "overdue" ? "#b91c1c" : s === "today" ? "#d97706" : "#2563eb";
  };

  // Book stats
  const totalRev = rows.reduce((s, t) => s + t.financials.revenue, 0);
  const avgLik = Math.round(rows.reduce((s, t) => s + t.scores.likelihood, 0) / rows.length);
  const hot = rows.filter((t) => t.scores.likelihood >= 70).length;
  const overdueN = rows.filter((t) => t.nextTouch && dueStatus(t.nextTouch.due) !== "upcoming").length;

  // Exclusivity health (statuses derived server-side from dates)
  const exCount = (s) => rows.filter((t) => t.details?.exclusivity?.status === s).length;
  const exclusivityData = [
    { label: "Active", value: exCount("Active"), color: "#15803d" },
    { label: "Expiring soon", value: exCount("Expiring Soon"), color: "#d97706" },
    { label: "Expired", value: exCount("Expired"), color: "#b91c1c" },
    { label: "None", value: rows.length - exCount("Active") - exCount("Expiring Soon") - exCount("Expired"), color: "#d6d9de" },
  ];

  // Engagement freshness: days since last logged activity
  const freshnessOf = (t) => {
    const last = t.activity?.[t.activity.length - 1]?.date;
    if (!last) return "none";
    const d = Math.round((Date.now() - new Date(last + "T00:00:00")) / DAY);
    return d <= 30 ? "fresh" : d <= 90 ? "mid" : "stale";
  };
  const fCount = (k) => rows.filter((t) => freshnessOf(t) === k).length;
  const freshnessData = [
    { label: "Active <30d", value: fCount("fresh"), color: "#1d4ed8" },
    { label: "Quiet 30–90d", value: fCount("mid"), color: "#60a5fa" },
    { label: "Dark 90d+", value: fCount("stale"), color: "#bfdbfe" },
    { label: "No history", value: fCount("none"), color: "#d6d9de" },
  ];

  return (
    <>
      <div className="book-stats">
        <div className="book-stat"><b>${totalRev.toFixed(1)}M</b><span>book revenue</span></div>
        <div className="book-stat"><b>{avgLik}</b><span>avg likelihood</span></div>
        <div className="book-stat"><b>{hot}</b><span>hot (≥70)</span></div>
        <div className="book-stat"><b style={overdueN ? { color: "#b91c1c" } : undefined}>{overdueN}</b><span>touches due</span></div>
      </div>

      <div className="chart-title">Likelihood to transact</div>
      <svg viewBox={`0 0 ${W} ${H1}`} width="100%" role="img">
        <title>Likelihood to transact by account</title>
        {rows.map((t, i) => {
          const y = i * rowH;
          const v = t.scores.likelihood;
          return (
            <g key={t.id}>
              <text x={L} y={y + 11} fontSize="10.5" fill="#4b5563">
                {t.company.length > 30 ? t.company.slice(0, 29) + "…" : t.company}
              </text>
              <rect x={L} y={y + 15} width={barW} height={9} rx={3.5} fill="#f0f1f3" />
              <rect x={L} y={y + 15} width={Math.max(4, (v / 100) * barW)} height={9} rx={3.5} fill="#2563eb" />
              <text x={L + barW + 6} y={y + 23} fontSize="10.5" fontWeight="600" fill="#1f2937">{v}</text>
            </g>
          );
        })}
      </svg>

      <div className="chart-title" style={{ marginTop: 16 }}>Touch cadence — next 90 days</div>
      {!touch.length && <p className="muted">No scheduled touches.</p>}
      {touch.length > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H2}`} width="100%" role="img">
            <title>Scheduled touches over the next 90 days</title>
            {[0, 30, 60, 90].map((d) => {
              const x = 100 + (d / 92) * (W - 108);
              return (
                <g key={d}>
                  <line x1={x} y1={4} x2={x} y2={H2 - 18} stroke="#eef0f3" strokeWidth="1" />
                  <text x={x} y={H2 - 6} fontSize="9.5" fill="#9ca3af" textAnchor="middle">
                    {d === 0 ? "today" : `+${d}d`}
                  </text>
                </g>
              );
            })}
            {touch.map((t, i) => {
              const y = 12 + i * 24;
              return (
                <g key={t.id}>
                  <text x={94} y={y + 3.5} fontSize="10" fill="#4b5563" textAnchor="end">{t.company.split(" ")[0]}</text>
                  <line x1={100} y1={y} x2={W - 8} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                  <circle cx={tx(t.nextTouch.due)} cy={y} r="4.5" fill={dotColor(t.nextTouch.due)}>
                    <title>{`${t.company} — ${t.nextTouch.due}: ${t.nextTouch.action}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
          <div className="chart-legend">
            <span><i style={{ background: "#b91c1c" }} /> overdue</span>
            <span><i style={{ background: "#d97706" }} /> today</span>
            <span><i style={{ background: "#2563eb" }} /> scheduled</span>
          </div>
        </>
      )}

      <div className="chart-title" style={{ marginTop: 16 }}>Exclusivity health</div>
      <Donut data={exclusivityData} centerLabel="accounts" />

      <div className="chart-title" style={{ marginTop: 16 }}>Engagement freshness</div>
      <Donut data={freshnessData} centerLabel="accounts" />
    </>
  );
}

function TouchRow({ t, onOpen, upcoming }) {
  const days = daysUntil(t.nextTouch.due);
  return (
    <div className={`touch-row ${upcoming ? "touch-upcoming" : ""}`} onClick={() => onOpen(t.id)}>
      <CompanyLogo target={t} size={30} />
      <div className="touch-body">
        <div className="touch-action">{t.nextTouch.action}</div>
        <div className="touch-reason">{t.company} — {t.nextTouch.reason}</div>
      </div>
      {upcoming && days > 0 && <span className="touch-days">in {days}d</span>}
      <DueBadge due={t.nextTouch.due} />
    </div>
  );
}

export default function MyDay({ targets, tasks, log = [], digest, onOpen, onToggleTask, onRunDigest, digestRunning }) {
  const [showDone, setShowDone] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [showCharts, setShowCharts] = useState(() => localStorage.getItem("mc-charts") !== "off");
  const toggleCharts = (on) => {
    setShowCharts(on);
    localStorage.setItem("mc-charts", on ? "on" : "off");
  };
  const autoRan = useRef(false);
  const owners = [...new Set(targets.map((t) => t.details?.accountOwner || t.owner.name))].sort();
  const ownerOf = (t) => t.details?.accountOwner || t.owner.name;

  // Page-level owner scope: everything below follows it.
  const scoped = ownerFilter ? targets.filter((t) => ownerOf(t) === ownerFilter) : targets;
  const scopedIds = new Set(scoped.map((t) => t.id));
  const scopedTasks = ownerFilter ? tasks.filter((t) => scopedIds.has(t.targetId)) : tasks;
  const scopedLog = ownerFilter ? log.filter((e) => scopedIds.has(e.targetId)) : log;

  // First visit with no digest: run the sweep so the page is never empty.
  useEffect(() => {
    if (!digest && !digestRunning && !autoRan.current) {
      autoRan.current = true;
      onRunDigest(null);
    }
  }, []);

  const touches = scoped
    .filter((t) => t.nextTouch)
    .sort((a, b) => a.nextTouch.due.localeCompare(b.nextTouch.due));
  const dueNow = touches.filter((t) => t.nextTouch.due <= TODAY);
  const upcoming = touches.filter((t) => t.nextTouch.due > TODAY);
  const thisWeek = upcoming.filter((t) => daysUntil(t.nextTouch.due) <= 7);
  const nextWeek = upcoming.filter((t) => daysUntil(t.nextTouch.due) > 7 && daysUntil(t.nextTouch.due) <= 14);
  const later = upcoming.filter((t) => daysUntil(t.nextTouch.due) > 14);
  const openTasks = scopedTasks.filter((t) => !t.done);
  const doneTasks = scopedTasks.filter((t) => t.done);

  // Score movers since session start (seed score = first history point).
  const movers = scoped
    .map((t) => ({ t, delta: (t.scoreHistory?.at(-1) ?? t.scores.likelihood) - (t.scoreHistory?.[0] ?? t.scores.likelihood) }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  // Match a digest priority line back to its account for click-through.
  const accountFor = (line) =>
    targets.find((t) => line.toLowerCase().includes(t.company.toLowerCase().split(" ")[0]));

  return (
    <div className="myday">
      <div className="board-header">
        <div>
          <h1>Mission Control</h1>
          <p className="board-sub">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} ·{" "}
            {dueNow.length} touch{dueNow.length === 1 ? "" : "es"} due · {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
            {ownerFilter && ` · viewing ${ownerFilter}'s book`}
          </p>
        </div>
        <div className="mc-controls">
          <label className="owner-scope">
            <span>Book</span>
            <select className="col-filter" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
              <option value="">All owners</option>
              {owners.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="charts-toggle">
            <input type="checkbox" checked={showCharts} onChange={(e) => toggleCharts(e.target.checked)} />
            Analytics
          </label>
        </div>
      </div>

      <div className={showCharts ? "myday-grid" : ""}>
      <div className="myday-main">

      {/* Weekly portfolio sweep digest */}
      <section className="panel digest">
        <div className="panel-head">
          <h3>
            Weekly Portfolio Sweep
            {digest && (
              <span className="digest-scope">
                · for {!digest.ownerScope || digest.ownerScope === "all" ? "all owners" : digest.ownerScope}
              </span>
            )}
          </h3>
          <button
            className="digest-btn"
            onClick={() => onRunDigest(ownerFilter || null)}
            disabled={digestRunning}
            title={ownerFilter ? `Sweep ${ownerFilter}'s book` : "Sweep the entire book"}
          >
            {digestRunning ? "Sweeping…" : digest ? <><RotateCcw size={12} /> Re-run sweep</> : <><Play size={11} /> Run sweep</>}
          </button>
        </div>
        {digestRunning && !digest && (
          <div className="analyzing" style={{ border: "none", padding: "8px 0", margin: 0, boxShadow: "none" }}>
            <div className="spinner" />
            <div>Agent sweeping {targets.length} accounts…</div>
          </div>
        )}
        {digest && (
          <>
            <div className="digest-headline">{digest.headline}</div>
            {(digest.summary || digest.brief) && <p className="digest-summary">{digest.summary || digest.brief}</p>}
            {digest.priorities.length > 0 && (
              <div className="factor-group-title" style={{ marginTop: 12 }}>This week's priorities — hover for the why</div>
            )}
            <div className="digest-priorities">
              {digest.priorities.map((p, i) => {
                const isRich = typeof p === "object";
                const label = isRich ? p.action : p;
                const account = accountFor(isRich ? p.company || p.action : p);
                return (
                  <div
                    key={i}
                    className={`priority-row ${account ? "priority-click" : ""}`}
                    onClick={account ? () => onOpen(account.id) : undefined}
                  >
                    {account ? <CompanyLogo target={account} size={26} /> : <span className="priority-num">{i + 1}</span>}
                    <div className="priority-body">
                      <div className="priority-action">{label}</div>
                      {isRich && p.company && <div className="priority-company">{p.company}</div>}
                    </div>
                    {isRich && p.urgency && (
                      <span className={`urgency-badge urgency-${p.urgency}`}>
                        {p.urgency === "now" ? "Act now" : p.urgency === "this-week" ? "This week" : "Watch"}
                      </span>
                    )}
                    {account && <span className="priority-go"><ArrowUpRight size={13} /></span>}
                    {isRich && p.why && <span className="pri-tip">{p.why}</span>}
                  </div>
                );
              })}
            </div>
            <div className="digest-meta">
              Swept {relativeTime(digest.generatedAt)} · {digest.source === "cached" ? "cached intelligence" : digest.source}
              {digest.ownerScope && digest.ownerScope !== "all" && ` · scope: ${digest.ownerScope}`}
            </div>
          </>
        )}
      </section>

      {/* Touches due */}
      <section className="panel">
        <div className="panel-head">
          <h3>Touches Due</h3>
          <span className="panel-tag">agent-prescribed cadence</span>
        </div>
        {!dueNow.length && <p className="muted">Nothing due today — the book is on cadence.</p>}
        <div className="touch-list">
          {dueNow.map((t) => <TouchRow key={t.id} t={t} onOpen={onOpen} />)}
        </div>
        {[["This week", thisWeek], ["Next week", nextWeek], ["Later", later]].map(([label, group]) =>
          group.length ? (
            <React.Fragment key={label}>
              <div className="factor-group-title" style={{ marginTop: 14 }}>{label} — on cadence, do not force</div>
              <div className="touch-list">
                {group.map((t) => <TouchRow key={t.id} t={t} onOpen={onOpen} upcoming />)}
              </div>
            </React.Fragment>
          ) : null
        )}
      </section>

      {/* Score movers */}
      {movers.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h3>Movers</h3>
            <span className="panel-tag">since session start</span>
          </div>
          <div className="mover-list">
            {movers.map(({ t, delta }) => (
              <div key={t.id} className="mover-row" onClick={() => onOpen(t.id)}>
                <CompanyLogo target={t} size={26} />
                <span className="mover-name">{t.company}</span>
                <Sparkline points={t.scoreHistory} />
                <span className={`mover-delta ${delta > 0 ? "pos" : "neg"}`}>
                  {delta > 0 ? "+" : ""}{delta}
                </span>
                <span className="mover-now">{t.scores.likelihood}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Agent tasks */}
      <section className="panel">
        <div className="panel-head">
          <h3>Agent Tasks</h3>
          <span className="panel-tag">{openTasks.length} open</span>
        </div>
        {!tasks.length && <p className="muted">No tasks yet — approve an agent action and its follow-up lands here.</p>}
        <div className="task-list">
          {openTasks.map((t) => (
            <label key={t.id} className="task-row">
              <input type="checkbox" checked={false} onChange={() => onToggleTask(t.id, true)} />
              <div>
                <div className="task-text">{t.text}</div>
                <div className="task-company" onClick={(e) => { e.preventDefault(); onOpen(t.targetId); }}>{t.company}</div>
              </div>
            </label>
          ))}
        </div>
        {doneTasks.length > 0 && (
          <>
            <button className="insight-more" onClick={() => setShowDone(!showDone)}>
              {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {showDone ? "Hide completed" : `Completed (${doneTasks.length})`}
            </button>
            {showDone && (
              <div className="task-list">
                {doneTasks.map((t) => (
                  <label key={t.id} className="task-row task-done">
                    <input type="checkbox" checked onChange={() => onToggleTask(t.id, false)} />
                    <div>
                      <div className="task-text">{t.text}</div>
                      <div className="task-company">{t.company}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Recent agent activity */}
      <section className="panel">
        <div className="panel-head">
          <h3>Recent Agent Activity</h3>
          <span className="panel-tag">{scopedLog.length} event{scopedLog.length === 1 ? "" : "s"}</span>
        </div>
        {!scopedLog.length && <p className="muted">Quiet so far — approvals, rescores, and confirmed predictions will land here.</p>}
        <div className="activity-feed">
          {scopedLog.slice(0, 8).map((e) => (
            <div key={e.id} className="feed-row" onClick={() => onOpen(e.targetId)}>
              <span className="feed-icon"><Check size={11} /></span>
              <div className="feed-body">
                <div className="feed-text"><b>{e.company}</b> — {e.text}</div>
                <div className="feed-detail">{e.detail}</div>
              </div>
              <span className="feed-time">{relativeTime(e.date)}</span>
            </div>
          ))}
        </div>
      </section>
      </div>

      {showCharts && (
        <aside className="myday-rail">
          <section className="panel">
            <div className="panel-head">
              <h3>Book Analytics</h3>
              <span className="panel-tag">{ownerFilter || "all owners"} · live</span>
            </div>
            <BookCharts accounts={scoped} />
          </section>
        </aside>
      )}
      </div>
    </div>
  );
}
