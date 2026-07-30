# TCan Express — agentic M&A CRM prototype

An intelligent CRM that thinks ahead of the deal lead. Every pixel answers:
**"What do we need to do to close this deal — and what will this seller do next?"**

## Run it

```
npm run dev
```

Opens the API on :3001 and the app on **http://localhost:5173**.

**Go live with real Claude reasoning:** copy `.env.example` to `.env`, paste your
`ANTHROPIC_API_KEY`, restart. The header pill flips to *"Agent live · claude-opus-5"*.
Without a key, the app runs on high-quality cached intelligence — identical UX,
zero network risk. (Server-side refusal fallbacks are enabled by default on the
live path and degrade gracefully if the beta isn't available.)

## 60-second demo script

1. **Board loads** with the core account → enrichment sweep runs live: signal chips land, score ticks.
2. **Vantage Permit Systems flares "⚡ Catalyst detected"** (rises 48 → 63).
3. **Click into the War Room** (Salesforce-style blue & white):
   - **Next Best Action sits on top** — a drafted re-engagement email, one click to view the draft.
   - **Click the Likelihood meter** → factor breakdown modal: conversation indicators
     (reply rate, last inbound, RCE campaigns, escalation depth) + enrichment signals.
   - **Activity** — 38 logged touches with month grouping, IN/OUT badges, and full
     mock email bodies ("✉ Read email").
   - Compact insights (Revival Radar / Relationship Read / Archetype) — headline first, "More detail" to expand.
4. Hit **✓ Review & Approve** → Likelihood 63 → 80, Close 22 → 34, blocker flips to
   *In Motion*, agent trace narrates, a follow-up task drops.
5. `⟲` button (top right) resets everything for the next run-through.

## Architecture

- `server/` — Express. `/api/enrich` (signal sweep), `/api/analyze` (SSE: streamed
  agent trace + structured-JSON Claude analysis), `/api/act` (executes approved
  actions: real re-scoring rationale, simulated side effects that persist in memory),
  `/api/reset` (rehearsal reset).
- `server/data/targets.js` — 7 seeded targets + the deal-twin pattern library
  (silent founders, dead-deal revival, intermediary effect, post-LOI renegotiation…).
  Every Claude prompt cites the matching analog.
- `src/` — React (Vite). Board → War Room → action loop.

All companies, people, and events in the seed data are fictional.
