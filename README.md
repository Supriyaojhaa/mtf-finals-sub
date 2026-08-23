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


# 8. AI Usage

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

# 9. Approximate Time Spent

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

# 10. Known Bugs / Issues

Current known limitations are primarily related to the prototype's dependency on external normalized data.

Potential external-data issues include:

- Source endpoint availability
- Delayed daily publication
- Changes to third-party JSON structure
- CORS or network restrictions
- Historical data inconsistencies outside the application's control

The application preserves the last successful response when a later polling request fails, where applicable, instead of immediately replacing the displayed data with an empty state.

---

# 11. Run Locally

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

# 12. Final Submission Scope

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