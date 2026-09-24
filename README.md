# Green Tile Social Club Web

Custom Shopify theme for the Green Tile Social Club site, plus a static prototype snapshot used during design/development.

This README is written for two audiences:
- **Site maintainers**: what to update in Shopify admin and what each section does.
- **Engineers**: code structure, data flow, and implementation details.

## Project Structure

- Root-level `assets/`, `sections/`, `templates/`, `snippets/`, `layout/`, `locales/`, and `config/` - active Shopify theme runtime files.
- `raw-html/` - static prototype/reference implementation used during design and for behavior parity checks.
  - `raw-html/css/` - prototype styles.
  - `raw-html/scripts/` - prototype JS behavior modules.
  - `raw-html/*.html` - section/page reference markup.

If you are editing live storefront behavior, work in the Shopify theme files (not the static `raw-html/` reference files).

## Shopify Integration & Branch Workflow

This repo separates client-managed Shopify changes from core code maintenance:

- `master` - source of truth for underlying theme code and engineering changes.
- `shopify` - branch that receives client/content changes synced from Shopify Admin/Theme Editor.

Expected flow:

1. Client or non-dev content/styling updates happen in Shopify Admin.
2. Those Shopify-side changes are pulled/committed to `shopify`.
3. `master` stays clean of direct client portal edits and remains the canonical engineering baseline.
4. Engineering work is developed/reviewed against `master`, then selectively merged/cherry-picked into `shopify` as needed for deployment sync.

This keeps portal-driven content edits auditable without muddying core source history.

## Shopify Setup

### Required Theme Settings

In **Theme settings**:
- **Contact form**
  - `Default contact email` (`contact_email`)
- **Event settings**
  - `Event metafield namespace` (default: `event_ticketing`)
  - `Event metafield key` (default: `event_v2`)
- **Navigation**
  - Logo, nav labels/URLs, back link target
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
  `{% paginate archive_source by: 24 %}` — real Shopify pagination (`page=N`
  in the URL), not a raised item cap. `assets/section-archives.js` fetches
  subsequent pages via the Section Rendering API
  (`?section_id=...&page=N`) as the "Load More" button scrolls into view
  (`IntersectionObserver`), merges the new cells into the existing
  month-packed grid, and stops once `paginate.next` is empty. The button
  itself stays in the DOM as a manual click fallback. There is no fixed
  ceiling — it keeps paging through the whole collection.
  - Sort order still matters for a *different* reason now: it decides the
    order events surface in as the visitor scrolls. Keep the events collection
    sorted **Date: newest first** so newest-first scroll order matches display
    order (the grid re-sorts every fetched batch by event date, so this only
    affects fetch order, not final on-screen order).
  - A raw 24-product page can land entirely on current-season (non-archived)
    products; the JS keeps auto-fetching subsequent pages until one actually
    contributes archive cells, so the "coming soon" empty state only shows once
    every page has been exhausted with zero matches.
- **Known Shopify sync risk**: the GitHub theme-sync app has previously
  rewritten `{% paginate ... by: 24 %}` to `{% paginate ... by nil %}` in an
  auto-commit (breaks pagination — renders 0 items), with an auto-inserted
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

### Key Front-End Modules

- `assets/contact.js`
  - contact panel open/close, topic routing, conditional fields
  - current send mechanism is `mailto:` fallback
- `assets/section-calendar.js`
  - list/grid toggles, month filtering, mobile rail UI, sticker randomization
- `assets/section-product.js`
  - variant select, quantity management, buy button state
  - buy flow clears cart, adds selected variant, redirects to `/checkout`

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
  wrapped in `{% paginate collection.products by: N %}` (max `N` per page is 250).
- `sections/archives.liquid` uses real `{% paginate archive_source by: 24 %}`
  pagination — `assets/section-archives.js` fetches additional `page=N` slices
  via the Section Rendering API as the visitor scrolls, so there's no fixed
  ceiling on total archived events. See "Archives Page" above for the full flow.
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

## Local Development

No Node build pipeline is configured in this repo. Theme assets are committed directly.

Typical Shopify workflow:
- Shopify CLI serve/pull/push against `shopify-theme/`
- edit Liquid/CSS/JS directly
- validate in Theme Editor + storefront preview

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
  - archives now pages through the whole collection via scroll-triggered
    fetches, so nothing should be permanently cut off; if events are still
    missing, check they're actually **active** (draft/archived in admin =
    invisible to the storefront) and dated before the current season start
  - if the page renders completely empty, check `sections/archives.liquid` for
    a Shopify-sync-mangled `{% paginate %}` tag (see "Known Shopify sync risk")
- **Archives "Load More" never shows / stops appearing**
  - expected once every page has been fetched and there's nothing left
    (`data-has-next="false"` on `.archives-page`)
  - if it's missing on first load with events still remaining, check the
    browser console for a failed fetch (e.g. `section_id` mismatch) — the
    button itself still works as a manual fallback if the auto-scroll fetch
    silently fails
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
