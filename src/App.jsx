import React, { useEffect, useRef, useState } from "react";
import { fetchTargets, enrichTarget } from "./api.js";
import Board from "./components/Board.jsx";
import WarRoom from "./components/WarRoom.jsx";
import Logo from "./components/Logo.jsx";

export default function App() {
  const [targets, setTargets] = useState([]);
  const [aiLive, setAiLive] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [log, setLog] = useState([]);
  const [view, setView] = useState({ name: "board" });
  const [sweepStatus, setSweepStatus] = useState("idle"); // idle | running | done
  const [toast, setToast] = useState(null);
  const sweepStarted = useRef(false);

  useEffect(() => {
    (async () => {
      const data = await fetchTargets();
      setTargets(data.targets);
      setAiLive(data.ai);
      setTasks(data.tasks);
      setLog(data.log);
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
            ? { ...p, enriched: true, justEnriched: true, scores: { ...p.scores, likelihood: result.after } }
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

  const active = view.name === "warroom" ? targets.find((t) => t.id === view.targetId) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView({ name: "board" })}>
          <Logo size={36} />
          <span className="brand-name">TCAN</span>
          <span className="brand-sub">EXPRESS</span>
        </div>
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
            ⟲
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
