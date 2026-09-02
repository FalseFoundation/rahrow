---
name: RahRow
description: A quiet, compact control system for trustworthy cross-platform VPN operation.
colors:
  connection-indigo: "oklch(0.5558 0.2141 269.017)"
  canvas-light: "oklch(1 0 0)"
  ink-carbon: "oklch(0.145 0 0)"
  surface-night: "oklch(0.205 0 0)"
  surface-slate: "oklch(0.269 0 0)"
  muted-slate: "oklch(0.556 0 0)"
  border-mist: "oklch(0.922 0 0)"
  soft-white: "oklch(0.985 0 0)"
  fault-coral: "oklch(0.577 0.245 27.325)"
  fault-coral-dark: "oklch(0.704 0.191 22.216)"
  glass-light: "oklch(1 0 0 / 70%)"
  glass-dark: "oklch(1 0 0 / 4%)"
typography:
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    letterSpacing: "normal"
  headline:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "normal"
  title:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  sm: "0.4375rem"
  md: "0.525rem"
  lg: "0.7rem"
  xl: "0.875rem"
  2xl: "1.225rem"
  3xl: "1.575rem"
  4xl: "1.925rem"
  pill: "9999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  4-5: "1.125rem"
  5-5: "1.375rem"
  6-75: "1.6875rem"
  10-5: "2.625rem"
components:
  button-primary:
    backgroundColor: "{colors.ink-carbon}"
    textColor: "{colors.soft-white}"
    typography: "{typography.body}"
    rounded: "{rounded.4xl}"
    padding: "0 0.75rem"
    height: "2.25rem"
  button-status:
    backgroundColor: "oklch(0.145 0 0 / 5%)"
    textColor: "{colors.connection-indigo}"
    rounded: "{rounded.pill}"
    size: "6.5rem"
  button-status-connected:
    backgroundColor: "{colors.connection-indigo}"
    textColor: "{colors.soft-white}"
    rounded: "{rounded.pill}"
    size: "6.5rem"
  input:
    backgroundColor: "oklch(0.922 0 0 / 50%)"
    textColor: "{colors.ink-carbon}"
    typography: "{typography.body}"
    rounded: "{rounded.3xl}"
    padding: "0 0.75rem"
    height: "2.25rem"
  card-default:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-carbon}"
    rounded: "{rounded.4xl}"
    padding: "1.5rem"
  card-featured:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.ink-carbon}"
    rounded: "{rounded.2xl}"
  navigation-tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate}"
    typography: "{typography.label}"
    rounded: "{rounded.2xl}"
    padding: "0.5rem"
---

# Design System: RahRow

## Overview

**Creative North Star: "The Quiet Control Deck"**

RahRow feels like a compact instrument panel made for a consequential but repetitive task. The interface stays calm and candid: neutral surfaces carry almost all of the structure, language states exactly what the system is doing, and Connection Indigo appears when activity, focus, or a live route deserves attention.

The system is softly contained rather than decorative. Deeply rounded controls make the narrow app shell approachable, fine borders organize dense operational information, and selective lift distinguishes floating or focal elements. The same visual grammar works in light and dark modes without turning the product into a developer console.

**Key Characteristics:**

- Compact, centered, single-column operation
- Neutral-first light and dark surfaces
- Connection-aware semantic color
- Deeply rounded controls with precise internal spacing
- Small, expanded labels paired with plain-language status copy
- Borders for structure; elevation only where hierarchy requires it

## Colors

The palette is intentionally quiet: achromatic surfaces and text establish trust, while Connection Indigo and Fault Coral communicate meaningful state.

### Primary

- **Connection Indigo:** Reserved for connected state, success, active navigation, connection-aware focus, and route emphasis.

### Secondary

- **Fault Coral:** Used for destructive actions, invalid fields, and failure states; the brighter dark-mode variant preserves contrast.

### Neutral

- **Clean Canvas:** The light-mode page, card, and popover foundation.
- **Carbon Ink:** Primary light-mode text and the dark-mode page foundation.
- **Night Graphite:** Raised dark-mode cards and popovers.
- **Soft Slate:** Dark-mode muted and accent surfaces.
- **Muted Slate:** Secondary text, inactive controls, metadata, and quiet icons.
- **Border Mist:** Light-mode borders, input foundations, and structural dividers.
- **Soft White:** Primary dark-mode text and foreground on Connection Indigo.
- **Glass Light / Glass Dark:** Translucent floating and featured surfaces appropriate to each theme.

**The Status Color Rule.** Connection Indigo is a system signal, not decoration. Use it for live, selected, focused, or route-specific meaning; keep ordinary surfaces neutral.

**The Honest Error Rule.** Fault Coral identifies destructive or invalid states only. Never use it as a general warm accent.

## Typography

**Display Font:** Manrope Variable (with sans-serif fallback)  
**Body Font:** Manrope Variable in LTR layouts and Estedad in RTL layouts, each with a sans-serif fallback

**Character:** The Latin and Arabic-script faces are paired for comparable clarity and density. Weight and size create hierarchy in every locale; expanded letter spacing is disabled in RTL layouts to preserve Arabic-script joining.

### Hierarchy

