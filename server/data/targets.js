// Seed data: one core acquisition target (top-of-funnel focus).
// All companies, people, and events are fictional.

export const PATTERN_LIBRARY = `
DEAL TWIN PATTERN LIBRARY (from real deal retrospectives — cite the matching analog in every prediction):
1. SILENT FOUNDER: Silent founders can take 3–5 years and multiple reps to open up; breakthroughs come from timing/catalysts, not more emails. Senior-person outreach outperforms rep-level outreach. Don't chase — expect long silences, then sudden engagement when circumstances change.
2. DEAD DEAL REVIVAL: Dead deals revive when the specific risk that killed them reverses. Re-engage on the reversal, not on price.
3. INTERMEDIARY EFFECT: Brokered deals close in 2–3 months; direct deals with silent founders take years. An intermediary helps a lot.
4. POST-LOI RENEGOTIATION: Post-LOI renegotiation is the norm — expect headline compression into earnouts. APA-stage friction kills deals; sellers get emotional at valuation and APA-redline moments. Frame structure changes early and in person.
5. THE HUMAN MOVE: Every close involved in-person moments — office visits, dinners, meeting the integration team. When a deal stalls, prescribe the human move, not another email.
6. STRUCTURE NORMS: Typical structures are cash-on-close + deferred + ARR-contingent earnout. Comps run ~0.6x–2.6x revenue for 15% EBITDA-margin vertical software; higher ARR mix and margins push the top of the range.
`;

