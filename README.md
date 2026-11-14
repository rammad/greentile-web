# Green Tile Social Club Web

Custom Shopify theme for the Green Tile Social Club site.

This README is written for two audiences:
- **Site maintainers**: what to update in Shopify admin and what each section does.
- **Engineers**: code structure, data flow, and implementation details.

## Project Structure

The repo root *is* the theme — Shopify's GitHub integration reads it directly, so the
standard theme folders must stay at the top level:

- `layout/` - `theme.liquid`, the single page shell
- `sections/` - every page section, plus the global header and contact panel
- `snippets/` - shared Liquid partials
- `templates/` - JSON templates composing sections per page type
- `assets/` - CSS, JS, fonts and image assets (one CSS/JS pair per section, plus globals)
- `config/` - theme settings schema and saved values
- `locales/` - translation strings

There is no build step; files are committed exactly as Shopify serves them.

## Shopify Integration & Branch Workflow

Deployment is handled entirely by **Shopify's built-in GitHub integration** — there are no
workflow files or CI config in this repo. Each connected theme tracks one branch: Shopify
periodically pulls that branch and updates the theme to match, and edits made in the
Theme Editor / Admin are committed back to the same branch by Shopify.

Branches:

- `develop` - day-to-day engineering branch. Connected to a development theme in Shopify,
  so pushing here is how changes are tested on a real storefront (there is no local
  preview or prototype).
- `feature/*` - optional short-lived branches off `develop` for larger pieces of work,
  merged back via PR.
- `master` - source of truth for theme code; `develop` is merged in via PR once tested. Not
  connected to any theme.
- `shopify` - the branch the **live theme** pulls from. It exists so `master` can stay the
  clean source of truth for the code base while the client's Theme Editor / Admin changes
  (content, section settings, layout) still have somewhere to be committed: the integration
  writes those edits back to `shopify`, never to `master`.

Release flow:

1. Engineering work lands on `develop` (directly or via a `feature/*` PR) and is checked on the
   development theme once Shopify has synced it.
2. Tested work is merged `develop` -> `master` via PR.
3. `master` is then merged into `shopify` — **this is the deploy step**; the live site only
   changes once `shopify` is updated and Shopify has synced it.
4. In parallel, the client's Theme Editor / Admin edits land on `shopify` as commits from the
   integration. They are never merged back into `master`; the next `master` -> `shopify`
   merge simply carries code changes on top of them.

This keeps portal-driven content edits auditable without muddying core source history.

Things to know about the integration:

- Sync is periodic, not instant — allow a short delay after pushing before testing.
- JSON templates (`templates/*.json`) and `config/settings_data.json` are rewritten by the
  Theme Editor (note the auto-generated header comment). Expect Shopify-authored commits to
  touch them, and avoid hand-editing them on a branch the editor is also writing to.
- The integration has rewritten Liquid before (see "Known Shopify sync risk" under Archives).

## Shopify Setup

### Required Theme Settings

In **Theme settings**:
- **Contact form**
  - `Default contact email` (`contact_email`)
- **Event settings**
  - `Event metafield namespace` (default: `event_ticketing`)
  - `Event metafield key` (default: `event_v2`)
- **Cart**
  - `Max quantity per product` (`cart_max_qty`, default 4) — counted per product across
    all its variants / ticket types (2 GA + 2 VIP = 4); enforced in the cart drawer
- **Navigation**
  - Logo, nav labels/URLs, back link target, cart link label
- **Footer**
  - Global footer title and links (up to 6 configurable links)
- **Social links**
  - Up to 5 icon/link entries used by the Socials section

### Required Product/Event Data

Event pages and listings use **product data**:
- Event metadata is read from product metafield:
  - Namespace: `event_ticketing`
  - Key: `event_v2`
- Metafield must be accessible storefront-side in Shopify custom data settings.

Important tags:
- `featured` - marks a product as the featured event candidate.
- `upcoming` - treated as "Coming Soon" in calendar/archive behaviors.

## Template Map

- `templates/index.json` - Home page
- `templates/page.about-us.json` - About page
- `templates/page.events.json` - Events calendar page
- `templates/page.archives.json` - Archives page
- `templates/product.json` - Event/product detail page
- `templates/collection.json` - currently renders the calendar section
- `templates/404.json` - 404 template

