# Green Tile Social Club Web

Custom Shopify theme for the Green Tile Social Club site, plus a static prototype snapshot used during design/development.

This README is written for two audiences:
- **Site maintainers**: what to update in Shopify admin and what each section does.
- **Engineers**: code structure, data flow, and implementation details.

## Project Structure

- Root-level `assets/`, `sections/`, `templates/`, `snippets/`, `layout/`, `locales/`, and `config/` - active Shopify theme runtime files.
- `/raw-html/` - static prototype/reference implementation used during design and for behavior parity checks.
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

### Product Detail (`sections/main-product.liquid`)

- Uses product data + event metafield to render:
  - event date/time
  - venue details
  - variants as ticket types
  - quantity picker + buy button
- Fill in section:
  - buy button label
  - max quantity per order

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
  - `tag == upcoming` => coming soon
  - `product.available == false` => sold out

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
- **Featured event not showing**
  - ensure at least one active product has `featured` tag, or set manual product/image override
- **Contact form not sending to expected email**
  - verify topic block `Route to email address`
  - verify theme setting `Default contact email`
- **Sold out / coming soon badge mismatch**
  - confirm product availability and `upcoming` tag usage
