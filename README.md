# MTF Analytics Dashboard

A focused rebuild of an **Overview Dashboard for India's Margin Trading Facility (MTF) data**.

The project is a React/Vite prototype designed to present MTF market data through a compact analyst-oriented interface with historical trends, exchange-level breakdowns, asset-class composition, and a searchable stock table.

**Live Demo:** https://mtfprotype.vercel.app/

---

## 1. Project Overview

Margin Trading Facility (MTF) data is published as daily end-of-day disclosures by NSE and BSE in different file formats and on different schedules.

The goal of this project was not to reproduce the existing MTF analytics website, but to build a small, clear and extensible slice of the product while thinking through how the underlying data platform could work in production.

The prototype focuses on:

- High-level MTF book metrics
- NSE/BSE comparison
- Historical MTF book trends
- Daily MTF flows
- Asset-class composition
- Searchable stock-level data
- Responsive desktop/mobile UI
- Dark/light themes
- Data export
- Published-data refresh
- Clear separation between currently implemented functionality and the proposed production architecture

---

## 2. Live Application

**Production deployment:**  
https://mtfprotype.vercel.app/

The application is deployed as a Vite/React frontend on Vercel.

The current application consumes normalized public JSON data from `mtf.trading`. The production ingestion architecture described later in this README is a proposed design and is not fully implemented in this prototype.

---

## 3. Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Responsive design
- Charting components

### Data

- Public JSON endpoints from `mtf.trading`
- Client-side filtering and aggregation for selected views

### Deployment

- Vercel

### Proposed Production Backend

The production architecture would use:

- Scheduled ingestion worker
- Object storage for raw source files
- PostgreSQL or a columnar database for canonical data
- Precomputed aggregate tables/files
- Cached API/JSON responses
- Monitoring and alerting

---

# 4. What Is Done

The following functionality is implemented in the current prototype.

### Overview Metrics

- Total MTF book
- NSE/BSE split
- Rupee change
- Percentage change
- As-of date

### Historical Chart

The dashboard provides:

- 1M
- 3M
- 6M
- 1Y
- ALL

and allows filtering between:

- ALL
- NSE
- BSE

### Asset Composition

The dashboard displays the composition of:

- F&O
- Non-F&O
- ETFs

### Stock Table

The stock table supports:

- Search
- Sorting
- Pagination
- Symbol
- MTF book
- Daily change
- Leverage percentage

### UI

- Responsive desktop/mobile layout
- Dark mode
- Light mode
- Custom dashboard design
- Analyst-oriented information hierarchy
- Responsive controls and tables

### Data Export

The sidebar download action exports the currently loaded datasets as JSON.

### Refresh

The application polls the selected public source every 60 seconds after the initial load.

This should be understood as **published-data refresh**, not a real-time market feed. The underlying MTF disclosure data is daily/EOD data.

---

# 5. Data Health

The production design treats data freshness as a first-class concept.

For every exchange, the ingestion system should track:

- Source date
- Published time
- Received time
- Processing time
- Validation status
- Publication status

Example states:

```text
NSE   ✓ Fresh
BSE   ✓ Fresh

Last update: 24 Aug 2026
Status: Healthy
```

If only one exchange has arrived:

```text
NSE   ✓ Fresh
BSE   ⚠ Delayed

Status: Partial
```

The current prototype does not have the complete production ingestion-health pipeline, but this is part of the planned platform architecture.

---

# 6. Data Source Choice

The prototype consumes normalized public JSON endpoints from `mtf.trading`:

```text
https://mtf.trading/api/v1/summary
https://mtf.trading/mtf_daily_totals.json
https://mtf.trading/mtf_flow.json
https://mtf.trading/mtf_aum_by_class.json
https://mtf.trading/date/<asOf>.json
```

### Why?

The assignment is primarily evaluating product thinking, data handling, correctness and failure-mode design.

Using an already-normalized public dataset allowed the prototype to focus on:

- Dashboard design
- Data presentation
- API integration
- Historical charting
- Stock exploration
- Responsive UX