Global sections rendered from layout:
- `sections/header.liquid`
- `sections/contact-panel.liquid`
- `sections/cart-drawer.liquid`

## Maintainer Guide (Theme Editor)

Use this as a practical "what should I fill in?" checklist.

### Global (Theme Settings)

- **Navigation**: controls desktop + mobile nav labels/links and logo.
- **Footer**: controls footer title and link behaviors (normal URL vs contact-trigger link).
- **Social links**: controls icon row in Socials section.
- **Contact form email**: fallback destination for contact submissions.
- **Event metafield namespace/key**: only change if Event Ticketing app metadata keys change.

### Home Sections

#### Hero (`sections/hero.liquid`)
- Fill: `Hero title`
- Optional: gradient palette selection
- Behavior: animated split title

#### Manifesto (`sections/about-manifesto.liquid`)
- Fill: `Subheading`, `Manifesto text`
- Add blocks: `Inline image`
  - Upload 1-4 image options per block
  - Set `Word position` to anchor image around a word in manifesto copy
- Behavior: random image from each block's uploaded pool

#### Upcoming Events (`sections/home-events.liquid`)
- Fill: section title, optional collection, max events, browse CTA
- Optional: enable featured single-event layout
- Data source:
  - First choice: selected collection products
  - Else: all products
  - Fallback: manual `event_card` blocks when no products found
- Special rule: "Featured layout" only activates if:
  1) toggle is on,
  2) exactly one event is available,
  3) no product tagged `featured` exists.

#### Featured Event (`sections/featured.liquid`)
- Auto mode: first active product tagged with configured `featured_tag` (default `featured`)
- Manual override: set `Manual product override` or manual poster/background images
- Fill: marquee label (`FEATURING` by default)

#### Socials (`sections/socials.liquid`)
- Fill: subheading/title text
- Add blocks: gallery images shown in track
- Icon links come from **Theme settings -> Social links**

#### Footer (`sections/footer.liquid`)
- Add blocks: scrolling marquee bars (top of footer)
- Footer links/title are controlled via **Theme settings -> Footer**

### About Page Sections

#### Mission (`sections/mission.liquid`)
- Fill: section label and line blocks (one line per block)

#### What We Do (`sections/what-we-do.liquid`)
- Add category (`menu_item`) blocks:
  - Title
  - Description
  - CTA label + URL
  - Optional `contact_topic` to open contact panel instead of navigating
  - Up to 8 scatter images (recommended to populate for visual density)
- Includes separate desktop/mobile gradient controls

#### Team (`sections/team.liquid`)
- Fill: section title
- Add `team_group` blocks with group image + comma-separated names

#### Clients & Press (`sections/clients.liquid`)
- Add `client` blocks (name + optional URL)
- Add `press_logo` blocks:
  - publication name
  - CSS slug
  - optional uploaded logo (mask)
  - URL

### Events Calendar Page (`sections/calendar.liquid`)

- Fill:
  - optional title override
  - events collection
  - archives page URL
  - empty-state message
- Auto title fallback: `<Current Season> Calendar <Year>`
- Month filter buttons auto-generate from current season months.
- Event status handling:
  - `upcoming` tag -> Coming Soon sticker behavior
  - unavailable product -> Sold Out sticker behavior
- Sticker artwork/colors are configurable in section settings.

### Archives Page (`sections/archives.liquid`)

- Auto mode:
  - pulls products (selected collection or all)
  - includes events with dates older than current season start
- Manual fallback:
  - if no auto archives, uses `archive_event` blocks
