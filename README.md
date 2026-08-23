# MTF Analytics Dashboard

A focused rebuild of the Overview tab for India's Margin Trading Facility (MTF) data. It is a React/Vite app with a custom dashboard design, live public JSON ingestion, responsive layout, dark/light themes, chart controls, and a searchable stock table.

## Run

```bash
npm install
npm run dev
```

Build for production with `npm run build`.

## What Is Done

- Overview-only dashboard with total MTF book, NSE/BSE split, rupee change, percentage change, and as-of date.
- Daily MTF book chart with 1M, 3M, 6M, 1Y, and ALL ranges plus ALL/NSE/BSE filtering.
- Composition breakdown for F&O, non-F&O, and ETFs.
- Searchable, sortable, paginated stock table with symbol, book, daily change, and leverage percentage.
- Responsive desktop/mobile layout and deliberate dark/light themes.
- JSON export of the currently loaded datasets from the sidebar download button.
- 60-second polling refresh after the initial load. This refreshes published data; it is not a tick-level market feed.

## Data Choice And Tradeoffs

The app consumes mtf.trading's public JSON endpoints rather than scraping exchange files in the browser:

- `https://mtf.trading/api/v1/summary`
- `https://mtf.trading/mtf_daily_totals.json`
- `https://mtf.trading/mtf_flow.json`
- `https://mtf.trading/mtf_aum_by_class.json`
- `https://mtf.trading/date/<asOf>.json`

This keeps the client small and gives access to the site's already-normalized historical data. The tradeoff is dependency on a third-party public service and its daily publication cadence. The source reports are daily EOD disclosures, not intraday prices. If the initial request fails, a small fallback dataset keeps the UI usable; a later polling failure preserves the last successful live response.

## Known Limitations

- There is no public WebSocket feed in the selected source, so "real time" means polling the latest published data every 60 seconds.
- Active securities, biggest daily move, flush events, and average leverage are currently presentation values rather than separate live calculations.
- The client aggregates exchange-level historical totals by date but does not implement the source site's full fill-forward or ISIN identity pipeline.
- No public deployment URL has been configured in this workspace yet.

## Design Direction

The interface uses a compact analyst workspace: high-signal headline metrics first, a primary trend view next, then composition, secondary metrics, and the stock table. It intentionally avoids copying mtf.trading's layout, colors, or typography. Dark mode is optimized for long monitoring sessions; light mode uses cool neutral surfaces and stronger active-control contrast for daylight use.

## AI And Time Note

AI tools were used for code exploration, implementation assistance, debugging, formatting, and checking the public endpoint shapes. The final data choice, UI structure, and tradeoffs were reviewed against the brief and the source methodology/data pages. Approximate time split: 35% data/API investigation, 40% UI and responsive styling, 15% chart/table behavior, and 10% README/build verification.

## Platform Plan

### Ingestion

Run a scheduled worker after the NSE and BSE EOD windows. Fetch each exchange's MTF Excel/CSV into immutable object storage with URL, checksum, HTTP status, discovered date, and parser version. Parse each format through a versioned adapter into a canonical row: `trading_date`, `exchange`, `symbol`, `isin`, `amount_financed`, `fresh_exposure`, `exposure_liquidated`, and `securities_count`.

Validate required columns, row counts, numeric ranges, duplicate keys, date coverage, and reconciliation totals before publishing. A holiday creates an expected-missing-day record, not a zero. A late file remains pending and triggers retries with exponential backoff. A format change quarantines the file, alerts the operator, and leaves the last good partition served. If a file never arrives, publish each exchange independently and fill forward the missing side in the combined view, while marking data health as partial.

### Backfill

Enumerate the archived daily source files from June 2017, download them concurrently with a bounded worker pool, and parse them into date-partitioned staging tables. For roughly 2,200 trading days and 3,400 stocks, a small cloud worker should finish in tens of minutes to a few hours depending on exchange throttling. Backfill is idempotent: the file checksum and parser version make reruns safe.

### Identity

Use ISIN as the canonical security key. Maintain a slowly changing security dimension containing ISIN, exchange symbol, scrip code, names, and validity dates. Resolve symbol/name changes through the exchange security master; keep exchange rows separate for exchange totals but collapse dual-listed securities by ISIN for the unified stock view. Unmatched rows are quarantined for manual mapping rather than guessed.

### Storage And Serving

Store raw files in object storage, canonical daily rows in a columnar warehouse or PostgreSQL partitions, and the latest stock snapshot in a query-friendly table. Precompute daily totals, composition, flow, and the latest screener snapshot after each successful ingestion. Serve the 2,200-point series from compressed versioned JSON or an edge-cached API response; this avoids scanning stock-level rows on every chart request while retaining database queries for drill-downs.

### Correctness And Operations

Reconcile NSE and BSE file totals against parsed row sums, compare day-over-day movements against thresholds, verify that composition sums are within rounding tolerance, and track row counts by exchange. Store source-file checksums and parser versions for lineage. Alert on missing files, schema drift, suspicious jumps, duplicate keys, stale freshness, or unexpected zero totals. Keep a small golden fixture set from real exchange files in CI for parser regression tests.

### Roadmap And Cost

In two weeks: ingestion adapters, raw archive, canonical totals, validation rules, precomputed JSON, Overview UI, and basic monitoring. In three months: complete ISIN/security-master reconciliation, stock-level history, backfill tooling, source archival, operator replay UI, richer API, and alerting dashboards. A low-volume deployment using object storage, one scheduled worker, a small database, and CDN caching should cost roughly $20-$80/month; a managed warehouse, high availability, and extensive archival would raise that range.

## Deployment

The app builds successfully with Vite, but no hosting provider or public deployment URL is configured in this repository. Deploy the generated `dist/` directory to any static host such as Cloudflare Pages, Netlify, or Vercel, and configure the host to allow browser requests to `https://mtf.trading`.
