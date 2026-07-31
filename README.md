# TCan Express — agentic M&A CRM prototype

An intelligent CRM that thinks ahead of the deal lead. Every pixel answers:
**"What do we need to do to get this deal to transact — and what will this seller do next?"**

## Run it

```
npm run dev
```

Opens the API on :3001 and the app on **http://localhost:5173**.

**Go live with real Claude reasoning:** copy `.env.example` to `.env`, paste your
`ANTHROPIC_API_KEY`, restart. The header pill flips to *"Agent live · claude-opus-5"*.
Without a key, everything runs on high-quality cached intelligence — identical UX,
zero network risk. On Vercel, set `ANTHROPIC_API_KEY` in project env vars.

## The demo script (~90 seconds)

1. **Start on Mission Control** — the agent's read of your day: the weekly
   portfolio sweep digest ("Run sweep"), touches due (Merritt overdue, Vantage
   today), and open agent tasks.
2. **Pipeline** — six accounts in a Salesforce-style list with KPI tiles
   (avg likelihood, catalysts, touches due, tasks). The enrichment sweep runs on
   load: signal pills land, scores tick, sparklines draw, and **Vantage Permit
   Systems flares "Catalyst"** (48 → 63). Click the Catalysts tile to filter;
   click any signals pill to expand the evidence; hover anything for an explanation.
3. **Open Vantage** — the War Room:
   - Highlights band (stage, scores, next touch, owner, NDA) + sentiment arc over
     4.5 years and 38 logged touches (read Ray's actual emails inline).
   - Click the **Likelihood meter** → conversation indicators + enrichment signals.
     Click **Close Probability** → blocker weights.
   - **Next Best Action**: the drafted catalyst re-engagement email. **✓ Approve** →
     63 → 80 (+17 ▲), blocker In Motion, follow-up task drops, board re-ranks live.
4. **⏩ 11 days later** (demo control) — Ray's predicted reply arrives at 5:42 AM:
   **Prediction vs. Reality** shows 4/4 confirmed, 80 → 88, and the next play
   pivots to booking the Boise visit.
5. **Prep brief** — one click, a one-pager for the Boise trip: objective,
   talking points, landmines ("do not apologize again — you already did on Oct 8").
6. `⟲` resets everything for the next run-through.

## Architecture

- `server/` — Express (local: `server/index.js`; Vercel: `api/index.js`, same app).
  - `/api/targets` — full account state incl. conversation signals & cached analyses
  - `/api/enrich` — signal sweep per account
  - `/api/analyze` — SSE: agent trace + structured-JSON analysis (claude-opus-5,
    cached server-side per account; `force` re-analyzes)
  - `/api/act` — executes approved actions: real rescoring rationale, simulated
    side effects that persist (scores, blockers, tasks, log, next-touch cadence)
  - `/api/simulate` — plays a target's scripted predicted reply (the payoff moment)
  - `/api/brief` — one-page pre-meeting brief per account
  - `/api/digest` — weekly portfolio sweep digest
  - `/api/task`, `/api/reset`, `/api/aicheck` — task toggles, demo reset, diagnostics
- `server/data/targets.js` — six seeded top-funnel accounts + the deal-twin pattern
  library (silent founders, dead-deal revival, intermediary effect…). The hero,
  Vantage, carries a KIU-density history: 38 touches, 4 reps, RCE campaigns, full
  mock email bodies.
- `server/conversation.js` — parses any activity log into scored likelihood
  indicators (reply rate, inbound recency, reconnect campaigns, escalation depth,
  sentiment trajectory, silence pattern). Generic — ready for real Salesforce exports.
- `src/` — React (Vite): Pipeline (sortable/filterable list, FLIP re-rank,
  sparklines), War Room (meters, factor modals, insights, activity + sentiment arc),
  Mission Control (digest, touches due, tasks).

Note: deal state is in-memory (per server process / warm serverless instance).
Fine for demos; move to a KV store before multi-user use.

All companies, people, and events in the seed data are fictional.
