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
2. **Pipeline** — ten accounts (two deal leads: Kevin Jay & Nathan Lim) in a
   Salesforce-style list with location flags and KPI tiles
   (avg likelihood, catalysts, touches due, tasks). The enrichment sweep runs on
   load: signal pills land, scores tick, sparklines draw, and **Vantage
   Software flares "Catalyst"** (48 → 63). Click the Catalysts tile to filter;
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

## Activity Synthesizer — paste raw logs, get structured activity

Accounts often arrive with years of history in Word docs, CRM exports, or notes.
Paste it raw; the agent synthesizes structured activity records.

- **Where:** the "New" account modal has an *Activity History (optional)* box
  (synthesis runs after enrichment), and every War Room's Activity panel has a
  **+ Add** button for existing accounts.
- **How it works:** `POST /api/activity/synthesize` converts the paste into
  records matching the exact timeline schema — date, direction (IN/OUT), rep
  (first-person entries map to the current user), contact (nullable), channel
  (email / call / meeting / LinkedIn, sequence codes like E1/RCE preserved in
  the subject), subject, note/body, and a sentiment consistent with the arc's
  categories. Everything is validated server-side; entries with unparseable
  dates are **flagged, never guessed**.
- **Review before commit:** synthesized records land in an editable table
  (date, direction, rep, contact, type, subject, sentiment). Only "Looks good —
  add N activities" writes them (`POST /api/activity/commit`). After commit the
  timeline, touch counts, sentiment arc, and conversation indicators all
  recompute — synthesized activity is indistinguishable from seeded activity.
- **Offline:** without an API key a deterministic parser (date-anchored
  splitting + keyword heuristics) runs instead — good-enough, same flow.

## Cached Intelligence — analyze once, refresh on notable change

Each analysis is stored per account with an `analyzedAt` timestamp and a
fingerprint of its inputs (activity count + latest entry, scores, stage,
blocker states, signal set). Opening a War Room with a fresh stored analysis
renders instantly — no agent run, no skeletons — with an "analyzed 2h ago"
timestamp. ↻ Re-analyze always forces a fresh run with the full agent trace.

The stored analysis goes stale when something **notable** happens:
1. new activity is added (synthesizer, ⏩ simulate, any path) — an **inbound**
   touch auto-runs the re-analysis on next open, since a reply is the
   highest-signal event in the system;
2. an approved action executes (scores/blockers move);
3. enrichment surfaces a new signal or catalyst;
4. stage changes;
5. likelihood or close probability moves ≥5 points.

Everything else — opening/closing accounts, navigation, page refresh, task
checkboxes, the exclusivity countdown — never invalidates. Stale-but-not-inbound
shows a subtle **"Update available — re-analyze"** pill instead of auto-running.
`⟲` reset restores the seeded state so rehearsals start from a known place.

## Architecture

- `server/` — Express (local: `server/index.js`; Vercel: `api/index.js`, same app).
  - `/api/targets` — full account state incl. conversation signals & cached analyses
  - `/api/accounts` — create a new account (**+ New** in the Pipeline); exclusivity
    auto-assigned to the Account Owner for 6 months.
    `/api/accounts/:id/enrich` runs the AI enrichment pass (full scraping schema,
    signals, financial estimates — deterministic mock without a key)
  - `/api/enrich` — signal sweep per account
  - `/api/analyze` — SSE: agent trace + structured-JSON analysis (claude-opus-5).
    Results persist per account with an input fingerprint; see *Cached
    Intelligence* above (`force` re-analyzes)
  - `/api/activity/synthesize` + `/api/activity/commit` — the Activity
    Synthesizer: raw paste → validated structured records → review → commit
  - `/api/act` — executes approved actions: real rescoring rationale, side effects
    that persist to the database (scores, blockers, tasks, log, next-touch cadence).
    If the activity history shows a **live sell-side process** (seller engaged a
    banker / we're invited into the process), approving an action floors
    Likelihood to Transact at **100** — the owner is transacting; close
    probability still moves by the blocker breakdown (whether *we* win it)
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
  paths as user-created accounts. `targets.js` remains only as the seed source
  (edits to it re-migrate seed records on restart while preserving user
  accounts). `⟲` is a **full demo reset**: user-created accounts and their
  log/task entries are deleted and exactly the original seeded companies
  remain. Saved Insights definitions (dashboard-level query specs, not account
  data) survive.
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
