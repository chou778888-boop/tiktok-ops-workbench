# Operating Pulse Workbench — Design QA

## Evidence

- Source visual truth: `/Users/a111/.codex/visualizations/2026/08/04/019fcbc0-380e-76b2-989e-69440bf1a4da/workbench-design-directions.html`，方向 A「经营脉冲台」
- Supporting art-direction reference: `/var/folders/ms/ww0_mprx4f9107x83kw6r5wc0000gn/T/codex-clipboard-444d6b60-6edf-41bf-8633-c2e11f8d24d4.png`
- Implementation URL: `http://127.0.0.1:8797/`
- Final desktop screenshot: `/private/tmp/operating-pulse-polished-1280x720.png`
- Source comparison screenshot: `/private/tmp/operating-pulse-source-1280x720.png`
- Final mobile screenshot: `/private/tmp/operating-pulse-polished-mobile-320.png`
- Desktop viewport: 1280 × 720 CSS px; source and implementation captures: 1261 × 720 px; device density 1; no density normalization required.
- Mobile viewport and capture: 320 × 852 CSS/physical px; device density 1.
- State: authenticated administrator, overview, 2026-08-06, JZZ real-data focus with only 2026-08-03 synced.

## Full-view comparison

The selected direction and final implementation were opened together at the same 1280 × 720 viewport. The final implementation retains the target's editorial left lead, offset acid-green decision surface, restrained white/ink palette, thin structural rules, and continuous seven-day operating pulse. It intentionally replaces the mock's fabricated seven-day values with the repository's single verified JZZ day and explicit pending states.

## Focused-region review

The acid-green focus region and header/date controls were inspected in the browser at desktop and 320 px. A separate same-coordinate crop was not used as final evidence because the source mock and production place this region at intentionally different vertical coordinates and the source preview's Chinese text is mojibaked. The full-view captures are readable enough to judge region proportion, color, alignment, typography hierarchy, and CTA treatment; production copy was verified from the live DOM snapshot.

## Required fidelity surfaces

- Fonts and typography: SF Pro/PingFang system stack, display weight, compact operational labels, tabular figures, balanced Chinese headings, and non-orphan mobile wrapping are applied. At 320 px the heading wraps into two deliberate lines without horizontal overflow.
- Spacing and layout rhythm: desktop uses the target's left narrative/right focus composition; the pulse starts directly below as one continuous instrument. At 1280 and 320 px document width equals viewport width.
- Colors and tokens: ink, canvas, muted copy, rule lines, and the signature acid green map to semantic design tokens. Status green and warning amber remain distinct.
- Image quality and asset fidelity: this screen does not require photography or decorative raster assets. The seven-day signal is rendered from real repository values on Canvas; no placeholder imagery is present.
- Copy and content: focus copy uses real JZZ data (39 items, GMV $675.52, actual received $631.47, provisional profit $163.47) and keeps actual received separate from transaction average.

## Comparison history

1. P2 — Date controls overlapped and the 1280 px data-management trigger clipped.
   - Fix: reset the inherited two-column top-line grid, allow the date meaning to wrap, and collapse data management to a stable overflow trigger at ≤1320 px.
   - Post-fix evidence: `/private/tmp/operating-pulse-implementation-1280x720.png`.
2. P2 — Initial implementation stacked the acid focus below the headline, unlike direction A, pushing the pulse below the fold.
   - Fix: changed the command surface to a 0.78fr/1.22fr editorial grid and centered a compact 190 px focus panel in the right track.
   - Post-fix evidence: `/private/tmp/operating-pulse-implementation-1280x720-final.png`.
3. P2 — At 320 px the command card retained a 448 px min-content width and the sync status text was cropped.
   - Fix: explicitly constrained the command card to the viewport and collapsed sync status to its healthy indicator.
   - Post-fix evidence: `/private/tmp/operating-pulse-mobile-320-final.png`; measured page scroll width 320 px and focus width 300 px.
4. P2 — The first direction-matched shell still felt visually flat because the focus surface lacked profit detail and the trend section lacked instrument depth.
   - Fix: added actual-received/provisional-profit ledger values to the acid focus surface, upgraded the seven-day pulse to a dark operating instrument, strengthened navigation and CTA states, and consolidated the duplicate pulse renderer into one maintainable implementation.
   - Post-fix evidence: `/private/tmp/operating-pulse-polished-1280x720.png` and `/private/tmp/operating-pulse-polished-mobile-320.png`; mobile document width remains exactly 320 px.

## Interaction and runtime checks

- “处理此链接” opens the JZZ listing-profit detail with the correct 2026-08-03 values.
- “近7日” becomes pressed and updates the range meaning; “今日” restores the single-day state.
- Fresh authenticated browser tab has no console warnings or errors.
- Pending days remain pending; no trend data is fabricated.

## Remaining differences

- P3 / accepted: the source mock's fine grid texture is omitted so dense Chinese operational copy and controls remain clearer.
- P3 / accepted: the source mock shows a complete seven-day line for composition; production shows only the one verified synced day.

## Final result

final result: passed
