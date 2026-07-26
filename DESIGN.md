---
name: MINT
description: Open-source intelligence network for verified OSINT analysts and the community
colors:
  # Void (dark) theme — canonical
  void-black: "#000000"
  terminal-surface: "#0a0a0a"
  elevated-surface: "#111111"
  void-border: "#1e1e1e"
  radar-cyan: "#4dc8e8"
  alert-red: "#e84848"
  signal-green: "#30d880"
  amber-alert: "#e8a020"
  cold-light: "#e0e8f0"
  dark-slate: "#404858"
  # Ghost (light) theme
  linen-bg: "#f8f7f5"
  ghost-surface: "#ffffff"
  ghost-surface2: "#f0ede8"
  stone-border: "#e0dbd4"
  crisis-red: "#c0404a"
  signal-purple: "#8a3a8a"
  forest-green: "#2a7a4a"
  caution-amber: "#b06020"
  dark-ink: "#1a1614"
  warm-ash: "#8a7a70"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "9px"
    fontWeight: 600
    letterSpacing: "2px"
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.5px"
rounded:
  sharp: "2px"
  sm: "3px"
  md: "4px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.radar-cyan}"
    textColor: "{colors.void-black}"
    rounded: "{rounded.md}"
    padding: "6px 14px"
    typography: "{typography.mono}"
  button-primary-hover:
    backgroundColor: "{colors.radar-cyan}"
    textColor: "{colors.void-black}"
    rounded: "{rounded.md}"
    padding: "6px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.radar-cyan}"
    rounded: "{rounded.md}"
    padding: "6px 14px"
  source-chip:
    backgroundColor: "{colors.elevated-surface}"
    textColor: "{colors.dark-slate}"
    rounded: "{rounded.sm}"
    padding: "2px 7px"
    typography: "{typography.label}"
  breaking-tag:
    backgroundColor: "{colors.alert-red}"
    textColor: "#ffffff"
    rounded: "{rounded.sharp}"
    padding: "2px 6px"
    typography: "{typography.label}"
---

# Design System: MINT

## Overview

**Creative North Star: "The Intelligence Terminal"**

MINT's visual language treats the interface as a live ops display — sparse, monochrome-first, chrome stripped to near-zero. Information does not perform; it reports. The design borrows its aesthetic from terminal tooling and signals analysis: high information density, monospaced type for structural data, a sans-serif for prose, and an accent palette that functions as a signal rather than decoration.

Two themes share the same skeleton. **Void** (dark, canonical) is a command center at 02:00 — pure black field, electric cyan accent, surfaces barely elevated from the background. **Ghost** (light) is the cold morning briefing — warm linen ground, crisis red for urgency, the same precision without the darkness. Both modes refuse visual softness; there are no gradients, no box shadows, no decorative roundness. The interface disappears; what remains is evidence and verdict.

Motion exists only to carry meaning. The theme-switch is a radar sweep — a horizontal scan line that wipes the screen and rebuilds it. Headlines decrypt on transition: opacity, letter-spacing, and blur resolve in sequence. Live states blink. Story cards gain a 3px accent stripe on hover. Nothing animates without an intelligence reason.

**Key Characteristics:**
- Dual-theme (Void/Ghost) — same token skeleton, opposite ambient mood; Void is canonical
- JetBrains Mono for all structural data, labels, timestamps, and chrome; Inter for readable prose and headlines
- Flat tonal depth: no box shadows; depth conveyed through bg → surface → surface2 stacking and backdrop-blur on floats
- Accent at ≤10% screen presence — rarity is the mechanism of emphasis
- Motion as information: every animation maps to a state in the intelligence workflow

## Colors

Two parallel palettes sharing semantic token names (`var(--accent)`, `var(--bg)`, etc.), switched via `[data-theme]` attribute. Void values are canonical; Ghost equivalents documented per role.