rather than spending the entire two-day period implementing a full exchange-file ingestion pipeline.

### Tradeoff

The main tradeoff is dependency on a third-party normalized data service.

A production version should ingest the original NSE/BSE disclosures directly so that the system owns:

- Source files
- Parsing
- Validation
- Data lineage
- Identity resolution
- Backfills
- Monitoring

---

# 7. Production Platform Architecture

The proposed end-to-end architecture is:

```text
                     ┌────────────────────┐
                     │        NSE         │
                     │    Excel / CSV     │
                     └─────────┬──────────┘
                               │
                               │
                     ┌─────────▼──────────┐
                     │                    │
                     │ Ingestion Worker   │
                     │                    │
                     └─────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
          ┌─────────────────┐    ┌─────────────────┐
          │  Raw Object     │    │   Validation    │
          │    Storage      │    │    Pipeline     │
          └────────┬────────┘    └────────┬────────┘
                   │                      │
                   └──────────┬───────────┘
                              ▼
                    ┌──────────────────┐
                    │ Canonical Data   │
                    │    Database      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        Daily Totals     Composition     Stock Data
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Precomputed JSON │
                    │   / Cached API   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ React Dashboard  │
                    └──────────────────┘
```

The architecture separates **raw ingestion**, **canonical storage**, **aggregation**, and **serving** so that failures in one stage do not corrupt already-published data.

---

# 8. Ingestion

NSE and BSE publish MTF data in different Excel/CSV formats and may publish at different times.

The production system should therefore treat each exchange as an independent ingestion pipeline.

## Step 1 — Discover and Download

A scheduled worker runs after the expected EOD publication window.

For each exchange:

1. Check the source page/API for the expected date.
2. Download the source file.
3. Store the original file unchanged in object storage.
4. Record metadata such as:

```text
exchange
trading_date
source_url
received_at
http_status
file_size
checksum
parser_version
```

The raw file should never be overwritten.

---

## Step 2 — Parse

Each exchange gets its own versioned parser/adapter because the file structures are different.

The parser converts the source into a canonical structure such as:

```text
trading_date
exchange
symbol
isin
amount_financed
fresh_exposure
exposure_liquidated
securities_count
```

A parser version is stored with every ingestion batch so that historical data can be reproduced after parser changes.

---

## Step 3 — Validate

Before publishing data, validate:

- Required columns exist
- Dates are valid
- Numeric values are valid
- Amounts are not unexpectedly negative
- Duplicate keys do not exist
- Row count is within expected range
- Source date matches expected trading date
- Exchange totals reconcile with parsed rows
- Composition totals are within rounding tolerance

Invalid files are quarantined rather than silently published.

---

# 9. Failure Handling

Production ingestion should be designed around failure rather than assuming every daily file arrives correctly.

## Holiday

A market holiday should not be treated as missing data.

Maintain a trading calendar:

```text
Expected trading day?
        │
     ┌──┴──┐
    YES    NO
     │      │
     ▼      ▼
 Ingest   Expected
          holiday
```

A holiday produces an expected-missing-day record, not a zero-value market record.

---

## Late Publication

If an expected file is not available:

1. Mark it as `PENDING`.
2. Retry using exponential backoff.
3. Continue checking until the configured deadline.
4. Alert if the file remains unavailable.

NSE and BSE are handled independently.

For example:

```text
NSE  ✓ Received
BSE  ⚠ Pending
```

The combined platform can therefore publish an explicitly marked partial state instead of pretending that both exchanges are current.

---

## File Never Arrives

If a file never arrives on an expected trading day:

```text
NSE  ✓
BSE  ✗ Missing
```

The platform should:

- Preserve the last valid BSE data
- Mark the current state as `PARTIAL`
- Never silently convert missing data to zero
- Trigger an operational alert
- Allow the file to be replayed later

---

## Format Change

If an exchange changes its Excel/CSV structure:

```text
Source file
    ↓
Parser
    ↓
Schema validation fails
    ↓
Quarantine
    ↓
Alert operator
    ↓
Update parser
    ↓
Replay original raw file
    ↓
Validate
    ↓
Publish
```

