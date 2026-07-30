import React from "react";
import { FileText } from "./Icons.jsx";

function Field({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="sf-field">
      <div className="sf-label">{label}</div>
      <div className="sf-value">{String(value)}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="panel">
      <div className="panel-head"><h3>{title}</h3></div>
      <div className="sf-grid">{children}</div>
    </section>
  );
}

export default function AccountDetails({ target }) {
  const d = target.details;
  if (!d) return <div className="muted">No account details on file.</div>;
  const s = d.scraping || {};

  return (
    <div>
      <Section title="Company Information">
        <Field label="Company Name" value={target.company} />
        <Field label="Website" value={d.domain} />
        <Field label="Industry" value={d.industry} />
        <Field label="Year Established" value={d.yearEstablished} />
        <Field label="Employees" value={d.employees} />
        <Field label="Parent Company" value={d.parentCompany} />
        <Field label="Lead Owner" value={d.leadOwner} />
        <Field label="Account Owner" value={d.accountOwner} />
        <Field label="Lead Source" value={d.leadSource} />
        <Field label="Stage" value={d.stage} />
        <Field label="Revenues" value={d.revenues} />
        <Field label="Recurring Revenue" value={d.recurringRevenue} />
        <Field label="Next Steps" value={d.nextSteps} />
        <Field label="Address" value={d.address} />
        <Field label="LinkedIn" value={d.linkedin} />
      </Section>

      <Section title="Outreach Status">
        <Field label="1st Email Date" value={d.firstEmailDate} />
        <Field label="Responded" value={d.responded} />
        <Field label="Interest" value={d.interest} />
        <Field label="Response Type" value={d.responseType} />
        <Field label="True Relation" value={d.trueRelation} />
        <Field label="Broker" value={d.broker} />
        <Field label="NDA Issued" value={d.ndaIssued} />
        <Field label="NDA Issued Date" value={d.ndaIssuedDate} />
      </Section>

      {d.exclusivity && (
        <Section title="Exclusivity Information">
          <Field label="Exclusivity Status" value={d.exclusivity.status} />
          <Field label="Start Date" value={d.exclusivity.startDate} />
          <Field label="End Date" value={d.exclusivity.endDate} />
          <Field label="Exclusive Owner" value={d.exclusivity.owner} />
          <Field label="Challenge Status" value={d.exclusivity.challengeStatus} />
        </Section>
      )}

      <Section title="Enrichment (Scraping) Information">
        <Field label="Employee Count Best" value={s.employeeCountBest} />
        <Field label="Revenue Best USD" value={s.revenueBestUsd} />
        <Field label="Industry" value={s.industry} />
        <Field label="Funding Status" value={s.fundingStatus} />
        <Field label="HQ City" value={s.hqCity} />
        <Field label="HQ Country" value={s.hqCountry} />
        <Field label="Succession Score" value={s.successionScore} />
        <Field label="Acquisition Fit Score" value={s.acquisitionFitScore} />
        <Field label="Acquisition Fit Band" value={s.acquisitionFitBand} />
        <Field label="Founded Year" value={s.foundedYear} />
        <Field label="LLM Is VMS" value={s.llmIsVms} />
        <Field label="LLM Vertical" value={s.llmVertical} />
        <Field label="LLM Sub-Vertical" value={s.llmSubVertical} />
        <Field label="LLM Target Customer" value={s.llmTargetCustomer} />
        <Field label="Match Confidence" value={s.matchConfidence} />
        <Field label="Revenue Model" value={s.revenueModel} />
        <Field label="LLM Revenue Model" value={s.llmRevenueModel} />
        <Field label="LLM Confidence" value={s.llmConfidence} />
        <Field label="Website Description" value={s.websiteDescription} />
        <Field label="LLM Product Summary" value={s.llmProductSummary} />
      </Section>

      {d.opportunities?.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h3>Opportunities ({d.opportunities.length})</h3></div>
          {d.opportunities.map((o, i) => (
            <div key={i} className="sf-opp">
              <div className="sf-opp-name">{o.name}</div>
              <div className="sf-opp-meta">
                <span>Stage: <b>{o.stage}</b></span>
                <span>Amount: <b>{o.amount}</b></span>
                <span>Close: <b>{o.closeDate}</b></span>
              </div>
            </div>
          ))}
        </section>
      )}

      {d.ownerHistory?.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h3>Account History ({d.ownerHistory.length})</h3></div>
          <table className="sf-table">
            <thead><tr><th>Date</th><th>Field</th><th>Original Value</th><th>New Value</th></tr></thead>
            <tbody>
              {d.ownerHistory.map((h, i) => (
                <tr key={i}><td>{h.date}</td><td>{h.field}</td><td>{h.from}</td><td>{h.to}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {d.notes?.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h3>Notes & Attachments ({d.notes.length})</h3></div>
          {d.notes.map((n, i) => (
            <div key={i} className="sf-note"><FileText size={13} /> {n.title} <span className="sf-note-date">{n.date} · Note</span></div>
          ))}
        </section>
      )}

      {d.systemInfo && (
        <Section title="System Information">
          <Field label="Created By" value={`${d.systemInfo.createdBy}, ${d.systemInfo.createdDate}`} />
          <Field label="Last Modified By" value={`${d.systemInfo.lastModifiedBy}, ${d.systemInfo.lastModifiedDate}`} />
        </Section>
      )}
    </div>
  );
}
