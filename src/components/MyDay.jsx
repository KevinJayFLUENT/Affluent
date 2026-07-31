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
        <label className="owner-scope">
          <span>Book</span>
          <select className="col-filter" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">All owners</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      </div>

      {/* Weekly portfolio sweep digest */}
      <section className="panel digest">
        <div className="panel-head">
          <h3>Weekly Portfolio Sweep</h3>
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
  );
}
