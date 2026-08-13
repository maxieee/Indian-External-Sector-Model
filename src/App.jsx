import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, Legend
} from "recharts";

// ---------------------------------------------------------------------------
// REAL DATA — pulled from the project's own regression datasets
// ---------------------------------------------------------------------------
const EXCH_HIST = [
  {year:2003,rate:46.55,oil:28.90},{year:2004,rate:45.33,oil:37.73},{year:2005,rate:44.11,oil:53.39},
  {year:2006,rate:45.33,oil:64.29},{year:2007,rate:41.29,oil:71.12},{year:2008,rate:43.42,oil:96.99},
  {year:2009,rate:48.35,oil:61.76},{year:2010,rate:45.73,oil:79.04},{year:2011,rate:46.28,oil:104.01},
  {year:2012,rate:53.26,oil:105.01},{year:2013,rate:58.39,oil:104.08},{year:2014,rate:60.76,oil:96.24},
  {year:2015,rate:64.15,oil:50.75},{year:2016,rate:67.21,oil:42.81},{year:2017,rate:65.12,oil:52.81},
  {year:2018,rate:68.44,oil:68.35},{year:2019,rate:70.42,oil:61.41},{year:2020,rate:74.07,oil:41.26},
  {year:2021,rate:73.92,oil:69.07},{year:2022,rate:78.64,oil:97.10},{year:2023,rate:82.60,oil:80.76},
  {year:2024,rate:83.68,oil:78.73},
];

const EXPORT_HIST = [
  {year:2005,india:100.35,china:761.95},{year:2006,india:121.20,china:968.94},
  {year:2007,india:145.90,china:1220.06},{year:2008,india:181.86,china:1430.69},
  {year:2009,india:176.77,china:1201.65},{year:2010,india:220.41,china:1577.76},
  {year:2011,india:301.48,china:1898.39},{year:2012,india:289.56,china:2048.78},
  {year:2013,india:336.61,china:2209.01},{year:2014,india:317.54,china:2342.29},
  {year:2015,india:263.89,china:2281.86},{year:2016,india:260.96,china:2118.98},
  {year:2017,india:295.86,china:2271.80},{year:2018,india:324.00,china:2494.23},
  {year:2019,india:323.25,china:2498.33},{year:2020,india:275.49,china:2588.40},
  {year:2021,india:394.81,china:3361.81},{year:2022,india:452.68,china:3593.60},
  {year:2023,india:431.25,china:3388.72},{year:2024,india:441.70,china:3575.46},
];

