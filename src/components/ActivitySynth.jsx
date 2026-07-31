import React, { useState } from "react";
import { X, Check, ChevronUp } from "./Icons.jsx";
import { synthesizeActivity, commitActivity } from "../api.js";

const TYPES = ["email", "call", "meeting", "linkedin"];
const SENTIMENTS = ["positive", "warm", "neutral", "negative", "none"];

// Mirrors the server's check: ISO shape AND a real calendar date (round-trip).
function isValidDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return false;
  const t = new Date(d + "T00:00:00Z");
  return !isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

// Activity Synthesizer modal — used from the War Room ("+ Add" on the
// Activity panel) and from the New-account flow (which arrives with records
// already synthesized from the modal's pasted history).
//
// Steps: paste raw history → synthesize → editable review table → confirm.
// Nothing is written until "Looks good — add N activities".
export default function ActivitySynth({
  targetId,
  company,
  initialRecords = null,
  initialIssues = [],
  initialSource = null,
  initialText = "",
  onClose,
  onCommitted,
}) {
  // Zero synthesized records is NOT a review state — land on paste with the
  // original text preserved so nothing the agent typed is lost.
  const [step, setStep] = useState(initialRecords && initialRecords.length ? "review" : "paste");
  const [text, setText] = useState(initialText || "");
  const [records, setRecords] = useState(initialRecords || []);
  const [issues, setIssues] = useState(initialIssues || []);
  const [source, setSource] = useState(initialSource);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const badDates = records.filter((r) => !isValidDate(r.date)).length;

  async function runSynthesis() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await synthesizeActivity(text, targetId);
      setRecords(result.records);
      setIssues(result.issues || []);
      setSource(result.source);
      setStep("review");
    } catch (err) {
      setError(err.message || "Synthesis failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!records.length || busy || badDates) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commitActivity(targetId, records);
      onCommitted?.(result);
      // If server re-validation rejected any reviewed rows, say so — never
      // let a row the user just reviewed vanish silently.
      if (result.issues?.length) {
        setRecords([]);
        setIssues(result.issues);
        setError(
          `${result.added} added, but ${result.issues.length} row${result.issues.length === 1 ? " was" : "s were"} rejected by validation — see below.`
        );
        setBusy(false);
        return;
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add activities");
      setBusy(false);
    }
  }

  const edit = (i, field) => (e) => {
    const value = e.target.value;
    setRecords((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const removeRow = (i) => setRecords((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal synth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Activity Synthesizer — {company}</h2>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {step === "paste" && (
          <>
            <p className="modal-narrative">
              Paste raw interaction history — Word-doc notes, CRM exports, email logs. The agent converts it
              into structured activity records; you review and edit before anything is written.
            </p>
            <textarea
              className="synth-paste"
              rows={12}
              autoFocus
              placeholder={"e.g.\n2021-03-15: E1 cold intro email. No reply.\nApril 2, 2021 — called the main line, left a voicemail…\nMarch 3, 2026 — CEO replied: \"we have engaged a banker…\""}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {issues.length > 0 && (
              <div className="synth-issues">
                <div className="synth-issues-head">
                  {issues.length} entr{issues.length === 1 ? "y" : "ies"} could not be converted last time — add full dates and re-synthesize:
                </div>
                {issues.map((iss, i) => (
                  <div key={i} className="synth-issue">
                    <b>{iss.reason}</b> — “{iss.text}”
                  </div>
                ))}
              </div>
            )}
            {error && <div className="na-error">{error}</div>}
            <div className="na-actions">
              <button className="ghost-btn" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="primary-btn" onClick={runSynthesis} disabled={busy || !text.trim()}>
                {busy ? <><span className="spinner spinner-sm" /> Synthesizing…</> : "Synthesize"}
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <p className="modal-narrative">
              {records.length} record{records.length === 1 ? "" : "s"} synthesized
              {source ? ` (${source === "heuristic" ? "offline parser" : source})` : ""} — review, edit, or remove rows.
              Nothing is written until you confirm.
            </p>

            <div className="synth-table-wrap">
              <table className="account-table synth-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Dir</th><th>Rep</th><th>Contact</th><th>Type</th><th>Subject</th><th>Sentiment</th><th />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className={`col-filter synth-date ${isValidDate(r.date) ? "" : "synth-date-bad"}`}
                          value={r.date}
                          onChange={edit(i, "date")}
                          title={isValidDate(r.date) ? undefined : "Must be a real date in YYYY-MM-DD format"}
                        />
                      </td>
                      <td>
                        <select className="col-filter" value={r.direction} onChange={edit(i, "direction")}>
                          <option value="out">OUT</option>
                          <option value="in">IN</option>
                        </select>
                      </td>
                      <td><input className="col-filter" value={r.rep || ""} onChange={edit(i, "rep")} /></td>
                      <td><input className="col-filter" placeholder="—" value={r.contact || ""} onChange={edit(i, "contact")} /></td>
                      <td>
                        <select className="col-filter" value={r.type} onChange={edit(i, "type")}>
                          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td><input className="col-filter synth-subject" value={r.subject} onChange={edit(i, "subject")} title={r.note} /></td>
                      <td>
                        <select className="col-filter" value={r.sentiment} onChange={edit(i, "sentiment")}>
                          {SENTIMENTS.map((s) => <option key={s} value={s}>{s === "none" ? "no reply" : s}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className="ins-card-del" title="Remove row" onClick={() => removeRow(i)}><X size={12} /></button>
                      </td>
                    </tr>
                  ))}
                  {!records.length && (
                    <tr><td colSpan={8} className="cell-empty">No records — go back and adjust the paste.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {issues.length > 0 && (
              <div className="synth-issues">
                <div className="synth-issues-head">
                  {issues.length} entr{issues.length === 1 ? "y" : "ies"} could not be converted (no guessing — fix the source text or add manually):
                </div>
                {issues.map((iss, i) => (
                  <div key={i} className="synth-issue">
                    <b>{iss.reason}</b> — “{iss.text}”
                  </div>
                ))}
              </div>
            )}

            {error && <div className="na-error">{error}</div>}

            <div className="na-actions">
              <button className="ghost-btn" onClick={() => setStep("paste")} disabled={busy}>
                <ChevronUp size={12} style={{ transform: "rotate(-90deg)" }} /> Back to paste
              </button>
              <button className="ghost-btn" onClick={onClose} disabled={busy}>
                {initialRecords ? "Skip — add later" : "Cancel"}
              </button>
              <button
                className="primary-btn"
                onClick={confirm}
                disabled={busy || !records.length || badDates > 0}
                title={badDates ? `${badDates} row${badDates === 1 ? " has" : "s have"} an invalid date — fix or remove before adding` : undefined}
              >
                {busy
                  ? <><span className="spinner spinner-sm" /> Adding…</>
                  : badDates
                  ? `Fix ${badDates} invalid date${badDates === 1 ? "" : "s"} first`
                  : <><Check size={13} /> Looks good — add {records.length} activit{records.length === 1 ? "y" : "ies"}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
