// ─── MASTER HOOK TAXONOMY ────────────────────────────────────────────────────
// This is the single source of truth for all hook types in the app.
// The Hook Library page renders from this data.
// All dropdowns across Script Matrix, Iteration Engine, Creative Lab,
// and Competitor Intelligence import HOOK_TYPES from here.
// To add a new hook type, add it to HOOK_CATEGORIES — everything else updates automatically.

export const HOOK_CATEGORIES = [
  {
    id: "negative",
    type: "Negative Hook",
    emoji: "🚫",
    label: "Negative Hooks",
    color: "#ef4444",
    description:
      "Lead with a pain point, failure, or problem the audience already feels. Negative hooks work because they mirror the audience's inner monologue — when people feel understood, they keep watching. The key is specificity: the more precisely you name the frustration, the stronger the resonance.",
    examples: [
      "Stop wasting money on ads that don't convert — here's what nobody tells you.",
      "I tried every diet for 3 years and gained weight every single time.",
      "Most people quit their 9-5 and end up broker than when they started.",
    ],
  },
  {
    id: "question",
    type: "Question Hook",
    emoji: "❓",
    label: "Question Hooks",
    color: "#6366f1",
    description:
      "Open with a question your ideal customer is already asking themselves. Questions pull the viewer into a conversation and create a psychological itch that demands an answer. The best question hooks feel like they were plucked directly from the viewer's own thoughts.",
    examples: [
      "Why do some people lose 20 lbs in 60 days while others struggle for years?",
      "What if the reason your ads aren't working has nothing to do with your budget?",
      "Have you ever wondered why some coaches charge $50k and still have a waitlist?",
    ],
  },
  {
    id: "quotation",
    type: "Quotation Hook",
    emoji: "💬",
    label: "Quotation Hooks",
    color: "#f97316",
    description:
      "Open with a powerful, memorable quote that your audience immediately connects with. Quotation hooks borrow authority and emotion from someone else's words — making your opening feel more credible and less sales-y. The key is to follow the quote with your own commentary that bridges it to your message.",
    examples: [
      '"The definition of insanity is doing the same thing and expecting different results." Here\'s what that means for your ad strategy.',
      'Warren Buffett once said "Price is what you pay. Value is what you get." Most businesses have this completely backwards.',
      '"Your network is your net worth." — and here\'s the data that proves it.',
    ],
  },
  {
    id: "statistic",
    type: "Statistic Hook",
    emoji: "📊",
    label: "Statistic Hooks",
    color: "#3b82f6",
    description:
      "Lead with a striking number that surprises, shocks, or reframes reality. Statistics create instant credibility and curiosity. The most powerful stat hooks reveal a gap between what people believe and what the data actually shows — making the viewer feel they've been missing something important.",
    examples: [
      "93% of people who start a business fail within 5 years — and it's not for the reason you think.",
      "The average person spends 2 hours a day on their phone but only 11 minutes exercising.",
      "In a study of 1,200 ad accounts, the top 5% shared one thing in common.",
    ],
  },
  {
    id: "anecdotal",
    type: "Anecdotal Hook",
    emoji: "🎭",
    label: "Anecdotal Hooks",
    color: "#e879f9",
    description:
      "Share a short, relatable story — real or illustrative — that immediately connects to the viewer's experience. Anecdotal hooks work because humans are wired for narrative. The story doesn't need to be dramatic; it just needs to feel authentic and tie directly into the core message.",
    examples: [
      "Back in high school I failed every test I ever tried to study for — until I found this.",
      "My first client paid me $5. Last month that same strategy brought in $50,000.",
      "I used to spend 3 hours writing every ad. Then I stumbled onto a framework that changed everything.",
    ],
  },
  {
    id: "curiosity",
    type: "Curiosity Hook",
    emoji: "🔍",
    label: "Curiosity Hooks",
    color: "#8b5cf6",
    description:
      "Say something unexpected, counterintuitive, or mysterious that demands an explanation. Curiosity hooks exploit the brain's need for closure — once a question is opened, viewers stay to see it resolved. Avoid clickbait: the payoff must genuinely deliver on the intrigue.",
    examples: [
      "The one thing successful e-commerce brands do that their competitors think is a waste of time.",
      "I deleted all my ads for 30 days. Here's what happened to my revenue.",
      "There's a psychological pattern hidden in every viral ad from the last decade — and it's not what you'd expect.",
    ],
  },
  {
    id: "controversial",
    type: "Controversial Hook",
    emoji: "⚡",
    label: "Controversial Hooks",
    color: "#f43f5e",
    description:
      "Challenge a widely held belief, industry norm, or popular opinion. Controversial hooks create instant tension — people either strongly agree or disagree, and both reactions drive engagement. Use with caution: the controversy must be rooted in truth, not shock value alone.",
    examples: [
      "Doctors are wrong about this — and it's costing you your results.",
      "Everything the gurus teach about Facebook ads is designed to keep you paying them.",
      "The fitness industry doesn't want you to know that calorie counting is the least effective weight loss strategy.",
    ],
  },
  {
    id: "promise",
    type: "Promise Hook",
    emoji: "🤝",
    label: "Promise Hooks",
    color: "#10b981",
    description:
      "Open with a bold, specific, and believable outcome the viewer can achieve. Promise hooks work best when the result feels aspirational but attainable — too vague and it's ignored, too extreme and it triggers skepticism. Pair the promise with a time frame or mechanism to add credibility.",
    examples: [
      "In the next 90 seconds, I'm going to show you exactly how to cut your ad spend in half.",
      "By the end of this video, you'll have a complete hook-writing system that works for any niche.",
      "This single framework helped 200 clients add $10k/month to their coaching business.",
    ],
  },
  {
    id: "result-oriented",
    type: "Result-Oriented Hook",
    emoji: "🏆",
    label: "Result-Oriented Hooks",
    color: "#06b6d4",
    description:
      "Lead directly with the outcome — start at the end result and let the process explain itself. Result-oriented hooks work by making the viewer instantly imagine themselves achieving the same thing. The implication is clear: the solution already exists, you just need to follow it.",
    examples: [
      "Here's how I made $10k in 30 days with a list of just 200 people.",
      "This exact system is how our clients consistently book 20+ calls per week without paid ads.",
      "In 90 days, she went from 0 to 50,000 followers — here's the exact playbook.",
    ],
  },
  {
    id: "story",
    type: "Story Hook",
    emoji: "📖",
    label: "Story Hooks",
    color: "#f59e0b",
    description:
      "Open mid-scene in a relatable, emotionally resonant moment from a real story. Story hooks bypass resistance because they feel human, not like an ad. The trick is to start at the most dramatic or emotionally charged moment — skip the backstory and drop the viewer straight into the action.",
    examples: [
      "I was sitting in my car outside the office, crying, because I'd just lost my biggest client.",
      "Three months ago I had $200 in my account. Today I just hit $100k in a single month.",
      "She told me I was crazy for quitting my job with no backup plan. That was two years ago.",
    ],
  },
];