### Primary
- **Radar Cyan** (`#4dc8e8`, Void `--accent`): Primary action accent in dark mode — active nav rail, CTA buttons, selected story stripe, confidence bar fill. Electric without warmth.
- **Crisis Red** (`#c0404a`, Ghost `--accent`): Primary accent in light mode. Same structural roles as Radar Cyan. Muted crimson — closer to a threat classification color than a brand red.

### Secondary
- **Alert Red** (`#e84848`, Void `--accent2`) / **Signal Purple** (`#8a3a8a`, Ghost `--accent2`): The live-and-breaking color. Runs all urgency states — live dot, breaking tag, live indicator, nav badge. In Ghost, Signal Purple carries the same role.
- **Signal Green** (`#30d880`, Void `--verified`) / **Forest Green** (`#2a7a4a`, Ghost `--verified`): Verification state exclusively. Applied to verified badges, the vdot in source chips, and confirmed-source indicators. Never decorative.
- **Amber Alert** (`#e8a020`, Void `--warn`) / **Caution Amber** (`#b06020`, Ghost `--warn`): Single-source data quality warning. The only warm-hue exception in the system.

### Neutral
- **Void Black** (`#000000`, Void `--bg`) / **Linen Bg** (`#f8f7f5`, Ghost `--bg`): Page background. Void: absolute black — the field everything sits on. Ghost: warm off-white with faint paper-tone.
- **Terminal Surface** (`#0a0a0a`, Void `--surface`) / **Ghost White** (`#ffffff`, Ghost `--surface`): Card and sidebar surface — barely elevated from the background.
- **Elevated Surface** (`#111111`, Void `--surface2`) / **Ghost Surface 2** (`#f0ede8`, Ghost `--surface2`): Secondary surface for hover states and nested containers.
- **Void Border** (`#1e1e1e`, Void `--border`) / **Stone Border** (`#e0dbd4`, Ghost `--border`): Structural dividers. Barely visible — enough to separate, not enough to compete.
- **Cold Light** (`#e0e8f0`, Void `--text`) / **Dark Ink** (`#1a1614`, Ghost `--text`): Primary body text.
- **Dark Slate** (`#404858`, Void `--muted`) / **Warm Ash** (`#8a7a70`, Ghost `--muted`): Timestamps, handles, counts, inactive nav items.

### Named Rules
**The Signal Rule.** The accent color appears on ≤10% of any given screen — one active state, one CTA, one live indicator per view. Every additional use dilutes the signal.

**The Rarity Rule.** Verified green, amber alert, and the secondary accent are status colors. They appear only when the underlying status is factually true. A verified badge on an unverified channel, or a warning without a real data-quality issue, is a false signal.

## Typography

**Body Font:** Inter, weights 300–600 (fallback: -apple-system, BlinkMacSystemFont, system-ui, sans-serif)
**Label / Data Font:** JetBrains Mono, weights 400–600 (fallback: monospace)

**Character:** The pairing reads like an analyst's toolchain. Inter delivers human-readable intelligence in clean, efficient prose; JetBrains Mono renders structured metadata the way a terminal would. Together they signal professional-grade tooling, not a consumer feed.

### Hierarchy
- **Display** (Inter, 600, 32px, line-height 1.2, letter-spacing -0.02em): Page-level headers only — landing page, auth screen titles. Rare in the app shell.
- **Headline** (Inter, 500, 13px, line-height 1.5): Story card headlines and detail panel titles. The primary information-reading size.
- **Body** (Inter, 400, 12px, line-height 1.6): Post bodies, descriptions, narrative prose. Soft max-width ~65ch for readability.
- **Label** (JetBrains Mono, 600, 9px, letter-spacing 2px, UPPERCASE): Section headers, nav group labels, status tags, topbar titles. Always uppercase.
- **Mono** (JetBrains Mono, 400–600, 10–13px, letter-spacing 0.5–2px): Timestamps, handles, nav items, button text, counts, metadata.

### Named Rules
**The Mono/Sans Divide.** JetBrains Mono carries data: timestamps, labels, nav sections, handles, tags, button text, logo type. Inter carries meaning: headlines, post bodies, names, prose. Reversing the assignment breaks the intelligence/prose hierarchy.

