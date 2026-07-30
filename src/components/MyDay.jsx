import React, { useState } from "react";
import CompanyLogo from "./CompanyLogo.jsx";

const TODAY = new Date().toISOString().slice(0, 10);

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

export default function MyDay({ targets, tasks, digest, onOpen, onToggleTask, onRunDigest, digestRunning }) {
  const [showDone, setShowDone] = useState(false);

  const touches = targets
    .filter((t) => t.nextTouch)
    .sort((a, b) => a.nextTouch.due.localeCompare(b.nextTouch.due));
  const dueNow = touches.filter((t) => t.nextTouch.due <= TODAY);
  const upcoming = touches.filter((t) => t.nextTouch.due > TODAY);
  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  return (
    <div className="myday">
      <div className="board-header">
        <div>
          <h1>My Day</h1>
          <p className="board-sub">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} ·{" "}
            {dueNow.length} touch{dueNow.length === 1 ? "" : "es"} due · {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Weekly portfolio sweep digest */}
      <section className="panel digest">
        <div className="panel-head">
          <h3>Weekly Portfolio Sweep</h3>
          <button className="digest-btn" onClick={onRunDigest} disabled={digestRunning}>
            {digestRunning ? "Sweeping…" : digest ? "↻ Re-run sweep" : "▸ Run sweep"}
          </button>
        </div>
        {!digest && !digestRunning && (
          <p className="muted">Run the sweep — the agent reads all {targets.length} accounts and writes the week's brief.</p>
        )}
        {digestRunning && !digest && (
          <div className="analyzing" style={{ border: "none", padding: "8px 0", margin: 0, boxShadow: "none" }}>
            <div className="spinner" />
            <div>Agent sweeping {targets.length} accounts…</div>
          </div>
        )}
        {digest && (
          <>
            <div className="digest-headline">{digest.headline}</div>
            <p>{digest.brief}</p>
            <div className="factor-group-title" style={{ marginTop: 10 }}>This week's priorities</div>
            <ol className="digest-priorities">
              {digest.priorities.map((p, i) => <li key={i}>{p}</li>)}
            </ol>
            <div className="digest-meta">
              Generated {new Date(digest.generatedAt).toLocaleTimeString()} · {digest.source === "cached" ? "cached intelligence" : digest.source}
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
          {dueNow.map((t) => (
            <div key={t.id} className="touch-row" onClick={() => onOpen(t.id)}>
              <CompanyLogo target={t} size={30} />
              <div className="touch-body">
                <div className="touch-action">{t.nextTouch.action}</div>
                <div className="touch-reason">{t.company} — {t.nextTouch.reason}</div>
              </div>
              <DueBadge due={t.nextTouch.due} />
            </div>
          ))}
        </div>
        {upcoming.length > 0 && (
          <>
            <div className="factor-group-title" style={{ marginTop: 14 }}>Upcoming — on cadence, do not force</div>
            <div className="touch-list">
              {upcoming.map((t) => (
                <div key={t.id} className="touch-row touch-upcoming" onClick={() => onOpen(t.id)}>
                  <CompanyLogo target={t} size={30} />
                  <div className="touch-body">
                    <div className="touch-action">{t.nextTouch.action}</div>
                    <div className="touch-reason">{t.company} — {t.nextTouch.reason}</div>
                  </div>
                  <DueBadge due={t.nextTouch.due} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

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
              {showDone ? "▴ Hide completed" : `▾ Completed (${doneTasks.length})`}
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
    </div>
  );
}
