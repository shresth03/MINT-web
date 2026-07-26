# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Verified OSINT analysts (producers)** — security researchers, investigative journalists, and intelligence professionals who apply for verified status and post intel stories. They need sourced, credibility-tracked publishing tools and a network that rewards accuracy.

**Informed general audience (consumers)** — geopolitics followers, news-literate civilians, and adjacent researchers who want a higher-signal alternative to Twitter/Telegram for following fast-moving events. They follow channels, discuss posts, add community notes, and track confidence scores.

The network is two-sided: analysts produce, the community corroborates and consumes. Both roles are essential to the platform's intelligence loop.

## Product Purpose

MINT is a real-time open-source intelligence network where verified analysts compile and publish breaking-event stories, and the community challenges, supports, and refines those stories through source-backed annotations. Success means an intelligence report on MINT is more verifiable and more trusted than the same report on any general social platform.

## Positioning

The full stack that Twitter and Telegram lack: **verified analyst tier + AI-compiled multi-source stories + community corroboration**. No single competitor combines application-reviewed analyst credibility scoring, automatic multi-source story compilation with confidence scores, and adversarial community notes with citations. Each element alone is replicable; together they form a self-reinforcing trust system.

## Operating Context

- **Breaking events:** users arrive during live crises — conflicts, cyber incidents, geopolitical flashpoints — where speed and accuracy are in direct tension. The interface must surface signal under load.
- **Source verification ritual:** analysts and community members habitually cite sources. The platform must make citation friction-free and make unsourced claims visually distinguishable.
- **Multi-device, often desktop:** analysts correlating sources work on larger screens; general audience skims on mobile. Both paths must be complete.
- **Dark environment:** "Void" dark theme is the expected default for serious users. Light "Ghost" theme exists but dark is the ambient mode for the core audience.

## Capabilities and Constraints

- **Intel Stories** — multi-source posts compiled into a single story with per-source confidence scoring and AI-synthesised summary.
- **Event Map** — D3.js world map with live region event counts and geographic filtering.
- **Verified Channels** — application and admin review system; approved analysts receive a verified badge and credibility score.
- **Community Notes** — source-backed annotations that users can add to any intel story; community votes resolve contested claims.
- **Live Broadcasts** — real-time stream rooms tied to verified channels.
- **General Feed** — public real-time post board with likes and replies (open to all users, not just analysts).
- **Trending & Reels** — short-form intel clips and trending topic surface.
- **Roles**: `public` (read + post in General Feed), `osint` (+ post Intel Stories, go live), `admin` (+ review applications).
- **Tech**: React + Vite, Tailwind CSS v4, Supabase (PostgreSQL + Auth + Realtime subscriptions), D3.js, Vercel deployment.
- **Indic language support** partially implemented; Sarvam API key pending (falls back to Claude in the interim).

## Brand Commitments

- **Name**: MINT — fixed.
- **Dual theme**: "Ghost" (light, warm off-white `#f8f7f5`, red accent `#c0404a`) and "Void" (dark, pure black `#000000`, cyan accent `#4dc8e8`). Both themes are shipped and user-switchable; the radar-sweep transition between them is a signature interaction.
- **Typography**: JetBrains Mono (monospace, for data and labels) + Inter (sans-serif, for prose and UI). The mono/sans pairing signals intelligence tooling, not consumer social.
- **Accent palette**: muted red and deep cyan — deliberately non-social, closer to terminal and ops tooling.
- **No logo or wordmark asset on file** — the name "MINT" rendered in JetBrains Mono functions as the wordmark.

## Evidence on Hand

- Full working web application with Supabase backend and live Vercel deployment.
- Implemented features: Intel Feed, Event Map, Verified Channels, Admin Dashboard, Live Broadcasts, General Feed, Messages, Trending, Reels, Community Notes (EditNoteSection).
- Two complete theme systems with CSS custom properties and animated transition.
- No external press, case studies, or testimonials on file; future work must not fabricate them.

## Product Principles

1. **Signal over noise.** Every surface prioritises verifiable, sourced information. Unverified content is visually subordinate to verified intel.
2. **Trust is earned, not assumed.** Analyst verification, confidence scores, and community corroboration are the mechanism — not algorithmic amplification.
3. **Speed without sacrifice.** Breaking events demand real-time performance. Latency and visual clutter are failure modes in a crisis context.
4. **The tool disappears.** The interface should recede; the intelligence should surface. Design for the analyst hunched over three screens at 2 AM, not the casual scroller.
5. **Dark is canonical.** "Void" is the expected ambient mode for the core user. Every design decision must look intentional in dark first.

## Accessibility & Inclusion

No product-specific accessibility requirement established. Standard WCAG 2.1 AA applies. High-contrast tokens in both themes should be preserved.