This prevents a format change from silently corrupting the database.

---

# 10. Backfill

The platform needs approximately nine years of historical MTF data.

The backfill process would:

1. Enumerate available historical NSE/BSE files.
2. Download them using bounded concurrency.
3. Store originals in object storage.
4. Parse each file using the correct parser version.
5. Validate the parsed data.
6. Load canonical rows into staging.
7. Resolve security identity.
8. Publish date-partitioned data.

The process is idempotent.

A combination of:

```text
source file checksum
+
trading date
+
exchange
+
parser version
```

can be used to prevent accidental duplicate loads.

### Estimated duration

For approximately:

- 2,200 trading days
- 2 exchanges
- ~4,400 source files

a bounded concurrent download and parsing worker should reasonably complete the initial backfill in approximately **1–2 hours**, depending on:

- Exchange throttling
- File size
- Network speed
- Database write performance
- Parser complexity

This is an estimate, not a measured production benchmark.

A larger production deployment could parallelize downloads and parsing further.

---

# 11. Identity Resolution

The same company can appear on NSE and BSE under different symbols or slightly different names.

The canonical identity should therefore be based primarily on **ISIN**, not company name.

Example:

```text
NSE Symbol: ABC
BSE Symbol: 123456
Company: ABC LIMITED
ISIN: INE123A01010
```

Both exchange records resolve to:

```text
ISIN = INE123A01010
```

and can therefore be represented as one security in the unified stock view.

## Security Master

Maintain a slowly changing security dimension containing:

```text
isin
exchange
symbol
scrip_code
company_name
valid_from
valid_to
```

This handles symbol and company-name changes over time.

### Missing ISIN

If ISIN is unavailable:

1. Attempt resolution through the exchange security master.
2. Use exchange-specific identifiers where available.
3. Never blindly merge based only on company name.
4. Quarantine unresolved records for manual mapping.

This prevents false company matches.

---

# 12. Storage

The proposed storage model has three layers.

## Raw Layer

Immutable exchange files stored in object storage.

Example:

```text
/raw/nse/2026/08/24/source.xlsx
/raw/bse/2026/08/24/source.csv
```

This provides complete source lineage and allows historical replay.

---

## Canonical Layer

A PostgreSQL database or suitable columnar database stores normalized daily rows.

Example conceptual schema:

```text
mtf_daily
-----------
trading_date
exchange
isin
symbol
amount_financed
fresh_exposure
exposure_liquidated
securities_count
parser_version
source_file_id
```

A security dimension stores identity information:

```text
security
-----------
isin
exchange
symbol
scrip_code
company_name
valid_from
valid_to
```

---

## Aggregate Layer

Precompute commonly requested data:

```text
daily_totals
daily_flow
aum_by_class
latest_stock_snapshot
historical_stock_series
```

This avoids repeatedly scanning raw stock-level rows.

---

# 13. Serving a 2,200-Point Series

The dashboard may request approximately 2,200 daily points for a long historical chart.

The application should not calculate this from raw stock-level records on every request.

Instead:

```text
Canonical Database
        ↓
Daily aggregation job
        ↓
Precomputed series
        ↓
Compressed JSON / Cached API
        ↓
React dashboard
```

For example:

```text
daily_totals.json
```

can contain one record per trading day.

This makes the historical chart extremely cheap to serve and easy to cache.

For a larger production system, the same data can be exposed through an API with CDN/edge caching.

### Why not only use a database?

A database is still required for:

- Stock-level queries
- Drilldowns
- Historical security data
- Identity resolution
- Administrative operations

But repeatedly querying it for simple historical charts adds unnecessary work.

Therefore the preferred design is:

**Database for source-of-truth + precomputed JSON/API for high-read aggregate views.**

---

# 14. Correctness

Correctness is treated as a separate concern from ingestion.

The system should continuously verify:

### File-level checks

- HTTP status
- File size
- Checksum
- Expected date
- Parser version

### Row-level checks

