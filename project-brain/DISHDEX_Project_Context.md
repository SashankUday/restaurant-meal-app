# DISHDEX — Project Context Export

*Working name: DISHDEX. Compiled from project history as of July 23, 2026. This was an older name of the current name*

---

## 1. Purpose & Core Concept

DISHDEX is a **dish-level restaurant discovery app**, targeting **Oxford students** as the initial launch market. It solves the friction in the "we should eat out → food on the table" conversion:

- Group decision paralysis
- Difficulty identifying specific dishes (not just restaurants)
- Inability to surface unknown/undiscovered restaurants

The core model is **IMDB-style rating applied to individual dishes**, rather than restaurants as a whole.

**Why Oxford:** small, student-dense, walkable, and socially networked through the college system — a contained environment ideal for bootstrapping a cold-start network product.

**Business model:** consumer-first, with restaurants monetised via **sponsored slots**. Firm principle: organic rankings must never be influenced by payment — sponsored slots are clearly labelled and sit *above* an honest, untouched organic index (Google-style separation).

---

## 2. Evolution of the Idea

The product has evolved across conversations:

- **Early concept:** a personal dish diary / taste-matching app (see original handoff doc, Section 8 below), modelled on flavour-attribute tagging and calendar-driven logging.
- **Current direction:** a more structured utility — **dish search first, ratings as the trust layer, and a lottery mechanic as the ignition mechanism** to bootstrap rating data before organic loops (search → eat → rate) can sustain themselves.

This is a meaningful pivot from "diary app that builds recommendations over time" toward "searchable dish index that needs to hit critical mass fast."

---

## 3. Current State — What's Been Built

### a) Working demo
A complete single-file React demo covering the full Phase 1 core loop:

- **Dish search** with sorting (top-rated, price ascending) and dietary/allergen filtering — allergen conflicts **hide** dishes entirely rather than flagging them
- **14 seeded Oxford dishes** across **7 restaurants**
- **Sponsored slot system**: clearly labelled "paid placement — never affects rankings," distinct visual treatment, and respects allergen/dietary filters like organic results
- **Post-meal rating flow**: triggered ~3 hours after a dish is marked as eaten; 0–10 score grid plus a fixed tag menu (max 3 tags)
- **Receipt scanning for lottery entry**: £500 prize pool, public leaderboard
- **Profile tab** for saved filters

### b) Developer handoff spec (markdown)
Covers:
- Phase 1 build scope
- Data model
- Search/filter behaviour
- Ranking integrity rules
- Lottery fraud-resistance mechanics — **receipt-anchored verification**; photos are optional, unscored enrichment only
- Pattern-level fraud detection
- Admin account scoping: restaurant admins can edit only their own menus; developer admins have full access
- Allergen disclaimer copy flagged for **solicitor review**

### c) Open questions flagged for review
- Whether the sponsored card's visual weight is appropriately balanced against organic listings
- Whether the 3-hour post-meal rating prompt needs an explicit "I'm going to eat this" tap, or should trigger from any search action (the 180-minute rule in the spec implies the latter)

---

## 4. On the Horizon

- **Pre-build validation**: run the lottery mechanic by hand in one Oxford college before writing production code (recommended next step)
- **Phase 2 (explicitly deferred)**: group tables feature, recommendation engine
- **Undecided**: final app name, launch geography beyond Oxford, restaurant incentive design beyond sponsored slots
- Allergen disclaimer copy requires solicitor sign-off before launch

---

## 5. Key Principles & Learnings

- **Cold start is the central strategic risk.** The lottery mechanic (£500 pool, public leaderboard, receipt verification) is the deliberate ignition mechanism, seeding ratings before the organic search-to-rate loop (~180 minutes) can sustain itself.
- **Receipts over photos for fraud resistance.** Receipts earn lottery entries; photos are optional enrichment only — photos were explicitly rejected as the *primary* fraud rail because they're the weaker mechanism.
- **Sponsored slots done right**: clearly labelled, filtered by the user's dietary/allergen constraints just like organic results, structurally separated from organic rankings. Undermining either trust pillar (honest ranking, safe results) would be fatal to the product.
- **Validate behaviour before building infrastructure.** Carries forward from the earliest framing of the idea (see two-week logging experiment below) — the sequencing principle persists even as the product shape changed.
- **Defer complexity deliberately.** Group features, recommendations, and community/creator layers are parked in later phases to keep Phase 1 focused.

---

## 6. Approach & Working Style

- Sashank engages Claude as a **direct, opinionated thought partner** and expects substantive pushback; he responds well to challenge and holds his position confidently when he disagrees (e.g., the sponsored-slots trust debate).
- Product decisions are made iteratively through **structured pressure-testing sessions**, with Claude expected to stress-test ideas before producing handoff artifacts.
- Preference for **concrete outputs** at the end of sessions: handoff markdown specs, working demos, memory entries.
- Strong instinct to defer non-core features and validate behaviour before building infrastructure.

