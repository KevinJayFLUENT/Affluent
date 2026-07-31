import React, { useState } from "react";
import { X } from "./Icons.jsx";

// Salesforce-style "New" account modal. Creates the record immediately, then
// the caller runs the AI enrichment pass with the standard sweep treatment.
export default function NewAccount({ owners, onClose, onCreate }) {
  const [form, setForm] = useState({
    companyName: "",
    linkedinUrl: "",
    website: "",
    industry: "",
    employeeCount: "",
    accountOwner: owners.includes("Kevin Jay") ? "Kevin Jay" : owners[0] || "Kevin Jay",
    hqCity: "",
    hqCountry: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.companyName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        ...form,
        companyName: form.companyName.trim(),
        employeeCount: form.employeeCount ? Number(form.employeeCount) : null,
      });
    } catch (err) {
      setError(err.message || "Failed to create the account");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal na-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>New Account</h2>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <p className="modal-narrative" style={{ marginBottom: 12 }}>
          The account is created instantly; the agent then runs an enrichment sweep — company profile,
          fit and succession scores, and signals — and the account ranks on the board like any other.
          Exclusivity is assigned to the Account Owner for 6 months from today.
        </p>

        <form onSubmit={save}>
          <div className="na-grid">
            <label className="na-field na-wide">
              <span>Company Name *</span>
              <input className="list-filter na-input" required autoFocus value={form.companyName} onChange={set("companyName")} placeholder="e.g. Orchard Dental Systems" />
            </label>
            <label className="na-field">
              <span>Account Owner</span>
              <select className="list-filter na-input" value={form.accountOwner} onChange={set("accountOwner")}>
                {(owners.length ? owners : ["Kevin Jay"]).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            <label className="na-field">
              <span>Industry</span>
              <input className="list-filter na-input" value={form.industry} onChange={set("industry")} placeholder="e.g. Dental practice software" />
            </label>
            <label className="na-field">
              <span>Website</span>
              <input className="list-filter na-input" value={form.website} onChange={set("website")} placeholder="https://…" />
            </label>
            <label className="na-field">
              <span>LinkedIn URL</span>
              <input className="list-filter na-input" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="linkedin.com/company/…" />
            </label>
            <label className="na-field">
              <span>Employee Count</span>
              <input className="list-filter na-input" type="number" min="1" value={form.employeeCount} onChange={set("employeeCount")} placeholder="e.g. 30" />
            </label>
            <label className="na-field">
              <span>HQ City</span>
              <input className="list-filter na-input" value={form.hqCity} onChange={set("hqCity")} placeholder="optional" />
            </label>
            <label className="na-field">
              <span>HQ Country</span>
              <input className="list-filter na-input" value={form.hqCountry} onChange={set("hqCountry")} placeholder="e.g. US" />
            </label>
          </div>

          {error && <div className="na-error">{error}</div>}

          <div className="na-actions">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving || !form.companyName.trim()}>
              {saving ? <><span className="spinner spinner-sm" /> Creating…</> : "Save & Enrich"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
