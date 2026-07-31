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
2. **Pipeline** — ten accounts (two deal leads: Kevin Jay & Nathan Lim) in a Salesforce-style list with location flags with KPI tiles
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
  - `/api/accounts` — create a new account (**+ New** in the Pipeline); exclusivity
    auto-assigned to the Account Owner for 6 months.
    `/api/accounts/:id/enrich` runs the AI enrichment pass (full scraping schema,
    signals, financial estimates — deterministic mock without a key)
  - `/api/enrich` — signal sweep per account
  - `/api/analyze` — SSE: agent trace + structured-JSON analysis (claude-opus-5,
    cached server-side per account; `force` re-analyzes)
  - `/api/act` — executes approved actions: real rescoring rationale, side effects
    that persist to the database (scores, blockers, tasks, log, next-touch cadence)
  - `/api/simulate` — plays a target's scripted predicted reply (the payoff moment)
  - `/api/brief` — one-page pre-meeting brief per account
  - `/api/digest` — weekly portfolio sweep digest
  - `/api/query` — executes a filter definition against the live database, returns
    matching accounts + aggregates (one code path for Insights widgets & drill-downs)
  - `/api/insights/*` — saved dashboards & reports (definitions, never snapshots;
    every open re-queries the live database with a fresh "as of" timestamp)
  - `/api/task`, `/api/reset`, `/api/aicheck` — task toggles, demo reset, diagnostics
- `server/store.js` — **persistent storage layer.** Route logic never touches
  storage directly; the working set lives in memory and every mutation writes
  through. Backend selected by env:
  - **Local dev (default):** `server/data/db.json` — survives restarts, inspectable,
    gitignored.
  - **Deployed:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
    (Vercel KV's `KV_REST_API_URL`/`KV_REST_API_TOKEN` also work) for a durable
    free-tier store. Plain REST — no extra dependency.
  - **Neither available** (e.g. bare Vercel): falls back to seeded in-memory data
    per warm instance, the pre-Phase-3 behavior.
- `server/state.js` — the database is the single source of truth. On first run the
  ten demo companies migrate from `targets.js` into the DB as ordinary records
  (origin: `seed`) with staggered exclusivity backfill (Active / Expiring Soon /
  Expired); from then on they're editable and re-scorable through the same code
  paths as user-created accounts. `targets.js` remains only as the seed source.
  `⟲` reset restores the demo companies to their seeded state but preserves
  user-created accounts and saved Insights definitions.
- `server/exclusivity.js` — 6-month exclusivity records tied to the Account Owner;
  status (Active / Expiring Soon / Expired) is always computed from the dates.
- `server/accounts.js` — new-account skeleton + AI enrichment (exact 20-field
  scraping schema, validated server-side; plausible mock offline).
- `server/data/targets.js` — ten seeded top-funnel accounts + the deal-twin pattern
  library (silent founders, dead-deal revival, intermediary effect…). The hero,
  Vantage, carries a KIU-density history: 38 touches, 4 reps, RCE campaigns, full
  mock email bodies.
- `server/conversation.js` — parses any activity log into scored likelihood
  indicators (reply rate, inbound recency, reconnect campaigns, escalation depth,
  sentiment trajectory, silence pattern). Generic — ready for real Salesforce exports.
- `server/insights/` — account-row derivation (NBA type, ownership, exclusivity
  status), declarative filter/KPI/grid engine, prompt→dashboard-spec generator.
- `src/` — React (Vite): Pipeline (sortable/filterable list, FLIP re-rank,
  sparklines, **+ New** account modal, exclusivity column), War Room (meters,
  factor modals, insights, activity + sentiment arc), Mission Control (digest,
  touches due, tasks), Insights (saved dashboards/reports over the live database).

All companies, people, and events in the seed data are fictional; AI enrichment
of user-created accounts generates plausible demo data, not real firmographics.
