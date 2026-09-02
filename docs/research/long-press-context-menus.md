# Long-press and context-menu interaction

Research date: 2026-09-02

## Decision summary

Use RahRow's existing shared `ContextMenu` primitive for secondary-click and touch-hold behavior, and pair it with a visible overflow `Menu` button that exposes the same actions. Long press is an enhancement, not the only way to discover or invoke an action. This matches Base UI's explicit guidance for touch and assistive-technology access and its official example, which shares one action set between a context menu and a visible menu button ([Base UI Context Menu](https://base-ui.com/react/components/context-menu), [shadcn Context Menu](https://ui.shadcn.com/docs/components/base/context-menu)).

RahRow currently uses the shadcn **Base UI** variant, not the Radix implementation: `packages/ui/src/components/ui/context-menu.tsx` wraps `@base-ui/react/context-menu`, and `packages/ui/package.json` pins the compatible range at `^1.7.0`. Do not add a second home-grown timer or a Radix-specific long-press hook around it.

The recommended product behavior is:

- A normal tap keeps the item's existing primary behavior, such as selecting a profile or opening a group.
- A secondary mouse/trackpad click or a successful touch hold opens the contextual actions near the invocation point.
- A visible, accessible overflow button opens the same actions with tap/click, `Enter`, or `Space`.
- `Shift+F10` and the platform Context Menu key open contextual actions when the relevant item itself already has a legitimate focus target. Do not add `tabIndex=0` to every noninteractive card solely for this shortcut; the visible menu button remains the universal keyboard path.
- Opening a menu moves focus into it; `Escape` closes it and restores focus to the invoking context. Arrow keys, `Home`, `End`, typeahead, and activation are left to Base UI rather than reimplemented.

## Semantics and composition

Keep the list and item semantics that describe the data (`list`/`listitem`, headings, text, and existing primary controls). Base UI's context trigger renders a `div` by default and supports replacing that element through `render`; being a context-menu surface does not by itself make an item a button ([Base UI Trigger API](https://base-ui.com/react/components/context-menu#trigger)). Avoid a fake button around a card that already contains buttons, links, checkboxes, or other interactive descendants.

Each item that has contextual actions should also have a visible overflow button with an item-specific accessible name such as “Actions for {profile name}”. A menu button is a native button with `aria-haspopup="menu"`, reflects its open state with `aria-expanded`, opens with `Enter` or `Space`, and places focus on a menu item ([WAI-ARIA APG Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)). Keep one action definition and render it through both `ContextMenu.Item` and `Menu.Item` so permissions, disabled state, destructive styling, labels, and behavior cannot drift.

The contextual menu should contain only actions relevant to that item. Hidden context menus are inherently less discoverable; Apple similarly recommends short, relevant context menus and placing destructive actions last ([Apple context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)). The visible overflow button must remain visible for coarse pointers and on keyboard focus; it may become visually quieter for fine-pointer hover layouts, as long as it appears on `:focus-visible`.

Do not override the menu roles or focus model emitted by Base UI. The expected menu behavior is focus on an item when opened, arrow-key navigation inside the composite, `Enter`/`Space` activation, printable-character typeahead, and `Escape` closure with focus returned to the invoking context ([WAI-ARIA APG Menu and Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)). `Shift+F10` is the conventional Windows/Linux context-menu shortcut ([WAI-ARIA APG Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)).

## Hold recognition and cancellation

Preserve the behavior of the installed Base UI 1.7.0 trigger. Its official source uses:

- a **500 ms** long-press delay;
- exactly one active touch;
- cancellation when either axis moves more than **10 CSS px** from the start point;
- cancellation on early `touchend`, `touchcancel`, a second touch, disablement at start, or unmount cleanup;
- native `contextmenu` handling for mouse/trackpad secondary click;
- `WebkitTouchCallout: none` on the trigger; and
- suppression of the browser context menu only within an enabled custom trigger/backdrop.

These are implementation facts of the dependency RahRow ships, not universal platform constants; keep regression tests pinned to the installed version and re-audit them on Base UI upgrades ([Base UI 1.7.0 trigger source](https://github.com/mui/base-ui/blob/v1.7.0/packages/react/src/context-menu/trigger/ContextMenuTrigger.tsx)). Android itself exposes a system long-press timeout and touch slop rather than prescribing a hard-coded value for every custom UI ([Android `ViewConfiguration`](https://developer.android.com/reference/android/view/ViewConfiguration)).

Do not apply `touch-action: none` to scrollable subscription/profile rows. Pointer Events specifies that panning or zooming causes the browser to cancel the pointer stream and that `touch-action` declares which direct-manipulation gestures the browser may own; preventing all touch actions would make ordinary list scrolling compete with the menu gesture ([Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/#declaring-direct-manipulation-behavior)). Base UI's movement and cancellation handling should let scrolling win.

The application integration still needs one important guard: after a hold successfully opens the menu, the same gesture must not also run the row's primary tap/click action. Prefer the primitive's composed event behavior; if a real WebView test exposes a compatibility click, suppress only the next click associated with that completed hold and immediately reset the guard. Never suppress subsequent unrelated taps. Early release, movement, scrolling, cancellation, route change, disablement, and unmount must not open a menu or leave a timer/click-suppression flag behind. This follows the pointer-cancellation principle that activation should occur on the up event or otherwise be abortable/undoable ([WCAG 2.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)).

Let Base UI own the `contextmenu` event and call `preventDefault` only where the custom menu is actually available. The UI Events algorithm shows that canceling the dispatched `contextmenu` event suppresses the user-agent menu; a keyboard-generated context menu targets the currently focused element ([UI Events algorithms](https://www.w3.org/TR/uievents/event-algo.html#maybe-show-context-menu)). Do not globally disable native context menus, because doing so removes useful browser/WebView actions from fields and other content outside these item surfaces.

## Selection, callouts, and primary actions

RahRow's current shared trigger already applies `select-none`, while Base UI applies `WebkitTouchCallout: none`. Keep these restrictions scoped to the card/item surface whose product contract is nonselectable. Do not put global `user-select: none` or callout suppression on the application shell. The Pointer Events specification explicitly notes that `touch-action` does not govern text selection, link/form activation, or other user-agent behavior ([Pointer Events `touch-action`](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property)).

Do not start navigation, profile selection, drag/reorder, or destructive work on pointer/touch down. A short tap may activate the primary item action on release; a completed hold opens only the menu. Destructive commands remain explicit menu-item activations and use the existing confirmation policy.

## Haptic feedback

Haptics are optional confirmation, not gesture detection and not the only indication that the menu opened. If RahRow adds them, emit one short semantic impact only after the menu transitions from closed to open because of a successful touch hold. Do not vibrate on touch down, timer start, canceled holds, right-click, keyboard invocation, or every highlighted menu item.

Inject haptics through the mobile platform capability boundary and treat failure or lack of hardware as a no-op. Capacitor provides a native Haptics plugin for supported mobile platforms ([Capacitor Haptics](https://capacitorjs.com/docs/apis/haptics)). Do not rely on `navigator.vibrate` for a cross-platform contract: the W3C specification records limited implementation, requires a visible document and prior sticky activation, and permits requests to have no effect ([W3C Vibration API](https://www.w3.org/TR/vibration/)). Apple recommends brief, causally connected, optional haptics that complement visual/auditory feedback and warns against overuse ([Apple haptics guidance](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)). Desktop and unsupported devices should behave identically without haptics.

## Acceptance and test matrix

Component tests should use controlled/fake time and exercise the shared feature component, not a detached custom hook:

| Input or state | Expected result |
| --- | --- |
| Touch released before 500 ms | No menu; primary tap runs exactly once. |
| One touch held through 500 ms without excess movement | Menu opens exactly once at the hold point; primary action does not run. |
| Touch moves more than 10 px on either axis before 500 ms | Hold cancels; scrolling remains possible; no stale timer opens later. |
| Second touch, `touchcancel`, early `touchend`, disabled item, route change, or unmount | Hold cancels and all transient state is cleared. |
| Mouse/trackpad secondary click | Custom menu opens at the pointer and the native menu is suppressed only on the enabled trigger. |
| Ordinary primary click/tap | Existing select/open behavior is unchanged and no context menu opens. |
| Visible overflow button with pointer, `Enter`, or `Space` | Same actions and states open through the primary accessible menu path. |
| Focused eligible item with `Shift+F10` or Context Menu key | Context menu opens; otherwise the visible button remains the documented fallback. |
| Open menu | First/appropriate item receives focus; arrows, `Home`/`End`, typeahead, disabled items, submenus, and `Enter`/`Space` follow Base UI behavior. |
| `Escape`, outside press, or item activation | Menu closes as appropriate and focus returns predictably to the invoking item/button. |
| RTL | Logical placement, arrow meaning, menu order, and focus movement remain correct. |

Add real-browser/WebView coverage because synthetic DOM tests cannot prove native callout, compatibility-click, scroll arbitration, pointer positioning, or assistive-technology behavior. Cover Android WebView, iOS WKWebView, Windows WebView2, macOS WKWebView, and Linux WebKitGTK where available. At minimum, manually verify VoiceOver and TalkBack can find the labeled overflow button, announce it as a menu button with expanded state, operate every action without long press, and recover focus after close. Also test keyboard-only operation and secondary click on desktop, coarse-pointer scrolling, a hold near screen edges, nested scroll containers, virtualized/recycled rows, and rapid route/list updates while a hold is pending.

Automated assertions should include accessible roles/names/states, one invocation per gesture, timer cleanup, no primary-action leak after a successful hold, and parity between overflow-menu and context-menu action models. Use real input in end-to-end tests where possible; Playwright documents that its `Touchscreen` API is tap-oriented, so held/moving multi-event gestures need lower-level dispatch or real-device testing ([Playwright Touchscreen](https://playwright.dev/docs/api/class-touchscreen)).

## RahRow implementation boundary

Keep the reusable interaction in `packages/features` beside the shared subscription/profile list-item behavior and CSS Module. Continue consuming the shared `ContextMenu` and `Menu` primitives from `@rahrow/ui`; do not duplicate desktop/mobile gesture code. Native haptic implementations stay in the mobile app edge behind an injected optional capability. The CLI has no pointer interaction and needs no long-press UI, but it must retain equivalent commands where those actions are part of the product capability rather than presentation-only behavior.