- Required fields
- Valid dates
- Valid numbers
- Duplicate keys
- Unexpected nulls
- Invalid identifiers

### Aggregate-level checks

- Parsed rows reconcile with source totals
- NSE/BSE totals are within expected ranges
- Composition totals reconcile
- No unexpected zero totals

### Time-series checks

Compare daily values against historical ranges.

For example:

```text
Today's MTF book
       ↓
Compare with previous day
       ↓
Unexpected movement?
       ↓
Alert
```

Thresholds should be configurable rather than hard-coded.

---

# 15. Detecting Silent Failures

The system should maintain operational metrics such as:

```text
last_successful_ingestion
last_received_file
row_count
total_mtf_book
processing_duration
validation_status
parser_version
```

Alerts should be triggered for:

- Missing files
- Late files
- Schema drift
- Unexpected row-count changes
- Duplicate records
- Suspicious MTF movements
- Unexpected zero totals
- Stale data
- Validation failures

A golden set of real exchange files should also be kept in CI to catch parser regressions whenever the parser changes.

---

# 16. Testing Strategy

The production ingestion pipeline should include unit and regression tests for:

```text
✓ Required column validation
✓ Invalid date rejection
✓ Invalid numeric values
✓ Duplicate row detection
✓ Negative-value detection
✓ Exchange-total reconciliation
✓ Composition reconciliation
✓ Holiday handling
✓ Missing-file handling
✓ Parser compatibility with historical files
✓ ISIN identity resolution
```

The current prototype is primarily a frontend/data-consumption slice; the complete exchange-file parser test suite is part of the production roadmap.

---

# 17. Current Prototype vs Production Plan

## Implemented in this submission

- React/Vite dashboard
- Responsive UI
- Dark/light themes
- MTF overview metrics
- NSE/BSE filtering
- Historical chart
- Multiple time ranges
- Asset-class composition
- Searchable stock table
- Sorting
- Pagination
- JSON export
- Public JSON API integration
- 60-second published-data polling
- Vercel deployment

## Designed but not fully implemented

- Direct NSE ingestion
- Direct BSE ingestion
- Raw exchange-file archival
- Versioned parser adapters
- Automated validation pipeline
- Complete 9-year exchange-file backfill
- Production security master
- Full ISIN reconciliation pipeline
- Database-backed API
- Automated alerting
- Operator replay interface
- Production data-health monitoring

This distinction is intentional. The prototype prioritizes a working, understandable slice over a broad but incomplete production implementation.

---

# 18. Known Limitations

### 1. Third-party data dependency

The current frontend uses normalized public JSON data from `mtf.trading` instead of directly ingesting NSE/BSE files.

### 2. Published data is not a market tick feed

The source data represents daily/EOD MTF disclosures.

The 60-second polling interval only checks whether newly published data is available.

It does not provide intraday market prices or tick-level updates.

### 3. Some metrics are presentation-level

Metrics such as:

- Active securities
- Biggest daily move
- Flush events
- Average leverage

are currently not backed by independent production calculations.

They should not be interpreted as fully validated production metrics.

### 4. No complete production identity pipeline

The current client does not implement the complete ISIN/security-master resolution pipeline described in the production design.

### 5. No production ingestion worker

The NSE/BSE ingestion architecture is documented but not implemented in the two-day prototype.

---

# 19. Roadmap

## First 2 Weeks — MVP Production Pipeline

- NSE ingestion adapter
- BSE ingestion adapter
- Raw file archive
- Canonical database schema
- Basic validation
- Daily aggregate generation
- Precomputed JSON/API
- Overview dashboard
- Basic freshness monitoring

## Month 1

- 9-year historical backfill
- ISIN/security-master reconciliation
- Stock-level historical data
- Retry and replay tooling
- Better API caching

## Month 2

- Data-health dashboard
- Operational alerts
- Parser regression suite
- Improved stock analytics
- More robust historical queries

## Month 3

- Operator/admin interface
- Security-master management
- Full ingestion observability
- Production hardening
- Better API access patterns
- Expanded analytics and drilldowns