// ---------------------------------------------------------------------------
// FITTED MODEL COEFFICIENTS — the refined (robustness-checked) specifications
// ---------------------------------------------------------------------------
const EXCH_MODEL = {
  const_: 22.7334, bankRate: 3.1790, inflation: -0.9361, oil: -0.1399,
  reserves: 8.69e-5, fedRate: -0.2205, tariff: 1.1122, gdpGrowth: -0.1520,
  r2: 0.954, adjR2: 0.931, n: 22,
};
const INDIA_MODEL = {
  const_: -24.99, tariff: -28.81, oil: 1.570, inflation: 1.141, gdp: 0.0001, gdpGrowth: 2.809,
  r2: 0.974, adjR2: 0.965, n: 20,
};
const CHINA_MODEL = {
  const_: -343.6, tariff: 70.93, oil: 4.888, inflation: 15.12, gdp: 0.0002, gdpGrowth: 8.144,
  r2: 0.992, adjR2: 0.989, n: 20,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function computeExchangeRate(v) {
  return EXCH_MODEL.const_
    + EXCH_MODEL.bankRate * v.bankRate
    + EXCH_MODEL.inflation * v.inflation
    + EXCH_MODEL.oil * v.oil
    + EXCH_MODEL.reserves * v.reserves
    + EXCH_MODEL.fedRate * v.fedRate
    + EXCH_MODEL.tariff * v.tariff
    + EXCH_MODEL.gdpGrowth * v.gdpGrowth;
}
// India/China export models: inputs in native regression units; output in USD thousand -> convert to USD billion
function computeIndiaExports(v) {
  const thousands = INDIA_MODEL.const_ * 1e6
    + INDIA_MODEL.tariff * 1e6 * v.tariff
    + INDIA_MODEL.oil * 1e6 * v.oil
    + INDIA_MODEL.inflation * 1e6 * v.inflation
    + INDIA_MODEL.gdp * v.gdp
    + INDIA_MODEL.gdpGrowth * 1e6 * v.gdpGrowth;
  return thousands / 1e6; // -> USD billion
}
function computeChinaExports(v) {
  const thousands = CHINA_MODEL.const_ * 1e6
    + CHINA_MODEL.tariff * 1e6 * v.tariff
    + CHINA_MODEL.oil * 1e6 * v.oil
    + CHINA_MODEL.inflation * 1e6 * v.inflation
    + CHINA_MODEL.gdp * v.gdp
    + CHINA_MODEL.gdpGrowth * 1e6 * v.gdpGrowth;
  return thousands / 1e6; // -> USD billion
}

// ---------------------------------------------------------------------------
// UI PRIMITIVES
// ---------------------------------------------------------------------------
function Slider({ label, unit, value, min, max, step, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{label}</span>
        <span className="font-mono text-sm text-amber-300 tabular-nums">
          {format ? format(value) : value}{unit}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-700/60">
        <div
          className="absolute h-1.5 rounded-full bg-gradient-to-r from-amber-500/40 to-amber-400"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
          aria-label={label}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-300 border-2 border-slate-900 shadow-md pointer-events-none"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatChip({ label, value, sub }) {
  return (
    <div className="flex flex-col items-start px-4 py-2.5 border-l border-slate-700/70 first:border-l-0 first:pl-0">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-mono text-base text-slate-100 tabular-nums">{value}</span>
      {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
    </div>
  );
}

const TABS = [
  { id: "exch", label: "Exchange Rate" },
  { id: "india", label: "India Exports" },
  { id: "china", label: "China Exports" },
];

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
export default function ExternalSectorModel() {
  const [tab, setTab] = useState("exch");

  const [exchV, setExchV] = useState({
    bankRate: 6.75, inflation: 5.65, oil: 78.73, reserves: 655928,
    fedRate: 5.08, tariff: 3.0, gdpGrowth: 6.48,
  });
  const [indiaV, setIndiaV] = useState({
    tariff: 3.0, oil: 78.73, inflation: 4.95, gdp: 3.9127e12, gdpGrowth: 6.48,
  });
  const [chinaV, setChinaV] = useState({
    tariff: 8.01, oil: 78.73, inflation: 0.22, gdp: 1.8744e13, gdpGrowth: 4.98,
  });

  const exchPred = useMemo(() => computeExchangeRate(exchV), [exchV]);
  const indiaPred = useMemo(() => computeIndiaExports(indiaV), [indiaV]);
  const chinaPred = useMemo(() => computeChinaExports(chinaV), [chinaV]);

  const lastActualExch = EXCH_HIST[EXCH_HIST.length - 1].rate;
  const lastActualIndia = EXPORT_HIST[EXPORT_HIST.length - 1].india;
  const lastActualChina = EXPORT_HIST[EXPORT_HIST.length - 1].china;

  const exchDelta = exchPred - lastActualExch;
  const indiaDelta = indiaPred - lastActualIndia;
  const chinaDelta = chinaPred - lastActualChina;

  const fmtINR = (v) => v.toFixed(2);
  const fmtUSDbn = (v) => v.toFixed(1);

  const activeModel = tab === "exch" ? EXCH_MODEL : tab === "india" ? INDIA_MODEL : CHINA_MODEL;

  return (
    <div className="min-h-screen w-full" style={{ background: "#0E1726" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Masthead */}
        <div className="mb-8 pb-6 border-b border-slate-700/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 font-medium">
              Fitted Model &middot; Live Scenario Engine
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl text-slate-50 mb-2"
            style={{ fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif" }}
          >
            India's External Sector, Under Your Assumptions
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Move the levers below and the model recomputes in real time, using the exact
            coefficients fitted on 2003&ndash;2024 data &mdash; the same refined specifications from
            the regression tables in the manuscript. This is a research illustration, not investment advice.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-slate-800/50 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                tab === t.id
                  ? "bg-amber-400 text-slate-900 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Model stat strip */}
        <div className="flex flex-wrap mb-8 rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-1">
          <StatChip label="Adj. R\u00b2" value={activeModel.adjR2.toFixed(3)} />
          <StatChip label="Observations" value={`n = ${activeModel.n}`} sub={tab === "exch" ? "2003\u20132024" : "2005\u20132024"} />
          <StatChip label="Specification" value="Refined (robustness-checked)" />
        </div>

        <div className="grid md:grid-cols-5 gap-8">

          {/* Controls */}
          <div className="md:col-span-2 rounded-xl bg-slate-800/40 border border-slate-700/50 p-6">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 mb-5">Scenario Inputs</h2>

            {tab === "exch" && (
              <>
                <Slider label="Bank Rate" unit="%" value={exchV.bankRate} min={4} max={10} step={0.05}
                  format={(v) => v.toFixed(2)} onChange={(v) => setExchV({ ...exchV, bankRate: v })} />
                <Slider label="Inflation (Annual)" unit="%" value={exchV.inflation} min={-6} max={12} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setExchV({ ...exchV, inflation: v })} />
                <Slider label="Crude Oil" unit=" $/bbl" value={exchV.oil} min={25} max={110} step={1}
                  onChange={(v) => setExchV({ ...exchV, oil: v })} />
                <Slider label="Foreign Reserves" unit=" $bn" value={exchV.reserves / 1000} min={80} max={700} step={5}
                  format={(v) => v.toFixed(0)} onChange={(v) => setExchV({ ...exchV, reserves: v * 1000 })} />
                <Slider label="US Fed Funds Rate" unit="%" value={exchV.fedRate} min={0} max={5.5} step={0.05}
                  format={(v) => v.toFixed(2)} onChange={(v) => setExchV({ ...exchV, fedRate: v })} />
                <Slider label="Weighted Avg. Tariff" unit="%" value={exchV.tariff} min={1.5} max={9} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setExchV({ ...exchV, tariff: v })} />
                <Slider label="GDP Growth" unit="%" value={exchV.gdpGrowth} min={-6} max={10} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setExchV({ ...exchV, gdpGrowth: v })} />
              </>
            )}

            {tab === "india" && (
              <>
                <Slider label="Weighted Avg. Tariff" unit="%" value={indiaV.tariff} min={1.5} max={9} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setIndiaV({ ...indiaV, tariff: v })} />
                <Slider label="Crude Oil" unit=" $/bbl" value={indiaV.oil} min={25} max={110} step={1}
                  onChange={(v) => setIndiaV({ ...indiaV, oil: v })} />
                <Slider label="Inflation (Annual)" unit="%" value={indiaV.inflation} min={2} max={12} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setIndiaV({ ...indiaV, inflation: v })} />
                <Slider label="India GDP" unit=" $tn" value={indiaV.gdp / 1e12} min={0.6} max={5.5} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setIndiaV({ ...indiaV, gdp: v * 1e12 })} />
                <Slider label="GDP Growth" unit="%" value={indiaV.gdpGrowth} min={-6} max={10} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setIndiaV({ ...indiaV, gdpGrowth: v })} />
              </>
            )}

            {tab === "china" && (
              <>
                <Slider label="Weighted Avg. Tariff" unit="%" value={chinaV.tariff} min={5} max={12} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setChinaV({ ...chinaV, tariff: v })} />
                <Slider label="Crude Oil" unit=" $/bbl" value={chinaV.oil} min={25} max={110} step={1}
                  onChange={(v) => setChinaV({ ...chinaV, oil: v })} />
                <Slider label="Inflation (Annual)" unit="%" value={chinaV.inflation} min={-1} max={6} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setChinaV({ ...chinaV, inflation: v })} />
                <Slider label="China GDP" unit=" $tn" value={chinaV.gdp / 1e12} min={2} max={22} step={0.5}
                  format={(v) => v.toFixed(1)} onChange={(v) => setChinaV({ ...chinaV, gdp: v * 1e12 })} />
                <Slider label="GDP Growth" unit="%" value={chinaV.gdpGrowth} min={0} max={15} step={0.1}
                  format={(v) => v.toFixed(1)} onChange={(v) => setChinaV({ ...chinaV, gdpGrowth: v })} />
              </>
            )}
          </div>

          {/* Readout + Chart */}
          <div className="md:col-span-3 flex flex-col gap-6">

            <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-6">
              <span className="text-xs uppercase tracking-wider text-slate-400">
                {tab === "exch" ? "Predicted INR/USD Exchange Rate" : tab === "india" ? "Predicted India Exports to World" : "Predicted China Exports to World"}
              </span>
              <div className="flex items-end gap-3 mt-2">
                <span className="font-mono text-5xl text-amber-300 tabular-nums" style={{ fontFamily: "'IBM Plex Mono','SF Mono','Courier New',monospace" }}>
                  {tab === "exch" ? `\u20b9${fmtINR(exchPred)}` : `$${fmtUSDbn(tab === "india" ? indiaPred : chinaPred)}bn`}
                </span>
                <span className={`text-sm font-mono mb-1.5 ${
                  (tab === "exch" ? exchDelta : tab === "india" ? indiaDelta : chinaDelta) >= 0
                    ? "text-emerald-400" : "text-red-400"
                }`}>
                  {(tab === "exch" ? exchDelta : tab === "india" ? indiaDelta : chinaDelta) >= 0 ? "\u25b2" : "\u25bc"}
                  {" "}
                  {tab === "exch"
                    ? `${Math.abs(exchDelta).toFixed(2)} vs 2024 actual`
                    : `$${Math.abs(tab === "india" ? indiaDelta : chinaDelta).toFixed(1)}bn vs 2024 actual`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                Computed from the fitted OLS equation: prediction = intercept + &sum;(coefficient &times; your input).
                Underlying series are non-stationary (see manuscript Section 5.4) &mdash; treat this as illustrative
                association, not a forecast.
              </p>
            </div>

            <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-6">
              <span className="text-xs uppercase tracking-wider text-slate-400 mb-4 block">
                Historical Trend, 2003&ndash;2024
              </span>
              <ResponsiveContainer width="100%" height={220}>
                {tab === "exch" ? (
                  <LineChart data={EXCH_HIST} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={2} dot={false} name="INR/USD" />
                    <ReferenceDot x={2024} y={exchPred} r={5} fill="#34D399" stroke="#0F172A" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <LineChart data={EXPORT_HIST} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                    <Line type="monotone" dataKey="india" stroke="#34D399" strokeWidth={2} dot={false} name="India ($bn)" />
                    <Line type="monotone" dataKey="china" stroke="#F59E0B" strokeWidth={2} dot={false} name="China ($bn)" />
                    <ReferenceDot x={2024} y={tab === "india" ? indiaPred : chinaPred} r={5}
                      fill={tab === "india" ? "#34D399" : "#F59E0B"} stroke="#0F172A" strokeWidth={2} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/60 text-[11px] text-slate-500 leading-relaxed">
          Coefficients from the refined regression specifications (GDP/Reserves collinearity and circular
          Trade-Value-with-US regressor removed &mdash; see the manuscript's Section 5.4 robustness check).
          Source data: RBI, IMF, World Bank, US Federal Reserve, ITC Trade Map, 2003&ndash;2024.
        </div>
      </div>
    </div>
  );
}
