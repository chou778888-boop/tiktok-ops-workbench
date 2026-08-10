# Workbench Style System

The workbench keeps browser-native CSS and compiles it into one production file.
This preserves fast loading while making recurring visual changes predictable.

## Where to edit

- `src/styles/tokens.css`: global colors, type scale, spacing, radii, shadows and motion.
- `src/styles/workbench.css`: ordered module manifest used by local preview.
- `src/styles/modules/`: the complete visual system split in original cascade order.
- `scripts/build-cloudflare.mjs`: combines and minifies both files for Cloudflare.

Change a token before adding another one-off value. Existing short variable names
such as `--blue` and `--radius` are compatibility aliases, so older modules can be
migrated gradually without a visual rewrite.

## Layer order

The declared order is:

`tokens → reset → base → layout → components → pages → responsive`

Existing modules remain unlayered so their original cascade is byte-for-byte
preserved. New rules should go in the relevant module and consume design tokens.
Do not reorder the manifest without running the full visual regression check.

## Ordered modules

The manifest is the source of truth for CSS order. Production builds resolve all
imports through `scripts/style-sources.mjs`, concatenate them without separators,
and emit one minified immutable asset. Local preview loads the same files through
native CSS imports.

| Module | Primary responsibility |
| --- | --- |
| `01-entry.css` | Entry cover and login composition |
| `02-shell-and-reports.css` | App shell, navigation, report forms and weekly report foundation |
| `03-costing.css` | Cost-calculation workspace |
| `04-operations.css` | Overview, store, product and operating views |
| `05-creator-base.css` | Original creator presentation primitives |
| `07-creators.css` | Creator hub, project pages, tables, forms and dialogs |
| `08-workspace-theme.css` | Internal workspace visual theme |
| `09-report-records.css` | Compact read-only report records |
| `10-chinese-typography.css` | Chinese orphan-line prevention |
| `11-cross-device.css` | Windows, laptop, touch and mobile hardening |
| `12-platform-typography.css` | Mac/Windows typography tuning |
| `13-single-line-controls.css` | Short-label single-line behavior |
| `14-report-typography.css` | Daily-center reading scale |
| `15-report-hierarchy.css` | Daily-center attention hierarchy |
| `16-desktop-polish.css` | Desktop navigation and content polish |
| `17-final-responsive.css` | Final report and overview responsive guardrails |
| `18-profit-template.css` | Profit-domain workspace, settlement, link and SKU presentation |
| `19-premium-shell-overview.css` | Phase-one premium shell, overview composition and final responsive overrides |
| `20-report-command-center.css` | Daily report command surface, density and responsive behavior |
| `21-task-command-center.css` | Task views, action queue, history audit and responsive behavior |

Task-center presentation has one owner: `21-task-command-center.css`. The retired
lane-board stylesheet and placeholder DOM are intentionally absent. A release
check rejects repeated top-level selectors in the final overview, report, task
and profit owners so visual refinements are merged into their original rules
instead of being appended as another override layer.

## Premium surface system

The premium workspace uses three surface levels: the canvas establishes the
working environment, raised surfaces group business content, and focus surfaces
highlight only the most important operating result or status. Palette, depth,
radii, spacing and typography remain owned by `tokens.css`.

`19-premium-shell-overview.css` owns the premium shell and overview composition.
`20-report-command-center.css` and `21-task-command-center.css` own their final
business surfaces. Other modules consume shared tokens instead of copying their
declarations. The profit module keeps its domain structure and calculation
presentation while consuming the same title and surface tokens.

## Responsive rules

- Prefer fluid values with `clamp()` for typography and page spacing.
- Use media queries for page-level changes.
- Use container queries for reusable cards, toolbars and report panels once those
  modules are extracted.
- Verify at 1280px, 1440px, 1920px and mobile widths before publishing.

## Publishing guardrail

Run `node scripts/check-project.mjs`, syntax checks, task-state tests and the
Cloudflare build before deployment. Local preview and user confirmation remain
required before updating the formal site.