- **Display** (800, display token): Connection outcome and focal state on the home surface.
- **Headline** (600, headline token): Major screen and section headings.
- **Title** (600, title token): App header, drawer, and card titles.
- **Body** (400, body token): Controls, field values, explanations, and operational prose.
- **Label** (600, label token, expanded uppercase): Telemetry, section eyebrows, connection metadata, and compact navigation labels.

**The Two-Voice Rule.** Use sentence case for actions and explanations; reserve expanded uppercase labels for compact metadata and status categories.

## Layout

The shared product UI uses a centered app stage capped at 24.5625rem, with a 1rem base gutter and operating-system safe-area insets. Screens are single-column and vertically scroll within the stage. This narrow contract is shared by desktop and mobile so task order and navigation remain familiar.

Primary navigation floats above the bottom safe area in a compact three-tab bar. Nested routes replace the three tabs with one back action. Sticky headers and drawers retain local context while the body scrolls. Vertical rhythm follows the quarter-rem spacing scale, with recurring 1rem, 1.375rem, 1.6875rem, and 2.625rem intervals.

**The Compact Stage Rule.** Preserve the narrow operational stage and its safe-area behavior unless a new surface has evidence that it needs a wider information model.

## Elevation & Depth

RahRow uses a hybrid depth model. Borders and tonal layering carry everyday structure. Default cards receive a low ambient shadow, dialogs receive the strongest lift, and the connection control may gain a restrained halo or glow when active. Featured, glass, flat, and list surfaces deliberately remove shadow.

### Shadow Vocabulary

- **Ambient Card:** A low two-part shadow for standard cards.
- **Floating Dialog:** A broad elevated shadow for modal interruption.
- **Connection Ring:** A crisp translucent ring around live status indicators.
- **Connection Glow:** A diffuse indigo backlight around the focal connection control.

**The Flat-Until-Focal Rule.** Use borders or tonal contrast by default. Add shadow only when an element floats, interrupts, or represents the primary connection action.

## Shapes

The form language is soft and contained. Buttons and default cards use generous curvature; inputs are slightly tighter; tabs, compact cards, and list containers use medium radii. The connection control and live-status dot are fully circular. Flat list rows intentionally remove side curvature so dividers can form a continuous vertical rhythm.

**The Nested Radius Rule.** Inner controls use a visibly smaller radius than their container, preserving clear nesting instead of stacking identical rounded rectangles.

## Components

### Buttons

- **Shape:** Deeply rounded by default; compact square and fully circular sizes are explicit variants.
- **Primary:** Carbon Ink with Soft White in light mode, reversing through semantic theme tokens in dark mode.
- **Hover / Focus:** Hover changes tone without adding decoration. Keyboard focus adds a three-pixel semantic ring; press moves the control down one pixel.
- **Secondary / Outline / Ghost:** Secondary uses a quiet tonal fill, outline uses a structural border, and ghost remains transparent until interaction.
- **Status:** A large circular connection control shifts from a faint neutral surface to Connection Indigo when connected.

### Cards / Containers

- **Corner Style:** Default cards use the largest system radius; featured and glass cards use tighter nested radii.
- **Background:** Theme-aware card, glass, or transparent surfaces.
- **Shadow Strategy:** Standard cards are ambient; featured, glass, and flat variants are shadowless.
- **Border:** Featured and glass variants use Border Mist or its dark-mode equivalent.
- **Internal Padding:** Standard cards use the larger spacing step; compact cards reduce it consistently.

### Inputs / Fields

- **Style:** Quiet translucent input fill, transparent resting border, and generous rounded corners.
- **Focus:** Semantic border plus a three-pixel ring; no layout shift.
- **Error / Disabled:** Fault Coral border and ring for invalid input; disabled controls reduce opacity and remove interaction.

### Navigation

The bottom bar is a translucent, blurred, bordered surface with equal-width icon-and-label tabs. Inactive tabs use Muted Slate; the active tab gains a faint neutral fill and Connection Indigo text. Nested screens collapse navigation to a single back control in the same container.

### Connection Control

The home surface centers a large circular status button inside a bordered halo, with a restrained ripple and backlight. Text beside the control always states the connection state, so animation and color remain supportive rather than essential.

### Operational Rows

Profile, setting, and connection rows use compact type, quiet metadata, bottom dividers, and stateful borders or fills only when interactive. Rows preserve a strong text-first reading order and truncate volatile endpoints or names rather than breaking the stage.

## Do's and Don'ts

### Do:

- **Do** let explicit status copy accompany every connection color or animation.
- **Do** use Connection Indigo sparingly for live, selected, focused, and route-specific meaning.
- **Do** preserve the 24.5625rem stage, safe-area insets, and bottom-navigation clearance across desktop and mobile hosts.
- **Do** use borders, dividers, and tonal surfaces for routine hierarchy before adding shadow.
- **Do** keep operational labels compact and expanded while keeping actions and explanations in sentence case.

### Don't:

- **Don't** elevate every card; featured, glass, flat, and list surfaces are intentionally shadowless.
- **Don't** use sharp corners on controls unless a flat list or continuous divider system explicitly requires them.
- **Don't** communicate connected, pending, destructive, or invalid state through color alone.
- **Don't** widen layouts or increase density in ways that make desktop and mobile task order diverge.
- **Don't** use Connection Indigo or Fault Coral as ambient decoration.
