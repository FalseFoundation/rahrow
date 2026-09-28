# Design System: Liquid Glass iOS
**Project ID:** 9684777897827345447

## 1. Visual Theme & Atmosphere
A dark, quiet control surface. The canvas is near-black OLED. Cards are thin glass: a little white fill, a hairline border, and a soft shadow. White is the action color. Green is only for a live connection. Nothing decorative sits behind the content.

## 2. Color Palette & Roles
- OLED ground (`#131313`): the app background.
- Glass fill (`rgba(255, 255, 255, 0.06)`): cards, lists, and the floating tab bar.
- Specular white (`#ffffff`): primary buttons, the connected power control, and the add action.
- Ink (`#2f3131`): text on white controls.
- Mist (`#c4c7c8`): secondary labels and metadata.
- Live green (`#30D158`): the connected status dot and healthy telemetry.
- Hazard rose (`#ffb4ab`): delete and reset.

## 3. Typography Rules
Manrope carries interface labels. Headings are semibold with tight tracking. Protocol names, ports, and latency use a compact mono face. Section labels are small, uppercase, and widely tracked.

## 4. Component Stylings
* **Buttons:** Primary actions are white pills. Secondary actions are glass tiles with an icon and a short label. The connected control is a white disc inside a dark ring.
* **Cards/Containers:** Generously rounded glass panels with a 1px light edge and a deep, soft shadow. Lists are one card with inset separators.
* **Inputs/Forms:** Recessed glass fields with a quiet border that brightens on focus.
* **Navigation:** A floating glass pill with three destinations. The active item is a lighter pill.

## 5. Layout Principles
One narrow column. A frosted header, content, then a floating tab bar clear of the home indicator. Home leads with status, a power control, protocol, and the selected connection. Connected adds a two-by-two telemetry grid. Connections groups nodes under a subscription card. Settings uses titled glass groups. Surfaces without their own Stitch screen — import, diagnostics, logs, about, and editors — use the same glass, radius, and white primary.
