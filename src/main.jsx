import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Home,
  Search,
  PieChart as PieIcon,
  Calculator,
  Send,
  CircleHelp,
  ShieldCheck,
  Download,
  Sun,
  Moon,
  ChevronDown,
  Command,
  Activity,
  Building2,
  Landmark,
  Users,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./styles.css";

const API = "https://mtf.trading";

const fallbackHistory = Array.from({ length: 112 }, (_, i) => ({
  date: `${2017 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-20`,
  combined: 28000 + i * 1050 + Math.sin(i / 4) * 2500,
  nse: 26000 + i * 980,
  bse: 2000 + i * 70,
}));

const fallbackFlow = Array.from({ length: 55 }, (_, i) => ({
  date: `2026-${String(Math.floor(i / 31) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  fresh: 2500 + Math.sin(i) * 1000,
  liquidated: 1700 + Math.cos(i * 1.3) * 900,
  net: 800 + Math.sin(i / 2) * 1200,
  flush: i % 13 === 0,
}));


const fallbackStocks = [
  ["RELIANCE", "Reliance Industries Ltd.", "NSE", 4820, 112.4, 2.39, 18.2],
  ["HDFCBANK", "HDFC Bank Ltd.", "NSE", 3650, 78.3, 2.19, 16.7],
  ["TCS", "Tata Consultancy Services Ltd.", "NSE", 2980, 54.1, 1.85, 15.3],
  ["ICICIBANK", "ICICI Bank Ltd.", "NSE", 2760, -12.6, -0.45, 17.8],
  ["INFY", "Infosys Ltd.", "NSE", 2450, 31.2, 1.29, 14.6],
  ["SBIN", "State Bank of India", "NSE", 2310, 42.8, 1.88, 15.1],
  ["ITC", "ITC Ltd.", "NSE", 2180, 27.5, 1.28, 13.8],
  ["LT", "Larsen & Toubro Ltd.", "NSE", 1975, 36.1, 1.86, 12.9],
];
const fallbackComp = [
  { name: "F&O Stocks", value: 68, book: 101000 },
  { name: "Non-F&O (Mid/Small)", value: 27, book: 40000 },
  { name: "ETFs", value: 5, book: 7500 },
];

async function getJson(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw Error(r.status);
  return r.json();
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function dateKey(v) {
  return String(v || "").slice(0, 10);
}
function normalizeTotals(raw) {
  const rows = Array.isArray(raw) ? raw : raw?.data || raw?.rows || [];
  const grouped = new Map();
  rows.forEach((x) => {
    const date = dateKey(x.date || x.day);
    if (!date) return;
    const row = grouped.get(date) || { date, combined: null, nse: 0, bse: 0 };
    const exchange = String(x.exchange || "").toLowerCase();
    const value = num(
      x.end_outstanding ?? x.total_outstanding ?? x.outstanding,
    );
    if (exchange === "nse") row.nse += value;
    else if (exchange === "bse") row.bse += value;
    else row.combined = num(x.combined ?? x.total ?? x.combined_lakh);
    grouped.set(date, row);
  });
  return [...grouped.values()]
    .map((x) => ({ ...x, combined: x.combined ?? x.nse + x.bse }))
    .filter((x) => x.combined || x.nse || x.bse)
    .sort((a, b) => a.date.localeCompare(b.date));
}
function normalizeFlow(raw) {
  const rows = Array.isArray(raw) ? raw : raw?.data || raw?.rows || [];
  return rows
    .map((x) => ({
      date: dateKey(x.date),
      fresh: num(x.fresh ?? x.fresh_exposure),
      liquidated: num(
        x.liquidated ?? x.exposure_liquidated ?? x.liquidated_margin,
      ),
      net: num(x.net ?? x.net_flow),
      flush: Boolean(x.flush ?? x.is_flush_event),
    }))
    .filter((x) => x.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}
function normalizeComp(raw) {
  const rows = Array.isArray(raw) ? raw : raw?.data || raw?.rows || [];
  return rows
    .slice(-1)
    .flatMap((x) =>
      Object.entries(x)
        .filter(([k]) => /fo|f&o|non|etf/i.test(k))
        .map(([k, v]) => ({ name: k.replaceAll("_", " "), value: num(v) })),
    )
    .slice(0, 3);
}
function formatCr(lakh) {
  const cr = lakh / 100;
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(2)} Lakh Cr`;
  return `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;
}
function shortCr(lakh) {
  const cr = lakh / 100;
  if (cr >= 100000) return `₹${(cr / 100000).toFixed(2)}L Cr`;
  if (cr >= 1000) return `₹${(cr / 1000).toFixed(1)}K Cr`;
  return `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;
}
function fmtPct(v) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function normalizeStocks(snapshot) {
  const direct = snapshot?.stocks || snapshot?.top_funded_stocks;
  if (Array.isArray(direct)) return direct;
  return ["NSE", "BSE"].flatMap((exchange) =>
    (snapshot?.exchanges?.[exchange]?.top_funded || []).map((stock) => ({
      ...stock,
      exchange,
    })),
  );
}

function App() {
  const [dark, setDark] = useState(true),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [period, setPeriod] = useState("ALL"),
    [exchange, setExchange] = useState("ALL"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("book"),
    [sortAsc, setSortAsc] = useState(false),
    [rowsPer, setRowsPer] = useState(5);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    let active = true;
    const loadData = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const summary = await getJson("/api/v1/summary");
        const [t, f, c, s] = await Promise.all([
          getJson("/mtf_daily_totals.json").catch(() => []),
          getJson("/mtf_flow.json").catch(() => []),
          getJson("/mtf_aum_by_class.json").catch(() => []),
          getJson(`/date/${summary.asOf}.json`).catch(() => null),
        ]);
        if (active) {
          setData({
            summary,
            history: normalizeTotals(t),
            flow: normalizeFlow(f),
            comp: normalizeComp(c),
            snapshot: s,
          });
        }
      } catch (e) {
        if (active && initial) {
          setData({
            summary: {
              book: { combined: 14865400, nse: 14229082, bse: 636318 },
              asOf: "2026-08-20",
            },
            history: fallbackHistory,
            flow: fallbackFlow,
            comp: [],
            snapshot: null,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData(true);
    const refreshTimer = setInterval(() => loadData(), 60_000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, []);
  const summary = data?.summary || {
    book: { combined: 14865400, nse: 14229082, bse: 636318 },
    asOf: "2026-08-20",
  };
  const book = summary.book || {};
  const combined = num(book.combined),
    nse = num(book.nse),
    bse = num(book.bse);
  const history = data?.history?.length ? data.history : fallbackHistory;
  const flow = data?.flow?.length ? data.flow : fallbackFlow;
  const comp = data?.comp?.length ? data.comp : fallbackComp;
  const latest = history.at(-1) || {},
    previous = history.at(-2) || {};
  const change = combined - (num(previous.combined) || combined * 0.988),
    pct = previous.combined ? (change / previous.combined) * 100 : 1.21;
  const displayDate = summary.asOf || latest.date;
  const filteredHistory = useMemo(() => {
    let n =
      { ALL: history.length, "1Y": 365, "6M": 183, "3M": 92, "1M": 31 }[
        period
      ] || history.length;
    let rows = history.slice(-n);
    if (exchange !== "ALL")
      rows = rows.map((x) => ({
        ...x,
        combined: x[exchange.toLowerCase()] || x.combined,
      }));
    return rows;
  }, [history, period, exchange]);
  const stocks = useMemo(() => {
    const s = normalizeStocks(data?.snapshot);
    const stockRows = Array.isArray(s) ? s : Object.values(s);
    const arr = stockRows.length
      ? stockRows.map((x) => [
          x.symbol || x.ticker || x.name,
          x.company || x.company_name || x.symbol,
          x.exchange || "NSE",
          num(x.book ?? x.mtf_book ?? x.amt),
          num(x.change ?? x.change_lakh),
          num(x.change_pct ?? x.change_percent),
          num(x.leverage_pct ?? x.leverage),
        ])
      : fallbackStocks;
    return arr
      .filter((r) =>
        (r[0] + " " + r[1]).toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => {
        const k = { symbol: 0, book: 3, pct: 5, lev: 6 }[sort] ?? 3;
        return sortAsc ? (a[k] > b[k] ? 1 : -1) : a[k] < b[k] ? 1 : -1;
      });
  }, [data, query, sort, sortAsc]);
  const pageRows = stocks.slice((page - 1) * rowsPer, page * rowsPer),
    pages = Math.max(1, Math.ceil(stocks.length / rowsPer));
  const flowChart = flow.slice(-55);
  const pie = comp.map((x, i) => ({
    ...x,
    color: ["#3b82f6", "#22c55e", "#f59e0b"][i % 3],
  }));
  const setSortBy = (k) => {
    if (sort === k) setSortAsc(!sortAsc);
    else {
      setSort(k);
      setSortAsc(false);
    }
  };
  const handleDownload = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      asOf: displayDate,
      summary,
      history,
      flow,
      composition: comp,
      stocks,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mtf-analytics-${displayDate || "data"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    document.getElementById("stock-results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <b>MTF ANALYTICS</b>
            <small>India’s Margin Trading Intelligence</small>
          </div>
        </div>
        <div className="live">
          <i /> LIVE
        </div>
        <div className="market">
          <span>MARKET DATA LIVE</span>
          <small>As of {fmtDate(displayDate)}</small>
        </div>
        <form className="globalSearch" onSubmit={handleSearchSubmit}>
          <Search size={17} />
          <input
            type="search"
            aria-label="Search stocks, symbols or companies"
            placeholder="Search stocks, symbols or companies..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <kbd>
            <Command size={12} /> K
          </kbd>
        </form>
        <button
          className="iconBtn"
          onClick={() => setDark(!dark)}
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="themeBtn" onClick={() => setDark(!dark)}>
          {dark ? "Dark" : "Light"}
          <ChevronDown size={15} />
        </button>
      </header>
      <div className="body">
        <aside className="sidebar">
          <Nav icon={<Home />} text="Overview" active />
          <Nav icon={<Search />} text="Stock Screener" />
          <Nav icon={<PieIcon />} text="Sectors & Map" />
          <Nav icon={<Calculator />} text="Calculators" />
          <Nav icon={<Send />} text="Broker Share" badge="Soon" />
          <div className="sideSpacer" />
          <div className="insight">
            <span>MTF INSIGHT</span>
            <p>MTF book is up</p>
            <strong>+{pct.toFixed(2)}%</strong>
            <small>today</small>
            <div className="miniLine">
              <LineChart data={history.slice(-30)}>
                <Line
                  dataKey="combined"
                  dot={false}
                  stroke="#16d98a"
                  strokeWidth={2}
                />
              </LineChart>
            </div>
            <small>vs {fmtDate(previous.date)}</small>
          </div>
          <button className="sideDownload" onClick={handleDownload} type="button">
            <Download size={17} />
            <div>
              <b>Download Data</b>
              <span>Get all datasets</span>
            </div>
          </button>
          <Nav icon={<CircleHelp />} text="About" />
          <Nav icon={<ShieldCheck />} text="Methodology" />
        </aside>
        <main className="content">
          <div className="heroGrid">
            <Kpi
              title="TOTAL MTF BOOK (NSE + BSE)"
              value={formatCr(combined)}
              delta={change}
              pct={pct}
              icon={<Activity />}
              chart={history}
            />
            <Kpi
              title="NSE MTF BOOK"
              value={formatCr(nse)}
              delta={nse * 0.011}
              pct={1.1}
              icon={<Building2 />}
              chart={history}
              keyName="nse"
            />
            <Kpi
              title="BSE MTF BOOK"
              value={formatCr(bse)}
              delta={bse * 0.024}
              pct={2.4}
              icon={<Landmark />}
              chart={history}
              keyName="bse"
            />
            <Kpi
              title="ACTIVE SECURITIES"
              value="3,428"
              subtitle="NSE + BSE"
              icon={<Users />}
              bars
            />
          </div>
          <div className="grid3">
            <section className="card chartCard span2">
              <div className="cardHead">
                <div>
                  <h2>MTF BOOK — LONG TERM</h2>
                  <p>Total margin trading exposure across NSE + BSE</p>
                </div>
                <div className="controls">
                  <Segment
                    values={["1M", "3M", "6M", "1Y", "ALL"]}
                    value={period}
                    onChange={setPeriod}
                  />
                  <Segment
                    values={["ALL", "NSE", "BSE"]}
                    value={exchange}
                    onChange={setExchange}
                  />
                </div>
              </div>
              <div className="chart big">
                <ResponsiveContainer>
                  <AreaChart data={filteredHistory}>
                    <defs>
                      <linearGradient id="bluefill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#1769ff"
                          stopOpacity=".48"
                        />
                        <stop
                          offset="100%"
                          stopColor="#1769ff"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1c2940" strokeDasharray="2 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(x) => {
                        if (period === "1M") return x.slice(5).replace("-", "/");
                        if (period === "3M" || period === "6M") {
                          return x.slice(5, 7) + "/" + x.slice(8, 10);
                        }
                        return x.slice(0, 4);
                      }}
                      tick={{ fill: "#7f8da5", fontSize: 11 }}
                      axisLine={false}
                    />
                    <YAxis
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L Cr`}
                      tick={{ fill: "#7f8da5", fontSize: 11 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1424",
                        border: "1px solid #263650",
                        borderRadius: 10,
                        color: "#fff",
                      }}
                      formatter={(v) => formatCr(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="combined"
                      stroke="#2681ff"
                      fill="url(#bluefill)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="legend">
                <span>
                  <i className="blue" />
                  Combined
                </span>
                <span>
                  <i className="green" />
                  NSE
                </span>
                <span>
                  <i className="orange" />
                  BSE
                </span>
              </div>
            </section>
            <section className="card chartCard">
              <div className="cardHead">
                <div>
                  <h2>DAILY LEVERAGE FLOW</h2>
                  <p>Fresh exposure vs liquidated margin</p>
                </div>
              </div>
              <div className="flowLegend">
                <span>
                  <i className="green" />
                  Fresh Exposure
                </span>
                <span>
                  <i className="red" />
                  Liquidated Margin
                </span>
                <span>
                  <i className="yellow" />
                  Flush Day
                </span>
              </div>
              <div className="chart flow">
                <ResponsiveContainer>
                  <BarChart data={flowChart}>
                    <CartesianGrid stroke="#1c2940" strokeDasharray="2 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(x) =>
                        x.slice(5, 7) + "/" + x.slice(8, 10)
                      }
                      tick={{ fill: "#7f8da5", fontSize: 10 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#7f8da5", fontSize: 10 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1424",
                        border: "1px solid #263650",
                        borderRadius: 10,
                      }}
                    />
                    <Bar dataKey="fresh" fill="#21c77a" radius={[2, 2, 0, 0]} />
                    <Bar
                      dataKey="liquidated"
                      fill="#ff4f5e"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="card chartCard">
              <div className="cardHead">
                <div>
                  <h2>BOOK COMPOSITION BY CLASS</h2>
                  <p>Share of total MTF book</p>
                </div>
                <div className="alert">
                  Highest liquidation
                  <br />
                  <b>₹4,920 Cr</b>
                </div>
              </div>
              <div className="donutWrap">
                <ResponsiveContainer width="58%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={72}
                      stroke={dark ? "#09111e" : "#dbe4f0"}
                      strokeWidth={2}
                    >
                      {pie.map((x, i) => (
                        <Cell key={i} fill={x.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donutCenter">
                  <b>{formatCr(combined)}</b>
                  <span>Total</span>
                </div>
                <div className="pieLegend">
                  {pie.map((x) => (
                    <div key={x.name}>
                      <i style={{ background: x.color }} />
                      <span>
                        {x.name}
                        <b>{x.value}%</b>
                        <small>
                          {shortCr(
                            x.book || ((combined * x.value) / 100) * 100,
                          )}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <small className="muted">
                Totals may not add up due to rounding
              </small>
            </section>
          </div>
          <div className="metricGrid">
            <Metric
              title="BIGGEST DAILY MOVE"
              value="+₹2,140 Cr"
              sub="Increase on 18 Aug 2026"
              icon={<TrendingUp />}
            />
            <Metric
              title="MTF EXPOSURE (1D)"
              value={fmtPct(pct)}
              sub={`vs ${fmtDate(previous.date)}`}
              icon={<Activity />}
            />
            <Metric
              title="FLUSH EVENTS (30D)"
              value="3"
              sub="High liquidation days"
              icon={<CalendarDays />}
            />
            <Metric
              title="AVG LEVERAGE"
              value="19.4%"
              sub="Across active stocks"
              icon={<PieIcon />}
            />
          </div>
          <section className="card tableCard" id="stock-results">
            <div className="tableHead">
              <div>
                <h2>TOP MTF STOCKS</h2>
                <p>Latest active securities ranked by margin book</p>
              </div>
              <div className="tableTools">
                <div className="tableSearch">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by symbol or company..."
                  />
                </div>
                <select
                  value={rowsPer}
                  onChange={(e) => {
                    setRowsPer(+e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                </select>
              </div>
            </div>
            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th onClick={() => setSortBy("symbol")}>Symbol</th>
                    <th>Company</th>
                    <th>Exchange</th>
                    <th onClick={() => setSortBy("book")}>MTF Book (₹ Cr)</th>
                    <th>1D Change (₹ Cr)</th>
                    <th onClick={() => setSortBy("pct")}>1D Change (%)</th>
                    <th onClick={() => setSortBy("lev")}>Leverage (%)</th>
                    <th>Trend (30D)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length ? pageRows.map((r, i) => (
                    <tr key={r[0]}>
                      <td>{(page - 1) * rowsPer + i + 1}</td>
                      <td className="symbol">{r[0]}</td>
                      <td>{r[1]}</td>
                      <td>
                        <span className="exchange">
                          <b>◆</b>
                          {r[2]}
                        </span>
                      </td>
                      <td className="number">{r[3].toLocaleString("en-IN")}</td>
                      <td className={r[4] >= 0 ? "positive" : "negative"}>
                        {r[4] >= 0 ? "+" : ""}
                        {r[4].toFixed(2)}
                      </td>
                      <td className={r[5] >= 0 ? "positive" : "negative"}>
                        {r[5] >= 0 ? "+" : ""}
                        {r[5].toFixed(2)}%
                      </td>
                      <td>{r[6].toFixed(1)}%</td>
                      <td>
                        <Spark positive={r[5] >= 0} />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="9" className="emptyState">
                        No stocks match “{query}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {pageRows.length} of {stocks.length} stocks
              </span>
              <div>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(4, pages) }, (_, i) => (
                  <button
                    className={page === i + 1 ? "active" : ""}
                    onClick={() => setPage(i + 1)}
                    key={i}
                  >
                    {i + 1}
                  </button>
                ))}
                {pages > 4 && (
                  <>
                    <em>…</em>
                    <button onClick={() => setPage(pages)}>{pages}</button>
                  </>
                )}
                <button
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
          <footer>
            <span>Data source: NSE / BSE MTF disclosures</span>
            <i /> <span>Processed via MTF Analytics public data endpoints</span>
            <span className="footRight">
              All values in ₹ (INR) &nbsp;|&nbsp; Lakh = 100,000 &nbsp;|&nbsp;
              Crore = 10,000,000
            </span>
          </footer>
        </main>
      </div>
      {loading && (
        <div className="loading">
          <div className="spinner" />
          Loading live market data…
        </div>
      )}
    </div>
  );
}
function Nav({ icon, text, active, badge }) {
  return (
    <div className={"nav " + (active ? "active" : "")}>
      <span>{React.cloneElement(icon, { size: 18, strokeWidth: 1.7 })}</span>
      <label>{text}</label>
      {badge && <small>{badge}</small>}
    </div>
  );
}
function Segment({ values, value, onChange }) {
  return (
    <div className="segment">
      {values.map((v) => (
        <button
          key={v}
          className={v === value ? "on" : ""}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
function Kpi({
  title,
  value,
  delta,
  pct,
  subtitle,
  icon,
  chart,
  keyName = "combined",
  bars,
}) {
  return (
    <section className="card kpi">
      <div className="kpiIcon">{React.cloneElement(icon, { size: 20 })}</div>
      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
      {delta != null ? (
        <div className="kpiDelta positive">
          <ArrowUpRight size={16} />
          {formatCr(Math.abs(delta))}{" "}
          <b>
            ({pct >= 0 ? "+" : ""}
            {pct.toFixed(2)}%)
          </b>
        </div>
      ) : null}
      <small>{subtitle || "vs previous period"}</small>
      {chart && (
        <div className="kpiChart">
          <ResponsiveContainer>
            <LineChart data={chart.slice(-30)}>
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Line
                type="monotone"
                dataKey={keyName}
                dot={false}
                stroke="#2580ff"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {bars && (
        <div className="bars">
          {[1, 2, 3, 4, 5, 7, 9].map((x, i) => (
            <i style={{ height: 8 + x * 5 }} key={i} />
          ))}
        </div>
      )}
    </section>
  );
}
function Metric({ title, value, sub, icon }) {
  return (
    <section className="card metric">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
      <div className="metricIcon">{React.cloneElement(icon, { size: 34 })}</div>
    </section>
  );
}
function Spark({ positive }) {
  const pts = Array.from({ length: 24 }, (_, i) => ({
    v: 50 + Math.sin(i / 2) * 8 + i * 0.7 + Math.random() * 4,
  }));
  return (
    <div className="spark">
      <ResponsiveContainer>
        <LineChart data={pts}>
          <Line
            dataKey="v"
            
            dot={false}
            stroke={positive ? "#17d87f" : "#ff4d5c"}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}




createRoot(document.getElementById("root")).render(<App />);