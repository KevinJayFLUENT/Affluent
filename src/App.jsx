import React, { useEffect, useRef, useState } from "react";
import { fetchTargets, enrichTarget, toggleTask, runDigest } from "./api.js";
import Board from "./components/Board.jsx";
import WarRoom from "./components/WarRoom.jsx";
import MyDay from "./components/MyDay.jsx";
import Insights from "./components/Insights.jsx";
import Logo from "./components/Logo.jsx";
import { RotateCcw } from "./components/Icons.jsx";

const TODAY = new Date().toISOString().slice(0, 10);

export default function App() {
  const [targets, setTargets] = useState([]);
  const [aiLive, setAiLive] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [log, setLog] = useState([]);
  const [view, setView] = useState({ name: "board" });
  const [sweepStatus, setSweepStatus] = useState("idle"); // idle | running | done
  const [toast, setToast] = useState(null);
  const [digest, setDigest] = useState(null);
  const [digestRunning, setDigestRunning] = useState(false);
  const sweepStarted = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await fetchTargets();
      setTargets(data.targets);
      setAiLive(data.ai);
      setTasks(data.tasks);
      setLog(data.log);
      setDigest(data.digest);
      if (!sweepStarted.current) {
        sweepStarted.current = true;
        runSweep(data.targets);
      }
    })();
  }, []);

  async function runSweep(initial) {
    const pending = initial.filter((t) => !t.enriched);
    if (!pending.length) {
      setSweepStatus("done");
      return;
    }
    setSweepStatus("running");
    await new Promise((r) => setTimeout(r, 900));
    for (const t of pending) {
      const result = await enrichTarget(t.id);
      setTargets((prev) =>
        prev.map((p) =>
          p.id === t.id
            ? {
                ...p,
                enriched: true,
                justEnriched: true,
                scores: { ...p.scores, likelihood: result.after },
                scoreHistory: [...(p.scoreHistory || []), result.after],
              }
            : p
        )
      );
      await new Promise((r) => setTimeout(r, 750));
    }
    setSweepStatus("done");
  }

  function patchTarget(id, patch) {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function showToast(text) {
    setToast(text);
    setTimeout(() => setToast(null), 5200);
  }

  async function handleToggleTask(taskId, done) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    await toggleTask(taskId, done);
  }

  async function handleRunDigest() {
    setDigestRunning(true);
    try {
      const result = await runDigest();
      setDigest(result.digest);
    } finally {
      setDigestRunning(false);
    }
  }

  const active = view.name === "warroom" ? targets.find((t) => t.id === view.targetId) : null;
  const dueCount = targets.filter((t) => t.nextTouch && t.nextTouch.due <= TODAY).length;
  const openTaskCount = tasks.filter((t) => !t.done).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView({ name: "board" })}>
          <Logo size={36} />
          <span className="brand-name">TCAN</span>
          <span className="brand-sub">EXPRESS</span>
        </div>
        <nav className="main-nav">
          <button
            className={`nav-link ${view.name === "board" ? "active" : ""}`}
            onClick={() => setView({ name: "board" })}
          >
            Pipeline
            <span className="nav-tip">Every account in the book, ranked by likelihood to transact, with live enrichment signals.</span>
          </button>
          <button
            className={`nav-link ${view.name === "myday" ? "active" : ""}`}
            onClick={() => setView({ name: "myday" })}
          >
            Mission Control
            {dueCount + openTaskCount > 0 && <span className="nav-badge">{dueCount + openTaskCount}</span>}
            <span className="nav-tip">Your agent-prioritized day: touches due, follow-up tasks, and the weekly portfolio sweep — what to do next, across the whole book.</span>
          </button>
          <button
            className={`nav-link ${view.name === "insights" ? "active" : ""}`}
            onClick={() => setView({ name: "insights" })}
          >
            Insights
          </button>
        </nav>
        <div className="topbar-right">
          <span className={`ai-pill ${aiLive ? "live" : ""}`}>
            <span className="dot" />
            {aiLive ? "Agent live · claude-opus-5" : "Agent offline · cached intelligence"}
          </span>
          <span className="user-chip">Kevin Jay · Corp Dev</span>
          <button
            className="reset-btn"
            title="Reset demo state and replay the enrichment sweep"
            onClick={async () => {
              await fetch("/api/reset", { method: "POST" });
              window.location.reload();
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {view.name === "board" && (
        <Board
          targets={targets}
          sweepStatus={sweepStatus}
          tasks={tasks}
          log={log}
          onOpen={(id) => setView({ name: "warroom", targetId: id })}
          onGoMyDay={() => setView({ name: "myday" })}
        />
      )}

      {view.name === "insights" && (
        <Insights onOpenAccount={(id) => setView({ name: "warroom", targetId: id })} />
      )}

      {view.name === "myday" && (
        <MyDay
          targets={targets}
          tasks={tasks}
          digest={digest}
          digestRunning={digestRunning}
          onOpen={(id) => setView({ name: "warroom", targetId: id })}
          onToggleTask={handleToggleTask}
          onRunDigest={handleRunDigest}
        />
      )}

      {active && (
        <WarRoom
          key={active.id}
          target={active}
          onBack={() => setView({ name: "board" })}
          patchTarget={patchTarget}
          onActionExecuted={({ task, logEntry }) => {
            setTasks((prev) => [task, ...prev]);
            setLog((prev) => [logEntry, ...prev]);
            showToast(`Task created: ${task.text}`);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
