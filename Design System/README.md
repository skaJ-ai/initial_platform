# HR AX Design System

> Design system for **HR AX Copilot** — the shared Copilot layer of the HR AX 플랫폼 (HR AX Platform).

## Product Context

**HR AX Copilot** is a work OS for HR professionals. It manages work cards (업무 카드), process assets, and evidence documents together in a single workspace. The platform sits at the intersection of human judgment and LLM collaboration — "copilot-first, selective-agent."

**Key concept:** Work is structured around 4 cognitive modes:
| Mode | Korean | Color | Purpose |
|------|--------|-------|---------|
| Diverge | 발산 | Teal `#00bfa5` | Expand possibilities, gather materials |
| Validate | 검증 | Amber `#d08700` | Surface risks, counterarguments |
| Synthesize | 종합 | Blue `#0969da` | Compress evidence into decisions |
| Write | 작성 | Green `#1b873f` | Turn thinking into usable output |

### Products / Surfaces
1. **Marketing Site** (`/`) — Landing page explaining the product
2. **Workspace App** (`/workspace`) — Authenticated HR professional workspace with sidebar nav, session canvas, work cards, knowledge library
3. **Shared Wiki** (`/wiki`) — Publicly readable wiki, no login required
4. **Ideation Points** (`/ideation-points`) — Design philosophy wiki

### Source
- **Codebase**: `skaJ-ai/AXIOM` (Next.js 15 App Router, TypeScript, Tailwind CSS + custom design tokens)
- Fonts: `/public/fonts/PretendardVariable.woff2`
- Design tokens: `src/app/globals.css`
- Brand copy: `src/lib/brand.ts`
- Components: `src/components/workspace/`, `src/components/ui/`

---

## CONTENT FUNDAMENTALS

**Language**: Korean (한국어) — all UI copy is in Korean. Product names (HR AX Copilot, HR AX 플랫폼) are mixed Korean/English.

**Tone**: Professional, structured, purposeful. Not casual. Not cheerful. The brand positions itself as a serious work tool for HR professionals, not a consumer product.

**Voice characteristics**:
- Uses "합니다" / "됩니다" formal sentence endings (formal polite register)
- Compound nouns are common: 업무 카드, 프로세스 자산, 근거 자료, 작업공간
- Short, declarative copy — no fluff
- Technical vocabulary used confidently: 엔티티, 팩트, 인사이트, 메모리 청크
- Action labels are brief: 작업공간 열기, 공유 위키 보기, 베타 시작, 로그인

**Naming conventions**:
- Brand name: `HR AX Copilot` (not shortened to just "Copilot" or "AX")
- Platform name: `HR AX 플랫폼`
- Short label: `HR AX 플랫폼` / `공통 Copilot 레이어`
- Sidebar badge: `HX` (monospace, accent blue background)

**Headlines**: Bold, tight tracking (`-0.055em`), often broken mid-sentence with `<span>` color accent for teal highlight. Large fluid type (`clamp(3.5rem, 7vw, 6.8rem)`).

**Section labels**: ALL CAPS, tiny, wide tracking (`0.14em`), Manrope 800, accent blue color. Used as eyebrow text above headings.

**Meta labels**: Monospace font, 0.75rem, tertiary color, slight wide tracking. Used for timestamps, counts, process breadcrumbs.

**No emoji** in the product UI — the interface is intentionally clean.

**Numbers**: Korean counting uses 개 (개수), e.g. "메시지 3개 · 자료 2개"

---

## VISUAL FOUNDATIONS

### Color System
**Philosophy**: "Trust within Flow" — Core Blue communicates institutional trust; Teal communicates flow and insight.

| Token | Light Value | Dark Value | Role |
|-------|-------------|------------|------|
| `--color-bg` | `#fcfcfc` | `#0a0a0a` | Page background |
| `--color-bg-elevated` | `#ffffff` | `#141414` | Cards, panels |
| `--color-bg-sunken` | `#f5f5f7` | `#0e0e0e` | Inputs, muted areas |
| `--color-text` | `#0d1f33` | `#f0f0f0` | Primary text |
| `--color-text-secondary` | `#4a6080` | `#94a3b8` | Body, descriptions |
| `--color-text-tertiary` | `#8fa5be` | `#64748b` | Meta, placeholders |
| `--color-accent` | `#0f4c81` | `#7ba7c9` | Core Blue — primary actions, brand |
| `--color-teal` | `#00bfa5` | `#4dd8c0` | Teal — CTA, Diverge mode, insights |
| `--color-border` | `#e5e7eb` | `#2a2a2a` | Default borders |

### Typography
- **Headline**: Manrope (Google Fonts) — bold, tight tracking. Used for all H1–H6.
- **Body**: Pretendard Variable — Korean-optimized sans-serif with full variable weight range (45–920).
- **Mono**: SFMono-Regular / Consolas / Liberation Mono — used for meta labels, code, process badges.

**Type scale**:
- Display: `clamp(3.5rem, 7vw, 6.8rem)`, weight 800, tracking `-0.055em`, line-height 0.92
- H2: `3rem / 2.5rem`, weight 700, tracking `-0.025em`
- Body: `0.9375rem`, line-height 1.8
- Small/meta: `0.75rem`, mono
- Section label: `0.75rem`, uppercase, tracking `0.14em`, weight 800