**The Compact Scale Rule.** The type scale spans 8–13px across the entire app shell. This is the information density target, not a limitation. Large decorative type is not part of this system.

## Layout

The main shell is a persistent three-column split: a fixed **sidebar (220px)** on the left, a fixed-width **intel feed column (360px)** in the middle, and a flex-1 **detail / content panel** on the right. A **topbar (52px tall)** spans the main area above both feed and detail. The three-column structure mirrors a classic email client — a spatial metaphor immediately legible to analysts accustomed to triage workflows.

On mobile (≤768px): the sidebar becomes an off-canvas drawer (transforms in from left), the feed and detail stack vertically, and the detail panel hides until a story is selected. A backdrop overlay (rgba(0,0,0,0.5) + blur 2px) covers the content when the drawer is open.

**Spacing rhythm:** 8px base unit. Card internal padding is 14px vertical / 16px horizontal. Sidebar padding is 18–20px horizontal. Section headers use 10px vertical padding. Topbar is 52px fixed. Density is high by design — maximum scannable stories above the fold.

## Elevation & Depth

This system is **flat-by-default, tonal-only**. There are no `box-shadow` declarations in the production interface. Depth is conveyed through three mechanisms:

1. **Surface stacking:** `--bg` < `--surface` < `--surface2`. Sidebar and topbar sit on `--surface`; hover states and nested containers step to `--surface2`.
2. **Opacity + backdrop-blur on floats:** Sticky section headers use a near-opaque bg color (95%) with `backdrop-filter: blur(8px)`. Tooltips, map overlays, and modal panels use 93–97% opaque backgrounds with the same blur. This creates the illusion of a floating layer without projection.
3. **Borders as altitude markers:** `1px solid var(--border)` separates surface boundaries. The border is the edge, not decoration.

### Named Rules
**The Shadowless Rule.** No `box-shadow` in the UI. When a surface needs to feel elevated, step to `--surface2` or apply `backdrop-filter: blur(8px)` with a near-opaque background. Projection does not exist in this system.

## Shapes

The form language is **angular and tight**. Decorative roundness is absent.

- **Sharp (2px):** Classification tags, breaking badges. Near-square corners signal precision and urgency.
- **Default (3–4px):** Source chips (3px), inputs, buttons, and all interactive elements (4px). The standard corner for every interactive primitive.
- **Pill (10px or 9999px):** Nav count badges (10px), avatars (50%). Reserved for circular identity shapes and quantity pills.

The **MINT logomark** is a hexagonal diamond clip-path (`polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`). This is the one signature geometry — it appears in the logo and nowhere else.

The **active nav rail** — `border-left: 2px solid var(--accent)` — is the system's primary location indicator. This 2px line is the accent at its most minimal.

### Named Rules
**The 4px Ceiling Rule.** No interactive element uses border-radius above 4px. Only nav badges (10px pill) and modal containers (10px) exceed this. The system is angular; softness is not part of the visual contract.

## Components

### Buttons
JetBrains Mono, 11px, 0.5px letter-spacing. Two variants:
- **Primary (filled):** `background: var(--accent)`, `color: var(--bg)`, no border, `border-radius: 4px`, `padding: 6px 14px`. One primary button per view.
- **Ghost (outline):** `background: transparent`, `border: 1px solid var(--accent)`, `color: var(--accent)`, `border-radius: 4px`, `padding: 6px 14px`. Default for most topbar actions.
- Transition: `all 0.15s ease` on both. Hover: `background: var(--topbar-hover)` (accent at 10% opacity).

### Story Cards
`padding: 14px 16px`, separated by 1px bottom border. A `::before` pseudo-element (`width: 3px`, `position: absolute left`) is transparent at rest, transitions to `var(--accent)` on hover and active. Breaking stories set the stripe to `var(--accent2)`. Active card: `background: var(--story-active-bg)` (accent at 4–5% opacity). Transition: `background 0.15s`.

