import React, { useEffect, useState } from "react";
import CompanyLogo from "./CompanyLogo.jsx";
import { TrendingUp, Zap, Gauge, FileText, RotateCcw, ArrowUpRight, X, Play, ChevronDown } from "./Icons.jsx";
import {
  listInsights,
  openDashboard,
  buildDashboard,
  refreshDashboard,
  deleteDashboard as apiDeleteDashboard,
  fetchReport,
  saveReport,
  openSavedReport,
  deleteReport as apiDeleteReport,
} from "../api.js";

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

const fmtDate = (d) =>
  !d ? "—" : new Date(String(d).length <= 10 ? d + "T00:00:00" : d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const KPI_ICONS = [
  { icon: TrendingUp, cls: "kpi-blue" },
  { icon: Zap, cls: "kpi-amber" },
  { icon: Gauge, cls: "kpi-neutral" },
];

// Render a single cell value the way the report column wants it.
function renderCell(field, value, row) {
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  if (field === "company") {
    return (
      <span className="cell-company">
        <CompanyLogo target={{ company: value, brand: row.brand }} size={26} />
        {value}
      </span>
    );
  }
  if (field === "lastActivityDate") return fmtDate(value);
  if (field === "scoreDelta") {
    const n = Number(value);
    return <span className={n > 0 ? "delta-pos" : n < 0 ? "delta-neg" : "muted"}>{n > 0 ? `+${n}` : n}</span>;
  }
  if (field === "score" || field === "currentScore" || field === "originalScore" || field === "closeScore")
    return <span className="mono">{value}</span>;
  if (field === "triggerInDays") {
    const n = Number(value);
    return <span className={n <= 0 ? "delta-neg" : "mono"}>{n <= 0 ? `${n} (due)` : `${n}d`}</span>;
  }
  if (field === "daysSinceActivity") return <span className="mono">{value}d</span>;
  return String(value);
}

export default function Insights({ onOpenAccount }) {
  const [mode, setMode] = useState("gallery"); // gallery | dashboard | report
  const [gallery, setGallery] = useState({ dashboards: [], reports: [], ai: false });
  const [loading, setLoading] = useState(true);

  const [prompt, setPrompt] = useState("");
  const [building, setBuilding] = useState(false);

  const [dash, setDash] = useState(null); // { dashboard, data, filterBar, selections, refreshedAt }
  const [dashLoading, setDashLoading] = useState(false);

  const [report, setReport] = useState(null);
  const [savingReport, setSavingReport] = useState(false);

  async function reloadGallery() {
    setLoading(true);
    try {
      setGallery(await listInsights());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reloadGallery();
  }, []);

  async function open(id, selections = {}) {
    setDashLoading(true);
    setMode("dashboard");
    try {
      const data = await openDashboard(id, selections);
      setDash(data);
    } finally {
      setDashLoading(false);
    }
  }

  async function build() {
    if (!prompt.trim()) return;
    setBuilding(true);
    try {
      const { dashboard } = await buildDashboard(prompt.trim());
      setPrompt("");
      await reloadGallery();
      await open(dashboard.id);
    } finally {
      setBuilding(false);
    }
  }

  async function changeFilter(field, value) {
    const selections = { ...(dash.selections || {}), [field]: value };
    if (value === "__all__") delete selections[field];
    setDashLoading(true);
    try {
      const data = await openDashboard(dash.dashboard.id, selections);
      setDash(data);
    } finally {
      setDashLoading(false);
    }
  }

  async function refresh() {
    setDashLoading(true);
    try {
      const r = await refreshDashboard(dash.dashboard.id, dash.selections || {});
      setDash((d) => ({ ...d, data: r.data, refreshedAt: r.refreshedAt }));
    } finally {
      setDashLoading(false);
    }
  }

  async function openReport(widget) {
    const payload = { dashboardId: dash.dashboard.id, widget, selections: dash.selections || {} };
    const r = await fetchReport(payload);
    setReport({ ...r, from: dash.dashboard.id, selections: dash.selections || {} });
    setMode("report");
  }

  async function doSaveReport() {
    const name = window.prompt("Name this report:", `${report.dashboardName} — ${widgetTitle(report.widget)}`);
    if (!name) return;
    setSavingReport(true);
    try {
      await saveReport({ name, dashboardId: report.from, widget: report.widget, selections: report.selections, columns: null });
      await reloadGallery();
    } finally {
      setSavingReport(false);
    }
  }

  async function openSaved(id) {
    const r = await openSavedReport(id);
    setReport({ ...r, dashboardName: r.saved?.name || "Saved report", widget: r.saved?.widget || {}, from: r.saved?.dashboardId, selections: r.saved?.selections || {}, saved: r.saved });
    setMode("report");
  }

  async function removeDashboard(id, e) {
    e.stopPropagation();
    if (!window.confirm("Delete this dashboard? Seeded defaults can't be removed.")) return;
    await apiDeleteDashboard(id);
    reloadGallery();
  }
  async function removeReport(id, e) {
    e.stopPropagation();
    await apiDeleteReport(id);
    reloadGallery();
  }

  // ── Gallery ──────────────────────────────────────────────────────────────
  if (mode === "gallery") {
    return (
      <div className="insights">
        <div className="board-header">
          <div>
            <h1>Insights</h1>
            <p className="board-sub">
              Reports &amp; Dashboards · saved objects that refresh live against the account base · {gallery.dashboards.length} dashboard
              {gallery.dashboards.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Prompt builder */}
        <section className="panel panel-action ins-builder">
          <div className="panel-head">
            <h3>Build a dashboard</h3>
            <span className={`ai-pill ${gallery.ai ? "live" : ""}`} style={{ fontSize: 11 }}>
              <span className="dot" />
              {gallery.ai ? "Claude live · claude-opus-5" : "Claude offline · deterministic builder"}
            </span>
          </div>
          <p className="muted" style={{ marginBottom: 10 }}>
            Describe the report you want. The prompt builds it once — after that it lives in the CRM as a saved dashboard and refreshes on every open.
          </p>
          <div className="ins-prompt-row">
            <textarea
              className="ins-prompt"
              rows={2}
              placeholder="e.g. Accounts by NBA type against time-to-trigger urgency, with KPIs for high-priority NBAs and catalyst re-scores this quarter"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) build();
              }}
            />
            <button className="primary-btn" onClick={build} disabled={building || !prompt.trim()}>
              {building ? <><span className="spinner spinner-sm" /> Building…</> : <><Play size={12} /> Build dashboard</>}
            </button>
          </div>
          <div className="ins-examples">
            {[
              "Accounts by ownership type against days without engagement",
              "NBA type against score movement since last refresh",
              "Founder-succession accounts by time-to-trigger",
            ].map((ex) => (
              <button key={ex} className="ins-chip" onClick={() => setPrompt(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </section>

        {/* Saved dashboards */}
        <div className="factor-group-title" style={{ marginTop: 6 }}>Saved dashboards</div>
        {loading ? (
          <div className="analyzing"><div className="spinner" /><div>Loading Insights…</div></div>
        ) : (
          <div className="ins-card-grid">
            {gallery.dashboards.map((d) => (
              <div key={d.id} className="ins-card" onClick={() => open(d.id)}>
                <div className="ins-card-top">
                  <FileText size={15} />
                  <span className="ins-card-name">{d.name}</span>
                  {d.seeded ? <span className="ins-badge">default</span> : (
                    <button className="ins-card-del" title="Delete dashboard" onClick={(e) => removeDashboard(d.id, e)}><X size={13} /></button>
                  )}
                </div>
                <p className="ins-card-desc">{d.description}</p>
                <div className="ins-card-meta">
                  {d.rowField && <span className="ins-tag">{d.rowField} × {d.colField}</span>}
                  <span className="ins-asof">as of {fmtTime(d.lastRefreshedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved reports */}
        {gallery.reports?.length > 0 && (
          <>
            <div className="factor-group-title" style={{ marginTop: 18 }}>Saved reports</div>
            <div className="ins-report-list">
              {gallery.reports.map((r) => (
                <div key={r.id} className="ins-report-item" onClick={() => openSaved(r.id)}>
                  <FileText size={14} />
                  <span className="ins-report-name">{r.name}</span>
                  <span className="ins-asof">saved {fmtTime(r.createdAt)}</span>
                  <button className="ins-card-del" onClick={(e) => removeReport(r.id, e)}><X size={12} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  if (mode === "dashboard") {
    const d = dash?.dashboard;
    const data = dash?.data;
    return (
      <div className="insights">
        <button className="ins-back" onClick={() => { setMode("gallery"); reloadGallery(); }}>← All dashboards</button>
        <div className="board-header ins-dash-header">
          <div>
            <h1>{d?.name || "…"}</h1>
            <p className="board-sub">{d?.description}</p>
          </div>
          <div className="ins-dash-actions">
            <span className="ins-asof-lg">As of {fmtTime(dash?.refreshedAt)}</span>
            <button className="ghost-btn" onClick={refresh} disabled={dashLoading}>
              <RotateCcw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {dash?.filterBar?.length > 0 && (
          <div className="ins-filterbar">
            {dash.filterBar.map((fb) => (
              <div key={fb.field} className="ins-filter">
                <label>{fb.label}</label>
                <div className="ins-select-wrap">
                  <select value={dash.selections?.[fb.field] || "__all__"} onChange={(e) => changeFilter(fb.field, e.target.value)}>
                    <option value="__all__">All</option>
                    {fb.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} />
                </div>
              </div>
            ))}
            {Object.keys(dash.selections || {}).length > 0 && (
              <button className="ins-clear" onClick={() => open(d.id, {})}>Clear filters</button>
            )}
          </div>
        )}

        {dashLoading && !data ? (
          <div className="analyzing"><div className="spinner" /><div>Refreshing against live accounts…</div></div>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="kpi-strip ins-kpis">
              {(data?.kpis || []).map((k, i) => {
                const { icon: Ic, cls } = KPI_ICONS[i % KPI_ICONS.length];
                return (
                  <div key={k.id} className="kpi kpi-click" onClick={() => openReport({ type: "kpi", kpiId: k.id })}>
                    <span className={`kpi-icon ${cls}`}><Ic size={17} /></span>
                    <div>
                      <div className="kpi-value">{k.value}</div>
                      <div className="kpi-label">{k.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Widget grid */}
            {data?.grid && (
              <div className="ins-grid-wrap">
                <div className="ins-grid" style={{ gridTemplateColumns: `minmax(150px, 200px) repeat(${data.grid.cols.length}, minmax(150px, 1fr))` }}>
                  <div className="ins-corner">{labelFor(data.grid.rowField)}</div>
                  {data.grid.cols.map((c) => (
                    <button key={c} className="ins-colhead" onClick={() => openReport({ type: "grid-col", col: c })} title="View all accounts in this column">
                      {c}
                    </button>
                  ))}

                  {data.grid.rows.map((row) => (
                    <React.Fragment key={row.value}>
                      <div className="ins-rowhead">
                        <div className="ins-rowhead-label">{row.label}</div>
                        <button className="ins-rowtotal" onClick={() => openReport({ type: "grid-row", row: row.value })}>
                          {row.total} total →
                        </button>
                      </div>
                      {row.cells.map((cell) => (
                        <button
                          key={cell.label}
                          className={`ins-cell ${cell.value === 0 ? "ins-cell-empty" : ""}`}
                          onClick={() => openReport({ type: "cell", row: row.value, col: cell.label })}
                          disabled={cell.value === 0}
                        >
                          <div className="ins-cell-value">{cell.value}</div>
                          <div className="ins-cell-foot">
                            <span className="ins-viewreport">View Report<ArrowUpRight size={11} /></span>
                            <span className="ins-asof">as of {fmtTime(dash?.refreshedAt)}</span>
                          </div>
                        </button>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Report drill-down ──────────────────────────────────────────────────────
  if (mode === "report" && report) {
    return (
      <div className="insights">
        <button className="ins-back" onClick={() => (dash ? setMode("dashboard") : (setMode("gallery"), reloadGallery()))}>
          ← {dash ? "Back to dashboard" : "All dashboards"}
        </button>
        <div className="board-header ins-dash-header">
          <div>
            <h1>{report.dashboardName}</h1>
            <p className="board-sub">
              {widgetTitle(report.widget)} · <strong>{report.total}</strong> account{report.total === 1 ? "" : "s"} · as of {fmtTime(report.generatedAt)}
            </p>
          </div>
          {report.from && !report.saved && (
            <button className="ghost-btn" onClick={doSaveReport} disabled={savingReport}>
              {savingReport ? "Saving…" : <><FileText size={13} /> Save as report</>}
            </button>
          )}
        </div>

        <div className="ins-report">
          {/* Account list */}
          <div className="list-wrap ins-report-table">
            <table className="account-table">
              <thead>
                <tr>
                  {report.columns.map((c) => (
                    <th key={c.field}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.accounts.length === 0 && (
                  <tr><td colSpan={report.columns.length} className="muted" style={{ padding: 22 }}>No accounts match this filter set.</td></tr>
                )}
                {report.accounts.map((a) => (
                  <tr key={a.id} className="account-row" onClick={() => onOpenAccount?.(a.id)}>
                    {report.columns.map((c) => (
                      <td key={c.field}>{renderCell(c.field, a[c.field], a)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Filter logic panel */}
          <aside className="ins-filters-panel">
            <div className="ins-filters-head">Filter logic</div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Every row maps to a real account field. All conditions must match (AND).
            </p>
            {report.filters.map((f, i) => (
              <div key={i} className={`ins-filter-row origin-${f.origin}`}>
                <div className="ins-filter-conj">{i === 0 ? "WHERE" : "AND"}</div>
                <div className="ins-filter-body">
                  <div className="ins-filter-text">{f.text}</div>
                  <div className="ins-filter-field">
                    field: <code>{f.field}</code>
                    <span className={`ins-origin-tag origin-${f.origin}`}>{f.origin}</span>
                  </div>
                </div>
              </div>
            ))}
            {report.filters.length === 0 && <p className="muted">No filters — full account base.</p>}
          </aside>
        </div>
      </div>
    );
  }

  return null;
}

// Human title for a widget descriptor.
function widgetTitle(w = {}) {
  if (w.type === "kpi") return "KPI drill-down";
  if (w.type === "grid-row") return `${w.row} — all`;
  if (w.type === "grid-col") return w.col;
  if (w.type === "cell") return `${w.row} · ${w.col}`;
  return "Report";
}

function labelFor(field) {
  const map = {
    nbaType: "Next Best Action",
    ownershipType: "Ownership Type",
    priority: "NBA Priority",
    stage: "Stage",
    accountOwner: "Account Owner",
    country: "Country",
  };
  return map[field] || field;
}