export function seedTargets() {
  return [
    {
      id: "vantage",
      company: "Vantage Permit Systems",
      vertical: "Municipal permitting & licensing software",
      location: "Boise, ID",
      hero: true,
      brand: { color: "#0b5cab", color2: "#032d60", initials: "VP", mark: "permit" },
      stage: "Dormant — Run 1 died at APA (Oct 2025)",
      owner: {
        name: "Ray Delgado",
        title: "Founder & President",
        age: 63,
        tenure: 25,
        profile:
          "Founded Vantage in 2001. Sole owner. Daughter declined to join the business (2024). Engineer by training, answers his own phone maybe one call in ten. Anchored on a 2.4x revenue valuation from a peer's 2021 exit.",
      },
      financials: {
        revenue: 6.2,
        ebitdaMargin: 22,
        arrPct: 78,
        employees: 34,
        note: "142 municipal customers, 96% gross retention, sub-50k-population towns",
      },
      scores: { likelihood: 48, close: 22 },
      blockers: [
        {
          id: "b1",
          closeWeight: 12,
          label: "Re-establish contact after 10 months of silence",
          status: "blocked",
          detail:
            "Ray walked at APA redlines Oct 2025 and has ignored 2 attempts since. Silent-founder pattern: next touch must be catalyst-framed, senior-level, and must not mention price.",
          action: {
            id: "act-reengage",
            label: "Draft re-engagement note — succession + catalyst framing, no price",
            artifactType: "email",
          },
        },
        {
          id: "b2",
          closeWeight: 4,
          label: "Valuation gap from Run 1 (seller 2.4x vs our 1.6x)",
          status: "pending",
          detail:
            "Gap must be bridged with structure (ARR-contingent earnout), not headline. Pattern: compression into earnouts is the norm — frame it early this time.",
          action: {
            id: "act-structure",
            label: "Model 1.9x headline w/ earnout bridge for next conversation",
            artifactType: "memo",
          },
        },
        {
          id: "b3",
          closeWeight: 3,
          label: "Broker channel available — not yet engaged",
          status: "pending",
          detail:
            "Marty Feldstein (CapWest) has a standing relationship with Ray. Intermediary-effect pattern: brokered paths close in 2–3 months; direct paths with silent founders take years.",
          action: {
            id: "act-broker",
            label: "Brief Marty Feldstein (CapWest) as warm channel for the re-engagement",
            artifactType: "task",
          },
        },
        {
          id: "b4",
          closeWeight: 2,
          label: "No face-to-face with current deal lead",
          status: "pending",
          detail:
            "Run 1 was rep-carried until late. Every close involved in-person moments — plan a Boise visit for the moment Ray re-engages.",
          action: {
            id: "act-visit",
            label: "Hold Boise site-visit window (48h turnaround) for when Ray replies",
            artifactType: "task",
          },
        },
      ],
      signals: [
        {
          id: "s-catalyst",
          label: "Catalyst: kill-risk reversed",
          value: "State e-permitting portal program cancelled (Jun 24)",
          contribution: +8,
          source: "web",
          detail:
            "Idaho DOA cancelled the centralized state e-permitting portal in June budget cuts — the exact market risk that collapsed Run 1's investment case has reversed.",
          catalyst: true,
        },
        {
          id: "s-competitor",
          label: "Competitor exiting segment",
          value: "GovSuite sunsetting PermitPro for sub-50k munis (Jul 11)",
          contribution: +4,
          source: "web",
          detail:
            "GovSuite announced end-of-life for its small-municipality permitting product — Vantage's core segment just lost its largest competitor.",
          catalyst: true,
        },
        {
          id: "s-succession",
          label: "Succession pressure",
          value: "Founder 63, 25 yrs, no successor",
          contribution: +2,
          source: "crm",
          detail: "Daughter declined to join (Jun 2024 call). No management bench.",
        },
        {
          id: "s-linkedin",
          label: "LinkedIn activity shift",
          value: "First profile update in 6 yrs; engaging with retirement content",
          contribution: +1,
          source: "web",
          detail: "Ray updated his profile Jul 2026 and liked two posts on founder retirement.",
        },
      ],
      // 38 touches / 4 reps / 4.5 years — Salesforce-style subjects, with full
      // mock email bodies on the touches that matter.
      activity: [
        { date: "2022-02-08", rep: "Dana Whitfield", type: "email", direction: "out", subject: "[E1] - Acquisition interest in Vantage from Fluent", sentiment: "none", note: "Intro email. No reply.",
          body: "Hi Ray,\n\nI'm with Fluent — we acquire and grow vertical software companies for the long term (we've never sold one). Vantage keeps coming up when we map the municipal permitting space.\n\nIf you're ever curious what a partnership or exit could look like, I'd welcome 20 minutes.\n\nBest,\nDana Whitfield" },
        { date: "2022-02-10", rep: "Dana Whitfield", type: "call", direction: "out", subject: "C1 - Cold intro call", sentiment: "neutral", note: "Ray answered, polite but curt: 'Not for sale, but keep in touch.'" },
        { date: "2022-03-02", rep: "Dana Whitfield", type: "email", direction: "out", subject: "[E2] - Re: Acquisition interest in Vantage from Fluent", sentiment: "none", note: "Follow-up on the call. No reply." },
        { date: "2022-05-18", rep: "Dana Whitfield", type: "email", direction: "out", subject: "[RCE1] - Fluent & Vantage — checking in", sentiment: "none", note: "Quarterly check-in. No reply." },
        { date: "2022-06-06", rep: "Dana Whitfield", type: "email", direction: "out", subject: "[RCE2] - Re: Fluent & Vantage — checking in", sentiment: "none", note: "No reply." },
        { date: "2022-09-07", rep: "Dana Whitfield", type: "email", direction: "out", subject: "[RCE3] - Vertical-market comps piece", sentiment: "none", note: "Shared comps content. No reply. Campaign closed." },
        { date: "2022-11-15", rep: "Dana Whitfield", type: "call", direction: "out", subject: "C2 - Voicemail", sentiment: "none", note: "Voicemail, no answer." },
        { date: "2023-01-24", rep: "Marcus Lee", type: "call", direction: "out", subject: "C1 - Territory handoff intro", sentiment: "none", note: "Territory handoff. Voicemail, no answer." },
        { date: "2023-02-07", rep: "Marcus Lee", type: "email", direction: "out", subject: "[RCE1] - Vantage <> Fluent Reconnect", sentiment: "none", note: "New rep intro. No reply." },
        { date: "2023-03-01", rep: "Marcus Lee", type: "email", direction: "out", subject: "[RCE2] - Re: Vantage <> Fluent Reconnect", sentiment: "none", note: "No reply." },
        { date: "2023-04-11", rep: "Marcus Lee", type: "email", direction: "out", subject: "[RCE3] - Congrats on the City of Nampa win", sentiment: "none", note: "Personalized on public news. No reply. Campaign closed.",
          body: "Ray,\n\nSaw Vantage won the City of Nampa contract — congratulations. That's a competitive process and it says a lot about the product.\n\nStill here whenever a conversation makes sense. No agenda beyond an introduction.\n\nMarcus Lee, Fluent" },
        { date: "2023-08-30", rep: "Marcus Lee", type: "call", direction: "out", subject: "C2 - Screened", sentiment: "negative", note: "Office manager screened: 'Ray says he's not interested in these calls.'" },
        { date: "2023-10-12", rep: "Marcus Lee", type: "email", direction: "out", subject: "[RCE1] - Reconnect ahead of GFOA", sentiment: "none", note: "Conference-timed touch. No reply." },
        { date: "2024-02-14", rep: "Priya Raman", type: "email", direction: "out", subject: "[E1] - New coverage intro", sentiment: "none", note: "New rep intro. No reply." },
        { date: "2024-04-03", rep: "Priya Raman", type: "email", direction: "out", subject: "[E2] - Re: New coverage intro", sentiment: "none", note: "No reply." },
        { date: "2024-06-20", rep: "Priya Raman", type: "call", direction: "out", subject: "C1 - BREAKTHROUGH", sentiment: "warm", note: "25 min. Ray volunteered that his daughter isn't joining the business. Asked, unprompted: 'What do businesses like mine actually go for?'" },
        { date: "2024-07-08", rep: "Priya Raman", type: "email", direction: "in", subject: "[In] Re: Following up on our call", sentiment: "warm", note: "FIRST INBOUND after 29 months. Ray asked for the valuation framework in writing.",
          body: "Priya,\n\nGood talking with you last month. I've been thinking about what you said.\n\nCould you send me that valuation framework you mentioned — how you'd actually look at a business like mine? In writing, no calls needed for now.\n\nRay" },
        { date: "2024-09-12", rep: "Priya Raman", type: "email", direction: "out", subject: "[Out] Valuation framework for vertical software", sentiment: "neutral", note: "Sent framework per his ask.",
          body: "Ray,\n\nAs promised — attached is how we frame valuation for vertical software:\n\n• Comps run 0.6x–2.6x revenue for ~15% EBITDA-margin businesses\n• ARR mix and gross retention drive where you land in that range\n• Vantage's 78% ARR and 96% retention would price it well above the midpoint\n\nHappy to walk through it whenever suits — or not at all. Your timeline.\n\nPriya" },
        { date: "2024-09-25", rep: "Priya Raman", type: "email", direction: "in", subject: "[In] Re: Valuation framework", sentiment: "neutral", note: "Reply: 'These multiples seem low. A friend got 2.4x in 2021.'",
          body: "Priya,\n\nRead it. Honestly, these multiples seem low. A friend of mine sold his utility-billing company in 2021 for 2.4x revenue and his retention wasn't any better than mine.\n\nNot saying no to a conversation. Saying I know what this business is worth.\n\nRay" },
        { date: "2024-10-14", rep: "Priya Raman", type: "email", direction: "out", subject: "[Out] Re: Valuation framework — ARR quality context", sentiment: "neutral", note: "Walked through why ARR mix moves the multiple.",
          body: "Ray,\n\nFair push-back — and your friend's outcome is real. Two honest notes:\n\n1) 2021 was the top of the market; multiples have compressed since.\n2) What we CAN do is get the structure to reward what you've built — retention like yours can carry an earnout that closes most of that gap.\n\nIf you'd ever want to explore under NDA, we'd put real numbers on it. No pressure either way.\n\nPriya" },
        { date: "2024-11-05", rep: "Priya Raman", type: "call", direction: "out", subject: "C2 - Agreed to explore", sentiment: "positive", note: "Agreed to explore. NDA signed. Handoff to deal lead." },
        { date: "2024-11-20", rep: "Priya Raman", type: "email", direction: "in", subject: "[In] NDA countersigned + data request list", sentiment: "positive", note: "Ray returned the NDA same week and asked what we'd need to see.",
          body: "Priya,\n\nSigned NDA attached.\n\nSend me the list of what you'd need to see. I'll pull it together myself — I don't want my controller or the team knowing about this yet.\n\nRay" },
        { date: "2025-01-16", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] Vantage x Fluent — management presentation agenda", sentiment: "positive", note: "Deal lead takes over. Agenda agreed in two days.",
          body: "Ray,\n\nKevin Jay — I lead transactions at Fluent and I'll be your counterpart from here. Priya speaks very highly of you.\n\nProposed agenda for Feb 27: your story and the product first, numbers second, and what life after a deal actually looks like for your team. We'll come to you.\n\nKevin" },
        { date: "2025-02-27", rep: "Kevin Jay", type: "meeting", direction: "out", subject: "M1 - Management presentation", sentiment: "positive", note: "Strong ARR base, clean churn. Ray engaged and proud of the product." },
        { date: "2025-03-14", rep: "Kevin Jay", type: "email", direction: "in", subject: "[In] Re: Follow-up materials", sentiment: "positive", note: "Ray sent churn and ARR detail unprompted. Peak engagement.",
          body: "Kevin,\n\nAttached the customer-level ARR detail and the churn log going back to 2019. You'll see the two logos we lost in 2022 were both city mergers, not competitive losses.\n\nI want whoever looks at this to see it the way I do.\n\nRay" },
        { date: "2025-04-22", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] Re: Vantage x Fluent Conference Call 16 May 2025", sentiment: "neutral", note: "LOI discussion scheduled." },
        { date: "2025-05-16", rep: "Kevin Jay", type: "meeting", direction: "out", subject: "M2 - LOI discussion", sentiment: "neutral", note: "Gap: our 1.6x vs his 2.4x anchor. Parked at 1.9x headline with earnout concept." },
        { date: "2025-06-03", rep: "Kevin Jay", type: "email", direction: "in", subject: "[In] Re: LOI discussion", sentiment: "neutral", note: "Ray: needs time to think about the earnout concept. Tone still constructive.",
          body: "Kevin,\n\nI need some time with the earnout idea. I understand the logic — I just spent 25 years not answering to anyone, and hitting someone else's targets for my own money sits strangely.\n\nGive me a few weeks. Not a no.\n\nRay" },
        { date: "2025-06-19", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] Earnout mechanics walkthrough", sentiment: "neutral", note: "Plain-English earnout explainer sent." },
        { date: "2025-07-22", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] Structure update after state portal RFP", sentiment: "negative", note: "State announced centralized e-permitting portal RFP — direct threat to Vantage's segment. IC tightened structure; more into earnout.",
          body: "Ray,\n\nI have to be straight with you: the state's announcement of a centralized e-permitting portal RFP is a material development for the segment. Our committee has asked that we shift a larger portion of the consideration into the earnout while the picture clarifies.\n\nThe total is unchanged. I know this isn't the direction you wanted.\n\nCan we talk this week?\n\nKevin" },
        { date: "2025-08-05", rep: "Kevin Jay", type: "email", direction: "in", subject: "[In] Re: Structure update", sentiment: "negative", note: "Ray: 'This isn't what we discussed in May.' Response latency jumped from 2 days to 14.",
          body: "Kevin,\n\nThis isn't what we discussed in May.\n\nEvery time I get comfortable, the deal gets a little worse. The portal thing is speculative — my customers aren't going anywhere and you know it.\n\nRay" },
        { date: "2025-08-20", rep: "Kevin Jay", type: "call", direction: "out", subject: "C1 - Revised structure walkthrough", sentiment: "negative", note: "Defensive call. Ray heard 'less money', not 'risk sharing'." },
        { date: "2025-09-18", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] APA draft + redlines", sentiment: "negative", note: "APA paper went out without an in-person walkthrough. Mistake in hindsight." },
        { date: "2025-09-30", rep: "Kevin Jay", type: "call", direction: "out", subject: "C2 - APA redline call", sentiment: "negative", note: "Redlines + renegotiated structure landed badly. Ray: 'I feel nickel-and-dimed.' Walked. Deal dead." },
        { date: "2025-10-08", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] Repair attempt", sentiment: "none", note: "Thanked him, left door open. No reply.",
          body: "Ray,\n\nI'm sorry about how the last stretch felt. You built something excellent and you deserved a cleaner process than the one you got.\n\nNo ask here. If circumstances ever change — yours or the market's — my line is open.\n\nKevin" },
        { date: "2025-12-02", rep: "Priya Raman", type: "email", direction: "out", subject: "[RCE1] - Vantage <> Fluent — reconnecting", sentiment: "none", note: "Soft reconnect. No reply." },
        { date: "2026-01-21", rep: "Priya Raman", type: "email", direction: "out", subject: "[RCE2] - Re: Vantage <> Fluent — reconnecting", sentiment: "none", note: "No reply." },
        { date: "2026-03-15", rep: "Priya Raman", type: "email", direction: "out", subject: "[RCE3] - Soft check-in", sentiment: "none", note: "No reply. Campaign closed. 10+ months of silence." },
      ],
      details: {
        leadOwner: "Priya Raman",
        accountOwner: "Kevin Jay",
        industry: "GovTech",
        yearEstablished: 2001,
        domain: "vantagepermit.com",
        employees: 34,
        parentCompany: null,
        leadSource: "Outbound — vertical mapping",
        firstEmailDate: "2022-02-08",
        broker: "CapWest Advisors (Marty Feldstein)",
        responded: "Yes",
        interest: "Tier 1",
        responseType: "Positive",
        trueRelation: "No",
        ndaIssued: "Yes",
        ndaIssuedDate: "2024-11-05",
        linkedin: "linkedin.com/company/vantage-permit-systems",
        stage: "Follow Up Funnel",
        address: "412 W Idaho St, Boise, ID 83702, USA",
        recurringRevenue: "$4.8M ARR",
        revenues: "$6.2M",
        nextSteps: "Catalyst-framed re-engagement (senior-level, no price talk)",
        exclusivity: { status: "Expired", startDate: "2025-04-18", endDate: "2025-10-15", owner: "Kevin Jay", challengeStatus: "None" },
        scraping: {
          employeeCountBest: 37, revenueBestUsd: "$6,400,000", industry: "Custom Software Development",
          fundingStatus: "bootstrapped_likely", hqCity: "Boise", hqCountry: "US",
          successionScore: 84, acquisitionFitScore: 87, acquisitionFitBand: "high", foundedYear: 2001,
          llmIsVms: "yes", llmVertical: "govtech", llmSubVertical: "municipal permitting & licensing",
          llmTargetCustomer: "sub-50k-population municipalities", matchConfidence: 100,
          revenueModel: "SaaS / Subscription", llmRevenueModel: "saas_subscription",
          websiteDescription: "Vantage Permit Systems provides permitting, licensing, and code-enforcement software purpose-built for small and mid-size municipalities.",
          llmProductSummary: "Vantage provides permit intake, plan review, licensing, and inspection management software for municipal governments.",
          llmConfidence: 82,
        },
        systemInfo: { createdBy: "Dana Whitfield", createdDate: "2022-02-08", lastModifiedBy: "Kevin Jay", lastModifiedDate: "2026-07-30" },
        ownerHistory: [
          { date: "2024-11-05", field: "Account Owner", from: "Priya Raman", to: "Kevin Jay" },
          { date: "2024-01-15", field: "Account Owner", from: "Marcus Lee", to: "Priya Raman" },
          { date: "2022-12-19", field: "Account Owner", from: "Dana Whitfield", to: "Marcus Lee" },
        ],
        opportunities: [
          { name: "Vantage Permit Systems — Run 1", stage: "Closed Lost", amount: "$11.8M EV (1.9x parked)", closeDate: "2025-09-30" },
        ],
        notes: [
          { title: "APA Redline Summary — where it broke", date: "2025-10-01" },
          { title: "Valuation Framework v2 (sent to Ray)", date: "2024-09-12" },
          { title: "RCC Notes — breakthrough call", date: "2024-06-20" },
        ],
      },
      cachedAnalysis: {
        likelihoodNarrative:
          "Vantage scores 63 because the two forces that kept this deal dead have both flipped in the last six weeks. The state portal program that killed Run 1's investment case was cancelled June 24, and GovSuite is abandoning the exact segment Vantage owns. A 63-year-old sole owner with no successor whose LinkedIn just woke up completes the dead-deal-revival pattern: the deal died on a specific risk, and that specific risk has reversed. The discount is Ray himself — he has ignored two touches since walking, so the next move has to be right.",
        relationshipRead: {
          summary:
            "Thirty-eight touches across four reps over 4.5 years. Three full reconnect campaigns absorbed without a single reply — but also without an opt-out. One warm window in mid-2024 when succession got real, a fast run to LOI at 2-day response latency, then an emotional exit at the APA stage.",
          touchVolume: "38 touches / 4 reps / 4.5 years — 22 unanswered · 6 inbound replies, all inside the 2024–25 engagement window",
          sentimentArc:
            "Curt → silent (2022–23) → warm breakthrough on succession (Jun 2024) → positive through management presentation (Feb 2025) → soured on structure push (Jul 2025) → walked angry at APA redlines (Sep 2025) → silent since",
          wentColdWhen: "September 30, 2025 — the APA redline call",
          wentColdWhy:
            "Not price discovery — betrayal of trust. The state-portal risk made the IC tighten structure late, and Ray experienced the renegotiation as being nickel-and-dimed after he'd already emotionally committed. APA-stage friction killing deals is the most common death in our retrospectives.",
          ownerMood:
            "Proud, bruised, and quietly running out of road. He asked what businesses like his go for, his daughter said no, and he's 63. The anger was at the process, not the outcome.",
        },
        archetype: {
          label: "Silent Founder (post-burn)",
          description:
            "Sole owner, engineer temperament, screens calls, anchored on a peer's 2021 multiple. Went from silent to LOI once — which proves he can move fast when the timing is his. Now carries APA scar tissue on top of the baseline archetype.",
          whatToExpect:
            "Expect ~2 weeks of silence after any outreach, then engagement on his terms — likely a short reply or a call at an odd hour. When he re-engages, expect a counter on structure, not price: he'll want certainty of close and simplicity, not a higher headline. Do not chase in the gap; a second email inside two weeks confirms his 'they're desperate' prior.",
          nextBehavior:
            "He will quietly validate the catalyst himself (he reads state procurement notices) and likely sound out Marty Feldstein. Then he'll respond to whoever made him feel respected rather than processed.",
          flashpoints: [
            "Any valuation number in the first conversation",
            "APA redlines arriving without an in-person walkthrough",
            "Earnout mechanics framed as 'protection against him'",
            "Being handed back down to a rep after dealing with a principal",
          ],
          dealTwin:
            "This mirrors the silent-founder + dead-deal-revival pattern: deals like this closed only after a catalyst plus senior outreach — never from another check-in email. Twin deals took 60–90 days from catalyst-framed re-engagement to signed LOI, and every one included a site visit within 3 weeks of first reply.",
        },
        revivalRadar: {
          catalyst:
            "Idaho cancelled the centralized state e-permitting portal (Jun 24) and GovSuite is sunsetting PermitPro for sub-50k municipalities (Jul 11).",
          source: "State procurement notice + GovSuite press release (web enrichment).",
          whyItChangesTheMath:
            "Run 1 died because the portal RFP threatened Vantage's entire segment, forcing our structure-tightening that Ray read as bad faith. That risk is now gone AND his largest competitor is handing him 100+ orphaned municipal accounts. His business is worth more today than at LOI — which lets us return at the 1.9x headline he almost accepted, framed as 'the world changed in your favor,' not as a concession. Windows like this don't stay open long.",
        },
        recommendedAction: {
          title: "Re-engagement note to Ray Delgado — catalyst + succession framing, zero price talk",
          rationale:
            "Silent-founder pattern says: senior sender, short note, timing-based reason to talk, no chase. The catalyst gives us the only honest opening that doesn't reopen the APA wound — the world changed, not our position.",
          artifactType: "email",
          artifact:
            "Subject: The portal cancellation — and what it means for Vantage\n\nRay,\n\nKevin Jay here — I led our conversations last year, and I owe you a straighter process than the one you got. I'm not writing to reopen that.\n\nTwo things changed that I thought you'd want from someone who's done the work on your business: the state cancelled the e-permitting portal program in June's budget, and GovSuite is sunsetting PermitPro for towns under 50k. The risk that soured our last conversation is gone, and your market just got less crowded.\n\nThat changes the picture for Vantage — and honestly, it changes what your options look like at 63 with no one pushing you to decide anything.\n\nIf it's useful, I'd come to Boise for an afternoon — no bankers, no paper, no numbers. Just what the next chapter could look like on your terms. If not, no reply needed and I won't follow up beyond this.\n\nKevin",
        },
      },
    },

    // ───────────────────── PE-backed, exit clock (early dialogue) ─────────────────────
    {
      id: "novaris",
      company: "Novaris Health Scheduling",
      vertical: "Clinic & therapy scheduling software",
      location: "Minneapolis, MN",
      brand: { color: "#06a59a", color2: "#014d44", initials: "NH" },
      stage: "Early dialogue — PE holder signaling",
      owner: {
        name: "Copper Gate Partners (Tom Brandt, CEO)",
        title: "PE-backed; CEO hired 2021",
        age: 48,
        tenure: 5,
        profile: "Copper Gate invested 2019 out of a 2017-vintage fund — now year 9 of a 10-year fund life. Distribution pressure is real.",
      },
      financials: { revenue: 18.9, ebitdaMargin: 19, arrPct: 91, employees: 104, note: "Fund vintage 2017; two failed platform add-ons in 2024" },
      scores: { likelihood: 62, close: 45 },
      blockers: [
        { id: "b1", closeWeight: 8, label: "Copper Gate hasn't decided to sell yet", status: "pending", detail: "Signaling openness ('realists about fund life') but no decision. A credible pre-emptive signal starts their internal clock.", action: { id: "act-preempt", label: "Signal pre-emptive interest directly to Copper Gate ops partner", artifactType: "email" } },
        { id: "b2", closeWeight: 3, label: "Valuation expectations set by 2021 marks", status: "pending", detail: "Fund carried Novaris at aggressive 2021 marks; reality is lower.", action: { id: "act-marks", label: "Build mark-to-market comp set for the opening conversation", artifactType: "memo" } },
      ],
      signals: [
        { id: "s-fundclock", label: "PE exit clock", value: "Fund vintage 2017 — year 9 of 10", contribution: +4, source: "web", detail: "Copper Gate Fund III (2017) is past typical hold; LP distribution pressure mounting." },
        { id: "s-hiring", label: "Hiring freeze", value: "Open roles down 80% YoY", contribution: +2, source: "web", detail: "Job postings collapsed from 15 to 3 — cost discipline typical of exit-prep." },
        { id: "s-ceo", label: "CEO comp refresh", value: "Brandt granted new options pkg", contribution: +1, source: "web", detail: "Retention package consistent with pre-sale grooming." },
      ],
      activity: [
        { date: "2025-11-14", rep: "Priya Raman", type: "email", direction: "out", subject: "[E1] - Intro to CEO Brandt", sentiment: "neutral", note: "Intro to CEO Brandt. Cordial, deferred to sponsor." },
        { date: "2026-02-19", rep: "Kevin Jay", type: "call", direction: "out", subject: "C1 - Copper Gate ops partner", sentiment: "positive", note: "Sponsor-level call: 'not for sale today, but we're realists about fund life.'" },
        { date: "2026-03-05", rep: "Kevin Jay", type: "email", direction: "in", subject: "[In] Re: Fund life conversation", sentiment: "positive", note: "Ops partner: keep us on your list; revisit after Q3 marks.",
          body: "Kevin,\n\nGood conversation last month. Nothing to do today, but keep Novaris on your list.\n\nWe'll have a cleaner internal view after Q3 marks. If your interest is real then, worth an hour.\n\nDavid" },
        { date: "2026-06-30", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] H1 check-in", sentiment: "none", note: "Sent H1 check-in. No reply yet — expected between quarters." },
      ],
      details: {
        leadOwner: "Priya Raman", accountOwner: "Kevin Jay", industry: "Healthcare IT", yearEstablished: 2012,
        domain: "novarishealth.com", employees: 104, parentCompany: "Copper Gate Partners (Fund III, 2017)",
        firstEmailDate: "2025-11-14", responded: "Yes", interest: "Tier 1", responseType: "Neutral",
        trueRelation: "Yes — sponsor-level dialogue", ndaIssued: "No", stage: "Early Dialogue",
        address: "Minneapolis, MN, USA", recurringRevenue: "$17.2M ARR", revenues: "$18.9M",
        nextSteps: "Pre-emptive signal to Copper Gate after Q3 marks",
        exclusivity: { status: "None", challengeStatus: "None" },
        scraping: {
          employeeCountBest: 112, revenueBestUsd: "$19,600,000", fundingStatus: "pe_backed",
          hqCity: "Minneapolis", hqCountry: "US", successionScore: 12, acquisitionFitScore: 71, acquisitionFitBand: "high",
          foundedYear: 2012, llmIsVms: "yes", llmVertical: "healthcare", llmSubVertical: "clinic & therapy scheduling",
          llmTargetCustomer: "outpatient clinics and therapy groups", matchConfidence: 100,
          revenueModel: "SaaS / Subscription", llmRevenueModel: "saas_subscription",
          llmProductSummary: "Novaris provides scheduling and utilization software for clinics and therapy providers.", llmConfidence: 85,
        },
        systemInfo: { createdBy: "Priya Raman", createdDate: "2025-11-14", lastModifiedBy: "Kevin Jay", lastModifiedDate: "2026-06-30" },
        ownerHistory: [{ date: "2026-02-01", field: "Account Owner", from: "Priya Raman", to: "Kevin Jay" }],
        opportunities: [],
        notes: [{ title: "Copper Gate fund-life notes (ops partner call)", date: "2026-02-19" }],
      },
      cachedAnalysis: {
        likelihoodNarrative:
          "Novaris scores 69 on the strength of the fund clock alone: a 2017-vintage fund in year nine has to move, and the hiring freeze plus CEO retention grant look like exit grooming. The ops partner's 'keep us on your list' is as close to a for-sale sign as PE gives you this early.",
        relationshipRead: {
          summary: "Thin but warm at the right altitude. Four touches; the ones that mattered were sponsor-level, including a written invitation to revisit after Q3 marks.",
          touchVolume: "4 touches / 2 reps / 8 months — 1 inbound",
          sentimentArc: "Cordial → candid at sponsor level → quiet (normal PE cadence between quarters)",
          wentColdWhen: "N/A — active at PE cadence",
          wentColdWhy: "N/A",
          ownerMood: "Unsentimental. This is a spreadsheet decision made by a fund, not a founder identity crisis.",
        },
        archetype: {
          label: "Professional Seller (PE exit clock)",
          description: "Sponsor-controlled, banker-fluent, zero emotion. Will optimize for total value and speed of distribution.",
          whatToExpect:
            "Expect nothing until Q3 marks land, then a real window. In a pre-empt, expect them to quietly test our number against 1–2 other buyers regardless of what they promise. Speed and certainty beat headline creativity here.",
          nextBehavior: "Copper Gate runs its mark-to-market after Q3, then either takes a credible pre-empt seriously or hires a banker for a 2027 process.",
          flashpoints: ["Anchoring off their stale 2021 marks", "Slow responses — PE reads latency as weakness"],
          dealTwin: "Mirrors our PE-secondary pattern: pre-empting before a banker was hired saved meaningful competition in twin deals; once banked, these become auction math.",
        },
        revivalRadar: null,
        recommendedAction: {
          title: "Calendar the Q3 pre-empt — and warm the channel now",
          rationale: "The ops partner named the window (post-Q3 marks). A short note now keeps us first in line without spending anything.",
          artifactType: "email",
          artifact:
            "Subject: Novaris — holding you to that hour\n\nDavid,\n\nYou said after Q3 marks it'd be worth an hour. Booking it now: we'll bring a mark-to-market view of the scheduling comps and a number we can stand behind on a 60-day close.\n\nIf the marks come in where we both suspect, you save two quarters and a banker fee. If not, you've lost an hour.\n\nMid-October?\n\nKevin",
        },
      },
    },

    // ───────────────────── Warm inbound referral (succession) ─────────────────────
    {
      id: "merritt",
      company: "Merritt Fuel Systems",
      vertical: "Back-office software for fuel jobbers",
      location: "Tulsa, OK",
      brand: { color: "#dd7a01", color2: "#8c4b02", initials: "MF" },
      stage: "Exploring — NDA in legal review",
      owner: {
        name: "Doc Merritt",
        title: "Founder & CEO",
        age: 66,
        tenure: 29,
        profile: "Founded 1997. Health scare in January 2026 changed his math. Son works in the business but doesn't want to run it. Came to us via a portfolio-company CEO he trusts.",
      },
      financials: { revenue: 5.4, ebitdaMargin: 25, arrPct: 70, employees: 31, note: "310 fuel-jobber customers, extremely sticky, 40% market share in his region" },
      scores: { likelihood: 58, close: 30 },
      blockers: [
        { id: "b1", closeWeight: 8, label: "NDA stalled at his lawyer for 3+ weeks", status: "blocked", detail: "Small-town counsel, first M&A NDA he's seen. Doc reads the delay as 'this is getting complicated.'", action: { id: "act-nda", label: "Send plain-English NDA summary + offer a call with his counsel", artifactType: "email" } },
        { id: "b2", closeWeight: 5, label: "No financials shared yet", status: "pending", detail: "Waiting on NDA. Pre-stage the ask so nothing stalls after signature.", action: { id: "act-fin", label: "Prepare one-page 'what we need and why' data request", artifactType: "memo" } },
        { id: "b3", closeWeight: 5, label: "No face-to-face yet", status: "pending", detail: "Referral warmth only goes so far. Every close involved in-person moments — Tulsa dinner with Doc and his son.", action: { id: "act-meet", label: "Propose Tulsa visit — dinner with Doc and his son", artifactType: "task" } },
      ],
      signals: [
        { id: "s-health", label: "Succession catalyst", value: "Health scare (Jan) + son won't take over", contribution: +4, source: "crm", detail: "Doc said it directly on the referral call: 'January changed my math.'" },
        { id: "s-referral", label: "Trusted-channel entry", value: "Referred by FuelServ CEO (portfolio)", contribution: +2, source: "crm", detail: "Warm introduction from a seller who had a good exit with us — highest-converting channel." },
        { id: "s-consolidation", label: "Vertical consolidating", value: "2 fuel-software peers acquired in 12 months", contribution: +2, source: "web", detail: "Doc watches his peers; consolidation makes waiting feel riskier to him." },
      ],
      activity: [
        { date: "2026-03-12", rep: "Kevin Jay", type: "call", direction: "in", subject: "C1 - Inbound referral via FuelServ CEO", sentiment: "positive", note: "Doc, referred by Duke (FuelServ). Direct: 'January changed my math. Tell me how this works.'" },
        { date: "2026-03-20", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] How our process works — plain English", sentiment: "positive", note: "Sent the no-jargon overview per his ask.",
          body: "Doc,\n\nGood talking with you. As promised, the whole process in plain English:\n\n1. NDA — so you can show us numbers safely\n2. We learn the business (2-3 weeks, your pace)\n3. We put a real number and structure in writing\n4. You decide. No pressure, no games — ask Duke\n\nNothing moves without you. Call anytime.\n\nKevin" },
        { date: "2026-04-08", rep: "Kevin Jay", type: "call", direction: "out", subject: "C2 - Q&A call", sentiment: "positive", note: "90 minutes. Asked mostly about what happens to his 31 people. Good sign." },
        { date: "2026-05-14", rep: "Kevin Jay", type: "email", direction: "in", subject: "[In] Re: Next steps", sentiment: "warm", note: "Doc asked about team retention track record; wants son included going forward.",
          body: "Kevin,\n\nBeen thinking on our call. Two things before I send anything:\n\n1) What happens to my people? I want names and examples, not promises.\n2) My son Cole should be in the room from here on. He's not taking over but it's his inheritance we're talking about.\n\nSend that NDA to my lawyer, Ray Hutchins in Broken Arrow.\n\nDoc" },
        { date: "2026-06-25", rep: "Kevin Jay", type: "email", direction: "out", subject: "[Out] NDA sent to counsel + retention examples", sentiment: "neutral", note: "NDA to Hutchins; sent 3 named references from acquired teams." },
        { date: "2026-07-18", rep: "Kevin Jay", type: "email", direction: "in", subject: "[In] Re: NDA status", sentiment: "neutral", note: "Doc: 'Ray's still reading it. He's thorough.' Three weeks and counting.",
          body: "Kevin,\n\nRay's still reading it. He's thorough — did my first commercial lease in 1994 and he's read everything since.\n\nDon't take the wait personally.\n\nDoc" },
      ],
      details: {
        leadOwner: "Kevin Jay", accountOwner: "Kevin Jay", industry: "Energy Software", yearEstablished: 1997,
        domain: "merrittfuel.com", employees: 31, firstEmailDate: "2026-03-20", broker: "None — direct via portfolio referral",
        responded: "Yes", interest: "Tier 1", responseType: "Positive", trueRelation: "Yes — portfolio CEO referral",
        ndaIssued: "Yes — in legal review", ndaIssuedDate: "2026-06-25", stage: "Exploring",
        address: "Tulsa, OK, USA", recurringRevenue: "$3.8M ARR", revenues: "$5.4M",
        nextSteps: "Unstick NDA at his counsel; plan Tulsa dinner with Doc + Cole",
        exclusivity: { status: "None", challengeStatus: "None" },
        scraping: {
          employeeCountBest: 33, revenueBestUsd: "$5,700,000", fundingStatus: "bootstrapped_likely",
          hqCity: "Tulsa", hqCountry: "US", successionScore: 88, acquisitionFitScore: 79, acquisitionFitBand: "high",
          foundedYear: 1997, llmIsVms: "yes", llmVertical: "energy", llmSubVertical: "fuel jobber back-office & logistics",
          llmTargetCustomer: "fuel jobbers and petroleum distributors", matchConfidence: 100,
          revenueModel: "License + Subscription", llmRevenueModel: "mixed",
          llmProductSummary: "Merritt provides dispatch, tax filing, and back-office software for fuel distributors.", llmConfidence: 81,
        },
        systemInfo: { createdBy: "Kevin Jay", createdDate: "2026-03-12", lastModifiedBy: "Kevin Jay", lastModifiedDate: "2026-07-18" },
        ownerHistory: [],
        opportunities: [],
        notes: [{ title: "Referral call notes — 'January changed my math'", date: "2026-03-12" }, { title: "Team retention references sent", date: "2026-06-25" }],
      },
      cachedAnalysis: {
        likelihoodNarrative:
          "Merritt scores 66 because every top-funnel indicator points the same way: a durable personal catalyst (health + succession), entry through our highest-converting channel (a portfolio CEO he trusts), and a seller whose questions are about his people, not his price. The only drag is mechanical — an NDA sitting with a small-town lawyer for three weeks.",
        relationshipRead: {
          summary: "Six touches in four months, three of them inbound — Doc is leaning in. The relationship formed fast on borrowed trust from the FuelServ referral, and his questions have already moved from 'how does this work' to 'what happens to my people.'",
          touchVolume: "6 touches / 1 lead / 4 months — 3 inbound",
          sentimentArc: "Positive from first contact → warm as it got real → neutral-patient during the NDA wait",
          wentColdWhen: "N/A — waiting on his counsel, not on him",
          wentColdWhy: "N/A",
          ownerMood: "Resolved but careful. He's decided to do something; he hasn't decided to trust the process yet. Cole in the room is how he de-risks it emotionally.",
        },
        archetype: {
          label: "Referred Succession Seller",
          description: "Warm, direct, people-first. Trusts individuals, not institutions — the referral is the asset. Will move at the speed of his lawyer and his son's comfort.",
          whatToExpect:
            "Expect the NDA delay to be about his lawyer's pace, not cold feet — but also expect Doc to read our patience as character. When numbers finally come, expect one round of honest negotiation, not games; referred sellers anchor on fairness, not maximum.",
          nextBehavior: "He'll wait out his lawyer, bring Cole to the next call, and quietly ask Duke whether we behaved well post-close.",
          flashpoints: ["Pressuring the lawyer directly", "Anything that smells like going around Cole", "Generic corporate answers to the 'my people' question"],
          dealTwin: "Mirrors our portfolio-referral pattern: referred succession sellers closed at the highest rate in the book and almost never ran processes — but every one included a family dinner before the LOI.",
        },
        revivalRadar: null,
        recommendedAction: {
          title: "Unstick the NDA — plain-English summary + offer his counsel a call",
          rationale: "Three weeks of legal silence is momentum quietly dying. Make the lawyer's job easy and Doc's decision simple, without pressuring either.",
          artifactType: "email",
          artifact:
            "Subject: Making Ray's job easier\n\nDoc,\n\nNo rush from our side — Ray being thorough is a good sign, not a problem.\n\nTo make his read easier, attached is a one-page plain-English summary of the NDA: what it covers, what it doesn't, and the three clauses lawyers usually ask about (marked in the draft). If it'd help, I'll get on a call with Ray directly — happy to walk him through it lawyer-to-layman.\n\nAnd whenever the paperwork's done: dinner in Tulsa, you, me, and Cole. I'd like to meet him.\n\nKevin",
        },
      },
    },

    // ───────────────────── Polite deflector ("ask me next year") ─────────────────────
    {
      id: "solenta",
      company: "Solenta Labs",
      vertical: "LIMS for water & environmental testing labs",
      location: "Madison, WI",
      brand: { color: "#9050e9", color2: "#401075", initials: "SL" },
      stage: "Nurture — 'ask me next year' (it's next year)",
      owner: {
        name: "Dev Okonkwo",
        title: "Co-founder & CEO",
        age: 57,
        tenure: 20,
        profile: "Co-founded 2006; bought out his partner in 2019. Polite, precise, never says no — says 'next year.' Currently mid lab-expansion project.",
      },
      financials: { revenue: 7.8, ebitdaMargin: 28, arrPct: 86, employees: 42, note: "460 lab customers; compliance-driven stickiness; expansion capex underway" },
      scores: { likelihood: 44, close: 18 },
      blockers: [
        { id: "b1", closeWeight: 6, label: "'Next year' is now — hold him to it", status: "blocked", detail: "He wrote 'ask me again next year — I mean it this time' in Sept 2025. The credible move is to take him at his word, on the date, with a reason.", action: { id: "act-annual", label: "Draft the 'you told me to ask again' note + lab-expansion congrats", artifactType: "email" } },
        { id: "b2", closeWeight: 4, label: "No relationship depth beyond two calls", status: "pending", detail: "Deflectors engage when they're treated as peers, not prospects. Get him in a room with founders who've sold.", action: { id: "act-founderdinner", label: "Invite Dev to the Fluent founder dinner at PITTCON", artifactType: "task" } },
      ],
      signals: [
        { id: "s-freeze", label: "Hiring plateau", value: "Headcount flat 6 quarters", contribution: +3, source: "web", detail: "42 employees since Q1 2025 — growth appetite cooling while expansion capex runs." },
        { id: "s-capital", label: "Capital drought", value: "Bootstrapped 20 yrs; expansion self-funded", contribution: +2, source: "web", detail: "No outside capital ever; the lab expansion is straining a conservative balance sheet." },
        { id: "s-age", label: "Succession pressure", value: "Owner 57, partner already exited", contribution: +2, source: "crm", detail: "Bought out his co-founder in 2019 — he's seen one partner take chips off the table." },
        { id: "s-web", label: "Quiet in a consolidating vertical", value: "3 LIMS peers acquired since 2024", contribution: +1, source: "web", detail: "We already own one adjacent lab-software asset — clear portfolio overlap." },
      ],
      activity: [
        { date: "2024-05-20", rep: "Priya Raman", type: "email", direction: "out", subject: "[E1] - Acquisition interest in Solenta from Fluent", sentiment: "none", note: "Intro email. No reply." },
        { date: "2024-09-10", rep: "Priya Raman", type: "call", direction: "out", subject: "C1 - First live contact", sentiment: "neutral", note: "Polite, unhurried: 'Not now. Try me next year.'" },
        { date: "2025-09-16", rep: "Priya Raman", type: "email", direction: "out", subject: "[Out] Checking in — as promised, one year later", sentiment: "neutral", note: "Kept the commitment to the day." },
        { date: "2025-09-18", rep: "Priya Raman", type: "email", direction: "in", subject: "[In] Re: Checking in — as promised", sentiment: "neutral", note: "Replied in 2 days. 'Ask me again next year — I mean it this time.'",
          body: "Priya,\n\nAppreciate you remembering — most don't.\n\nStill heads-down on the lab expansion, and I won't think about anything else until it's commissioned.\n\nAsk me again next year. I mean it this time.\n\nDev" },
        { date: "2026-04-02", rep: "Priya Raman", type: "email", direction: "out", subject: "[Out] Saw the expansion announcement", sentiment: "none", note: "Congratulations note on the expansion press release. No reply." },
      ],
      details: {
        leadOwner: "Priya Raman", accountOwner: "Priya Raman", industry: "Lab Informatics", yearEstablished: 2006,
        domain: "solentalabs.com", employees: 42, firstEmailDate: "2024-05-20", responded: "Yes", interest: "Tier 2",
        responseType: "Deferred — 'next year'", ndaIssued: "No", stage: "Nurture",
        address: "Madison, WI, USA", recurringRevenue: "$6.7M ARR", revenues: "$7.8M",
        nextSteps: "September check-in — on the anniversary, per his own words",
        exclusivity: { status: "None", challengeStatus: "None" },
        scraping: {
          employeeCountBest: 44, revenueBestUsd: "$8,100,000", fundingStatus: "bootstrapped_likely",
          hqCity: "Madison", hqCountry: "US", successionScore: 61, acquisitionFitScore: 76, acquisitionFitBand: "high",
          foundedYear: 2006, llmIsVms: "yes", llmVertical: "lab_informatics", llmSubVertical: "LIMS for water & environmental testing",
          llmTargetCustomer: "water utilities and environmental testing labs", matchConfidence: 100,
          revenueModel: "SaaS / Subscription", llmRevenueModel: "saas_subscription",
          llmProductSummary: "Solenta provides sample tracking, compliance reporting, and instrument integration for testing labs.", llmConfidence: 84,
        },
        systemInfo: { createdBy: "Priya Raman", createdDate: "2024-05-20", lastModifiedBy: "Priya Raman", lastModifiedDate: "2026-04-02" },
        ownerHistory: [],
        opportunities: [],
        notes: [{ title: "'Ask me next year — I mean it' email", date: "2025-09-18" }],
      },
      cachedAnalysis: {
        likelihoodNarrative:
          "Solenta scores 52 — a nurture asset approaching its window. Dev has deflected twice but replied both times, in writing, with a specific re-entry date he set himself. The expansion that's consuming him finishes this year, headcount has been flat six quarters, and he's 57 in a consolidating vertical. The score rises the day the expansion is commissioned.",
        relationshipRead: {
          summary: "Five touches over two years with a 100% response rate when contacted live or on his anniversary — rare discipline for a deflector. He rewards kept promises: the one-year-to-the-day check-in earned a 2-day reply.",
          touchVolume: "5 touches / 1 rep / 2 years — 1 inbound, replies only on his terms",
          sentimentArc: "Silent → politely deferred (2024) → warmer deferral with a self-set date (2025) → quiet during expansion",
          wentColdWhen: "Never cold — dormant by his own design",
          wentColdWhy: "N/A — he set the cadence and honors it",
          ownerMood: "In control and testing for reliability. 'Most don't remember' was the tell — he's keeping score of who keeps their word.",
        },
        archetype: {
          label: "Polite Deflector (date-setter)",
          description: "Precise, promise-keeping, allergic to pressure. Deflects with dates instead of no's — and remembers who honors them.",
          whatToExpect:
            "Expect nothing before the expansion is commissioned, then a real conversation if — and only if — we show up exactly when he said. Off-cycle pushes reset his trust clock. When he engages, expect diligence-grade questions about our other lab-software asset before any numbers.",
          nextBehavior: "Finishes the expansion, then quietly evaluates whether the last five years of grind is what he wants the next five to look like. The September check-in lands in exactly that window.",
          flashpoints: ["Contacting him off-cycle 'just to check in'", "Price talk before he opens the door", "Treating his deferrals as brush-offs"],
          dealTwin: "Mirrors our nurture pattern: date-setting deflectors converted at high rates when the follow-up landed on their date, from the same person, referencing their words — and near zero when chased off-cycle.",
        },
        revivalRadar: null,
        recommendedAction: {
          title: "September note, to the day — his words, his date",
          rationale: "The single highest-leverage move with a date-setter is keeping the date. Draft it now, schedule it for September 16, reference the commissioned expansion.",
          artifactType: "email",
          artifact:
            "Subject: One year later — as instructed\n\nDev,\n\nYou said ask again next year and that you meant it this time — so here I am, same date, same question, no pressure.\n\nCongratulations on commissioning the expansion. That's the project done that you said had to come first. If the next five years are a conversation you're ready to have, I'd start it however you prefer — a call, or dinner when you're at PITTCON.\n\nAnd if the answer is 'next year' again, I'll be here on September 16th.\n\nPriya",
        },
      },
    },

    // ───────────────────── Old-school seller ─────────────────────
    {
      id: "hartline",
      company: "Hartline Foundry Systems",
      vertical: "ERP for metal casting & foundry shops",
      location: "Erie, PA",
      brand: { color: "#e26e64", color2: "#8e2a20", initials: "HF" },
      stage: "Early — relationship building",
      owner: {
        name: "Walt Hartline",
        title: "Founder & President",
        age: 68,
        tenure: 34,
        profile: "Doesn't do email beyond forwarding jokes. Deals happen at his shop or not at all. Twice told reps 'come see me if you're serious.'",
      },
      financials: { revenue: 3.6, ebitdaMargin: 21, arrPct: 40, employees: 22, note: "Heavy license+maintenance mix; sticky 200-shop install base" },
      scores: { likelihood: 42, close: 20 },
      blockers: [
        { id: "b1", closeWeight: 7, label: "No face-to-face yet — his stated requirement", status: "blocked", detail: "Walt has said twice: 'come see me if you're serious.' Everything else is noise to him.", action: { id: "act-erie", label: "Book Erie visit — shop tour + lunch, no deck, no NDA talk", artifactType: "task" } },
        { id: "b2", closeWeight: 3, label: "Low ARR mix (40%)", status: "pending", detail: "License-heavy model needs a conversion thesis before any internal case.", action: { id: "act-arr", label: "Draft maintenance→subscription conversion model", artifactType: "memo" } },
      ],
      signals: [
        { id: "s-age", label: "Succession pressure", value: "Owner 68, 34 yrs, no succession plan", contribution: +3, source: "crm", detail: "No family in business, no bench. The actuarial clock is the catalyst here." },
        { id: "s-quiet", label: "Quiet company in our roll-up vertical", value: "2 foundry-ERP peers acquired in 18 months", contribution: +2, source: "web", detail: "We own two adjacent metal-shop software assets — clear portfolio overlap." },
        { id: "s-web", label: "Zero digital footprint change", value: "Website unchanged since 2019", contribution: 0, source: "web", detail: "No signals either way — this one only moves in person." },
      ],
      activity: [
        { date: "2024-10-03", rep: "Marcus Lee", type: "call", direction: "out", subject: "C1 - Cold call", sentiment: "neutral", note: "Walt answered: 'Not interested in phone salesmen. Come see me if you're serious.'" },
        { date: "2025-06-17", rep: "Marcus Lee", type: "email", direction: "out", subject: "[E1] - Intro letter", sentiment: "none", note: "Sent intro letter. Office confirmed receipt. No reply." },
        { date: "2026-04-22", rep: "Priya Raman", type: "call", direction: "out", subject: "C2 - Second contact", sentiment: "neutral", note: "Second 'come see me' — 'You're the third outfit to call this year. Nobody's shown up yet.'" },
      ],
      details: {
        leadOwner: "Priya Raman", accountOwner: "Kevin Jay", industry: "Manufacturing Software", yearEstablished: 1992,
        domain: "hartlinefoundry.com", employees: 22, firstEmailDate: "2025-06-17", responded: "Yes", interest: "Tier 2",
        responseType: "Conditional — in person only", ndaIssued: "No", stage: "Relationship Building",
        address: "Erie, PA, USA", recurringRevenue: "$1.4M maintenance", revenues: "$3.6M",
        nextSteps: "Erie shop visit — no deck, no paper",
        exclusivity: { status: "None", challengeStatus: "None" },
        scraping: {
          employeeCountBest: 24, revenueBestUsd: "$3,900,000", fundingStatus: "bootstrapped_likely",
          hqCity: "Erie", hqCountry: "US", successionScore: 91, acquisitionFitScore: 58, acquisitionFitBand: "medium",
          foundedYear: 1992, llmIsVms: "yes", llmVertical: "manufacturing", llmSubVertical: "ERP for metal casting & foundries",
          llmTargetCustomer: "small metal casting shops & foundries", matchConfidence: 100,
          revenueModel: "License + Maintenance", llmRevenueModel: "license_maintenance",
          llmProductSummary: "Hartline provides job costing, scheduling, and quality ERP for foundries.", llmConfidence: 74,
        },
        systemInfo: { createdBy: "Marcus Lee", createdDate: "2024-10-03", lastModifiedBy: "Priya Raman", lastModifiedDate: "2026-04-22" },
        ownerHistory: [{ date: "2026-01-10", field: "Lead Owner", from: "Marcus Lee", to: "Priya Raman" }],
        opportunities: [],
        notes: [{ title: "'Come see me' — call notes x2", date: "2026-04-22" }],
      },
      cachedAnalysis: {
        likelihoodNarrative:
          "Hartline scores 47 — low not because Walt won't sell, but because nobody has done the one thing he asked for. He's 68 with no successor in a vertical we're actively rolling up; the likelihood is latent, gated entirely on a wheels-down visit.",
        relationshipRead: {
          summary: "Three touches in two years, and the read is unusually clear: Walt has told us the playbook twice. 'Come see me if you're serious' is not a brush-off from a man like this — it's an instruction.",
          touchVolume: "3 touches / 2 reps / 21 months — 0 inbound",
          sentimentArc: "Gruff-neutral, consistent. No deterioration — he's waiting, not hiding.",
          wentColdWhen: "Never warmed — never engaged on his terms",
          wentColdWhy: "We've only used channels he's explicitly rejected.",
          ownerMood: "Testing. He's counting who calls versus who shows up. 'Third outfit this year, nobody's shown up' is a scoreboard.",
        },
        archetype: {
          label: "Old-School Operator",
          description: "Handshake culture, phone-averse, judges buyers by whether they'll sit in his shop and talk castings.",
          whatToExpect:
            "Expect nothing by phone or email — ever. In person, expect a slow first meeting that's 80% about the industry and his people, 0% about price. A deal here is 2–3 visits before numbers, then fast once he decides he trusts you.",
          nextBehavior: "He'll keep tallying phone calls from acquirers and open the door to the first credible one who shows up twice.",
          flashpoints: ["Opening with valuation", "Sending juniors", "NDA-first process formality"],
          dealTwin: "Mirrors the old-school-seller pattern: every close involved office visits and meals before any paper. A face-to-face visit wins these — email sequences never have.",
        },
        revivalRadar: null,
        recommendedAction: {
          title: "Erie shop visit — no deck, no paper",
          rationale: "He has literally told us the winning move twice. Cost: one day. It also front-runs the two other 'outfits' still dialing.",
          artifactType: "task",
          artifact: "Book Erie trip week of Aug 11. Format: shop tour + lunch at his pick. Bring: nothing. Talk: castings, his 200 shops, our two metal-shop platforms and how their teams fared. Do not raise price, NDA, or process.",
        },
      },
    },

    // ───────────────────── Fresh cold target ─────────────────────
    {
      id: "plexa",
      company: "Plexa Marina Management",
      vertical: "Marina & boatyard management SaaS",
      location: "Annapolis, MD",
      brand: { color: "#5867e8", color2: "#1f2b8e", initials: "PX" },
      stage: "New — no outreach yet",
      owner: {
        name: "Jess Okafor",
        title: "Co-founder & CEO",
        age: 45,
        tenure: 9,
        profile: "Ex-yacht-broker turned SaaS founder. Bootstrapped, growing, no known exit intent. Fresh add to the map.",
      },
      financials: { revenue: 2.4, ebitdaMargin: 12, arrPct: 95, employees: 18, note: "Est. from web signals; growing ~20% — likely too early" },
      scores: { likelihood: 28, close: 10 },
      blockers: [
        { id: "b1", closeWeight: 3, label: "No relationship exists", status: "pending", detail: "Zero touches. Long game: be known before she's ready.", action: { id: "act-intro", label: "Send founder-to-operator intro (no deal talk) + conference meet", artifactType: "email" } },
      ],
      signals: [
        { id: "s-funding", label: "Capital drought", value: "No outside capital ever raised", contribution: +2, source: "web", detail: "Bootstrapped 9 years — no investor exit pressure, but also no war chest as competitors raise." },
        { id: "s-growth", label: "Still growing", value: "~20% growth, hiring", contribution: -1, source: "web", detail: "Founders rarely sell into their growth curve at 45." },
      ],
      activity: [],
      details: {
        leadOwner: "Dana Whitfield", accountOwner: "Dana Whitfield", industry: "Marine Software", yearEstablished: 2017,
        domain: "plexamarina.com", employees: 18, firstEmailDate: null, responded: "No contact yet", interest: "Tier 3",
        responseType: null, ndaIssued: "No", stage: "New — Unworked",
        address: "Annapolis, MD, USA", recurringRevenue: "$2.3M ARR (est.)", revenues: "$2.4M (est.)",
        nextSteps: "Founder-to-operator intro, no deal talk",
        exclusivity: { status: "None", challengeStatus: "None" },
        scraping: {
          employeeCountBest: 19, revenueBestUsd: "$2,600,000", fundingStatus: "bootstrapped_likely",
          hqCity: "Annapolis", hqCountry: "US", successionScore: 9, acquisitionFitScore: 44, acquisitionFitBand: "medium",
          foundedYear: 2017, llmIsVms: "yes", llmVertical: "marine", llmSubVertical: "marina & boatyard management",
          llmTargetCustomer: "marinas, boatyards, yacht clubs", matchConfidence: 100,
          revenueModel: "SaaS / Subscription", llmRevenueModel: "saas_subscription",
          llmProductSummary: "Plexa provides slip management, billing, and service scheduling for marinas.", llmConfidence: 71,
        },
        systemInfo: { createdBy: "Dana Whitfield", createdDate: "2026-07-02", lastModifiedBy: "Dana Whitfield", lastModifiedDate: "2026-07-02" },
        ownerHistory: [],
        opportunities: [],
        notes: [],
      },
      cachedAnalysis: {
        likelihoodNarrative:
          "Plexa scores 29 — a seed, not a deal. Growing, bootstrapped, founder mid-career. The play is to be the acquirer she already knows in 3–4 years when the curve flattens or life intervenes.",
        relationshipRead: {
          summary: "No history — blank slate. That's an asset: no bad process to live down.",
          touchVolume: "0 touches",
          sentimentArc: "N/A",
          wentColdWhen: "N/A",
          wentColdWhy: "N/A",
          ownerMood: "Unknown. Web signals suggest heads-down operator energy.",
        },
        archetype: {
          label: "Cold / Pre-intent Founder",
          description: "Growing bootstrapper with no visible exit intent. Classification is provisional until first contact.",
          whatToExpect: "Expect a polite deflection to any deal-shaped outreach. Relationship-first contact (operator content, conference coffee) keeps the door open without spending credibility.",
          nextBehavior: "Keeps building. Watch for: senior hires leaving, growth deceleration, first institutional capital talk — any of these starts her clock.",
          flashpoints: ["Deal-shaped first touch", "Valuation talk of any kind"],
          dealTwin: "Mirrors our nurture pattern: cold vertical founders we met 3+ years before intent closed at above-average rates because we were the known quantity when the moment came.",
        },
        revivalRadar: null,
        recommendedAction: {
          title: "Founder-to-operator intro — no deal talk",
          rationale: "Cheapest option value on the board: one warm email and a conference coffee now buys first-call position years from now.",
          artifactType: "email",
          artifact:
            "Subject: Marina software — from someone who collects vertical SaaS stories\n\nJess,\n\nI lead acquisitions at Fluent — we own and grow niche software companies (we never flip them). Not writing to pitch anything: Plexa keeps coming up when marina operators talk software, and I just wanted to know the person behind it.\n\nIf you're at Dockside Expo in September, coffee's on me. I'm a good source of war stories on scaling vertical SaaS, if nothing else.\n\nKevin",
        },
      },
    },
  ];
}