### Source Chips
Inline attribution components: `background: var(--surface2)`, `border: 1px solid var(--border)`, `border-radius: 3px`, `padding: 2px 7px`, JetBrains Mono 9px. A 5px verified dot (`background: var(--verified)`, border-radius 50%) precedes the channel name. Verified channels also show a `BadgeCheck` icon (9px, `color: var(--verified)`) after the name.

### Breaking Tag
`background: var(--accent2)`, `color: #fff`, `border-radius: 2px`, `padding: 2px 6px`. JetBrains Mono 8px, letter-spacing 1.5px, uppercase. Animated: `flashTag` (2s ease-in-out infinite — opacity between 1.0 and 0.6). The only animated badge in the feed.

### Navigation
Sidebar nav items: `padding: 9px 18px`, Inter 13px, `color: var(--muted)`, `border-left: 2px solid transparent`. Hover: `background: var(--surface2)`, `color: var(--text)`. Active: `background: var(--active-bg)`, `color: var(--accent)`, `border-left-color: var(--accent)`. Transition: `all 0.15s`. Nav section labels: JetBrains Mono 9px, 2px letter-spacing, uppercase, `color: var(--muted)`. Count badges: JetBrains Mono 9px, `background: var(--accent2)`, `border-radius: 10px`, `padding: 1px 6px`.

### Post Cards
Community feed posts mirror story card density (`padding: 14px 16px`). Author avatars are 28–32px circles with `background: var(--accent)` and mono initials. Post body: Inter 12px, line-height 1.6, `color: var(--muted)`. Action row (reply, like, share): JetBrains Mono 10px, `color: var(--muted)`, hover `color: var(--accent)`. Active state: `transform: scale(0.85)`, `transition: transform 160ms ease-out`.

### Inputs / Fields
`border: 1px solid var(--border)`, `border-radius: 4px`, `padding: 10px 14px`, `background: transparent`, `color: var(--text)`, Inter 13px. Focus state: `border-color: var(--accent)`. Labels: JetBrains Mono 9px, uppercase, 2px letter-spacing.

### Signature Component: The Confidence Bar
Intel stories display a percentage-fill confidence bar beneath the headline — a thin horizontal strip filled with `var(--accent)`. On mount: a sparkle/glow entrance animation. On story switch: fill re-animates from 0. This is the primary data-visualization primitive and the most distinctive component in the system.

## Do's and Don'ts

### Do:
- **Do** use JetBrains Mono for all timestamps, labels, counts, tags, handles, and button text — and Inter for all prose, headlines, and names. The divide is absolute.
- **Do** apply the accent as a signal: one CTA, one active state, one live indicator per view.
- **Do** use the 3px left-rail stripe (`border-left: 2–3px solid var(--accent)`) as the primary active/selected indicator on list items and nav.
- **Do** keep border-radius ≤4px for interactive elements, 2px for status tags, 10px only for pill badges and modal containers.
- **Do** design in Void (dark) first; verify Ghost (light) second. The canonical experience is dark.
- **Do** use `backdrop-filter: blur(8px)` with a near-opaque background for floating/sticky surfaces — not box-shadows.
- **Do** keep type between 8–13px in the app shell. The interface is dense by design.

### Don't:
- **Don't** add `box-shadow`. This system has none. Tonal layering (bg → surface → surface2) is the depth model.
- **Don't** use the accent color for decorative purposes — borders, icons, dividers — unless they carry active state or selection meaning.
- **Don't** use Inter for metadata, timestamps, or labels; don't use JetBrains Mono for body text or headlines.
- **Don't** round interactive elements above 4px. The form language is angular.
- **Don't** animate for decoration. Every animation in this system maps to a concrete intelligence-workflow state: transitions, live signals, theme changes, loading.
- **Don't** use Signal Green outside of verification state. It is a status color, not a brand accent.
- **Don't** introduce gradients. The system is flat; gradients break the terminal aesthetic.
- **Don't** use monospace as a costume for "technical." It is reserved for actual data, measurements, and structural labels.
