# Mooduel Design Language

Reference document for all UI decisions. Read this before touching any component.

---

## Voice

Irreverent, direct, confident. The Pudding's tone — we take the data seriously
but not ourselves. Copy should feel like a smart friend explaining something
they're excited about, not a brand talking at you.

---

## Color

High contrast. Bright, saturated colors on dark backgrounds. Not pastel, not muted,
not glowing — *vivid*.

```
Background:     oklch(0.07 0 0)        — near black
Surface:        oklch(0.10 0 0)        — cards, panels (no glass morphism)
Border:         oklch(0.20 0 0)        — subtle, structural only
Text primary:   oklch(0.97 0 0)        — near white
Text secondary: oklch(0.55 0 0)        — muted, never invisible

Pink:    #E91E8C    — primary accent, CTAs
Coral:   #FF6B6B    — warmth, alerts
Purple:  #8B5CF6    — secondary accent, data
Green:   #1ED760    — success, positive values
Orange:  #F97316    — warnings, categories
Yellow:  #FBBF24    — highlights, badges
Blue:    #38BDF8    — links, information
```

### Rules
- No gradients on backgrounds. Flat color only.
- Gradients allowed on text (sparingly) and small accent elements.
- No glow effects, no box-shadow blurs > 1px, no neon.
- Color used for meaning, not decoration. Every colored element answers: "why is this colored?"
- WCAG AAA contrast target: 7:1 for body text, 4.5:1 for headings, 3:1 for UI elements.

---

## Typography

GOV.UK-inspired: large, bold, high contrast. Type does the heavy lifting.

```
Display:  Space Grotesk — headings, titles, numbers
Body:     Inter — everything else
Mono:     Geist Mono — code, data values, JSON

Sizes:
  Hero:      2.5rem / 40px  — bold 700
  Section:   2rem / 32px    — bold 700
  Subsection: 1.25rem / 20px — semibold 600
  Body:      1rem / 16px    — regular 400
  Small:     0.875rem / 14px — labels, captions
  Micro:     0.75rem / 12px  — badges, metadata

Line height: 1.5 for body, 1.2 for headings
Letter spacing: -0.01em for headings, normal for body
```

### Rules
- Headings are big and bold. No timid headings.
- One font weight per element — don't mix regular and bold in the same line.
- Labels and categories: UPPERCASE, tracked out (0.15em+), small size, colored.
- No italic except for vibe sentences and quotes.
- Hierarchy through size and weight, not through color.

---

## Layout

Bento grid — varying card sizes that create information hierarchy. Not a
uniform grid of identical cards.

```
Max width:   1200px
Grid:        CSS Grid with varying spans
Columns:     12-column base
Gutters:     16px (mobile), 24px (desktop)
Section gap: 64px minimum between major sections
```

### Rules
- Asymmetric layouts preferred over centered symmetric ones.
- Left-align text. Center only for hero and section headings.
- White space is structural — use it to create groups, not just padding.
- Accordions for hiding secondary information. Not tabs, not toggles — accordions.
  Tabs only when content is parallel (e.g., FAQ / Links / Authors).
