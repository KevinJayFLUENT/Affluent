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
  ];
}