---

## 7. Tools, References & Integrations

- **React** — single-file demo architecture used for the prototype
- **Reference products**:
  - Beli — visual design, booking flow
  - Letterboxd — rating culture, ambient creator presence
  - IMDB — the dish rating model
  - Google — sponsored-slot-above-honest-index model
- **Downstream integrations noted**: Mela, Osta — recipe export hand-off rather than building cooking features natively; deep-link to existing booking platforms rather than native booking

---

## 8. Original Handoff Doc — "Dining Diary App" (Earlier Framing)

This is the earlier, fuller version of the concept, preserved for reference. Several elements below (flavour-attribute tagging, calendar-driven recommendations, Wrapped-style growth feature) are **not yet reconciled** with the current lottery/search-first direction and represent either superseded thinking or a longer-term Phase 2/3 roadmap.

### Idea in one paragraph
An app for logging restaurant dishes (not restaurants), with photos, ratings, and flavour-attribute tags, that builds a personal dish diary first and a taste-matching recommendation engine second. Two anchor problems: "I can't remember what I loved here last time" (single-player, day-one value) and "what should I order somewhere new" (network feature, unlocks later).

### Phasing
- **Phase 1 — Personal diary, no network needed.** Log + photo + rating + notes + flavour tags, plus AI recipe export handing off to Mela/Osta rather than building cooking in-house.
- **Phase 2 — Recommendations.** Taste matching via collaborative filtering (user overlap) and content-based filtering (flavour-attribute preferences). Calendar-driven pre-meal recommendations with post-meal verification.
- **Phase 3 — Distribution.** Creator/community surfaces, Letterboxd-style. Deferred — competes for attention with Instagram/TikTok/Beli and stacks a second cold-start problem on the first.

### Key design decisions
- **Build for the meal-logger persona first** — the only persona that gets value before the network exists, and the one generating data the other three personas (indecisive diners, new-restaurant browsers, group deciders) will need later.
- **Flavour-attribute tagging as the recommendation engine.** Pure collaborative filtering struggles for restaurant dishes (low eating frequency, sparse overlap matrices). Content-based tag matching (spicy, acidic, rich, herbaceous, texture) works from day one and degrades gracefully with thin data. Captured via taps/sliders, not free text; restaurants pre-tag, users confirm/adjust.
- **Logging friction is the central design problem** — target sub-10-second logs via:
  - Geofencing to detect restaurant and pre-load menu
  - Photo-first capture, tag later
  - Calendar integration as a predictive lever: sees a booking, recommends a dish before the meal, follows up after with "did you order that?" — inverts the usual logging timing and produces high-quality predicted/chosen/rated training data.
- **Wrapped-style annual feature** as a growth channel (screenshot-driven, friend-endorsed free acquisition) and retention payoff — build earlier than feels justified.
- **Recipe export stays in the dining lane** — hand off to Mela/Osta, don't drift into building a cooking app; also opens partnership angles.

### Deferred or rejected
- Native booking — deep-link instead of building (OpenTable/Resy own this)
- Creator communities as a launch pillar — fine as ambient texture, dangerous as a launch feature
- Supermarket/ready-meal expansion — different company, parked until dining diary has real retention
- Deep brand partnerships before validation — start with share-sheet export

### Open risks
- Will people actually log consistently? (Every feature above assumes this behaviour exists.)
- Cofounder needed eventually, but easier to recruit once logging behaviour is proven
- Google review scraping for seed data — useful for breadth, against ToS, needs legal advice; seeds dish list only, not the flavour-attribute layer
- Calendar parsing reliability — event titles are often messy/ambiguous
- **Beli is the obvious competitor** and could add dish-level logging quickly — flavour-attribute layer is the strongest defensibility answer; "dish not restaurant" alone isn't enough
- Restaurant-incentive trust risk — "featured more" must never influence the taste-match algorithm, or recommendation credibility collapses

### Proposed immediate next step (from this earlier doc)
A two-week personal validation experiment in a notes app before any code or cofounder search — log every restaurant meal by hand (dish, photo, rating, flavour tags) to test whether the underlying logging behaviour exists, starting with the founder himself.

### Still undecided (from this earlier doc)
- Whether to keep designing or shift to validation now
- App name
- Geographic scope of launch
- Business model (not yet discussed at that stage)
- Restaurant-side incentive design beyond "featured more"
- Flavour-attribute schema structure (axes, count, sliders vs. binary tags)

---

*Note: Sections 1–7 reflect the current, more developed state of the project (dish search + ratings + lottery mechanic). Section 8 is the earlier framing and is included for continuity/reference — some elements (flavour tagging, calendar integration, Wrapped feature) may be superseded or deferred to a later phase rather than active in the current build.*