- No horizontal scroll. No carousel auto-play on the landing page body
  (the data carousel is an exception — it's an interactive explainer, not a slider).
- Sticky elements: nav only. Nothing else sticks.

---

## Border Radius

**Mooduel: 4px** — `border-radius: 4px` everywhere. Buttons, cards, inputs, badges.
One value. No exceptions. Not zero (that's Beautiful Tree's territory — serious,
professional). Not 8px+ (that's the AI-generic "friendly" look). 4px says:
"we're approachable but we mean business."

**Beautiful Tree: 0px** — sharp corners signal intellectual rigor.

---

## Animation

Emil Kowalski's principles. Animation communicates, it does not decorate.

```
Easing:
  Enter/appear:  cubic-bezier(0.16, 1, 0.3, 1)     — ease-out
  On-screen:     cubic-bezier(0.65, 0, 0.35, 1)     — ease-in-out
  NEVER:         ease-in for any UI element

Duration:
  Button press:  100ms
  Hover state:   150ms
  Tooltip:       150ms
  Dropdown:      200ms
  Accordion:     250ms
  Modal/drawer:  300ms
  Page section:  never > 300ms for UI, up to 500ms for scroll-triggered reveals

Button press: scale(0.97) — subtle physical feedback
```

### Rules
- CSS transitions for everything possible. Framer Motion only for:
  layout animations, exit animations (AnimatePresence), gestures.
- Only animate `transform` and `opacity`. Never animate width, height, top, left.
- Hover states on everything interactive. Users should always know what's clickable.
- Scroll-triggered reveals: fade-up with 20-30px offset, staggered. Not dramatic.
- `prefers-reduced-motion`: reduce, don't remove. Keep opacity changes, drop movement.
- **Performance is non-negotiable.** If an animation causes jank, delete it.
  Test on throttled CPU. No heavy 3D, no shader effects, no canvas unless required.

---

## Components — What They Look Like

### Buttons
- Solid background for primary (accent color, white text)
- Border-only for secondary (accent border, accent text)
- Text-only for tertiary (accent text, underline on hover)
- All: 4px radius, scale(0.97) on press, 100ms transition
- Large hit targets: minimum 44px height, 12px horizontal padding

### Cards
- Flat background (surface color). No shadow, no blur, no glow.
- 1px border (border color). 4px radius.
- Content defines the card. Minimal internal padding (16-20px).
- Hover: border brightens slightly (150ms). That's it.

### Inputs
- Full-width by default. Label always visible above.
- 1px border, 4px radius. Focus: 2px accent border.
- Error: red border + red text below. No icons in error states.
- Large: minimum 44px height for touch targets.

### Accordions
- Full-width. Section heading is the trigger.
- Chevron rotates on open (200ms ease-in-out).
- Content slides in with height animation (250ms).
- Multiple can be open simultaneously.

### Badges / Tags
- Small, inline, colored background with contrasting text.
- 4px radius. No border. Pill shape only for status indicators.
- Removing a tag: small X, keyboard accessible.

### Tooltips
- Dark background, white text, 4px radius, 8px padding.
- Appear after 150ms hover. Skip delay on subsequent hovers (Emil's pattern).
- Position: prefer top, auto-flip if clipped.
- Max width: 280px. No complex content — use popover/dialog for that.

---

## What We Don't Do

- No glass morphism (backdrop-blur on semi-transparent backgrounds)
- No glow effects (box-shadow with colored blur)
- No neon aesthetic
- No gradients on backgrounds or large surfaces
- No uniform grid of identical cards
- No centered-everything layouts
- No border-radius > 4px
- No smooth scroll-jacking
- No heavy libraries for simple things (no Three.js for a spinning logo)
- No loading states that block the entire page
- No animations > 300ms for UI interactions
- No decorative SVG illustrations
- No emoji in UI text (data/content is fine)

---

## Performance Baseline

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 200ms
- Cumulative Layout Shift: < 0.1
- Bundle: no single JS chunk > 100KB gzipped
- Images: WebP/AVIF, lazy-loaded below fold
- Fonts: subset, preload display font, swap body font

If a design choice degrades these numbers, the design choice loses.

---

## Reference Sites

These informed the design language. Return to them when making decisions.

| Site | What we took |
|------|-------------|
| pudding.cool | Irreverent tone, high-saturation colors, per-story identity |
| ourworldindata.org | Bento layout, accordions, credibility-first communication |
| design-system.service.gov.uk | Large bold type, high contrast, task-oriented IA |
| linear.app | Systematic dark mode, four-level text hierarchy |
| letterboxd.com | Film platform restraint, poster-as-content |

---

*Every pixel earns its place. If it doesn't communicate, it doesn't exist.*