// ── Derived exports (all generated from HOOK_CATEGORIES) ─────────────────────

export const HOOK_TYPES: string[] = HOOK_CATEGORIES.map(h => h.type);

export const HOOK_DESC: Record<string, string> = Object.fromEntries(
  HOOK_CATEGORIES.map(h => [h.type, h.description])
);

// Suggested alternative hooks to test next, keyed by current winning hook type
export const HOOK_NEXT: Record<string, string[]> = {
  "Negative Hook":      ["Curiosity Hook", "Statistic Hook", "Controversial Hook", "Question Hook"],
  "Question Hook":      ["Curiosity Hook", "Negative Hook", "Statistic Hook", "Anecdotal Hook"],
  "Quotation Hook":     ["Anecdotal Hook", "Story Hook", "Promise Hook", "Curiosity Hook"],
  "Statistic Hook":     ["Curiosity Hook", "Negative Hook", "Controversial Hook", "Result-Oriented Hook"],
  "Anecdotal Hook":     ["Curiosity Hook", "Question Hook", "Negative Hook", "Story Hook"],
  "Curiosity Hook":     ["Negative Hook", "Statistic Hook", "Controversial Hook", "Question Hook"],
  "Controversial Hook": ["Curiosity Hook", "Negative Hook", "Statistic Hook", "Anecdotal Hook"],
  "Promise Hook":       ["Result-Oriented Hook", "Statistic Hook", "Curiosity Hook", "Question Hook"],
  "Result-Oriented Hook": ["Promise Hook", "Story Hook", "Statistic Hook", "Negative Hook"],
  "Story Hook":         ["Anecdotal Hook", "Result-Oriented Hook", "Negative Hook", "Curiosity Hook"],
};