---

# 20. Estimated Monthly Cost

For a low-volume deployment:

| Component | Estimated Monthly Cost |
|---|---:|
| Object storage | $1–5 |
| Scheduled worker | $5–15 |
| Small PostgreSQL instance | $10–30 |
| CDN/API caching | $0–10 |
| Monitoring | $0–10 |
| **Estimated total** | **~$20–70/month** |

This estimate assumes:

- Low traffic
- Small database
- Daily ingestion
- CDN caching
- No expensive warehouse
- Minimal operational tooling

A high-availability production deployment, larger historical database, extensive monitoring, or heavy traffic would increase the cost.

---

# 21. Design Direction

The dashboard intentionally uses a **compact analyst workspace** rather than copying the existing MTF analytics interface.

The information hierarchy is:

```text
High-signal metrics
        ↓
Primary historical trend
        ↓
Market composition
        ↓
Secondary metrics
        ↓
Stock-level exploration
```

The design uses:

- Strong metric hierarchy
- Compact information density
- Clear filtering controls
- Responsive layouts
- Dark mode for extended monitoring
- Light mode for daylight use
- Independent visual identity

The goal was to make the interface feel like an analyst's monitoring workspace rather than a direct clone of an existing website.

---

# 22. Tradeoffs

### Working frontend over full ingestion pipeline

A full NSE/BSE ingestion system was not implemented within the two-day constraint.

Instead, the prototype uses normalized public JSON data so that the UI and product experience could be completed and tested.

### Precomputed data over database-only serving

Historical aggregate series are better suited to precomputed/cached responses because they are read frequently and change relatively infrequently.

### ISIN over company name

ISIN provides a stronger canonical identifier for dual-listed securities and avoids unsafe name-based merges.

### Partial data over fake completeness

If one exchange fails in production, the system should expose a `PARTIAL` state rather than silently replacing missing data with zero or pretending that both exchanges are current.

### Immutable raw files

Keeping original exchange files allows future parser fixes and historical replay without depending on the source website remaining unchanged.

---

# 23. AI Usage

AI tools were used during development for:

- Code exploration
- React implementation assistance
- Debugging
- UI iteration
- Formatting
- Understanding public endpoint structures
- Reviewing architecture ideas
- README refinement

AI was used as a development assistant rather than as a replacement for validating the final application.

The final decisions around:

- Data source
- Dashboard structure
- Production architecture
- Failure handling
- Storage strategy
- Identity resolution
- Tradeoffs

were reviewed against the assignment requirements and available source/data documentation.

---

# 24. Approximate Time Spent

The two-day development effort was approximately divided as follows:

| Area | Approx. Time |
|---|---:|
| Data/API investigation | 35% |
| UI and responsive styling | 35% |
| Charts and table behavior | 15% |
| README / architecture / tradeoff analysis | 10% |
| Build and deployment verification | 5% |

The time allocation intentionally prioritized producing a working, polished and understandable prototype rather than implementing a broad production system that could not be properly tested.

---

# 25. Known Bugs / Issues

Current known limitations are primarily related to the prototype's dependency on external normalized data.

Potential external-data issues include:

- Source endpoint availability
- Delayed daily publication
- Changes to third-party JSON structure
- CORS or network restrictions
- Historical data inconsistencies outside the application's control

The application preserves the last successful response when a later polling request fails, where applicable, instead of immediately replacing the displayed data with an empty state.

---

# 26. Run Locally

Clone the repository and install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 27. Final Submission Scope

This submission deliberately focuses on a **small, working and well-reasoned slice** of the larger platform.

The prototype demonstrates:

1. A working Overview experience
2. Real public data integration
3. Historical data visualization
4. Stock-level exploration
5. Responsive product design
6. Clear data-source tradeoffs
7. A production-oriented ingestion architecture
8. Explicit handling of failure scenarios
9. A scalable storage and serving strategy
10. A roadmap for moving from prototype to production

The production design is intentionally documented separately from the current implementation so that the boundary between **what works today** and **what would be built next** remains clear.