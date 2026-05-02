import {
  generateTestId, generateVariantId, generateIterationBatchId,
} from "./id-system";

/**
 * Seeds a newly created project with LeadFlow AI demo data.
 * @param projectId  - storage key returned by createProject() (e.g. "proj-01")
 * @param projectCode - project.code slug used as the test-ID prefix (e.g. "leadflow-ai")
 *                      MUST be the same value activeProjectCode returns for this project.
 */
export function seedDemoProject(projectId: string, projectCode: string): void {
  const k = (suffix: string) => `clb:p:${projectId}:${suffix}`;
  const set = (suffix: string, value: unknown) =>
    localStorage.setItem(k(suffix), JSON.stringify(value));

  // ── Market Intel — Market Form ──────────────────────────────────────────────
  set("market:form", {
    product:  "LeadFlow AI",
    audience: "B2B SaaS founders and revenue leaders",
    pain:     "Manually qualifying leads and wasting hours on low-intent prospects",
    outcome:  "An automated pipeline that delivers sales-ready, high-intent leads every morning",
    existing: "Clay, Apollo.io, HubSpot manual workflows",
  });

  // ── Market Intel — Angles ───────────────────────────────────────────────────
  set("market:angles", [
    { type: "Mechanism Angle",      color: "#6366f1", angle: "The real reason B2B SaaS founders can't scale pipeline isn't headcount — it's that Apollo and Clay were never built to capture real-time buying intent. LeadFlow AI changes the equation." },
    { type: "Fear Angle",           color: "#ef4444", angle: "Every day your sales team relies on manual enrichment, a competitor reaches the same in-market account first. LeadFlow AI is built for the transition that's already happening." },
    { type: "Status Angle",         color: "#f59e0b", angle: "Top-performing revenue leaders have stopped using manual Clay workflows. They use LeadFlow AI to wake up to a ranked list of warm, in-market accounts — and it shows in their pipeline." },
    { type: "Contrarian Angle",     color: "#8b5cf6", angle: "Stop trying to fix unqualified leads with more outreach volume. The entire conventional approach is broken — and LeadFlow AI proves it." },
    { type: "Transformation Angle", color: "#10b981", angle: "From spending 15 hours weekly on prospect research to waking up with a ready-to-contact list of in-market buyers: this is how LeadFlow AI is changing pipeline generation for B2B SaaS teams." },
  ]);

  set("market:angleGenerated", true);

  // ── Market Intel — Avatar ───────────────────────────────────────────────────
  set("market:avatar", {
    audience:        "B2B SaaS founders and revenue leaders (28–45) running teams of 5–50",
    problem:         "Spending 60% of sales capacity chasing cold, unqualified leads that never convert",
    currentSolution: "Manual Clay enrichment, Apollo sequences, and cold outreach sprays",
    emotionalState:  "Frustrated",
    awareness:       "Solution Aware",
    identity:        "A revenue-obsessed operator who wants to scale pipeline without growing headcount",
    fear:            "Hiring a larger SDR team and still missing quota because the underlying lead quality problem isn't fixed",
    outcome:         "A self-filling pipeline of warm, intent-signalled leads that are ready to buy — delivered every morning",
  });

  // ── Market Intel — Avatar Strategy ─────────────────────────────────────────
  set("market:avatarStrategy", {
    angle:                "Fear + Relief",
    angleExplanation:     "Your audience has tried multiple solutions and grown sceptical. They're still searching because the pain is severe enough. Fear of continued failure — paired with relief from finally finding something that actually works — is the most powerful emotional lever for Solution Aware buyers.",
    primaryEmotion:       "Frustrated",
    secondaryEmotion:     "Hopeful",
    primaryEmotionNote:   "They're exhausted by tools that over-promise and under-deliver on lead quality.",
    secondaryEmotionNote: "A part of them still believes the right system could change everything — they just need proof.",
    hooks: [
      { label: "Question Hook",  icon: "Zap", color: "#8b5cf6", text: "How many qualified leads are you losing because your team reached out 3 days too late?" },
      { label: "Negative Hook",  icon: "Zap", color: "#ef4444", text: "Your competitors are closing deals you don't even know are available — because they know who's in-market right now." },
      { label: "Statistic Hook", icon: "Zap", color: "#6366f1", text: "68% of B2B deals go to the vendor that reaches out first at the moment of peak buying intent." },
    ],
    formats: [
      { label: "UGC",              icon: "User",      note: "Founder or operator testimonial. Builds authenticity for a sceptical, solution-aware audience." },
      { label: "Talking Head",     icon: "Video",     note: "Direct address from a founder or sales leader. High trust signal, ideal for high-ticket SaaS." },
      { label: "Screen Recording", icon: "Megaphone", note: "Live product demo showing intent signals in action. Fastest format to convert solution-aware buyers." },
    ],
  });

  // ── Market Intel — Pain Rows ────────────────────────────────────────────────
  set("market:painRows", [
    { id: "lf-p1", pain: "Sales reps waste 3+ hours daily on prospect research and list building",      emotion: "Frustration",       failed: "Clay + manual enrichment, research VAs, offshore teams",             opportunity: "AI-driven intent signal capture that auto-qualifies before human touch",              source: "Sales call"         },
    { id: "lf-p2", pain: "High lead volume but conversion sits under 2% — most prospects aren't ready", emotion: "Financial anxiety",  failed: "More outreach volume, A/B tested sequences, additional SDRs",       opportunity: "Prioritisation layer that scores leads on real buying intent — not demographic fit", source: "Customer interview" },
    { id: "lf-p3", pain: "CRM is polluted with stale data, dead contacts, and companies that churned",  emotion: "Overwhelm",         failed: "ZoomInfo refresh, manual data hygiene, virtual assistants",          opportunity: "Continuous enrichment loop that keeps pipeline data accurate automatically",          source: "Support ticket"     },
    { id: "lf-p4", pain: "No way to know which accounts are actually in-market and evaluating now",     emotion: "Uncertainty",       failed: "Bombora intent data, G2 review monitoring, LinkedIn stalking",       opportunity: "Real-time buying signal aggregator mapped directly to ICP criteria",                  source: "Reddit"             },
    { id: "lf-p5", pain: "Outreach timing is always wrong — too early when they're not ready, or late", emotion: "Self-doubt",        failed: "Sales engagement tools, trigger-based drip sequences",               opportunity: "Timing engine that fires outreach at the exact moment of peak buying intent",         source: "Review site"        },
    { id: "lf-p6", pain: "Can't tell which rep activities drive pipeline vs. which are just busy work",  emotion: "Frustration",       failed: "Salesforce dashboards, activity tracking, weekly forecast calls",     opportunity: "Pipeline attribution layer that links rep actions to closed revenue",                  source: "Customer interview" },
  ]);

  // ── Market Intel — VOC Quotes ───────────────────────────────────────────────
  set("market:vocQuotes", [
    { id: "lf-v1", quote: "I'm paying for 10 sales tools and still starting from zero every single month.",                                   tag: "Pain",       source: "Reddit"    },
    { id: "lf-v2", quote: "I don't need more leads. I need leads that actually want to talk to us right now.",                                  tag: "JTBD",       source: "Interview" },
    { id: "lf-v3", quote: "Our SDR team is burning out chasing accounts that will never convert. Morale is at an all-time low.",               tag: "Pain",       source: "Comment"   },
    { id: "lf-v4", quote: "If we could just know who's ready to buy right now, we'd 10x our close rate with the same team.",                   tag: "Desire",     source: "Interview" },
    { id: "lf-v5", quote: "We've tried everything. The problem isn't tools or volume — it's timing and intent.",                               tag: "Objection",  source: "Review"    },
    { id: "lf-v6", quote: "I genuinely don't believe any AI tool can understand real buying intent. Prove me wrong.",                          tag: "Skepticism",  source: "Reddit"    },
    { id: "lf-v7", quote: "I want my team spending 100% of their time closing, not qualifying or researching.",                                 tag: "JTBD",       source: "Interview" },
    { id: "lf-v8", quote: "Every quarter it's the same story: great activity numbers, terrible conversion. Something upstream is broken.",      tag: "Pain",       source: "Comment"   },
  ]);

  // ── Competitor Intelligence ──────────────────────────────────────────────────
  set("competitors:rows", [
    {
      id: "lf-c1", brand: "Clay", adLink: "https://www.facebook.com/ads/library",
      hookType: "Question Hook", angle: "Ease of Use", format: "Screen Recording",
      emotion: "Relief", cta: "Start Free", longevity: "30–90 days",
      notes: "Opens with 'What if you could build your entire prospect list in 5 minutes?' — Targets time-poor operators. Strong visual of the product working live. Converts well because it addresses the pain before revealing the solution.",
      screenshot: "", insight: "Question hook + live screen demo is their highest-performing combination. Test this format first.", testHook: "Curiosity Hook", testAngle: "Time Saving", testFormat: "Screen Recording",
    },
    {
      id: "lf-c2", brand: "Apollo.io", adLink: "https://www.facebook.com/ads/library",
      hookType: "Statistic Hook", angle: "Cost Reduction", format: "Text on Screen",
      emotion: "FOMO", cta: "Try Free", longevity: "7–30 days",
      notes: "'500M+ contacts. Zero manual research.' Hard product claim hook with a cost reduction angle. Simple text animation — low production cost, high recall.",
      screenshot: "", insight: "Raw statistic as the first line of copy is their most durable hook format. Test a competing stat about intent accuracy.", testHook: "Statistic Hook", testAngle: "Mechanism Reveal", testFormat: "Text on Screen",
    },
    {
      id: "lf-c3", brand: "Salesforce", adLink: "https://www.facebook.com/ads/library",
      hookType: "Authority Hook", angle: "Social Proof", format: "Studio Ad",
      emotion: "Aspiration", cta: "Book a Demo", longevity: "90+ days",
      notes: "Enterprise case study format — logo wall, exec testimonial, revenue outcome. Credibility-led, not product-led. High production value signals enterprise positioning.",
      screenshot: "", insight: "Their longest-running ads all use customer outcome statistics in the first 3 seconds. Borrow this structure but with a tighter hook.", testHook: "Authority Hook", testAngle: "Social Proof", testFormat: "UGC",
    },
    {
      id: "lf-c4", brand: "HubSpot", adLink: "https://www.facebook.com/ads/library",
      hookType: "Curiosity Hook", angle: "Transformation Story", format: "UGC",
      emotion: "Hope", cta: "Get Started Free", longevity: "30–90 days",
      notes: "Founder-style UGC showing chaotic vs. organised pipeline. Before/after story arc drives high watch time. Relatable tone removes sales resistance.",
      screenshot: "", insight: "Their UGC ads consistently outperform polished studio content by 2x on engagement. Consider a raw operator testimonial as a test.", testHook: "Question Hook", testAngle: "Transformation Story", testFormat: "UGC",
    },
    {
      id: "lf-c5", brand: "Outreach.io", adLink: "https://www.facebook.com/ads/library",
      hookType: "Negative Hook", angle: "Fear + Relief", format: "Talking Head",
      emotion: "Fear", cta: "See How It Works", longevity: "7–30 days",
      notes: "'Stop letting hot leads go cold.' Opens with fear of lost revenue then pivots to the product as immediate relief. Fast paced, high energy delivery.",
      screenshot: "", insight: "Negative hook + fear angle drives strong initial TSR but moderate hold. Pair with a stronger mechanism reveal to maintain watch time.", testHook: "Negative Hook", testAngle: "Fear + Relief", testFormat: "Talking Head",
    },
    {
      id: "lf-c6", brand: "ZoomInfo", adLink: "https://www.facebook.com/ads/library",
      hookType: "Statistic Hook", angle: "Mechanism Reveal", format: "Native TikTok Style",
      emotion: "FOMO", cta: "Start Free Trial", longevity: "30–90 days",
      notes: "Data-first hook revealing an intelligence gap competitors can't see. Lo-fi, native TikTok format reduces ad resistance for technical buyers. Works especially well for mid-funnel retargeting.",
      screenshot: "", insight: "Mechanism reveal angle with a native-style format is their most differentiated creative. Test a screen-recording version to verify format vs. angle contribution.", testHook: "Curiosity Hook", testAngle: "Mechanism Reveal", testFormat: "Screen Recording",
    },
  ]);

  // ── Script Matrix ───────────────────────────────────────────────────────────
  set("script:hooks", [
    { type: "Question Hook",  text: "How many qualified leads are you losing right now because your team reached out 3 days too late?" },
    { type: "Negative Hook",  text: "Your competitors are closing deals you don't even know are available — because they know who's in-market and you don't." },
    { type: "Statistic Hook", text: "68% of B2B deals go to the first vendor to reach out at the exact moment of peak buying intent. Most teams miss that window every single time." },
  ]);

  set("script:bodies", [
    {
      type: "Problem → Solution",
      text: "Most sales teams are working from a static list, not a live signal. They dial in the dark, burn through contacts, and wonder why conversion sits under 3%.\n\nLeadFlow AI changes the equation. We aggregate intent signals across 40+ data sources — job changes, funding rounds, tech stack switches, content engagement — and surface only the accounts that are actively in-market right now.\n\nYour reps stop guessing. They start closing.",
    },
    {
      type: "Mechanism Reveal",
      text: "Here's what nobody tells you about lead generation: the problem isn't volume. It's timing.\n\nLeadFlow AI's intent engine scores every account in your ICP in real time. When a buying signal fires — a VP searches your category, a champion changes jobs, a competitor contract expires — your team gets the alert instantly. Not next week. Now.\n\nYou show up at the right moment, every time.",
    },
    {
      type: "Transformation Story",
      text: "Six months ago, our sales team was spending 15 hours a week just researching accounts and building lists. Today, LeadFlow AI does that overnight.\n\nWe wake up every morning with a ranked list of in-market prospects — pre-enriched, intent-scored, and ready to contact. We closed 40% more deals in Q3 with the exact same headcount.",
    },
  ]);

  set("script:ctas", [
    { type: "Direct Response", text: "See your first batch of in-market leads in 48 hours. Start your free trial at leadflowai.com — link in bio." },
    { type: "Soft CTA",        text: "Drop a comment below or click the link to see how LeadFlow AI works for your specific ICP and market." },
    { type: "Demo CTA",        text: "Book a 15-minute live demo. We'll show you real intent signals firing on accounts in your market — right now, not a recording." },
  ]);

  // ── Creative Lab — Experiments ──────────────────────────────────────────────
  const now = Date.now();
  const ago = (days: number) => now - 86400000 * days;
  const tl = (entries: { date: string; tsr: number; hold: number; ctr: number; cpa: number }[]) =>
    entries.map((e, i) => ({ id: `tl-${e.date}-${i}`, ...e, createdAt: now }));

  // ─── T01 — Meta — Mechanism Reveal — Full Iteration Journey ─────────────────
  // 7 scripts → 5 hooks → 3 formats → 3 visuals → 2 CTAs (all complete, scaled)
  // Angle: Mechanism Reveal / "The Intent Gap"
  const T1   = generateTestId(projectCode, 1);
  const c1s1 = generateVariantId(T1, "S", 1);       // Loser
  const c1s2 = generateVariantId(T1, "S", 2);       // Loser
  const c1s3 = generateVariantId(T1, "S", 3);       // WINNER → iteration root
  const c1s4 = generateVariantId(T1, "S", 4);       // Loser
  const c1s5 = generateVariantId(T1, "S", 5);       // Loser
  const c1s6 = generateVariantId(T1, "S", 6);       // Loser
  const c1s7 = generateVariantId(T1, "S", 7);       // Loser
  // 5 hooks — base = winning script c1s3
  const c1h1 = generateVariantId(c1s3, "H", 1);     // Loser
  const c1h2 = generateVariantId(c1s3, "H", 2);     // Loser
  const c1h3 = generateVariantId(c1s3, "H", 3);     // WINNER
  const c1h4 = generateVariantId(c1s3, "H", 4);     // Loser
  const c1h5 = generateVariantId(c1s3, "H", 5);     // Loser
  // 3 formats — base = c1s3, parent = winning hook c1h3
  const c1f1 = generateVariantId(c1s3, "F", 1);     // Loser
  const c1f2 = generateVariantId(c1s3, "F", 2);     // WINNER
  const c1f3 = generateVariantId(c1s3, "F", 3);     // Loser
  // 3 visuals — base = c1s3, parent = winning format c1f2
  const c1v1 = generateVariantId(c1s3, "V", 1);     // Loser
  const c1v2 = generateVariantId(c1s3, "V", 2);     // WINNER
  const c1v3 = generateVariantId(c1s3, "V", 3);     // Loser
  // 2 CTAs — base = c1s3, parent = winning visual c1v2
  const c1c1 = generateVariantId(c1s3, "C", 1);     // Loser
  const c1c2 = generateVariantId(c1s3, "C", 2);     // WINNER
  // Iteration batch IDs
  const b1H  = generateIterationBatchId(c1s3, "H");
  const b1F  = generateIterationBatchId(c1s3, "F");
  const b1V  = generateIterationBatchId(c1s3, "V");
  const b1C  = generateIterationBatchId(c1s3, "C");

  // ─── T02 — LinkedIn — Transformation Story — Script Exploration Only ─────────
  // 6 scripts, no iteration started. 2 early losers, 4 still testing.
  const T2   = generateTestId(projectCode, 2);
  const c2s1 = generateVariantId(T2, "S", 1);       // Loser (poor TSR, stopped early)
  const c2s2 = generateVariantId(T2, "S", 2);       // Testing
  const c2s3 = generateVariantId(T2, "S", 3);       // Loser (poor hold rate, stopped)
  const c2s4 = generateVariantId(T2, "S", 4);       // Testing
  const c2s5 = generateVariantId(T2, "S", 5);       // Testing (leading)
  const c2s6 = generateVariantId(T2, "S", 6);       // Testing

  // ─── T03 — TikTok — Mechanism Reveal — Hook Iteration Only ──────────────────
  // 5 scripts → winner picked → 5 hooks tested → winner declared, no further iteration
  const T3   = generateTestId(projectCode, 3);
  const c3s1 = generateVariantId(T3, "S", 1);       // Loser
  const c3s2 = generateVariantId(T3, "S", 2);       // WINNER → hook iteration root
  const c3s3 = generateVariantId(T3, "S", 3);       // Loser
  const c3s4 = generateVariantId(T3, "S", 4);       // Loser
  const c3s5 = generateVariantId(T3, "S", 5);       // Loser
  // 5 hooks — base = winning script c3s2
  const c3h1 = generateVariantId(c3s2, "H", 1);     // Loser
  const c3h2 = generateVariantId(c3s2, "H", 2);     // Loser
  const c3h3 = generateVariantId(c3s2, "H", 3);     // Loser
  const c3h4 = generateVariantId(c3s2, "H", 4);     // WINNER
  const c3h5 = generateVariantId(c3s2, "H", 5);     // Loser
  const b3H  = generateIterationBatchId(c3s2, "H");

  // ─── T04 — Meta — Social Proof — Format Test (currently running) ─────────────
  // 5 scripts → winner picked → 3 formats, still testing (no winner yet)
  const T4   = generateTestId(projectCode, 4);
  const c4s1 = generateVariantId(T4, "S", 1);       // Loser
  const c4s2 = generateVariantId(T4, "S", 2);       // Loser
  const c4s3 = generateVariantId(T4, "S", 3);       // Loser
  const c4s4 = generateVariantId(T4, "S", 4);       // WINNER → format iteration root
  const c4s5 = generateVariantId(T4, "S", 5);       // Loser
  // 3 formats — base = winning script c4s4
  const c4f1 = generateVariantId(c4s4, "F", 1);     // Testing
  const c4f2 = generateVariantId(c4s4, "F", 2);     // Testing (leading)
  const c4f3 = generateVariantId(c4s4, "F", 3);     // Testing
  const b4F  = generateIterationBatchId(c4s4, "F");

  // ─── SA01 — Meta — Visual Format Test (Static Image wins) ──────────────────
  // 4 format variants, Jan 15–Feb 7. Static Image wins at 3.8% CTR / $44 CPA.
  const SA01  = `${projectCode}-SA01`;
  const sa1v1 = `${SA01}-V1`;   // Static Image — WINNER → iteration root
  const sa1v2 = `${SA01}-V2`;   // Carousel — Loser
  const sa1v3 = `${SA01}-V3`;   // Infographic — Loser
  const sa1v4 = `${SA01}-V4`;   // Split Comparison — Loser

  // ─── SA02 — Hook Iteration on Static Image (Negative Hook wins) ──────────────
  // 5 hook variants, Feb 10–Mar 3. Negative Hook wins at 4.1% CTR / $39 CPA.
  const SA02  = `${projectCode}-SA02`;
  const sa2v1 = `${SA02}-V1`;   // Question Hook — Loser
  const sa2v2 = `${SA02}-V2`;   // Negative Hook — WINNER → iteration root
  const sa2v3 = `${SA02}-V3`;   // Statistic Hook — Loser
  const sa2v4 = `${SA02}-V4`;   // Promise Hook — Loser
  const sa2v5 = `${SA02}-V5`;   // Result-Oriented Hook — Loser

  // ─── SA03 — Angle Test on Negative Hook (Pain Point leading, still running) ──
  // 4 angle variants, Mar 5–Mar 20. Pain Point leading at 3.4% CTR after 15 days.
  const SA03  = `${projectCode}-SA03`;
  const sa3v1 = `${SA03}-V1`;   // Pain Point — Testing (leading)
  const sa3v2 = `${SA03}-V2`;   // Mechanism Reveal — Testing
  const sa3v3 = `${SA03}-V3`;   // Social Proof — Testing
  const sa3v4 = `${SA03}-V4`;   // Fear + Relief — Testing

  // ─── SA04 — Scaling Variation Test (just launched) ──────────────────────────
  // 3 copy/placement variants launched Mar 22, based on SA03 leading direction.
  const SA04  = `${projectCode}-SA04`;
  const sa4v1 = `${SA04}-V1`;   // Tight pain copy — Ready to Test
  const sa4v2 = `${SA04}-V2`;   // Extended narrative — Producing
  const sa4v3 = `${SA04}-V3`;   // LinkedIn placement — Draft

  // Iteration batch IDs for static ad tests
  const bSA1F = `${SA01}-F`;    // SA01 format iteration batch
  const bSA2H = `${sa1v1}-H`;   // SA02 hook iteration (source = SA01 winner)
  const bSA3V = `${sa2v2}-V`;   // SA03 angle iteration (source = SA02 winner)

  // ─── T05 — YouTube — Contrarian — New Angle Script Test (live, 11 days) ──────
  // 6 scripts, different angle (contrarian), no iteration yet
  const T5   = generateTestId(projectCode, 5);
  const c5s1 = generateVariantId(T5, "S", 1);       // Testing
  const c5s2 = generateVariantId(T5, "S", 2);       // Testing
  const c5s3 = generateVariantId(T5, "S", 3);       // Testing (leading)
  const c5s4 = generateVariantId(T5, "S", 4);       // Testing
  const c5s5 = generateVariantId(T5, "S", 5);       // Testing
  const c5s6 = generateVariantId(T5, "S", 6);       // Testing

  set("lab:experiments", [

    // ═══════════════════════════════════════════════════════════════════════════
    // T01 — Meta — Mechanism Reveal — COMPLETE (Script → Hook → Format → Visual → CTA)
    // Timeline: Jan 20 → Feb 4 → Feb 18 → Mar 3 → Mar 14 → scaled Mar 19
    // ═══════════════════════════════════════════════════════════════════════════

    // ── T01 Script test — 7 variants (Jan 20–Feb 3)
    { id: c1s1, variantId: c1s1,
      adVariant: "Curiosity Hook — The Intent Signal Gap",
      hookType: "Curiosity Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s1, testId: T1,
      hookText: "There's a new category of data your competitors are already using to find in-market buyers before you do.",
      bodyText: "It's called real-time intent signal aggregation. LeadFlow AI monitors 40+ sources — job changes, funding rounds, tech stack switches — and surfaces only accounts that are actively in-market right now.",
      ctaText: "Start your free trial — see your first leads in 48 hours.",
      timeline: tl([
        { date: "2026-01-20", tsr: 31, hold: 35, ctr: 1.6, cpa: 213 },
        { date: "2026-01-24", tsr: 29, hold: 33, ctr: 1.5, cpa: 224 },
        { date: "2026-01-28", tsr: 30, hold: 34, ctr: 1.5, cpa: 219 },
      ]) },

    { id: c1s2, variantId: c1s2,
      adVariant: "Question Hook — How Many Deals Did You Miss This Week?",
      hookType: "Question Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s2, testId: T1,
      hookText: "How many qualified B2B deals did your team miss this week because you reached out 3 days too late?",
      bodyText: "Most outreach fails because it's timed to your schedule, not the buyer's intent. LeadFlow AI fires alerts the moment a buying signal appears — so your team shows up first, every time.",
      ctaText: "Start free — first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-01-20", tsr: 34, hold: 38, ctr: 1.9, cpa: 189 },
        { date: "2026-01-24", tsr: 33, hold: 37, ctr: 1.8, cpa: 196 },
        { date: "2026-01-28", tsr: 32, hold: 37, ctr: 1.8, cpa: 201 },
      ]) },

    { id: c1s3, variantId: c1s3,
      adVariant: "Curiosity Hook — Why 78% of B2B Outreach Fails",
      hookType: "Curiosity Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Winner", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s3, testId: T1,
      hookText: "Here's why 78% of B2B outreach is sent to accounts that aren't ready to buy — and how the top 1% of sales teams fix it.",
      bodyText: "The problem isn't your message or your team. It's timing. LeadFlow AI aggregates real-time buying signals across 40+ sources and delivers only the accounts actively in-market right now — pre-enriched, intent-scored, and ready to contact.",
      ctaText: "Start your free trial — see your first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-01-20", tsr: 39, hold: 44, ctr: 2.6, cpa: 138 },
        { date: "2026-01-24", tsr: 41, hold: 46, ctr: 2.8, cpa: 128 },
        { date: "2026-01-28", tsr: 43, hold: 48, ctr: 2.9, cpa: 122 },
        { date: "2026-02-01", tsr: 44, hold: 49, ctr: 3.1, cpa: 115 },
      ]) },

    { id: c1s4, variantId: c1s4,
      adVariant: "Authority Hook — What the Fastest SDR Teams Do Differently",
      hookType: "Authority Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s4, testId: T1,
      hookText: "The highest-performing SDR teams aren't working harder. They're working from a completely different data source.",
      bodyText: "LeadFlow AI surfaces real-time intent signals — accounts that are actively evaluating solutions right now — so your team stops cold calling and starts closing.",
      ctaText: "Start your free trial at leadflowai.com — link in bio.",
      timeline: tl([
        { date: "2026-01-20", tsr: 33, hold: 37, ctr: 1.8, cpa: 207 },
        { date: "2026-01-24", tsr: 31, hold: 35, ctr: 1.6, cpa: 218 },
        { date: "2026-01-28", tsr: 32, hold: 36, ctr: 1.7, cpa: 211 },
      ]) },

    { id: c1s5, variantId: c1s5,
      adVariant: "Negative Hook — Your CRM Is a Graveyard",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s5, testId: T1,
      hookText: "Your CRM isn't a pipeline. It's a graveyard of accounts that were never in-market when you reached out.",
      bodyText: "The fix isn't more data. It's better timing. LeadFlow AI monitors intent signals in real time and alerts your team the second a prospect is actively evaluating — not days or weeks too late.",
      ctaText: "See your first in-market leads in 48 hours — start free.",
      timeline: tl([
        { date: "2026-01-20", tsr: 36, hold: 40, ctr: 2.0, cpa: 178 },
        { date: "2026-01-24", tsr: 34, hold: 39, ctr: 1.9, cpa: 188 },
        { date: "2026-01-28", tsr: 33, hold: 38, ctr: 1.9, cpa: 193 },
      ]) },

    { id: c1s6, variantId: c1s6,
      adVariant: "Statistic Hook — 68% of Deals Go to First Mover",
      hookType: "Statistic Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s6, testId: T1,
      hookText: "68% of B2B deals go to the first vendor to reach out at the moment of peak buying intent. Your team is showing up third.",
      bodyText: "LeadFlow AI tracks intent signals the moment they fire — job changes, tech switches, competitor contract expirations — and puts the right accounts in your team's inbox before anyone else.",
      ctaText: "Start free — be first to reach in-market buyers.",
      timeline: tl([
        { date: "2026-01-20", tsr: 35, hold: 38, ctr: 1.9, cpa: 196 },
        { date: "2026-01-24", tsr: 34, hold: 37, ctr: 1.8, cpa: 204 },
        { date: "2026-01-28", tsr: 33, hold: 36, ctr: 1.7, cpa: 210 },
      ]) },

    { id: c1s7, variantId: c1s7,
      adVariant: "Story Hook — I Used to Spend 4 Hours Building Lists",
      hookType: "Story Hook", primaryAngle: "Transformation Story",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-01-20", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c1s7, testId: T1,
      hookText: "I used to spend the first 4 hours of every Monday building a prospect list. Now I spend those 4 hours closing.",
      bodyText: "LeadFlow AI delivers a ranked list of in-market accounts to my inbox every morning — pre-enriched, intent-scored, and ready to call. Same team, 40% more closed deals in Q3.",
      ctaText: "Start your free trial — see your first leads in 48 hours.",
      timeline: tl([
        { date: "2026-01-20", tsr: 37, hold: 41, ctr: 2.1, cpa: 171 },
        { date: "2026-01-24", tsr: 36, hold: 40, ctr: 2.0, cpa: 179 },
        { date: "2026-01-28", tsr: 35, hold: 39, ctr: 1.9, cpa: 186 },
      ]) },

    // ── T01 Hook test — 5 variants from winning script c1s3 (Feb 4–17)
    { id: c1h1, variantId: c1h1,
      parentVariantId: c1s3, parentId: c1s3, rootId: c1s3,
      adVariant: "Curiosity Hook — The Intent Gap",
      hookType: "Curiosity Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-04", platform: "Meta",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b1H,
      hookText: "Here's why 78% of B2B outreach is sent to accounts that aren't ready to buy — and how the top 1% of sales teams fix it.",
      bodyText: "The problem isn't your message or your team. It's timing. LeadFlow AI delivers only the accounts actively in-market right now — intent-scored and ready to contact.",
      ctaText: "Start your free trial — see your first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-02-04", tsr: 41, hold: 48, ctr: 2.8, cpa: 133 },
        { date: "2026-02-08", tsr: 40, hold: 47, ctr: 2.7, cpa: 139 },
        { date: "2026-02-12", tsr: 39, hold: 46, ctr: 2.6, cpa: 144 },
      ]) },

    { id: c1h2, variantId: c1h2,
      parentVariantId: c1s3, parentId: c1s3, rootId: c1s3,
      adVariant: "Statistic Hook — 78% Fail Rate",
      hookType: "Statistic Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-04", platform: "Meta",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b1H,
      hookText: "78% of B2B outreach lands on accounts that aren't evaluating anything. The remaining 22% close most of the deals.",
      bodyText: "LeadFlow AI puts your team squarely in that 22%. Real-time intent signals surface only the accounts actively in-market — the ones that are ready to buy right now.",
      ctaText: "Start free — first leads in 48 hours.",
      timeline: tl([
        { date: "2026-02-04", tsr: 43, hold: 50, ctr: 3.0, cpa: 121 },
        { date: "2026-02-08", tsr: 42, hold: 49, ctr: 2.9, cpa: 127 },
        { date: "2026-02-12", tsr: 41, hold: 48, ctr: 2.8, cpa: 132 },
      ]) },

    { id: c1h3, variantId: c1h3,
      parentVariantId: c1s3, parentId: c1s3, rootId: c1s3,
      adVariant: "Negative Hook — Your Competitors Are Closing Deals You Can't See",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Winner", startDate: "2026-02-04", platform: "Meta",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b1H,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "LeadFlow AI aggregates real-time buying signals across 40+ sources. When a buying signal fires, your team gets the account instantly — before anyone else reaches out.",
      ctaText: "Stop losing deals — start your free trial today.",
      timeline: tl([
        { date: "2026-02-04", tsr: 51, hold: 59, ctr: 4.0, cpa: 89 },
        { date: "2026-02-08", tsr: 54, hold: 62, ctr: 4.4, cpa: 81 },
        { date: "2026-02-12", tsr: 56, hold: 64, ctr: 4.7, cpa: 76 },
        { date: "2026-02-16", tsr: 57, hold: 65, ctr: 4.9, cpa: 73 },
      ]) },

    { id: c1h4, variantId: c1h4,
      parentVariantId: c1s3, parentId: c1s3, rootId: c1s3,
      adVariant: "Question Hook — How Many In-Market Accounts Did You Miss?",
      hookType: "Question Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-04", platform: "Meta",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b1H,
      hookText: "How many accounts in your ICP are actively evaluating right now — and have no idea you exist?",
      bodyText: "LeadFlow AI tells you exactly who's in-market before they engage with your competitors. Real-time signals from 40+ sources. No more cold calling. No more guessing.",
      ctaText: "Start free — see your first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-02-04", tsr: 44, hold: 51, ctr: 3.2, cpa: 114 },
        { date: "2026-02-08", tsr: 43, hold: 50, ctr: 3.1, cpa: 120 },
        { date: "2026-02-12", tsr: 42, hold: 49, ctr: 3.0, cpa: 125 },
      ]) },

    { id: c1h5, variantId: c1h5,
      parentVariantId: c1s3, parentId: c1s3, rootId: c1s3,
      adVariant: "Story Hook — I Stopped Cold Calling the Day I Found This",
      hookType: "Story Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-04", platform: "Meta",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b1H,
      hookText: "I stopped cold calling the day I found out which accounts were already looking for a solution like ours.",
      bodyText: "LeadFlow AI surfaces real-time intent signals so your team reaches out at the exact moment a prospect is ready. Same message, dramatically different result.",
      ctaText: "Try it free — first leads in 48 hours.",
      timeline: tl([
        { date: "2026-02-04", tsr: 45, hold: 52, ctr: 3.3, cpa: 110 },
        { date: "2026-02-08", tsr: 44, hold: 51, ctr: 3.2, cpa: 116 },
        { date: "2026-02-12", tsr: 43, hold: 50, ctr: 3.1, cpa: 121 },
      ]) },

    // ── T01 Format test — 3 variants from winning hook c1h3 (Feb 18–Mar 2)
    { id: c1f1, variantId: c1f1,
      parentVariantId: c1h3, parentId: c1h3, rootId: c1s3,
      adVariant: "Negative Hook — UGC Format",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-18", platform: "Meta",
      iterationType: "FORMAT", iterationStep: 2, source: "iteration", testId: b1F,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "LeadFlow AI aggregates real-time buying signals across 40+ sources. When a signal fires, your team gets the account — before anyone else.",
      ctaText: "Stop losing deals — start your free trial today.",
      timeline: tl([
        { date: "2026-02-18", tsr: 53, hold: 61, ctr: 4.3, cpa: 86 },
        { date: "2026-02-22", tsr: 52, hold: 60, ctr: 4.2, cpa: 89 },
        { date: "2026-02-26", tsr: 51, hold: 59, ctr: 4.1, cpa: 93 },
      ]) },

    { id: c1f2, variantId: c1f2,
      parentVariantId: c1h3, parentId: c1h3, rootId: c1s3,
      adVariant: "Negative Hook — Screen Recording Format",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "Screen Recording", cta: "Free Trial",
      status: "Winner", startDate: "2026-02-18", platform: "Meta",
      iterationType: "FORMAT", iterationStep: 2, source: "iteration", testId: b1F,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Here's LeadFlow AI live — watch 14 in-market accounts surface in real time, all actively evaluating solutions in your category right now.",
      ctaText: "Stop losing deals — start your free trial today.",
      timeline: tl([
        { date: "2026-02-18", tsr: 58, hold: 67, ctr: 5.1, cpa: 70 },
        { date: "2026-02-22", tsr: 61, hold: 70, ctr: 5.5, cpa: 64 },
        { date: "2026-02-26", tsr: 63, hold: 72, ctr: 5.8, cpa: 60 },
        { date: "2026-03-02", tsr: 64, hold: 73, ctr: 6.0, cpa: 57 },
      ]) },

    { id: c1f3, variantId: c1f3,
      parentVariantId: c1h3, parentId: c1h3, rootId: c1s3,
      adVariant: "Negative Hook — Talking Head Format",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-18", platform: "Meta",
      iterationType: "FORMAT", iterationStep: 2, source: "iteration", testId: b1F,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Our founder breaks down exactly how LeadFlow AI's intent engine works — and why most sales teams are showing up three days too late every single time.",
      ctaText: "Stop losing deals — start your free trial today.",
      timeline: tl([
        { date: "2026-02-18", tsr: 51, hold: 59, ctr: 4.0, cpa: 93 },
        { date: "2026-02-22", tsr: 50, hold: 58, ctr: 3.9, cpa: 97 },
        { date: "2026-02-26", tsr: 49, hold: 57, ctr: 3.8, cpa: 102 },
      ]) },

    // ── T01 Visual test — 3 variants from winning format c1f2 (Mar 3–13)
    { id: c1v1, variantId: c1v1,
      parentVariantId: c1f2, parentId: c1f2, rootId: c1s3,
      adVariant: "Screen Recording — Founder Voiceover",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "Screen Recording", cta: "Free Trial",
      status: "Loser", startDate: "2026-03-03", platform: "Meta",
      iterationType: "VISUAL", iterationStep: 3, source: "iteration", testId: b1V,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Watch the LeadFlow AI dashboard live — our founder narrates as 14 in-market accounts surface in real time.",
      ctaText: "Stop losing deals — start your free trial today.",
      timeline: tl([
        { date: "2026-03-03", tsr: 61, hold: 70, ctr: 5.4, cpa: 67 },
        { date: "2026-03-07", tsr: 62, hold: 71, ctr: 5.6, cpa: 64 },
        { date: "2026-03-11", tsr: 61, hold: 70, ctr: 5.5, cpa: 66 },
      ]) },

    { id: c1v2, variantId: c1v2,
      parentVariantId: c1f2, parentId: c1f2, rootId: c1s3,
      adVariant: "Screen Recording — Customer Walkthrough",
      hookType: "Negative Hook", primaryAngle: "Social Proof",
      creativeFormat: "Screen Recording", cta: "Free Trial",
      status: "Winner", startDate: "2026-03-03", platform: "Meta",
      iterationType: "VISUAL", iterationStep: 3, source: "iteration", testId: b1V,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Watch a real LeadFlow AI customer walk through their morning routine — 14 ranked in-market accounts waiting, zero hours of research spent.",
      ctaText: "Stop losing deals — start your free trial today.",
      timeline: tl([
        { date: "2026-03-03", tsr: 64, hold: 74, ctr: 5.9, cpa: 59 },
        { date: "2026-03-07", tsr: 66, hold: 76, ctr: 6.2, cpa: 55 },
        { date: "2026-03-11", tsr: 67, hold: 77, ctr: 6.4, cpa: 52 },
        { date: "2026-03-13", tsr: 68, hold: 78, ctr: 6.5, cpa: 51 },
      ]) },

    { id: c1v3, variantId: c1v3,
      parentVariantId: c1f2, parentId: c1f2, rootId: c1s3,
      adVariant: "Screen Recording — Animated Data Overlay",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "Screen Recording", cta: "Free Trial",
      status: "Loser", startDate: "2026-03-03", platform: "Meta",
      iterationType: "VISUAL", iterationStep: 3, source: "iteration", testId: b1V,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Live intent signals — visualised. Watch LeadFlow AI flag 14 in-market accounts in real time, with buying signals and urgency scores overlaid.",
      ctaText: "Stop losing deals — start your free trial.",
      timeline: tl([
        { date: "2026-03-03", tsr: 59, hold: 67, ctr: 5.1, cpa: 74 },
        { date: "2026-03-07", tsr: 60, hold: 68, ctr: 5.2, cpa: 72 },
        { date: "2026-03-11", tsr: 59, hold: 67, ctr: 5.1, cpa: 74 },
      ]) },

    // ── T01 CTA test — 2 variants from winning visual c1v2 (Mar 14–20, complete)
    { id: c1c1, variantId: c1c1,
      parentVariantId: c1v2, parentId: c1v2, rootId: c1s3,
      adVariant: "Screen Recording — Free Trial CTA",
      hookType: "Negative Hook", primaryAngle: "Social Proof",
      creativeFormat: "Screen Recording", cta: "Free Trial",
      status: "Loser", startDate: "2026-03-14", platform: "Meta",
      iterationType: "CTA", iterationStep: 4, source: "iteration", testId: b1C,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Watch a real LeadFlow AI customer walk through their morning routine — 14 ranked in-market accounts waiting, zero research hours spent.",
      ctaText: "Start your free trial — see your first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-03-14", tsr: 65, hold: 75, ctr: 6.1, cpa: 58 },
        { date: "2026-03-17", tsr: 64, hold: 74, ctr: 6.0, cpa: 60 },
        { date: "2026-03-19", tsr: 65, hold: 75, ctr: 6.1, cpa: 59 },
      ]) },

    { id: c1c2, variantId: c1c2,
      parentVariantId: c1v2, parentId: c1v2, rootId: c1s3,
      adVariant: "Screen Recording — Book a Demo CTA",
      hookType: "Negative Hook", primaryAngle: "Social Proof",
      creativeFormat: "Screen Recording", cta: "Book a Demo",
      status: "Winner", startDate: "2026-03-14", platform: "Meta",
      iterationType: "CTA", iterationStep: 4, source: "iteration", testId: b1C,
      hookText: "Your competitors are closing deals you don't even know exist — because they know who's in-market and you don't.",
      bodyText: "Watch a real LeadFlow AI customer walk through their morning routine — 14 ranked in-market accounts waiting, zero research hours spent.",
      ctaText: "Book a 15-minute demo — we'll show you live intent signals firing in your exact market right now.",
      timeline: tl([
        { date: "2026-03-14", tsr: 68, hold: 78, ctr: 6.6, cpa: 47 },
        { date: "2026-03-17", tsr: 70, hold: 80, ctr: 6.9, cpa: 43 },
        { date: "2026-03-19", tsr: 71, hold: 81, ctr: 7.1, cpa: 41 },
        { date: "2026-03-21", tsr: 72, hold: 82, ctr: 7.3, cpa: 39 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // T02 — LinkedIn — Transformation Story — Script Exploration (no iteration)
    // 6 scripts, 2 early losers stopped, 4 still running
    // Angle: Transformation Story / "From chaos to clarity"
    // Timeline: Jan 31 → still running
    // ═══════════════════════════════════════════════════════════════════════════

    { id: c2s1, variantId: c2s1,
      adVariant: "Story Hook — 15 Hours to Zero",
      hookType: "Story Hook", primaryAngle: "Transformation Story",
      creativeFormat: "Talking Head", cta: "Book a Demo",
      status: "Loser", startDate: "2026-01-31", platform: "LinkedIn",
      iterationType: null, iterationStep: 0, rootId: c2s1, testId: T2,
      hookText: "Six months ago our sales team spent 15 hours a week on prospect research. Today that number is zero.",
      bodyText: "LeadFlow AI delivers a ranked list of in-market accounts every morning — pre-enriched, intent-scored, and ready to contact. We closed 40% more deals in Q3 with the exact same headcount.",
      ctaText: "Book a 15-minute demo — see how it works for your ICP.",
      timeline: tl([
        { date: "2026-01-31", tsr: 28, hold: 30, ctr: 1.3, cpa: 248 },
        { date: "2026-02-04", tsr: 26, hold: 28, ctr: 1.1, cpa: 271 },
      ]) },

    { id: c2s2, variantId: c2s2,
      adVariant: "Curiosity Hook — The Morning Routine That Changes Pipeline",
      hookType: "Curiosity Hook", primaryAngle: "Transformation Story",
      creativeFormat: "Talking Head", cta: "Book a Demo",
      status: "Testing", startDate: "2026-01-31", platform: "LinkedIn",
      iterationType: null, iterationStep: 0, rootId: c2s2, testId: T2,
      hookText: "Here's the morning routine that helped one B2B SaaS team close 40% more deals with the exact same headcount.",
      bodyText: "They wake up to a ranked list of 14 in-market accounts — pre-enriched, intent-scored, and ready to contact. No research. No cold calls into the dark. That's LeadFlow AI.",
      ctaText: "Book a demo — we'll show you live intent signals in your market.",
      timeline: tl([
        { date: "2026-01-31", tsr: 37, hold: 41, ctr: 2.2, cpa: 166 },
        { date: "2026-02-07", tsr: 38, hold: 42, ctr: 2.3, cpa: 160 },
        { date: "2026-02-14", tsr: 39, hold: 43, ctr: 2.4, cpa: 154 },
        { date: "2026-02-21", tsr: 38, hold: 42, ctr: 2.3, cpa: 160 },
        { date: "2026-03-01", tsr: 39, hold: 43, ctr: 2.4, cpa: 154 },
        { date: "2026-03-10", tsr: 40, hold: 44, ctr: 2.5, cpa: 147 },
        { date: "2026-03-17", tsr: 40, hold: 44, ctr: 2.5, cpa: 147 },
      ]) },

    { id: c2s3, variantId: c2s3,
      adVariant: "Question Hook — What Would 40% More Deals Mean for Your Team?",
      hookType: "Question Hook", primaryAngle: "Transformation Story",
      creativeFormat: "Talking Head", cta: "Book a Demo",
      status: "Loser", startDate: "2026-01-31", platform: "LinkedIn",
      iterationType: null, iterationStep: 0, rootId: c2s3, testId: T2,
      hookText: "What would 40% more closed deals with the same team mean for your Q2 number?",
      bodyText: "LeadFlow AI eliminates prospect research and delivers in-market accounts every morning — pre-enriched, intent-scored, and ready to call. Same team, dramatically different output.",
      ctaText: "Book a 15-minute demo — see live intent signals in your market.",
      timeline: tl([
        { date: "2026-01-31", tsr: 31, hold: 33, ctr: 1.5, cpa: 234 },
        { date: "2026-02-04", tsr: 29, hold: 31, ctr: 1.4, cpa: 250 },
        { date: "2026-02-08", tsr: 28, hold: 30, ctr: 1.3, cpa: 260 },
      ]) },

    { id: c2s4, variantId: c2s4,
      adVariant: "Authority Hook — How the Top Revenue Teams Transformed Pipeline",
      hookType: "Authority Hook", primaryAngle: "Transformation Story",
      creativeFormat: "Talking Head", cta: "Book a Demo",
      status: "Testing", startDate: "2026-01-31", platform: "LinkedIn",
      iterationType: null, iterationStep: 0, rootId: c2s4, testId: T2,
      hookText: "The fastest-growing B2B SaaS revenue teams have quietly replaced manual prospecting with something entirely different.",
      bodyText: "They use real-time intent signals — not static lists. LeadFlow AI surfaces only the accounts actively evaluating right now, so their reps spend 100% of their time closing, not researching.",
      ctaText: "See how they did it — book a 15-minute demo.",
      timeline: tl([
        { date: "2026-01-31", tsr: 41, hold: 44, ctr: 2.6, cpa: 142 },
        { date: "2026-02-07", tsr: 42, hold: 45, ctr: 2.7, cpa: 137 },
        { date: "2026-02-14", tsr: 43, hold: 46, ctr: 2.8, cpa: 132 },
        { date: "2026-02-21", tsr: 42, hold: 45, ctr: 2.7, cpa: 137 },
        { date: "2026-03-01", tsr: 43, hold: 46, ctr: 2.8, cpa: 132 },
        { date: "2026-03-10", tsr: 44, hold: 47, ctr: 2.9, cpa: 127 },
        { date: "2026-03-17", tsr: 44, hold: 47, ctr: 2.9, cpa: 127 },
      ]) },

    { id: c2s5, variantId: c2s5,
      adVariant: "Negative Hook — Chaotic Pipeline vs. LeadFlow AI",
      hookType: "Negative Hook", primaryAngle: "Transformation Story",
      creativeFormat: "Talking Head", cta: "Book a Demo",
      status: "Testing", startDate: "2026-01-31", platform: "LinkedIn",
      iterationType: null, iterationStep: 0, rootId: c2s5, testId: T2,
      hookText: "If your sales team is still building prospect lists by hand, you're operating with a 2019 playbook in 2026.",
      bodyText: "The transformation is already happening. LeadFlow AI delivers in-market accounts every morning — ranked by intent, pre-enriched, and ready to close. Your team stops researching and starts selling.",
      ctaText: "Book a demo — see the difference in your first session.",
      timeline: tl([
        { date: "2026-01-31", tsr: 44, hold: 47, ctr: 2.9, cpa: 128 },
        { date: "2026-02-07", tsr: 46, hold: 49, ctr: 3.1, cpa: 119 },
        { date: "2026-02-14", tsr: 47, hold: 50, ctr: 3.2, cpa: 115 },
        { date: "2026-02-21", tsr: 48, hold: 51, ctr: 3.3, cpa: 111 },
        { date: "2026-03-01", tsr: 47, hold: 50, ctr: 3.2, cpa: 115 },
        { date: "2026-03-10", tsr: 48, hold: 51, ctr: 3.3, cpa: 111 },
        { date: "2026-03-17", tsr: 49, hold: 52, ctr: 3.4, cpa: 108 },
      ]) },

    { id: c2s6, variantId: c2s6,
      adVariant: "Story Hook — Before and After LeadFlow AI",
      hookType: "Story Hook", primaryAngle: "Transformation Story",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Testing", startDate: "2026-01-31", platform: "LinkedIn",
      iterationType: null, iterationStep: 0, rootId: c2s6, testId: T2,
      hookText: "Before LeadFlow AI: 3-hour Monday mornings building prospect lists. After: I open my inbox to 14 ranked in-market accounts.",
      bodyText: "My team went from 60% of capacity on research to 100% on closing. Deals closed up 40% in Q3. Same headcount. Same ICP. Completely different workflow.",
      ctaText: "Book a 15-minute demo — we'll walk you through your first session live.",
      timeline: tl([
        { date: "2026-01-31", tsr: 43, hold: 46, ctr: 2.8, cpa: 133 },
        { date: "2026-02-07", tsr: 44, hold: 47, ctr: 2.9, cpa: 128 },
        { date: "2026-02-14", tsr: 45, hold: 48, ctr: 3.0, cpa: 123 },
        { date: "2026-02-21", tsr: 44, hold: 47, ctr: 2.9, cpa: 128 },
        { date: "2026-03-01", tsr: 45, hold: 48, ctr: 3.0, cpa: 123 },
        { date: "2026-03-10", tsr: 46, hold: 49, ctr: 3.1, cpa: 119 },
        { date: "2026-03-17", tsr: 46, hold: 49, ctr: 3.1, cpa: 119 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // T03 — TikTok — Mechanism Reveal — Hook Iteration Only
    // 5 scripts → winner → 5 hooks → winner declared, no format test yet
    // Angle: Mechanism Reveal (same angle as T01, different platform & execution)
    // Timeline: Feb 8 → Feb 25 → hook winner Mar 10
    // ═══════════════════════════════════════════════════════════════════════════

    // ── T03 Script test — 5 variants (Feb 8–24)
    { id: c3s1, variantId: c3s1,
      adVariant: "Curiosity Hook — TikTok Native",
      hookType: "Curiosity Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-08", platform: "TikTok",
      iterationType: null, iterationStep: 0, rootId: c3s1, testId: T3,
      hookText: "There's a reason some B2B sales teams close 40% more deals with the same headcount.",
      bodyText: "Real-time intent signals. LeadFlow AI monitors 40+ data sources and delivers only in-market accounts every morning — no research required.",
      ctaText: "Start free — link in bio.",
      timeline: tl([
        { date: "2026-02-08", tsr: 46, hold: 42, ctr: 2.3, cpa: 158 },
        { date: "2026-02-12", tsr: 45, hold: 41, ctr: 2.2, cpa: 164 },
        { date: "2026-02-16", tsr: 44, hold: 40, ctr: 2.1, cpa: 170 },
      ]) },

    { id: c3s2, variantId: c3s2,
      adVariant: "Negative Hook — Stop Losing to Competitors Who Know More",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Winner", startDate: "2026-02-08", platform: "TikTok",
      iterationType: null, iterationStep: 0, rootId: c3s2, testId: T3,
      hookText: "Stop losing deals to competitors who knew the account was in-market 3 days before you did.",
      bodyText: "LeadFlow AI tracks real-time buying signals — job changes, funding rounds, tech evaluations — and delivers in-market accounts every morning. Your team shows up first. Every time.",
      ctaText: "Start your free trial — first leads in 48 hours. Link in bio.",
      timeline: tl([
        { date: "2026-02-08", tsr: 56, hold: 53, ctr: 3.2, cpa: 112 },
        { date: "2026-02-12", tsr: 59, hold: 56, ctr: 3.5, cpa: 103 },
        { date: "2026-02-16", tsr: 61, hold: 58, ctr: 3.7, cpa: 97 },
        { date: "2026-02-20", tsr: 62, hold: 59, ctr: 3.9, cpa: 93 },
      ]) },

    { id: c3s3, variantId: c3s3,
      adVariant: "Question Hook — When Did You Last Reach Out at the Right Time?",
      hookType: "Question Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-08", platform: "TikTok",
      iterationType: null, iterationStep: 0, rootId: c3s3, testId: T3,
      hookText: "When was the last time your team reached out to an account at the exact moment they were ready to buy?",
      bodyText: "Probably never — because without intent data, it's impossible. LeadFlow AI changes that. Real-time signals, delivered every morning.",
      ctaText: "Try it free — link in bio.",
      timeline: tl([
        { date: "2026-02-08", tsr: 50, hold: 46, ctr: 2.7, cpa: 134 },
        { date: "2026-02-12", tsr: 49, hold: 45, ctr: 2.6, cpa: 139 },
        { date: "2026-02-16", tsr: 48, hold: 44, ctr: 2.5, cpa: 145 },
      ]) },

    { id: c3s4, variantId: c3s4,
      adVariant: "Statistic Hook — 3 Seconds of Intent Data",
      hookType: "Statistic Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-08", platform: "TikTok",
      iterationType: null, iterationStep: 0, rootId: c3s4, testId: T3,
      hookText: "68% of B2B deals go to the vendor who reaches out first at the moment of peak buying intent.",
      bodyText: "Your team is reaching out at the wrong moment. LeadFlow AI delivers real-time intent signals so you're always first — every single time.",
      ctaText: "Start free — link in bio.",
      timeline: tl([
        { date: "2026-02-08", tsr: 48, hold: 44, ctr: 2.6, cpa: 140 },
        { date: "2026-02-12", tsr: 47, hold: 43, ctr: 2.5, cpa: 146 },
        { date: "2026-02-16", tsr: 46, hold: 42, ctr: 2.4, cpa: 152 },
      ]) },

    { id: c3s5, variantId: c3s5,
      adVariant: "Story Hook — My Team Stopped Cold Calling",
      hookType: "Story Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-08", platform: "TikTok",
      iterationType: null, iterationStep: 0, rootId: c3s5, testId: T3,
      hookText: "My team stopped cold calling 6 months ago. Our close rate went up 40%. Here's why.",
      bodyText: "We switched to intent-based outreach with LeadFlow AI. Every morning: a ranked list of accounts actively evaluating our category. No cold lists. No dark dials.",
      ctaText: "Try it free — link in bio.",
      timeline: tl([
        { date: "2026-02-08", tsr: 52, hold: 48, ctr: 2.9, cpa: 123 },
        { date: "2026-02-12", tsr: 51, hold: 47, ctr: 2.8, cpa: 128 },
        { date: "2026-02-16", tsr: 50, hold: 46, ctr: 2.7, cpa: 134 },
      ]) },

    // ── T03 Hook test — 5 variants from winning script c3s2 (Feb 25–Mar 10, complete)
    { id: c3h1, variantId: c3h1,
      parentVariantId: c3s2, parentId: c3s2, rootId: c3s2,
      adVariant: "Curiosity Hook — What Competitors Know",
      hookType: "Curiosity Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-25", platform: "TikTok",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b3H,
      hookText: "Here's the intelligence gap that's costing your team 40% of the deals they should be closing.",
      bodyText: "LeadFlow AI tracks real-time buying signals — job changes, funding rounds, tech evaluations — and delivers in-market accounts every morning. Your team shows up first. Every time.",
      ctaText: "Start your free trial — first leads in 48 hours. Link in bio.",
      timeline: tl([
        { date: "2026-02-25", tsr: 60, hold: 56, ctr: 3.6, cpa: 101 },
        { date: "2026-03-01", tsr: 59, hold: 55, ctr: 3.5, cpa: 104 },
        { date: "2026-03-05", tsr: 58, hold: 54, ctr: 3.4, cpa: 108 },
      ]) },

    { id: c3h2, variantId: c3h2,
      parentVariantId: c3s2, parentId: c3s2, rootId: c3s2,
      adVariant: "Question Hook — How Many Deals This Week?",
      hookType: "Question Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-25", platform: "TikTok",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b3H,
      hookText: "How many accounts in your ICP are actively evaluating right now — and have no idea your product exists?",
      bodyText: "LeadFlow AI tells you exactly who's in-market before they find your competitor. Real-time signals from 40+ sources delivered every morning.",
      ctaText: "Start free — see who's in-market now. Link in bio.",
      timeline: tl([
        { date: "2026-02-25", tsr: 61, hold: 57, ctr: 3.7, cpa: 97 },
        { date: "2026-03-01", tsr: 60, hold: 56, ctr: 3.6, cpa: 101 },
        { date: "2026-03-05", tsr: 59, hold: 55, ctr: 3.5, cpa: 105 },
      ]) },

    { id: c3h3, variantId: c3h3,
      parentVariantId: c3s2, parentId: c3s2, rootId: c3s2,
      adVariant: "Statistic Hook — 68% Go to First Mover",
      hookType: "Statistic Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-25", platform: "TikTok",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b3H,
      hookText: "68% of B2B deals close with the first vendor to reach out at the moment of peak intent. Your team is showing up third.",
      bodyText: "LeadFlow AI puts your team first — every time. Real-time buying signals delivered every morning, so you reach out at the exact right moment.",
      ctaText: "Start free — link in bio.",
      timeline: tl([
        { date: "2026-02-25", tsr: 57, hold: 53, ctr: 3.3, cpa: 111 },
        { date: "2026-03-01", tsr: 56, hold: 52, ctr: 3.2, cpa: 115 },
        { date: "2026-03-05", tsr: 55, hold: 51, ctr: 3.1, cpa: 119 },
      ]) },

    { id: c3h4, variantId: c3h4,
      parentVariantId: c3s2, parentId: c3s2, rootId: c3s2,
      adVariant: "Negative Hook — Stop Losing to Reps Who Know More",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Winner", startDate: "2026-02-25", platform: "TikTok",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b3H,
      hookText: "Stop losing deals to competitors who knew the account was in-market 3 days before you did.",
      bodyText: "LeadFlow AI delivers real-time buying signals the moment they fire — job changes, funding rounds, tech stack switches. Your team reaches out first. Every single time.",
      ctaText: "Start your free trial — first leads in 48 hours. Link in bio.",
      timeline: tl([
        { date: "2026-02-25", tsr: 68, hold: 64, ctr: 4.5, cpa: 79 },
        { date: "2026-03-01", tsr: 71, hold: 67, ctr: 4.9, cpa: 72 },
        { date: "2026-03-05", tsr: 73, hold: 69, ctr: 5.2, cpa: 67 },
        { date: "2026-03-10", tsr: 74, hold: 70, ctr: 5.4, cpa: 64 },
      ]) },

    { id: c3h5, variantId: c3h5,
      parentVariantId: c3s2, parentId: c3s2, rootId: c3s2,
      adVariant: "Story Hook — The Day I Stopped Cold Calling",
      hookType: "Story Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "UGC", cta: "Free Trial",
      status: "Loser", startDate: "2026-02-25", platform: "TikTok",
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: b3H,
      hookText: "The day I stopped cold calling was the day I started seeing which accounts were already ready to buy.",
      bodyText: "LeadFlow AI delivers real-time intent signals — so your outreach goes to accounts actively evaluating right now, not ones you're hoping might be.",
      ctaText: "Try it free — link in bio.",
      timeline: tl([
        { date: "2026-02-25", tsr: 63, hold: 59, ctr: 3.9, cpa: 92 },
        { date: "2026-03-01", tsr: 62, hold: 58, ctr: 3.8, cpa: 96 },
        { date: "2026-03-05", tsr: 61, hold: 57, ctr: 3.7, cpa: 100 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // T04 — Meta — Social Proof — Format Test (currently running)
    // 5 scripts → winner → 3 formats currently testing, no winner yet
    // Angle: Social Proof / "What our customers say"
    // Timeline: Feb 21 → Mar 6 → formats still running
    // ═══════════════════════════════════════════════════════════════════════════

    // ── T04 Script test — 5 variants (Feb 21–Mar 5)
    { id: c4s1, variantId: c4s1,
      adVariant: "Authority Hook — Logo Wall Social Proof",
      hookType: "Authority Hook", primaryAngle: "Social Proof",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Loser", startDate: "2026-02-21", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c4s1, testId: T4,
      hookText: "Clearbit, Segment, and 140 other B2B SaaS teams replaced manual prospect research with LeadFlow AI.",
      bodyText: "They wake up to in-market accounts ranked by intent — no list-building, no cold calls into the dark. The results speak for themselves: 40% more pipeline with the same headcount.",
      ctaText: "Book a 15-minute demo — see why they switched.",
      timeline: tl([
        { date: "2026-02-21", tsr: 34, hold: 37, ctr: 2.0, cpa: 184 },
        { date: "2026-02-25", tsr: 33, hold: 36, ctr: 1.9, cpa: 191 },
        { date: "2026-03-01", tsr: 32, hold: 35, ctr: 1.8, cpa: 199 },
      ]) },

    { id: c4s2, variantId: c4s2,
      adVariant: "Testimonial Hook — Revenue Leader Outcome",
      hookType: "Story Hook", primaryAngle: "Social Proof",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Loser", startDate: "2026-02-21", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c4s2, testId: T4,
      hookText: "We closed $1.2M ARR in Q3 without adding a single SDR. Here's the system that made it possible.",
      bodyText: "LeadFlow AI delivers ranked in-market accounts every morning — pre-enriched, intent-scored, and ready to contact. Our team went from 15 hours of research a week to zero.",
      ctaText: "Book a demo — see the system we use.",
      timeline: tl([
        { date: "2026-02-21", tsr: 37, hold: 40, ctr: 2.2, cpa: 168 },
        { date: "2026-02-25", tsr: 36, hold: 39, ctr: 2.1, cpa: 175 },
        { date: "2026-03-01", tsr: 35, hold: 38, ctr: 2.0, cpa: 183 },
      ]) },

    { id: c4s3, variantId: c4s3,
      adVariant: "Curiosity Hook — The System Behind the Numbers",
      hookType: "Curiosity Hook", primaryAngle: "Social Proof",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Loser", startDate: "2026-02-21", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c4s3, testId: T4,
      hookText: "140 B2B SaaS teams are using a system most of their competitors have never heard of.",
      bodyText: "LeadFlow AI. It delivers in-market accounts every morning ranked by real-time intent. No research. No cold calls. Just the right outreach at the right moment.",
      ctaText: "Book a demo — join the 140.",
      timeline: tl([
        { date: "2026-02-21", tsr: 36, hold: 39, ctr: 2.1, cpa: 174 },
        { date: "2026-02-25", tsr: 35, hold: 38, ctr: 2.0, cpa: 181 },
        { date: "2026-03-01", tsr: 34, hold: 37, ctr: 1.9, cpa: 189 },
      ]) },

    { id: c4s4, variantId: c4s4,
      adVariant: "Question Hook — What Did 140 SaaS Teams See in LeadFlow AI?",
      hookType: "Question Hook", primaryAngle: "Social Proof",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Winner", startDate: "2026-02-21", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c4s4, testId: T4,
      hookText: "140 B2B SaaS teams quietly switched to a new pipeline system in the last 6 months. What did they all see?",
      bodyText: "They saw their teams stop guessing — and start closing. LeadFlow AI delivers ranked in-market accounts every morning: pre-enriched, intent-scored, ready to contact. Same headcount, 40% more deals.",
      ctaText: "Book a demo — find out what they found.",
      timeline: tl([
        { date: "2026-02-21", tsr: 44, hold: 48, ctr: 2.9, cpa: 128 },
        { date: "2026-02-25", tsr: 46, hold: 50, ctr: 3.1, cpa: 119 },
        { date: "2026-03-01", tsr: 47, hold: 51, ctr: 3.2, cpa: 115 },
        { date: "2026-03-05", tsr: 48, hold: 52, ctr: 3.3, cpa: 111 },
      ]) },

    { id: c4s5, variantId: c4s5,
      adVariant: "Negative Hook — Still Doing It the Hard Way?",
      hookType: "Negative Hook", primaryAngle: "Social Proof",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Loser", startDate: "2026-02-21", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: c4s5, testId: T4,
      hookText: "While your team is building prospect lists by hand, 140 B2B SaaS teams have already automated it.",
      bodyText: "LeadFlow AI delivers in-market accounts every morning — ranked by intent, pre-enriched, and ready to call. The teams using it are closing 40% more with the same headcount.",
      ctaText: "Stop doing it the hard way — book a demo.",
      timeline: tl([
        { date: "2026-02-21", tsr: 38, hold: 41, ctr: 2.3, cpa: 162 },
        { date: "2026-02-25", tsr: 37, hold: 40, ctr: 2.2, cpa: 169 },
        { date: "2026-03-01", tsr: 36, hold: 39, ctr: 2.1, cpa: 177 },
      ]) },

    // ── T04 Format test — 3 variants from winning script c4s4 (Mar 6–present, testing)
    { id: c4f1, variantId: c4f1,
      parentVariantId: c4s4, parentId: c4s4, rootId: c4s4,
      adVariant: "Question Hook — UGC Customer Format",
      hookType: "Question Hook", primaryAngle: "Social Proof",
      creativeFormat: "UGC", cta: "Book a Demo",
      status: "Testing", startDate: "2026-03-06", platform: "Meta",
      iterationType: "FORMAT", iterationStep: 2, source: "iteration", testId: b4F,
      hookText: "140 B2B SaaS teams quietly switched to a new pipeline system in the last 6 months. What did they all see?",
      bodyText: "LeadFlow AI customer walking through their morning routine — 14 ranked in-market accounts, zero research hours, 40% more deals closed.",
      ctaText: "Book a demo — find out what they found.",
      timeline: tl([
        { date: "2026-03-06", tsr: 46, hold: 50, ctr: 3.1, cpa: 117 },
        { date: "2026-03-10", tsr: 47, hold: 51, ctr: 3.2, cpa: 114 },
        { date: "2026-03-14", tsr: 46, hold: 50, ctr: 3.1, cpa: 117 },
        { date: "2026-03-18", tsr: 47, hold: 51, ctr: 3.2, cpa: 114 },
      ]) },

    { id: c4f2, variantId: c4f2,
      parentVariantId: c4s4, parentId: c4s4, rootId: c4s4,
      adVariant: "Question Hook — Screen Recording Format",
      hookType: "Question Hook", primaryAngle: "Social Proof",
      creativeFormat: "Screen Recording", cta: "Book a Demo",
      status: "Testing", startDate: "2026-03-06", platform: "Meta",
      iterationType: "FORMAT", iterationStep: 2, source: "iteration", testId: b4F,
      hookText: "140 B2B SaaS teams quietly switched to a new pipeline system in the last 6 months. What did they all see?",
      bodyText: "We're inside LeadFlow AI live — watch 14 in-market accounts surface in real time, ranked by intent, pre-enriched, and ready to call.",
      ctaText: "Book a demo — find out what they found.",
      timeline: tl([
        { date: "2026-03-06", tsr: 52, hold: 57, ctr: 3.8, cpa: 96 },
        { date: "2026-03-10", tsr: 54, hold: 59, ctr: 4.0, cpa: 91 },
        { date: "2026-03-14", tsr: 55, hold: 60, ctr: 4.1, cpa: 89 },
        { date: "2026-03-18", tsr: 56, hold: 61, ctr: 4.2, cpa: 87 },
      ]) },

    { id: c4f3, variantId: c4f3,
      parentVariantId: c4s4, parentId: c4s4, rootId: c4s4,
      adVariant: "Question Hook — Talking Head Format",
      hookType: "Question Hook", primaryAngle: "Social Proof",
      creativeFormat: "Talking Head", cta: "Book a Demo",
      status: "Testing", startDate: "2026-03-06", platform: "Meta",
      iterationType: "FORMAT", iterationStep: 2, source: "iteration", testId: b4F,
      hookText: "140 B2B SaaS teams quietly switched to a new pipeline system in the last 6 months. What did they all see?",
      bodyText: "Our Head of Customer Success breaks down what 140 teams have in common — and why intent-based outreach is replacing everything else.",
      ctaText: "Book a demo — find out what they found.",
      timeline: tl([
        { date: "2026-03-06", tsr: 44, hold: 48, ctr: 3.0, cpa: 123 },
        { date: "2026-03-10", tsr: 45, hold: 49, ctr: 3.1, cpa: 119 },
        { date: "2026-03-14", tsr: 44, hold: 48, ctr: 3.0, cpa: 123 },
        { date: "2026-03-18", tsr: 45, hold: 49, ctr: 3.1, cpa: 119 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // T05 — YouTube — Contrarian — New Angle Script Test (11 days, running)
    // 6 scripts, different angle: "Stop buying more leads"
    // No iteration yet — too early to pick a winner
    // ═══════════════════════════════════════════════════════════════════════════

    { id: c5s1, variantId: c5s1,
      adVariant: "Contrarian Hook — Stop Buying More Leads",
      hookType: "Negative Hook", primaryAngle: "Contrarian",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Testing", startDate: "2026-03-10", platform: "YouTube",
      iterationType: null, iterationStep: 0, rootId: c5s1, testId: T5,
      hookText: "Stop buying more leads. The problem isn't volume — it's that 78% of your outreach is aimed at accounts that aren't ready.",
      bodyText: "LeadFlow AI doesn't give you more leads. It gives you the right ones — the accounts actively evaluating right now. Fewer dials, far more closes.",
      ctaText: "Start your free trial — see your first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-03-10", tsr: 28, hold: 33, ctr: 1.8, cpa: 181 },
        { date: "2026-03-15", tsr: 29, hold: 34, ctr: 1.9, cpa: 174 },
        { date: "2026-03-19", tsr: 30, hold: 35, ctr: 1.9, cpa: 174 },
      ]) },

    { id: c5s2, variantId: c5s2,
      adVariant: "Contrarian Hook — More Reps Is Not the Answer",
      hookType: "Negative Hook", primaryAngle: "Contrarian",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Testing", startDate: "2026-03-10", platform: "YouTube",
      iterationType: null, iterationStep: 0, rootId: c5s2, testId: T5,
      hookText: "Hiring more SDRs is not the solution to a lead quality problem. You're just paying more people to call accounts that aren't ready.",
      bodyText: "LeadFlow AI fixes the upstream problem: it identifies which accounts are actively in-market right now and routes only those to your team. Same headcount, dramatically better outcomes.",
      ctaText: "Start free — first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-03-10", tsr: 31, hold: 36, ctr: 2.0, cpa: 165 },
        { date: "2026-03-15", tsr: 32, hold: 37, ctr: 2.1, cpa: 157 },
        { date: "2026-03-19", tsr: 33, hold: 38, ctr: 2.1, cpa: 157 },
      ]) },

    { id: c5s3, variantId: c5s3,
      adVariant: "Contrarian Hook — The Lead Generation Industry Is Lying to You",
      hookType: "Curiosity Hook", primaryAngle: "Contrarian",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Testing", startDate: "2026-03-10", platform: "YouTube",
      iterationType: null, iterationStep: 0, rootId: c5s3, testId: T5,
      hookText: "The lead generation industry has been lying to you for a decade. More contacts is not a strategy. It's a distraction.",
      bodyText: "The real lever is timing. LeadFlow AI identifies accounts that are actively evaluating right now — not ones that fit a demographic. Same ICP, surgical timing, completely different results.",
      ctaText: "See how it actually works — start your free trial.",
      timeline: tl([
        { date: "2026-03-10", tsr: 35, hold: 41, ctr: 2.3, cpa: 151 },
        { date: "2026-03-15", tsr: 36, hold: 42, ctr: 2.4, cpa: 145 },
        { date: "2026-03-19", tsr: 37, hold: 43, ctr: 2.5, cpa: 139 },
      ]) },

    { id: c5s4, variantId: c5s4,
      adVariant: "Contrarian Hook — Volume Outreach Is Dead",
      hookType: "Negative Hook", primaryAngle: "Contrarian",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Testing", startDate: "2026-03-10", platform: "YouTube",
      iterationType: null, iterationStep: 0, rootId: c5s4, testId: T5,
      hookText: "Volume outreach is dead. Spray-and-pray killed B2B conversion rates — and adding more reps to a broken model just makes it worse.",
      bodyText: "The fix is intent-based targeting. LeadFlow AI tells you exactly which accounts are in-market right now so your team focuses 100% of their effort on buyers who are ready.",
      ctaText: "Start your free trial — first leads in 48 hours.",
      timeline: tl([
        { date: "2026-03-10", tsr: 30, hold: 35, ctr: 1.9, cpa: 174 },
        { date: "2026-03-15", tsr: 31, hold: 36, ctr: 2.0, cpa: 165 },
        { date: "2026-03-19", tsr: 32, hold: 37, ctr: 2.0, cpa: 165 },
      ]) },

    { id: c5s5, variantId: c5s5,
      adVariant: "Contrarian Hook — The Playbook Stopped Working",
      hookType: "Curiosity Hook", primaryAngle: "Contrarian",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Testing", startDate: "2026-03-10", platform: "YouTube",
      iterationType: null, iterationStep: 0, rootId: c5s5, testId: T5,
      hookText: "The B2B sales playbook that worked in 2020 is actively destroying your pipeline in 2026. Here's what replaced it.",
      bodyText: "Intent-based outreach. LeadFlow AI identifies the accounts actively in-market right now — before your competitors find them. Fewer leads, far better timing, dramatically higher close rates.",
      ctaText: "Start free — see your first in-market leads in 48 hours.",
      timeline: tl([
        { date: "2026-03-10", tsr: 32, hold: 37, ctr: 2.1, cpa: 157 },
        { date: "2026-03-15", tsr: 33, hold: 38, ctr: 2.1, cpa: 157 },
        { date: "2026-03-19", tsr: 34, hold: 39, ctr: 2.2, cpa: 150 },
      ]) },

    { id: c5s6, variantId: c5s6,
      adVariant: "Contrarian Hook — Cold Calling Was Always the Problem",
      hookType: "Negative Hook", primaryAngle: "Contrarian",
      creativeFormat: "Talking Head", cta: "Free Trial",
      status: "Testing", startDate: "2026-03-10", platform: "YouTube",
      iterationType: null, iterationStep: 0, rootId: c5s6, testId: T5,
      hookText: "Cold calling was never the problem. Calling accounts that aren't ready to buy — that's the problem. And most teams do it every single day.",
      bodyText: "LeadFlow AI eliminates cold outreach entirely by only surfacing accounts with active buying signals. Your reps make fewer calls — and close far more deals.",
      ctaText: "Start your free trial — see how few calls it takes.",
      timeline: tl([
        { date: "2026-03-10", tsr: 29, hold: 34, ctr: 1.9, cpa: 174 },
        { date: "2026-03-15", tsr: 30, hold: 35, ctr: 2.0, cpa: 165 },
        { date: "2026-03-19", tsr: 31, hold: 36, ctr: 2.0, cpa: 165 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // SA01 — Meta — Visual Format Test (complete, Static Image wins)
    // Timeline: Jan 15 → Jan 22 → Feb 1 → Feb 7
    // 4 format variants; Static Image 3.8% CTR / $44 CPA
    // ═══════════════════════════════════════════════════════════════════════════

    { id: sa1v1, variantId: sa1v1,
      adVariant: "Static Image — In-Market Buyers Visual",
      hookType: "Question Hook", primaryAngle: "Curiosity",
      creativeFormat: "Static Image", cta: "Learn More",
      adType: "static",
      status: "Winner", startDate: "2026-01-15", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: sa1v1, testId: SA01,
      hookText: "Do you know which accounts in your ICP are evaluating right now?",
      bodyText: "LeadFlow AI surfaces in-market buyers before your competitors find them. No more cold outreach. Just warm, intent-signalled leads every morning.",
      ctaText: "Learn how it works →",
      timeline: tl([
        { date: "2026-01-15", tsr: 0, hold: 0, ctr: 1.9, cpa: 72 },
        { date: "2026-01-22", tsr: 0, hold: 0, ctr: 2.7, cpa: 58 },
        { date: "2026-02-01", tsr: 0, hold: 0, ctr: 3.4, cpa: 49 },
        { date: "2026-02-07", tsr: 0, hold: 0, ctr: 3.8, cpa: 44 },
      ]) },

    { id: sa1v2, variantId: sa1v2,
      adVariant: "Carousel — Pipeline Coverage Sequence",
      hookType: "Story Hook", primaryAngle: "Transformation",
      creativeFormat: "Carousel", cta: "Learn More",
      adType: "static",
      status: "Loser", startDate: "2026-01-15", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: sa1v2, testId: SA01,
      hookText: "See how sales teams go from 40% pipeline coverage to 95% in 30 days.",
      bodyText: "Slide 1: Cold outreach. Slide 2: Intent signals. Slide 3: LeadFlow surfaces both. Slide 4: Your team closes, not chases.",
      ctaText: "See the breakdown →",
      timeline: tl([
        { date: "2026-01-15", tsr: 0, hold: 0, ctr: 1.4, cpa: 94 },
        { date: "2026-01-22", tsr: 0, hold: 0, ctr: 1.6, cpa: 88 },
        { date: "2026-02-01", tsr: 0, hold: 0, ctr: 1.5, cpa: 91 },
      ]) },

    { id: sa1v3, variantId: sa1v3,
      adVariant: "Infographic — 40+ Intent Signals Breakdown",
      hookType: "Statistic Hook", primaryAngle: "Authority",
      creativeFormat: "Infographic", cta: "Learn More",
      adType: "static",
      status: "Loser", startDate: "2026-01-15", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: sa1v3, testId: SA01,
      hookText: "40+ intent signals. One ranked prospect list. Every morning.",
      bodyText: "Website visits, hiring spikes, tech stack changes, funding rounds — LeadFlow monitors them all so your team doesn't have to.",
      ctaText: "See all signals →",
      timeline: tl([
        { date: "2026-01-15", tsr: 0, hold: 0, ctr: 1.2, cpa: 104 },
        { date: "2026-01-22", tsr: 0, hold: 0, ctr: 1.3, cpa: 99 },
        { date: "2026-02-01", tsr: 0, hold: 0, ctr: 1.2, cpa: 103 },
      ]) },

    { id: sa1v4, variantId: sa1v4,
      adVariant: "Split Comparison — Before / After LeadFlow",
      hookType: "Negative Hook", primaryAngle: "Pain Point",
      creativeFormat: "Split Image", cta: "Learn More",
      adType: "static",
      status: "Loser", startDate: "2026-01-15", platform: "Meta",
      iterationType: null, iterationStep: 0, rootId: sa1v4, testId: SA01,
      hookText: "Before LeadFlow: 200 cold calls. After LeadFlow: 20 warm conversations.",
      bodyText: "Left panel: reps dialing cold lists. Right panel: reps booking meetings from intent-scored accounts. One tool. Same team. 10× the conversion rate.",
      ctaText: "See the difference →",
      timeline: tl([
        { date: "2026-01-15", tsr: 0, hold: 0, ctr: 1.6, cpa: 86 },
        { date: "2026-01-22", tsr: 0, hold: 0, ctr: 1.7, cpa: 82 },
        { date: "2026-02-01", tsr: 0, hold: 0, ctr: 1.6, cpa: 85 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // SA02 — Hook Iteration on Static Image (complete, Negative Hook wins)
    // Timeline: Feb 10 → Feb 18 → Mar 3
    // 5 hook variants on the SA01 winning format; Negative Hook 4.1% CTR / $39 CPA
    // ═══════════════════════════════════════════════════════════════════════════

    { id: sa2v1, variantId: sa2v1,
      adVariant: "Question Hook — Who's Evaluating Right Now?",
      hookType: "Question Hook", primaryAngle: "Curiosity",
      creativeFormat: "Static Image", cta: "Learn More",
      adType: "static",
      status: "Loser", startDate: "2026-02-10", platform: "Meta",
      parentVariantId: sa1v1, parentId: sa1v1, rootId: sa1v1,
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: bSA2H,
      hookText: "Do you know which of your ICP accounts are evaluating tools right now?",
      bodyText: "LeadFlow AI surfaces in-market buyers before your competitors find them. No cold outreach. Just intent-scored leads every morning.",
      ctaText: "Find out →",
      timeline: tl([
        { date: "2026-02-10", tsr: 0, hold: 0, ctr: 2.4, cpa: 62 },
        { date: "2026-02-18", tsr: 0, hold: 0, ctr: 2.6, cpa: 58 },
        { date: "2026-03-03", tsr: 0, hold: 0, ctr: 2.5, cpa: 60 },
      ]) },

    { id: sa2v2, variantId: sa2v2,
      adVariant: "Negative Hook — Your Competitors Are Closing Deals You Don't Know Exist",
      hookType: "Negative Hook", primaryAngle: "Pain Point",
      creativeFormat: "Static Image", cta: "Learn More",
      adType: "static",
      status: "Winner", startDate: "2026-02-10", platform: "Meta",
      parentVariantId: sa1v1, parentId: sa1v1, rootId: sa1v1,
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: bSA2H,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "LeadFlow AI monitors 40+ buying signals across your entire ICP. You see every in-market account the moment they enter a buying window — before your competition does.",
      ctaText: "Stop losing deals →",
      timeline: tl([
        { date: "2026-02-10", tsr: 0, hold: 0, ctr: 2.9, cpa: 54 },
        { date: "2026-02-18", tsr: 0, hold: 0, ctr: 3.7, cpa: 44 },
        { date: "2026-03-03", tsr: 0, hold: 0, ctr: 4.1, cpa: 39 },
      ]) },

    { id: sa2v3, variantId: sa2v3,
      adVariant: "Statistic Hook — 68% of Deals Go to First Contact",
      hookType: "Statistic Hook", primaryAngle: "Authority",
      creativeFormat: "Static Image", cta: "Learn More",
      adType: "static",
      status: "Loser", startDate: "2026-02-10", platform: "Meta",
      parentVariantId: sa1v1, parentId: sa1v1, rootId: sa1v1,
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: bSA2H,
      hookText: "68% of B2B deals go to the vendor who reaches out first at peak buying intent.",
      bodyText: "LeadFlow AI tells you exactly when that window opens — for every account in your ICP. Your competitors are still guessing. You don't have to.",
      ctaText: "See the data →",
      timeline: tl([
        { date: "2026-02-10", tsr: 0, hold: 0, ctr: 2.0, cpa: 71 },
        { date: "2026-02-18", tsr: 0, hold: 0, ctr: 2.1, cpa: 68 },
        { date: "2026-03-03", tsr: 0, hold: 0, ctr: 2.0, cpa: 70 },
      ]) },

    { id: sa2v4, variantId: sa2v4,
      adVariant: "Promise Hook — Wake Up to Warm Leads",
      hookType: "Promise Hook", primaryAngle: "Aspiration",
      creativeFormat: "Static Image", cta: "Learn More",
      adType: "static",
      status: "Loser", startDate: "2026-02-10", platform: "Meta",
      parentVariantId: sa1v1, parentId: sa1v1, rootId: sa1v1,
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: bSA2H,
      hookText: "Wake up to a ranked list of warm, intent-ready leads — every morning.",
      bodyText: "LeadFlow AI monitors your entire ICP overnight and delivers your top accounts before your first coffee. Your team starts each day ready to close, not to research.",
      ctaText: "See your leads →",
      timeline: tl([
        { date: "2026-02-10", tsr: 0, hold: 0, ctr: 1.8, cpa: 83 },
        { date: "2026-02-18", tsr: 0, hold: 0, ctr: 1.9, cpa: 79 },
        { date: "2026-03-03", tsr: 0, hold: 0, ctr: 1.8, cpa: 82 },
      ]) },

    { id: sa2v5, variantId: sa2v5,
      adVariant: "Result-Oriented Hook — 40% More Deals, Same Headcount",
      hookType: "Result-Oriented Hook", primaryAngle: "Social Proof",
      creativeFormat: "Static Image", cta: "Get Started",
      adType: "static",
      status: "Loser", startDate: "2026-02-10", platform: "Instagram",
      parentVariantId: sa1v1, parentId: sa1v1, rootId: sa1v1,
      iterationType: "HOOK", iterationStep: 1, source: "iteration", testId: bSA2H,
      hookText: "We closed 40% more deals in Q3 — with the exact same sales team.",
      bodyText: "LeadFlow AI replaced our entire lead research process. Our reps now spend 100% of their time on accounts ready to buy.",
      ctaText: "Get started free →",
      timeline: tl([
        { date: "2026-02-10", tsr: 0, hold: 0, ctr: 2.2, cpa: 67 },
        { date: "2026-02-18", tsr: 0, hold: 0, ctr: 2.3, cpa: 64 },
        { date: "2026-03-03", tsr: 0, hold: 0, ctr: 2.2, cpa: 66 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // SA03 — Angle Test on Negative Hook (running, Pain Point leading)
    // Timeline: Mar 5 → Mar 20. Pain Point at 3.4% CTR / $48 CPA after 15 days.
    // 4 angle variants; no winner declared yet
    // ═══════════════════════════════════════════════════════════════════════════

    { id: sa3v1, variantId: sa3v1,
      adVariant: "Pain Point — Your Pipeline Is Full of Accounts That Won't Close",
      hookType: "Negative Hook", primaryAngle: "Pain Point",
      creativeFormat: "Static Image", cta: "Fix Your Pipeline",
      adType: "static",
      status: "Testing", startDate: "2026-03-05", platform: "Meta",
      parentVariantId: sa2v2, parentId: sa2v2, rootId: sa1v1,
      iterationType: "VISUAL", iterationStep: 2, source: "iteration", testId: bSA3V,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "Your pipeline is full of accounts that haven't entered a buying window. LeadFlow AI shows you which ones are evaluating right now — so your team stops chasing and starts closing.",
      ctaText: "Fix your pipeline →",
      timeline: tl([
        { date: "2026-03-05", tsr: 0, hold: 0, ctr: 2.8, cpa: 57 },
        { date: "2026-03-20", tsr: 0, hold: 0, ctr: 3.4, cpa: 48 },
      ]) },

    { id: sa3v2, variantId: sa3v2,
      adVariant: "Mechanism Reveal — 40+ Intent Signals Surface the Right Moment",
      hookType: "Negative Hook", primaryAngle: "Mechanism Reveal",
      creativeFormat: "Static Image", cta: "See How It Works",
      adType: "static",
      status: "Testing", startDate: "2026-03-05", platform: "Meta",
      parentVariantId: sa2v2, parentId: sa2v2, rootId: sa1v1,
      iterationType: "VISUAL", iterationStep: 2, source: "iteration", testId: bSA3V,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "LeadFlow monitors website visits, hiring spikes, funding rounds and 37 more signals — then ranks every account in your ICP by likelihood to buy this week.",
      ctaText: "See how it works →",
      timeline: tl([
        { date: "2026-03-05", tsr: 0, hold: 0, ctr: 2.4, cpa: 63 },
        { date: "2026-03-20", tsr: 0, hold: 0, ctr: 2.7, cpa: 57 },
      ]) },

    { id: sa3v3, variantId: sa3v3,
      adVariant: "Social Proof — How Clio Doubled Pipeline in 60 Days",
      hookType: "Negative Hook", primaryAngle: "Social Proof",
      creativeFormat: "Static Image", cta: "Read the Case Study",
      adType: "static",
      status: "Testing", startDate: "2026-03-05", platform: "Meta",
      parentVariantId: sa2v2, parentId: sa2v2, rootId: sa1v1,
      iterationType: "VISUAL", iterationStep: 2, source: "iteration", testId: bSA3V,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "Clio's sales team used LeadFlow AI to identify 3× more in-market accounts. In 60 days they doubled qualified pipeline — without adding a single rep.",
      ctaText: "Read the case study →",
      timeline: tl([
        { date: "2026-03-05", tsr: 0, hold: 0, ctr: 2.1, cpa: 68 },
        { date: "2026-03-20", tsr: 0, hold: 0, ctr: 2.4, cpa: 62 },
      ]) },

    { id: sa3v4, variantId: sa3v4,
      adVariant: "Fear + Relief — Stop Losing. Start Knowing.",
      hookType: "Negative Hook", primaryAngle: "Fear + Relief",
      creativeFormat: "Static Image", cta: "Start for Free",
      adType: "static",
      status: "Testing", startDate: "2026-03-05", platform: "Instagram",
      parentVariantId: sa2v2, parentId: sa2v2, rootId: sa1v1,
      iterationType: "VISUAL", iterationStep: 2, source: "iteration", testId: bSA3V,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "You can't win deals you don't know are open. LeadFlow AI eliminates the blind spot — giving your team a real-time view of every buying signal across your ICP.",
      ctaText: "Start for free →",
      timeline: tl([
        { date: "2026-03-05", tsr: 0, hold: 0, ctr: 2.0, cpa: 71 },
        { date: "2026-03-20", tsr: 0, hold: 0, ctr: 2.2, cpa: 66 },
      ]) },

    // ═══════════════════════════════════════════════════════════════════════════
    // SA04 — Scaling / Variation Test (just launched, based on SA03 leading angle)
    // Timeline: Mar 22 (launched). 3 copy and placement variants. No winner yet.
    // ═══════════════════════════════════════════════════════════════════════════

    { id: sa4v1, variantId: sa4v1,
      adVariant: "Pain Point — Tight Copy Variant",
      hookType: "Negative Hook", primaryAngle: "Pain Point",
      creativeFormat: "Static Image", cta: "Fix Your Pipeline",
      adType: "static",
      status: "Ready to Test", startDate: "2026-03-22", platform: "Meta",
      parentVariantId: sa3v1, parentId: sa3v1, rootId: sa1v1,
      iterationType: "CTA", iterationStep: 3, source: "iteration", testId: SA04,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "LeadFlow AI shows you which ICP accounts are in a buying window right now. Stop guessing. Start closing.",
      ctaText: "Fix your pipeline →",
      timeline: [] },

    { id: sa4v2, variantId: sa4v2,
      adVariant: "Pain Point — Extended Narrative Variant",
      hookType: "Negative Hook", primaryAngle: "Pain Point",
      creativeFormat: "Static Image", cta: "Learn More",
      adType: "static",
      status: "Producing", startDate: "2026-03-22", platform: "Meta",
      parentVariantId: sa3v1, parentId: sa3v1, rootId: sa1v1,
      iterationType: "CTA", iterationStep: 3, source: "iteration", testId: SA04,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "Your pipeline is full of accounts that haven't entered a buying window yet. LeadFlow AI monitors 40+ intent signals across your entire ICP and tells you exactly which accounts are evaluating right now — before your competitors reach them.",
      ctaText: "Learn how it works →",
      timeline: [] },

    { id: sa4v3, variantId: sa4v3,
      adVariant: "Pain Point — LinkedIn Placement Variant",
      hookType: "Negative Hook", primaryAngle: "Pain Point",
      creativeFormat: "Static Image", cta: "Book a Demo",
      adType: "static",
      status: "Draft", startDate: "", platform: "LinkedIn",
      parentVariantId: sa3v1, parentId: sa3v1, rootId: sa1v1,
      iterationType: "CTA", iterationStep: 3, source: "iteration", testId: SA04,
      hookText: "Your competitors are closing deals you don't know exist.",
      bodyText: "LeadFlow AI surfaces every in-market account in your ICP the moment they enter a buying window. Your team reaches out first — every time.",
      ctaText: "Book a demo →",
      timeline: [] },

  ]);

  // ── Creative Lab — Tests (iteration batch records) ──────────────────────────
  set("lab:tests", [

    // ── T01 — Meta — Full journey (all 4 iteration phases complete)
    {
      id: b1H, sourceVariantId: c1s3, platform: "Meta",
      iterationType: "HOOK", phase: "hook",
      variantIds: [c1h1, c1h2, c1h3, c1h4, c1h5],
      createdAt: ago(45),
      learning: {
        winnerVariantId: c1h3,
        insight: "Negative hook ('Your competitors are closing deals you don't know exist') drove 4.9% CTR vs 2.6–3.3% for Curiosity, Statistic, Question and Story — an 85% lift. On Meta, fear of competitive loss outperforms intellectual curiosity or data claims. The hook creates urgency by naming a specific threat the audience can already feel.",
        nextAction: "Lock Negative Hook. Test across formats: UGC vs. Screen Recording vs. Talking Head — keep hook and body identical.",
      },
    },
    {
      id: b1F, sourceVariantId: c1s3, platform: "Meta",
      iterationType: "FORMAT", phase: "format",
      parentTestId: b1H,
      variantIds: [c1f1, c1f2, c1f3],
      createdAt: ago(31),
      learning: {
        winnerVariantId: c1f2,
        insight: "Screen Recording hit 6.0% CTR at $57 CPA — 43% above UGC and 58% above Talking Head. Showing the product live in the first 3 seconds removes all doubt for solution-aware B2B buyers. Static testimonial formats build trust over time; Screen Recording earns it instantly by proving the claim in real time.",
        nextAction: "Lock Negative Hook + Screen Recording. Test visual execution: Founder voiceover vs. Customer walkthrough vs. Animated data overlay.",
      },
    },
    {
      id: b1V, sourceVariantId: c1s3, platform: "Meta",
      iterationType: "VISUAL", phase: "visual",
      parentTestId: b1F,
      variantIds: [c1v1, c1v2, c1v3],
      createdAt: ago(18),
      learning: {
        winnerVariantId: c1v2,
        insight: "Customer walkthrough delivered 6.5% CTR at $51 CPA — 17% above Founder voiceover and 27% above Animated overlay. Peer-to-peer social proof outperforms founder authority when the product demo is the creative centrepiece. Watching a real customer interact with the product reduces scepticism faster than any expert narration.",
        nextAction: "Lock Customer walkthrough. Test CTA: Free Trial vs. Book a Demo — keep all other variables identical.",
      },
    },
    {
      id: b1C, sourceVariantId: c1s3, platform: "Meta",
      iterationType: "CTA", phase: "cta",
      parentTestId: b1V,
      variantIds: [c1c1, c1c2],
      createdAt: ago(7),
      learning: {
        winnerVariantId: c1c2,
        insight: "Book a Demo drove $39 CPA vs $58 for Free Trial — a 33% reduction in acquisition cost. Demo CTA pre-qualifies intent from within the ad itself: viewers who book a call are further down the funnel and convert to closed revenue at 3× the rate of free trial sign-ups. Lower volume, dramatically higher revenue per lead.",
        nextAction: "Scale: Negative Hook + Screen Recording + Customer Walkthrough + Book a Demo. Begin audience segmentation: test founder vs. VP Sales persona targeting.",
      },
    },

    // ── T03 — TikTok — Hook phase complete, format not started
    {
      id: b3H, sourceVariantId: c3s2, platform: "TikTok",
      iterationType: "HOOK", phase: "hook",
      variantIds: [c3h1, c3h2, c3h3, c3h4, c3h5],
      createdAt: ago(24),
      learning: {
        winnerVariantId: c3h4,
        insight: "Negative hook ('Stop losing deals to competitors who knew 3 days early') drove 5.4% CTR vs 3.6–3.9% for Curiosity, Question, and Story variants — a 50% lift. On TikTok, negative hooks that name a specific competitive threat perform significantly above curiosity formats. The scroll-stop is fear-driven: the viewer recognises the loss before the product is mentioned.",
        nextAction: "Lock Negative Hook. Test format: UGC recut vs. Product demo vs. Before/After split screen. Keep hook copy identical across all three.",
      },
    },

    // ── T04 — Meta — Format phase running (no learning yet)
    {
      id: b4F, sourceVariantId: c4s4, platform: "Meta",
      iterationType: "FORMAT", phase: "format",
      variantIds: [c4f1, c4f2, c4f3],
      createdAt: ago(15),
      // Screen Recording (F2) leading at 4.2% CTR / $87 CPA after 15 days
    },

    // ── SA01 — Meta — Visual Format Test (complete, Static Image wins) ─────────
    {
      id: bSA1F, sourceVariantId: sa1v1, platform: "Meta",
      iterationType: "FORMAT", phase: "format",
      variantIds: [sa1v1, sa1v2, sa1v3, sa1v4],
      createdAt: ago(91),
      learning: {
        winnerVariantId: sa1v1,
        insight: "Static Image delivered 3.8% CTR at $44 CPA — 2.5× the Carousel rate and 3.2× the Infographic. On Meta feeds for B2B SaaS, clean static images with a single clear claim outperform multi-frame or data-heavy formats. The format rewards clarity: one question, high-contrast background, no visual noise. Scroll-stop happens in under 0.5 seconds.",
        nextAction: "Lock Static Image format. Test 5 hooks on the winning layout: Question, Negative, Statistic, Promise, and Result-Oriented — keep all visual variables identical.",
      },
    },

    // ── SA02 — Hook Iteration on Static Image (complete, Negative Hook wins) ───
    {
      id: bSA2H, sourceVariantId: sa1v1, platform: "Meta",
      iterationType: "HOOK", phase: "hook",
      parentTestId: bSA1F,
      variantIds: [sa2v1, sa2v2, sa2v3, sa2v4, sa2v5],
      createdAt: ago(61),
      learning: {
        winnerVariantId: sa2v2,
        insight: "Negative Hook ('Your competitors are closing deals you don't know exist') drove 4.1% CTR at $39 CPA — 64% above Question and 128% above Promise. On static formats, fear-of-loss hooks create instant relevance: the reader processes the threat in under a second without needing body copy. The competitive framing makes the pain feel imminent, not abstract. B2B buyers on Meta respond to urgency they can already feel.",
        nextAction: "Lock Negative Hook + Static Image. Test 4 body copy angles: Pain Point, Mechanism Reveal, Social Proof, Fear + Relief — keep hook headline identical across all variants.",
      },
    },

    // ── SA03 — Angle Test on Negative Hook (running, no learning yet) ──────────
    {
      id: bSA3V, sourceVariantId: sa2v2, platform: "Meta",
      iterationType: "VISUAL", phase: "visual",
      parentTestId: bSA2H,
      variantIds: [sa3v1, sa3v2, sa3v3, sa3v4],
      createdAt: ago(27),
      // Pain Point angle (V1) leading at 3.4% CTR / $48 CPA after 15 days
    },

  ]);

  // ── Iteration Form ───────────────────────────────────────────────────────────
  // Pre-filled with T01 winner combo (Negative Hook + Screen Recording + Customer Walkthrough + Book a Demo)
  set("iteration:form", {
    hookType:       "Negative Hook",
    primaryAngle:   "Mechanism Reveal",
    creativeFormat: "Screen Recording",
    ctaStyle:       "Book a Demo",
    roas:           "7.3",
  });
}