### Spacing
4px base grid: `--space-1` (4px) through `--space-16` (64px).

### Border Radius
- `--radius-sm`: 8px — inputs, small chips
- `--radius-md`: 12px — standard cards and panels
- `--radius-lg`: 20px — large surfaces
- `--radius-full`: 9999px — pills, badges, avatars
- Cards sometimes use `calc(var(--radius-md) + 2px)` = 14px for workspace cards
- Large surface cards use `1.75rem` (28px) or `2.4rem` (38.4px) for hero panels

### Shadows
Brand-tinted with `rgba(15, 76, 129, ...)` in light mode — shadows carry the accent blue hue:
- `--shadow-1`: subtle `0 2px 6px rgba(15,76,129,0.06)`
- `--shadow-2`: cards hover `0 4px 14px rgba(15,76,129,0.09)`
- `--shadow-3`: panels `0 8px 28px rgba(15,76,129,0.12)`
- `--shadow-4`: hero `0 16px 44px rgba(15,76,129,0.14)`
- `--shadow-5`: modals `0 24px 64px rgba(15,76,129,0.16)`

### Backgrounds & Surfaces
- Page background is near-white `#fcfcfc`, never pure white
- Cards are pure white `#ffffff` with `border: 1px solid #e5e7eb`
- Hero panels use radial gradient overlays: `radial-gradient(circle at top-left, rgba(accent-light), transparent)` layered over white
- Wiki shell uses glass-like `rgba(255,255,255,0.92)` with teal radial glow top-right
- CTA section: solid `--color-accent` (#0f4c81) background with subtle radial teal/blue highlight overlays
- No full-bleed photography; no grain; no hand-drawn illustrations
- Empty states use `radial-gradient(circle at top left, rgba(212,228,247,0.9), transparent 55%)` + `--color-bg-sunken`

### Animations & Transitions
- Duration: 120ms (fast interactions), 200ms (normal), 300ms (slow/overlays)
- Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — ease-out
- Cards hover: `translateY(-4px)` + shadow increase + border color shift to blue tint
- Buttons hover: `translateY(-1px)` + shadow or opacity change (92%)
- Topbar: sticky blur glass — `backdrop-filter: blur(12px)`
- Sidebar panel slide: `transform: translateX(-110%)` → `0` on mobile

### Hover / Press States
- **Cards**: translateY(-4px), border shifts to `rgba(15,76,129,0.38)`, shadow deepens
- **Interactive surfaces**: translateY(-2px), border to `--color-border-strong`, shadow-2
- **Primary button**: opacity 0.92, translateY(-1px), shadow grows
- **Teal button**: bg → `--color-teal-hover (#00a892)`, translateY(-1px)
- **Secondary button**: border → `--color-border-strong`, text → primary
- **Nav links**: bg → `--color-bg-sunken`, border appears, translateY(-1px)
- **Focus ring**: `2px solid --color-teal`, offset 2px (teal, not blue)

### Topbar
Sticky, glass: `background-color: rgba(255,255,255,0.8); backdrop-filter: blur(12px)`. Dark mode: `rgba(20,20,20,0.8)`.

### Sidebar
Fixed, 16rem wide, `--color-bg-elevated` bg, `border-right: 1px solid --color-border-subtle`. Logo: `HX` monogram in 8px-radius box, accent blue fill.

### Scrollbar
Thin (`scrollbar-width: thin`), thumb `rgba(143,165,190,0.8)` rounded pill, hover darkens.

### Imagery / Iconography
No custom illustrations. No photography. Visual interest comes from:
- Radial gradient blurs as ambient glows
- Large watermark text (pseudo `::after` with `data-mark` attribute, weight 800, 4rem, opacity 0.08)
- Color-coded mode badges
- Monospace meta labels

---

## ICONOGRAPHY

**No icon library** is used in this codebase. Icons are expressed as:
- **Monospace short labels** (e.g. `WB`, `NW`, `WC`) in small rounded pill badges for sidebar nav
- **Unicode characters**: `→` arrow, `●` bullet dot used inline in copy
- **Monogram badge**: `HX` or `A` in a rounded-square with accent blue bg for the logo

**Substitution recommendation**: If icons are needed, use **Lucide Icons** (stroke weight 1.5px, minimal line style) from CDN — this matches the clean, structured aesthetic. Do not use filled icons.

---

## FILES

| Path | Description |
|------|-------------|
| `README.md` | This file — full design system reference |
| `colors_and_type.css` | CSS custom properties for colors, type, spacing, radius, shadow |
| `fonts/PretendardVariable.woff2` | Korean variable font (weight 45–920) |
| `assets/` | Brand assets (logo SVG, color swatches) |
| `preview/` | Design System card HTML files |
| `ui_kits/axiom/` | Full UI kit — workspace app + marketing site |
| `SKILL.md` | Agent skill definition |

---

## UI Kits

- **`ui_kits/axiom/index.html`** — Interactive workspace prototype (sidebar + session list + canvas)