- Fill: title, load-more label, empty state
- **Pagination / infinite scroll**: the archives loop is wrapped in
  `{% paginate collections.all.products by 24 %}` — real Shopify pagination
  (`page=N` in the URL), not a raised item cap, and no fixed ceiling; it keeps
  paging through the whole store's products.
  - `paginate` has two constraints that both tripped Shopify's own GitHub
    theme validator (`Liquid syntax error ... is not a valid expression`)
    before landing on the current shape:
    1. It only accepts a fixed set of directly-referenced objects
       (`collection.products`, `collections.all.products`, `search.results`, …)
       — not a plain assigned variable, and not a bracket-indexed dynamic
       handle like `collections[handle].products`. So this always paginates
       `collections.all.products`, and the section's optional "Events
       collection" setting is applied as an ordinary per-product filter
       *inside* the loop (`product.collections contains
       collections[archive_collection]`), not as the paginate target.
    2. It must render directly to the page — it cannot be nested inside
       another block tag like `{% capture %}`. The whole cell-rendering block
       writes straight into `#dynamic-archive-container`; nothing captures its
       output into a variable first. Pagination state (`current_page`/`next`)
       is exposed via a small `#archive-pagination-state` marker element
       placed right after that container (it has to come after
       `{% endpaginate %}` runs, so it can't live as data attributes on
       `.archives-page`, whose opening tag is emitted before pagination runs).
    3. **`by` takes no colon.** `{% paginate x by: 24 %}` does not parse as a
       page size — Liquid silently falls back to the default 20/page, and
       Shopify's GitHub sync "helpfully" rewrites it to `by nil` (see the
       auto-commit in `caa588c`). Always write `{% paginate x by 24 %}`.
  - `#dynamic-archive-container`, `#archive-pagination-state` and the load-more
    control are **always** rendered — never gated on a server-side "do we have
    products?" probe. Page 1 can legitimately contain zero archive matches while
    later pages have plenty, and if the mount point isn't in the DOM the JS pager
    can't bootstrap at all, so the page renders permanently empty. Visibility is
    the JS's job (`checkEmptyState`), not Liquid's.
  - `assets/section-archives.js` reads `#archive-pagination-state` for
    `data-section-id`/`data-current-page`/`data-total-pages`/`data-has-next`,
    then fetches **every remaining page up front and in parallel** via the
    Section Rendering API (`?section_id=...&page=N`), merges the cells, and
    renders the complete date-sorted grid in one pass.
  - **Why eager, not on-scroll**: Shopify pages `collections.all` in catalogue
    order, and the sort key the grid actually uses — the event date — lives in a
    metafield Liquid can't order by. So page N can contain events belonging
    anywhere in the final date order. Loading pages lazily meant each arrival
    re-sorted the whole grid, and events silently appeared *above* the visitor's
    scroll position ("I had 1 event, scrolled down, scrolled back up and there
    were 3"). Fetching everything before the first re-render collapses that into
    a single early reorder, at the top of the page, before anyone has scrolled.
  - Concurrency is capped at `PREFETCH_CONCURRENCY` (4) and total pages at
    `MAX_PREFETCH_PAGES` (30). A failed page is logged and skipped rather than
    aborting the pages in flight with it. Anything past the cap stays behind the
    load-more control, which also remains a manual/no-JS click fallback.
  - Every full re-render (new pages merged, or a resize that changes the column
    count) goes through `rebuildGrid({ preserveScroll: true })`, which pins the
    topmost visible card by `data-key` (its product URL) and restores its screen
    position afterwards. `getScroller()` resolves the right scrolling element —
    `document.body` under `ios-body-scroll`, `#scroll-viewport` when Lenis owns
    it (corrected via `lenis.scrollTo(..., { immediate: true })`), otherwise
    `document.scrollingElement` with `scroll-behavior` temporarily forced to
    `auto`, since `html` carries `scroll-behavior: smooth`.
  - Per-cell markup lives in `snippets/archive-cell.liquid`.
  - Sort order matters for scroll order: keep the events collection sorted
    **Date: newest first** so newest-first fetch order roughly matches display
    order (the grid re-sorts every fetched batch by event date, so this only
    affects fetch order, not final on-screen order).
  - A raw 24-product page can land entirely on current-season/non-matching
    products, so the "coming soon" empty state only resolves after the prefetch
    has settled — never off page 1 alone.
  - The manual `archive_event` fallback renders on **page 1 only**. It used to
    render on any page with zero matches, which meant the JS pager appended the
    same manual blocks once per fetched page.
  - The optional "Events collection" setting resolves to a *collection object*,
    not a handle — filter with `product.collections contains archive_collection`.
    `collections[archive_collection]` is a nil lookup and silently excludes every
    product, emptying the page whenever the setting is set.
- **Known Shopify sync risk**: the GitHub theme-sync app has previously
  rewritten a `{% paginate ... by: N %}` tag to `{% paginate ... by nil %}` in
  an auto-commit (breaks pagination — renders 0 items), with an auto-inserted
  `{% comment %}` explaining the "rewrite". If archives suddenly goes empty,
  check `sections/archives.liquid` for this before debugging anything else.

### Product Detail (`sections/main-product.liquid`)

- Uses product data + event metafield to render:
  - event date/time
  - venue details
  - variants as ticket types
  - quantity picker + buy button
- Fill in section:
  - buy button label
  - max quantity per order
- Event Ticketing app block (`templates/product.json`): when a product has the event
  metafield and the app's Ticket Order Form block is attached, the buy button opens
  that form in an attendee-details drawer (`#ticket-modal`) instead of buying directly.
  The app's own ticket row is hidden and driven by the PDP's ticket-type buttons and
  quantity stepper; `assets/section-product.js` restyles the app markup with theme
  classes.
- Purchasing is disabled (button shows "Coming Soon", quantity hidden) when the
  product is tagged `upcoming`, mirroring the sold-out / past-event behavior.
  This is enforced even if someone reaches the product URL directly rather than
  via the calendar.

## Engineering Reference

### Runtime Architecture

- Base layout: `layout/theme.liquid`
  - loads global CSS/JS
  - renders page curtain, header, contact panel
  - injects `window.THEME_SETTINGS` (contact email, cart routes, tile URLs)
- Global helpers: `assets/global.js`
  - animation utilities
  - mobile menu
  - page transition curtain
  - fit-text/cascade text systems
  - `window.Drawer` — shared open/close for slide-out panels (see below)

### Cart drawer

- Markup: `sections/cart-drawer.liquid` (global, rendered from `theme.liquid`); styles:
  `assets/cart.css` (line layout only — shell, stepper, tags and buttons are shared classes);
  behaviour: `assets/cart.js` (`window.Cart`).
- Every mutation re-renders the section through the Section Rendering API
  (`sections=cart-drawer` on `/cart/add.js` and `/cart/change.js`, `/?sections=cart-drawer`
  for a refresh) and swaps `#cart-drawer-body`, so line-item markup lives only in Liquid.
- Opened by `[data-cart-trigger]` (header "CART (n)" link, mobile menu), `#cart` in the URL,
  or `window.Cart.add(...)`. The header count is kept in sync by `cart.js`.
- Ticket lines (products with the event metafield) hold one set of attendee answers per
  ticket as hidden line-item properties (`_1|Name`, `_1|Email`, …), so in the cart their
  quantity can only go down; more tickets are added from the event page. Attendee names are
  shown on the line so duplicate lines for the same event can be told apart.
- Checkout is a plain `POST /cart` with `checkout`, i.e. Shopify's standard checkout handoff.

### Drawers (slide-out panels)

The contact panel and the PDP attendee-details form share one drawer shell, and any new
slide-out panel should too:

- Markup/CSS: `assets/drawer.css` — `.drawer-backdrop`, `.drawer` (optionally
  `.drawer--fixed-body` when only an inner region should scroll), `.drawer-inner`,
  `.drawer-header`, `.drawer-heading`, `.drawer-title`, `.drawer-close` /
  `.drawer-close-line`. Panel-specific styles stay in that panel's own CSS.
- Behaviour: `window.Drawer.create(panel, backdrop, { bodyClass, onOpen, onClose })` in
  `assets/global.js` returns `{ open, close, isOpen }`. It handles Lenis stop/start, moving
  the drawer out of `#scroll-content`, backdrop/X/Escape, the mobile hamburger-as-close
  button, and handing over between drawers (only one is ever open).
- `bodyClass` (e.g. `contact-is-open`, `ticket-modal-is-open`) is for per-drawer nav
  tweaks; `drawer-is-open` is always set while any drawer is open.

### Key Front-End Modules

- `assets/contact.js`
  - contact panel open/close, topic routing, conditional fields
  - current send mechanism is `mailto:` fallback
- `assets/section-calendar.js`
  - list/grid toggles, month filtering, mobile rail UI, sticker randomization
- `assets/section-product.js`
  - variant select, quantity management, buy button state
  - attendee-details drawer for ticketed products (Event Ticketing app form)
  - direct buy flow clears cart, adds selected variant, redirects to `/checkout`

### Data Contracts

- Event metadata expected in product metafield `event_ticketing.event_v2`:
  - `starts_at`
  - `time`
  - `venue.name`
  - `venue.address` fields
- Status derivation:
  - `tag == upcoming` => coming soon; purchasing disabled on the PDP (Liquid
    `sales_closed` flag + `data-event-upcoming` for `assets/section-product.js`)
  - `starts_at` in the past => sold out; purchasing disabled
  - `product.available == false` => sold out

### Collection Product Caps

- `collection.products` in Liquid returns at most 50 products unless the loop is
  wrapped in `{% paginate collection.products by N %}` (max `N` per page is 250; no colon
  after `by` — see the Archives notes).
  `paginate` only accepts specific documented objects directly — not a variable,
  not a bracket-indexed dynamic handle.
- `sections/archives.liquid` uses real `{% paginate collections.all.products by 24 %}`
  pagination — `assets/section-archives.js` prefetches the remaining `page=N`
  slices up front via the Section Rendering API (up to `MAX_PREFETCH_PAGES`), so
  there's no small fixed ceiling on archived events. See "Archives Page" above for
  the full flow.
- `sections/calendar.liquid` and `sections/home-events.liquid` are left at the
  default 50 cap on purpose (current-season lists are small; avoids paying the
  higher scan cost on hot pages, and avoids depending on `{% paginate %}` there
  at all).
- The `{% paginate %}` tag has been rewritten once already by Shopify's GitHub
  sync (`by: 250` → `by nil`, silently zeroing the archives page — see
  "Known Shopify sync risk" above). If a future sync mangles it again, that's
  the first place to check when a paginated section suddenly renders empty.

### Internationalization

- Locale strings are in `locales/en.default.json`.
- Sections use translation keys for menu/contact/product/events labels where applicable.

## Development Workflow

No Node build pipeline is configured in this repo. Theme assets are committed directly.

- edit Liquid/CSS/JS directly in the repo root
- push to `develop` (or merge a `feature/*` PR into it)
- wait for Shopify's GitHub integration to sync the development theme
- validate in the storefront preview and Theme Editor for that theme
- Shopify's sync validates Liquid on import; a syntax error shows up as a failed sync in
  the theme's GitHub connection status rather than on the storefront

## Editing Guidelines

- Prefer updating section schemas when introducing new maintainer-facing settings.
- Keep behavior references in sync between:
  - section Liquid markup
  - associated asset JS/CSS
  - template JSON composition
- If adding new event logic, verify both:
  - calendar (`sections/calendar.liquid` + `assets/section-calendar.js`)
  - product detail (`sections/main-product.liquid` + `assets/section-product.js`)

## Quick Troubleshooting

- **Events missing from calendar**
  - check product is active and in selected collection
  - verify metafield namespace/key and storefront access
  - the calendar only shows the current season's 3-month window; it also reads
    at most 50 products from the collection (see "Collection Product Caps")
- **Old events missing from archives**
  - archives prefetches every page of the catalogue up front (capped at
    `MAX_PREFETCH_PAGES`, with load-more beyond that), so nothing should be
    permanently cut off; if events are still
    missing, check they're actually **active** (draft/archived in admin =
    invisible to the storefront) and dated before the current season start
  - if the page renders completely empty, check `sections/archives.liquid` for
    a Shopify-sync-mangled `{% paginate %}` tag (see "Known Shopify sync risk")
- **Archives "Load More" never shows / stops appearing**
  - expected once every page has been fetched and there's nothing left
    (`data-has-next="false"` on `#archive-pagination-state`) — normally the
    prefetch covers everything, so the button only appears past
    `MAX_PREFETCH_PAGES`
  - if events are missing, check the browser console for a failed page fetch
    (e.g. `section_id` mismatch); failed pages are logged and skipped, and the
    button remains a manual fallback
- **Featured event not showing**
  - ensure at least one active product has `featured` tag, or set manual product/image override
- **Contact form not sending to expected email**
  - verify topic block `Route to email address`
  - verify theme setting `Default contact email`
- **Sold out / coming soon badge mismatch**
  - confirm product availability and `upcoming` tag usage
- **"Coming Soon" event is still purchasable via direct URL**
  - confirm the product carries the `upcoming` tag (exact, lowercase); the PDP
    disables buying whenever that tag is present
