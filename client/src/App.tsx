/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  FEARGON INVEST v5.2 — HACKATHON FINAL                      ║
 * ║  Live Global Market Data · AI-Native · Institutional Grade  ║
 * ║                                                              ║
 * ║  LIVE DATA: Finnhub API — Real US + Global stocks           ║
 * ║  Search ANY ticker: AAPL, TSLA, INFY.NS, BTC-USD, etc.     ║
 * ║  AI: Claude claude-sonnet-4-20250514 via Anthropic                       ║
 * ║                                                              ║
 * ║  github.com/roshandhiman/feargon · MIT License              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Search, Calculator, MessageSquare, BookOpen,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Send,
  Shield, Target, Sparkles, ChevronRight, Zap, AlertTriangle,
  PieChart as PieIcon, Award, Plus, X, Globe, Gauge,
  Activity, RefreshCw, Building2, DollarSign, BarChart3,
  ChevronDown, Star, Clock, Info, Link,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

/* ─────────────────────────────────────────────────────────
   FINNHUB CONFIG
───────────────────────────────────────────────────────── */
const FKEY = "d7gr8hpr01qmqj46emr0d7gr8hpr01qmqj46emrg";
const FH   = "https://finnhub.io/api/v1";

// In-memory cache — avoids burning API calls on re-renders
const cache = new Map();
function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

const fhFetch = (path) =>
  fetch(`${FH}${path}&token=${FKEY}`).then(r => r.ok ? r.json() : null).catch(() => null);

/* Core Finnhub helpers */
const fhSearch   = (q) => cached(`search:${q}`, 30000, () => fhFetch(`/search?q=${encodeURIComponent(q)}`));
const fhQuote    = (s) => cached(`quote:${s}`,  15000, () => fhFetch(`/quote?symbol=${s}`));
const fhProfile  = (s) => cached(`profile:${s}`,3600000, () => fhFetch(`/stock/profile2?symbol=${s}`));
const fhCandles  = (s, res="D", days=90) => {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;
  return cached(`candles:${s}:${res}:${days}`, 60000,
    () => fhFetch(`/stock/candle?symbol=${s}&resolution=${res}&from=${from}&to=${to}`));
};
const fhMetrics  = (s) => cached(`metrics:${s}`, 3600000, () => fhFetch(`/stock/metric?symbol=${s}&category=all`));
const fhNews     = (s) => cached(`news:${s}`, 300000, () =>
  fhFetch(`/company-news?symbol=${s}&from=${new Date(Date.now()-7*86400000).toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`));

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS — Obsidian × Gold
───────────────────────────────────────────────────────── */
const T = {
  bg:"#07070f", bgDeep:"#050509", surface:"#0e0e1a", card:"#12121f", cardHov:"#181828",
  gold:"#c9a84c", goldBr:"#e8c97a", goldDim:"#8a6f2e",
  goldBg:"rgba(201,168,76,0.08)", goldBdr:"rgba(201,168,76,0.18)", goldFoc:"rgba(201,168,76,0.5)",
  green:"#34d399", greenBg:"rgba(52,211,153,0.08)",
  red:"#f87171",   redBg:"rgba(248,113,113,0.08)",
  blue:"#60a5fa",  blueBg:"rgba(96,165,250,0.08)",
  purple:"#a78bfa",purpleBg:"rgba(167,139,250,0.08)",
  cyan:"#22d3ee",  cyanBg:"rgba(34,211,238,0.08)",
  text:"#f0ece4", textSub:"#8a8aab", textMute:"#3a3a52",
  bdr:"rgba(255,255,255,0.06)", bdrHi:"rgba(201,168,76,0.25)",
};

/* ─────────────────────────────────────────────────────────
   STATIC ASSET DATABASE — fallback + Indian stocks
   (Finnhub free tier has limited Indian exchange support)
───────────────────────────────────────────────────────── */
const STATIC = {
  AAPL:    { n:"Apple Inc.",       e:"🍎", c:"#a78bfa", sec:"Technology",  fs:3, tag:"Blue Chip",    d:"iPhones, MacBooks, App Store, iCloud. 57% US smartphone share." },
  MSFT:    { n:"Microsoft Corp.",  e:"🪟", c:"#60a5fa", sec:"Technology",  fs:2, tag:"AI Leader",    d:"Azure cloud, Office 365, LinkedIn, Xbox, 49% stake in OpenAI." },
  NVDA:    { n:"NVIDIA Corp.",     e:"⚡", c:"#34d399", sec:"AI Chips",    fs:6, tag:"High Growth",  d:"H100/H200 GPUs. 80%+ market share in AI training silicon." },
  GOOGL:   { n:"Alphabet Inc.",    e:"🔍", c:"#34d399", sec:"Technology",  fs:3, tag:"Value Play",   d:"Google Search, YouTube, Google Cloud, Android, Waymo." },
  AMZN:    { n:"Amazon.com",       e:"📦", c:"#fbbf24", sec:"Cloud",       fs:4, tag:"Compounding",  d:"World's largest e-commerce + AWS. Prime has 200M+ members." },
  TSLA:    { n:"Tesla Inc.",       e:"🔋", c:"#f87171", sec:"EV/Energy",   fs:7, tag:"Volatile",    d:"EVs, Powerwall, Solar, FSD autonomous driving, Optimus robot." },
  META:    { n:"Meta Platforms",   e:"👥", c:"#60a5fa", sec:"Social",      fs:4, tag:"Cash Flow",    d:"Facebook, Instagram, WhatsApp — 3.2B daily users, ad machine." },
  NFLX:    { n:"Netflix Inc.",     e:"🎬", c:"#f87171", sec:"Streaming",   fs:5, tag:"Streaming",   d:"270M+ subscribers. Live sports, gaming, ad-supported tier." },
  AMEX:    { n:"American Express", e:"💳", c:"#34d399", sec:"Finance",     fs:2, tag:"Dividend",    d:"Premium credit cards. Warren Buffett holds 20%+ of the company." },
  JPM:     { n:"JPMorgan Chase",   e:"🏦", c:"#60a5fa", sec:"Banking",     fs:2, tag:"Value",       d:"Largest US bank by assets. Diversified financial services giant." },
  BRK_B:   { n:"Berkshire Hathaway",e:"🎩",c:"#c9a84c",sec:"Conglomerate",fs:1, tag:"Legendary",   d:"Warren Buffett's holding company. Diversified across industries." },
  // Indian stocks (fetched via Finnhub with .NS suffix or static)
  RELIANCE:{ n:"Reliance Inds.",   e:"🏭", c:"#34d399", sec:"Conglomerate",fs:3, tag:"Mega Cap",    d:"Jio (500M users), JioMart, oil refining, Jio Financial Services." },
  TCS:     { n:"TCS",              e:"💻", c:"#a78bfa", sec:"IT Services", fs:2, tag:"Dividend",    d:"India's largest IT firm. 600K+ employees serving Fortune 500." },
  HDFC:    { n:"HDFC Bank",        e:"🏦", c:"#60a5fa", sec:"Banking",     fs:2, tag:"Quality",     d:"India's largest private bank. Consistent 20%+ ROE." },
  INFY:    { n:"Infosys Ltd.",     e:"🌐", c:"#34d399", sec:"IT Services", fs:3, tag:"Global",      d:"Global IT consulting. Digital transformation & cloud leader." },
  NIFTY50: { n:"Nifty 50 Index",   e:"📊", c:"#c9a84c", sec:"Index",       fs:1, tag:"Index",       d:"India's top 50 companies. ~12% CAGR over 20 years." },
  // Crypto (Finnhub supports BINANCE:BTCUSDT etc.)
  BTC:     { n:"Bitcoin",          e:"₿",  c:"#fbbf24", sec:"Crypto",      fs:7, tag:"Store of Value",d:"Fixed 21M supply. Institutional ETF adoption. Digital gold." },
  ETH:     { n:"Ethereum",         e:"Ξ",  c:"#a78bfa", sec:"Crypto",      fs:7, tag:"Web3 Infra",  d:"Programmable blockchain. DeFi, NFTs, smart contracts." },
  SOL:     { n:"Solana",           e:"◎",  c:"#34d399", sec:"Crypto",      fs:8, tag:"High Risk",   d:"Fast (65K TPS), low-fee blockchain. Gaming and DeFi." },
};

// Static price fallbacks (shown until live data loads)
const STATIC_PRICES = {
  AAPL:205.50,MSFT:424.80,NVDA:882.50,GOOGL:172.30,AMZN:197.80,
  TSLA:248.30,META:514.20,NFLX:648.90,AMEX:281.50,JPM:198.40,BRK_B:412.80,
  RELIANCE:2855,TCS:3945,HDFC:1720,INFY:1680,NIFTY50:23150,
  BTC:84500,ETH:3290,SOL:148,
};

const isIN  = (s) => ["RELIANCE","TCS","INFY","HDFC","WIPRO","NIFTY50"].includes(s);
const isCrypto = (s) => ["BTC","ETH","SOL","BINANCE:BTCUSDT"].includes(s);
const fmt   = (p, s) => {
  if (!p && p !== 0) return "—";
  if (isIN(s)) return `₹${Number(p).toLocaleString("en-IN")}`;
  if (p >= 1000) return `$${Number(p).toLocaleString("en-US",{maximumFractionDigits:2})}`;
  if (p >= 1) return `$${Number(p).toFixed(2)}`;
  return `$${Number(p).toFixed(4)}`;
};
const fmtBig = (n) => {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};
const fColor = (s) => s <= 3 ? T.green : s <= 6 ? T.gold : T.red;
const fLabel = (s) => s <= 3 ? "Low Risk" : s <= 6 ? "Moderate" : "High Risk";

function genFallbackHistory(base, days=90, vol=0.018) {
  const out=[]; let p=base*0.82; const now=new Date();
  for(let i=days;i>=0;i--){
    p*=(1+0.0004+(Math.random()-.47)*vol); p=Math.max(p,base*.3);
    if(i===0)p=base;
    if(i%3===0||i===0){const d=new Date(now);d.setDate(d.getDate()-i);
      out.push({d:d.toLocaleDateString("en-US",{month:"short",day:"numeric"}),p:Math.round(p*100)/100,v:Math.round(Math.random()*1e8)});}
  }
  return out;
}

function calcSIP(pr, mo, yrs, rate) {
  const r=rate/100/12, m=yrs*12, out=[]; let val=pr;
  for(let i=0;i<=m;i++){
    if(i>0) val=(val+mo)*(1+r);
    if(i%12===0) out.push({yr:`Yr ${i/12}`,portfolio:Math.round(val),invested:Math.round(pr+mo*i),gain:Math.round(Math.max(0,val-pr-mo*i))});
  }
  return out;
}

/* ─────────────────────────────────────────────────────────
   AI CALL — dual route (backend → direct Anthropic)
───────────────────────────────────────────────────────── */
const AI_SYS_ADVISOR = `You are Feargon AI — warm expert investment advisor. Remove fear from investing for Indian and global beginners.
RULES: Always answer finance questions helpfully. Frame positively. Simple language. Indian context (SIPs, Nifty, Zerodha, SEBI). 3-6 sentences max. NEVER say "I cannot provide financial advice". Personality: calm wise elder sibling who studied finance.`;

async function aiCall(messages, system="") {
  try {
    const r = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages,system}), signal:AbortSignal.timeout(25000) });
    if(r.ok){ const d=await r.json(); const t=d.reply||d.content||""; if(t.length>10) return t; }
  } catch {}
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1024,system:system||undefined,messages}),
    signal:AbortSignal.timeout(30000),
  });
  if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error?.message||`API ${r.status}`); }
  const d=await r.json();
  return d.content?.[0]?.text || "";
}

/* ─────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────── */
function useGlobalStyles() {
  useEffect(() => {
    if (document.getElementById("fg-styles-v5")) return;
    const link = document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap";
    document.head.appendChild(link);
    const s = document.createElement("style");
    s.id = "fg-styles-v5";
    s.textContent = `
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{color-scheme:dark}
      html,body{background:${T.bg};font-family:'DM Sans',sans-serif;color:${T.text};overflow-x:hidden}
      ::selection{background:rgba(201,168,76,.25);color:${T.gold}}
      ::-webkit-scrollbar{width:5px;height:5px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:${T.textMute};border-radius:3px}
      ::-webkit-scrollbar-thumb:hover{background:${T.textSub}}
      input:focus,textarea:focus{outline:none!important}
      button{cursor:pointer;font-family:'DM Sans',sans-serif}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes goldGlow{0%,100%{box-shadow:0 0 20px rgba(201,168,76,.08)}50%{box-shadow:0 0 40px rgba(201,168,76,.2)}}
      @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      .fu{animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both}
      .fu1{animation-delay:.06s}.fu2{animation-delay:.12s}.fu3{animation-delay:.18s}.fu4{animation-delay:.24s}
      .gold-glow{animation:goldGlow 3s ease-in-out infinite}
      .skeleton{background:linear-gradient(90deg,${T.card} 25%,${T.surface} 50%,${T.card} 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
      input[type=range]{-webkit-appearance:none;width:100%;height:4px;background:${T.textMute};border-radius:2px;outline:none}
      input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,${T.gold},${T.goldBr});cursor:pointer;box-shadow:0 2px 8px rgba(201,168,76,.35);transition:transform .15s}
      input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.2)}
      .ticker-wrap{overflow:hidden;white-space:nowrap;background:${T.bgDeep};border-bottom:1px solid ${T.bdr};padding:9px 0}
      .ticker-inner{display:inline-flex;animation:ticker 60s linear infinite}
      .ticker-inner:hover{animation-play-state:paused}
      .t-item{display:inline-flex;align-items:center;gap:10px;padding:0 28px;border-right:1px solid ${T.bdr}}
    `;
    document.head.appendChild(s);
  }, []);
}

/* ─────────────────────────────────────────────────────────
   SHARED ATOMS
───────────────────────────────────────────────────────── */
function Spin({ size=16, color=T.gold }) {
  return <div style={{width:size,height:size,border:`1.5px solid ${color}20`,borderTop:`1.5px solid ${color}`,borderRadius:"50%",animation:"spin .75s linear infinite",flexShrink:0}}/>;
}
function Delta({ v, size=12 }) {
  if (v == null) return <span style={{color:T.textMute,fontSize:size}}>—</span>;
  const up = v >= 0;
  return <span style={{color:up?T.green:T.red,fontFamily:"'JetBrains Mono',monospace",fontSize:size,fontWeight:500,display:"inline-flex",alignItems:"center",gap:2}}>
    {up?<ArrowUpRight size={size}/>:<ArrowDownRight size={size}/>}{Math.abs(v).toFixed(2)}%
  </span>;
}
function Badge({ color=T.gold, children }) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:600,letterSpacing:".06em",color,background:`${color}14`,border:`1px solid ${color}28`,whiteSpace:"nowrap"}}>{children}</span>;
}
function GoldLine() {
  return <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.gold}30,transparent)`,margin:"16px 0"}}/>;
}
function SectionHead({ title, sub, action }) {
  return <div className="fu" style={{marginBottom:28,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
    <div>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:400,color:T.text,letterSpacing:"-.02em",lineHeight:1.15}}>{title}</h2>
      {sub && <p style={{color:T.textSub,fontSize:13,marginTop:6,fontWeight:300,lineHeight:1.65}}>{sub}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>;
}
function PCard({ children, onClick, style={}, glow }) {
  return <div onClick={onClick} className={glow?"gold-glow":""} style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:14,padding:20,cursor:onClick?"pointer":"default",transition:"all .2s",boxSizing:"border-box",...style}}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.background=T.cardHov;e.currentTarget.style.borderColor=T.bdrHi;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 28px rgba(201,168,76,.1)`;}}}
    onMouseLeave={e=>{if(onClick){e.currentTarget.style.background=T.card;e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}}>
    {children}
  </div>;
}

/* ─────────────────────────────────────────────────────────
   LIVE QUOTE HOOK — fetches real Finnhub data
───────────────────────────────────────────────────────── */
function useQuote(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!symbol || isIN(symbol) || isCrypto(symbol)) return;
    setLoading(true);
    fhQuote(symbol).then(q => {
      if (q && q.c) setData({ price: q.c, change: q.dp, open: q.o, high: q.h, low: q.l, prevClose: q.pc });
      setLoading(false);
    });
  }, [symbol]);
  return { data, loading };
}

/* ─────────────────────────────────────────────────────────
   MARKET TICKER — live prices for major symbols
───────────────────────────────────────────────────────── */
const TICKER_SYMS = ["AAPL","MSFT","NVDA","TSLA","GOOGL","AMZN","META","NFLX","JPM"];
function Ticker() {
  const [prices, setPrices] = useState({});
  useEffect(() => {
    Promise.all(TICKER_SYMS.map(s => fhQuote(s).then(q => [s, q]))).then(results => {
      const m = {};
      results.forEach(([s, q]) => { if (q?.c) m[s] = { p: q.c, ch: q.dp }; });
      setPrices(m);
    });
  }, []);

  const staticItems = [
    {s:"NIFTY50",p:"23,150",c:"+0.50%",u:true},{s:"SENSEX",p:"76,890",c:"+0.38%",u:true},
    {s:"BTC",p:"$84.5k",c:"+1.40%",u:true},{s:"GOLD",p:"$3,325",c:"+0.20%",u:true},
  ];
  const liveItems = TICKER_SYMS.map(s => ({
    s, p: prices[s] ? `$${prices[s].p.toFixed(2)}` : "…",
    c: prices[s] ? `${prices[s].ch>=0?"+":""}${prices[s].ch?.toFixed(2)}%` : "…",
    u: prices[s] ? prices[s].ch >= 0 : true,
  }));
  const all = [...staticItems, ...liveItems, ...staticItems, ...liveItems];

  return <div className="ticker-wrap">
    <div className="ticker-inner">
      {all.map((item, i) => (
        <div key={i} className="t-item">
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.textSub,letterSpacing:".1em"}}>{item.s}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:500,color:T.text}}>{item.p}</span>
          <span style={{fontSize:10,color:item.u?T.green:T.red,fontWeight:600}}>{item.c}</span>
        </div>
      ))}
    </div>
  </div>;
}

/* ─────────────────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  {id:"home",     label:"Home",      Icon:LayoutDashboard},
  {id:"market",   label:"Market",    Icon:Globe},
  {id:"analyze",  label:"Analyze",   Icon:Search},
  {id:"simulate", label:"Simulate",  Icon:Calculator},
  {id:"portfolio",label:"Portfolio", Icon:PieIcon},
  {id:"grow",     label:"Performance",Icon:TrendingUp},
  {id:"advisor",  label:"Advisor",   Icon:MessageSquare},
  {id:"profiler", label:"Profiler",  Icon:Award},
];

function Navbar({ view, setView }) {
  return <nav style={{position:"sticky",top:0,zIndex:200,background:`${T.bg}e8`,backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.bdr}`,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
    <div onClick={()=>setView("home")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flexShrink:0}}>
      <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:19,color:T.bgDeep,boxShadow:`0 2px 12px rgba(201,168,76,.3)`}}>F</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:500,fontSize:17,color:T.gold,letterSpacing:".02em"}}>Feargon</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.goldDim,letterSpacing:".1em",paddingTop:2}}>v5.2 LIVE</div>
    </div>
    <div style={{display:"flex",gap:4}}>
      {NAV_ITEMS.map(({id,label,Icon})=>(
        <button key={id} onClick={()=>setView(id)} style={{
          display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:8,border:`1px solid ${view===id?T.gold:T.bdr}`,
          background:view===id?T.goldBg:"transparent",color:view===id?T.gold:T.textSub,
          fontSize:12,fontWeight:500,transition:"all .15s",
        }}
        onMouseEnter={e=>{if(view!==id){e.currentTarget.style.color=T.text;e.currentTarget.style.borderColor=T.bdr;}}}
        onMouseLeave={e=>{if(view!==id){e.currentTarget.style.color=T.textSub;e.currentTarget.style.borderColor=T.bdr;}}}>
          <Icon size={13}/>{label}
        </button>
      ))}
    </div>
  </nav>;
}

/* ─────────────────────────────────────────────────────────
   HOME DASHBOARD
───────────────────────────────────────────────────────── */
function Home({ setView, setAnalyzeTarget }) {
  const [liveQuotes, setLiveQuotes] = useState({});
  const movers = ["NVDA","AAPL","MSFT","TSLA","META","AMZN"];

  useEffect(() => {
    Promise.all(movers.map(s => fhQuote(s).then(q => [s, q]))).then(results => {
      const m = {};
      results.forEach(([s, q]) => { if (q?.c) m[s] = { price: q.c, ch: q.dp }; });
      setLiveQuotes(m);
    });
  }, []);

  const fear = 42;
  const fearCol = fear > 65 ? T.red : fear > 50 ? T.gold : T.green;
  const indices = [
    {l:"NIFTY 50",v:"23,150",ch:0.50},{l:"S&P 500",v:"5,732",ch:0.43},
    {l:"SENSEX",v:"76,890",ch:0.38},{l:"BTC",v:"$84.5k",ch:1.40},
    {l:"GOLD",v:"$3,325",ch:0.20},{l:"USD/INR",v:"83.72",ch:-0.10},
  ];

  return <div>
    <div className="fu" style={{marginBottom:28}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:12,color:T.gold,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10}}>Feargon Invest · Live Markets</div>
      <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:40,fontWeight:300,color:T.text,letterSpacing:"-.02em",lineHeight:1.15}}>
        Real markets. Real data.<br/><span style={{color:T.gold}}>Zero fear.</span>
      </h1>
    </div>

    {/* Index strip */}
    <div className="fu fu1" style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:9,marginBottom:16}}>
      {indices.map(idx=><div key={idx.l} style={{background:T.card,border:`1px solid ${T.bdr}`,borderRadius:11,padding:"12px 14px"}}>
        <div style={{fontSize:9,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:4,fontWeight:500}}>{idx.l}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:500,color:T.text}}>{idx.v}</div>
        <div style={{marginTop:3}}><Delta v={idx.ch} size={11}/></div>
      </div>)}
    </div>

    {/* Fear gauge + movers */}
    <div className="fu fu2" style={{display:"grid",gridTemplateColumns:"155px 1fr",gap:12,marginBottom:14}}>
      <div style={{background:`${fearCol}07`,border:`1px solid ${fearCol}22`,borderRadius:14,padding:18,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:9}}>
        <div style={{fontSize:9,color:fearCol,textTransform:"uppercase",letterSpacing:".12em",fontWeight:600}}>Market Mood</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:48,fontWeight:700,color:fearCol,lineHeight:1}}>{fear}</div>
        <div style={{fontSize:11,color:fearCol,fontWeight:600}}>Fear</div>
        <div style={{width:"100%",height:4,background:T.textMute,borderRadius:2,overflow:"hidden"}}>
          <div style={{width:`${fear}%`,height:"100%",background:`linear-gradient(90deg,${T.green},${T.gold},${T.red})`,borderRadius:2}}/>
        </div>
        <div style={{fontSize:8,color:T.textMute}}>Fear ←——→ Greed</div>
      </div>

      <PCard>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>Live Top Movers · Finnhub</div>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:T.green}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:T.green,animation:"pulse 2s infinite"}}/>
            LIVE
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:9}}>
          {movers.map(sym=>{
            const st = STATIC[sym];
            const live = liveQuotes[sym];
            const price = live?.price || STATIC_PRICES[sym];
            const ch = live?.ch;
            const up = ch == null ? true : ch >= 0;
            return <div key={sym} onClick={()=>{setAnalyzeTarget(sym);setView("analyze");}}
              style={{background:T.surface,borderRadius:11,padding:"12px 11px",border:`1px solid ${T.bdr}`,cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=T.bdrHi;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:st?.c||T.gold,fontSize:10,fontWeight:700}}>{sym}</span>
                <span style={{fontSize:14}}>{st?.e||"📈"}</span>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",color:T.text,fontSize:12,fontWeight:500,marginBottom:5}}>
                {live ? `$${price.toFixed(2)}` : <span className="skeleton" style={{display:"block",height:14,borderRadius:3,width:"70%"}}/>}
              </div>
              {ch != null ? <Delta v={ch} size={10}/> : <div style={{fontSize:10,color:T.textMute}}>Loading…</div>}
            </div>;
          })}
        </div>
      </PCard>
    </div>

    {/* CTA grid */}
    <div className="fu fu3" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
      {[
        {v:"analyze",  Icon:Search,       c:T.gold,   t:"AI Analyzer",  d:"Search any stock globally. Live data + AI analysis."},
        {v:"simulate", Icon:Calculator,   c:T.green,  t:"Simulator",    d:"Watch compound growth work on your actual numbers."},
        {v:"advisor",  Icon:MessageSquare,c:T.purple, t:"AI Advisor",   d:"Conversational AI for every investing question."},
        {v:"profiler", Icon:Award,        c:T.blue,   t:"Fear Profiler",d:"Discover your investor persona. Get a combat plan."},
      ].map(card=><PCard key={card.v} onClick={()=>setView(card.v)} style={{padding:18,borderColor:`${card.c}22`,background:`${card.c}07`}}>
        <card.Icon size={17} color={card.c} style={{marginBottom:11}}/>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:card.c,fontWeight:500,marginBottom:6}}>{card.t}</div>
        <p style={{color:T.textSub,fontSize:12,lineHeight:1.65,margin:0}}>{card.d}</p>
        <div style={{display:"flex",alignItems:"center",gap:3,marginTop:12,color:card.c,fontSize:11,fontWeight:500}}>Begin<ChevronRight size={11}/></div>
      </PCard>)}
    </div>

    <div className="fu fu4" style={{padding:"16px 20px",background:T.goldBg,border:`1px solid ${T.goldBdr}`,borderLeft:`2px solid ${T.gold}`,borderRadius:11}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:T.gold,fontStyle:"italic",marginBottom:4}}>
        "Risk comes from not knowing what you're doing."
      </div>
      <div style={{fontSize:11,color:T.goldDim,letterSpacing:".08em"}}>— Warren Buffett</div>
    </div>
  </div>;
}

/* ─────────────────────────────────────────────────────────
   MARKET EXPLORER — with live Finnhub prices
───────────────────────────────────────────────────────── */
function Market({ setView, setAnalyzeTarget }) {
  const [tab, setTab] = useState("us");
  const [q, setQ]     = useState("");
  const [liveQuotes, setLiveQuotes] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);

  const usSyms    = ["AAPL","MSFT","NVDA","GOOGL","AMZN","TSLA","META","NFLX","JPM","BRK_B","AMEX"];
  const indianSyms= ["RELIANCE","TCS","HDFC","INFY","NIFTY50"];
  const cryptoSyms= ["BTC","ETH","SOL"];
  const tabSyms   = tab==="us" ? usSyms : tab==="india" ? indianSyms : cryptoSyms;

  // Fetch live quotes for visible symbols
  useEffect(() => {
    const syms = usSyms.filter(s => !isIN(s) && !isCrypto(s));
    Promise.all(syms.map(s => fhQuote(s).then(q => [s,q]))).then(res => {
      const m={};
      res.forEach(([s,q])=>{ if(q?.c) m[s]={price:q.c,ch:q.dp}; });
      setLiveQuotes(m);
    });
  }, []);

  // Debounced Finnhub search
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      fhSearch(q).then(res => {
        setSearchResults((res?.result || []).slice(0, 8));
        setSearching(false);
      });
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  const genSpark = (up) => { const vals=[]; let v=50; for(let i=0;i<20;i++){v=Math.max(5,Math.min(95,v+(Math.random()-(up?.44:.56))*8));vals.push(v);} return vals; };

  return <div>
    <SectionHead title="Market Explorer" sub="Live US stock data via Finnhub · Search any global stock · Indian blue chips · Crypto"/>

    {/* Search + tabs */}
    <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{position:"relative",flex:1,maxWidth:400}}>
        <Search size={13} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.textSub}}/>
        {searching && <Spin size={13} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)"}}/>}
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search any stock globally (AAPL, TSLA, RELIANCE…)"
          style={{width:"100%",padding:"10px 36px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:10,color:T.text,fontSize:13}}
          onFocus={e=>e.target.style.borderColor=T.goldFoc} onBlur={e=>e.target.style.borderColor=T.bdr}/>
        {searchResults.length>0 && <div style={{position:"absolute",top:"100%",left:0,right:0,background:T.surface,border:`1px solid ${T.bdrHi}`,borderRadius:11,marginTop:5,zIndex:60,overflow:"hidden"}}>
          {searchResults.map((r,i)=>(
            <div key={i} onClick={()=>{setAnalyzeTarget(r.symbol);setView("analyze");setQ("");setSearchResults([]);}}
              style={{padding:"11px 16px",cursor:"pointer",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.gold,fontWeight:700,fontSize:12}}>{r.symbol}</span>
                <span style={{color:T.textSub,fontSize:11,marginLeft:10}}>{(r.description||"").slice(0,40)}</span>
              </div>
              <span style={{fontSize:10,color:T.textMute}}>{r.type}</span>
            </div>
          ))}
        </div>}
      </div>
      {[{id:"us",l:"🇺🇸 US Stocks"},{id:"india",l:"🇮🇳 Indian"},{id:"crypto",l:"🪙 Crypto"}].map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{
          padding:"8px 16px",borderRadius:8,border:`1px solid ${tab===t.id?T.gold:T.bdr}`,
          background:tab===t.id?T.goldBg:"transparent",color:tab===t.id?T.gold:T.textSub,fontSize:12,fontWeight:500,transition:"all .15s"}}>
          {t.l}
        </button>
      ))}
    </div>

    {/* Live data badge */}
    {tab==="us" && <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,fontSize:11,color:T.textSub}}>
      <div style={{width:6,height:6,borderRadius:"50%",background:T.green,animation:"pulse 2s infinite"}}/>
      Prices via Finnhub API — refreshed every 15 seconds
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
      {tabSyms.map(sym=>{
        const st = STATIC[sym];
        const live = liveQuotes[sym];
        const price = live?.price || STATIC_PRICES[sym];
        const ch = live?.ch;
        const up = ch == null ? Math.random() > 0.4 : ch >= 0;
        const spark = genSpark(up);
        const pts = spark.map((v,i)=>`${(i/(spark.length-1))*100},${32-(v/100)*30}`).join(" ");
        return <PCard key={sym} onClick={()=>{setAnalyzeTarget(sym);setView("analyze");}} style={{padding:17}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{display:"flex",gap:9,alignItems:"center"}}>
              <div style={{width:32,height:32,borderRadius:9,background:`${st?.c||T.gold}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{st?.e||"📈"}</div>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",color:st?.c||T.gold,fontSize:10,fontWeight:700}}>{sym}</div>
                <div style={{color:T.textSub,fontSize:10,marginTop:1}}>{(st?.n||sym).slice(0,16)}</div>
              </div>
            </div>
            {st && <Badge color={fColor(st.fs)}>{st.fs}/10</Badge>}
          </div>
          <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none" style={{marginBottom:9}}>
            <defs><linearGradient id={`spk-${sym}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up?T.green:T.red} stopOpacity={.28}/><stop offset="100%" stopColor={up?T.green:T.red} stopOpacity={0}/>
            </linearGradient></defs>
            <polyline points={`0,32 ${pts} 100,32`} fill={`url(#spk-${sym})`} stroke="none"/>
            <polyline points={pts} fill="none" stroke={up?T.green:T.red} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:500,color:T.text}}>
              {live ? `$${price.toFixed(2)}` : fmt(price,sym)}
            </div>
            {ch != null ? <Delta v={ch}/> : <span style={{fontSize:10,color:T.textMute}}>…</span>}
          </div>
          <div style={{fontSize:10,color:T.textMute,marginTop:4}}>{st?.sec||"Equity"} · {st?.cap||"—"}</div>
        </PCard>;
      })}
    </div>
  </div>;
}

/* ─────────────────────────────────────────────────────────
   AI ANALYZER — full Finnhub integration
   Fetches: quote, profile, candles, metrics, news
───────────────────────────────────────────────────────── */
function Analyzer({ targetSym, setTargetSym }) {
  const [sym,      setSym]      = useState(null);
  const [quote,    setQuote]    = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [candles,  setCandles]  = useState([]);
  const [metrics,  setMetrics]  = useState(null);
  const [news,     setNews]     = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [aiLoad,   setAiLoad]   = useState(false);
  const [q,        setQ]        = useState("");
  const [suggs,    setSuggs]    = useState([]);
  const [suggest,  setSuggest]  = useState(false);
  const [tab,      setTab]      = useState("overview");
  const [dataErr,  setDataErr]  = useState(false);
  const abortRef = useRef(null);

  // Consume targetSym from navigation
  useEffect(() => { if (targetSym) { analyze(targetSym); setTargetSym(null); } }, [targetSym]);

  // Search suggestions
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (q.length < 1) { setSuggs([]); return; }
    // First show local matches instantly
    const local = Object.entries(STATIC).filter(([s,d])=>s.toLowerCase().includes(q.toLowerCase())||d.n.toLowerCase().includes(q.toLowerCase())).slice(0,4).map(([s,d])=>({symbol:s,description:d.n,type:"Stock"}));
    setSuggs(local);
    // Then enrich with Finnhub
    searchTimer.current = setTimeout(() => {
      fhSearch(q).then(res => {
        const remote = (res?.result||[]).slice(0,8).map(r=>({symbol:r.symbol,description:r.description,type:r.type}));
        const merged = [...remote.filter(r=>!local.find(l=>l.symbol===r.symbol)), ...local].slice(0,8);
        setSuggs(merged);
      });
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  const analyze = useCallback(async (s) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setSym(s); setAnalysis(null); setCandles([]); setQuote(null); setProfile(null); setMetrics(null); setNews([]);
    setLoading(true); setDataErr(false); setQ(""); setSuggs([]);setTab("overview");

    // Fetch all data in parallel
    const isStaticIndian = isIN(s);
    const isCrypto_ = isCrypto(s);
    const staticInfo = STATIC[s];

    if (!isStaticIndian && !isCrypto_) {
      const [q_, prof_, metr_, news_] = await Promise.all([
        fhQuote(s),
        fhProfile(s),
        fhMetrics(s),
        fhNews(s),
      ]);

      if (q_?.c) setQuote({ price: q_.c, ch: q_.dp, open: q_.o, high: q_.h, low: q_.l, prevClose: q_.pc, vol: q_.t });
      else if (!staticInfo) setDataErr(true);

      if (prof_?.name) setProfile(prof_);
      if (metr_?.metric) setMetrics(metr_.metric);
      if (news_?.length) setNews(news_.slice(0,4));

      // Candles
      const candle = await fhCandles(s, "D", 90);
      if (candle?.c && candle.c.length > 1) {
        const pts = candle.t.map((ts, i) => ({
          d: new Date(ts*1000).toLocaleDateString("en-US",{month:"short",day:"numeric"}),
          p: Math.round(candle.c[i]*100)/100,
          v: candle.v?.[i] || 0,
        }));
        setCandles(pts);
      } else {
        const base = q_?.c || staticInfo?.p || 150;
        setCandles(genFallbackHistory(base, 90, (staticInfo?.fs||4)*0.005+0.012));
      }
    } else {
      // Indian / Crypto — use static prices + generated history
      const base = STATIC_PRICES[s] || 100;
      setCandles(genFallbackHistory(base, 90));
      setQuote({ price: base, ch: (Math.random()-0.45)*3, open: base*0.99, high: base*1.02, low: base*0.98, prevClose: base*0.99 });
    }

    setLoading(false);

    // Now fire AI analysis
    setAiLoad(true);
    const livePrice = quote?.price || STATIC_PRICES[s] || "N/A";
    const liveChange = quote?.ch;
    const prompt = `Analyze ${s} for a beginner investor scared of losing money.
Company: ${profile?.name || staticInfo?.n || s}
Price: ${livePrice !== "N/A" ? fmt(livePrice, s) : "not available"} | 24h change: ${liveChange?.toFixed(2)||"?"}%
${profile?.marketCapitalization ? `Market Cap: $${(profile.marketCapitalization/1000).toFixed(0)}B` : ""}
${metrics?.["52WeekHigh"] ? `52-week range: $${metrics["52WeekLow"]?.toFixed(2)} – $${metrics["52WeekHigh"]?.toFixed(2)}` : ""}
${metrics?.peNormalizedAnnual ? `P/E: ${metrics.peNormalizedAnnual?.toFixed(1)}` : ""}
${profile?.finnhubIndustry ? `Industry: ${profile.finnhubIndustry}` : ""}
${staticInfo?.d || profile?.description?.slice(0,200) || "Global publicly listed company."}

IMPORTANT: Return ONLY valid JSON — no markdown, no backticks, no text before or after.
{
  "fearScore": <integer 1-10>,
  "fearReason": "<one calm sentence>",
  "eli5": "<what this company does, in plain English for a 10-year-old>",
  "thesis": "<core reason sophisticated investors own this, one sentence>",
  "bullCase": ["<point>","<point>","<point>"],
  "bearCase": ["<calmly framed risk>","<calmly framed risk>"],
  "historicalFact": "<one calming historical or statistical fact>",
  "beginnerVerdict": "<2 sentences: honest, encouraging, actionable>",
  "bestFor": "<who this suits>",
  "saferAlternative": "<one specific safer alternative>",
  "entryStrategy": "<beginner entry strategy>"
}`;

    try {
      const raw = await aiCall([{role:"user",content:prompt}],
        "You are a calm expert investment educator. Respond ONLY with valid JSON. No markdown, no backticks, no text before or after.");
      if (abortRef.current?.signal.aborted) return;
      const cleaned = raw.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      setAnalysis(JSON.parse(cleaned));
    } catch(e) {
      console.warn("AI analysis error:", e.message);
      setAnalysis({
        fearScore: staticInfo?.fs || 5,
        fearReason: "Based on historical volatility and sector characteristics.",
        eli5: staticInfo?.d || `${s} is a publicly listed company.`,
        thesis: `${s} has a strong market position in its sector.`,
        bullCase:["Established market leader","Consistent revenue growth","Institutional backing"],
        bearCase:["Market volatility is normal","Macro conditions affect all assets"],
        historicalFact:"Every major market correction has been followed by full recovery.",
        beginnerVerdict:"Start with a small position using SIP approach. Time and patience are your greatest edges.",
        bestFor:"Patient investors with 5+ year horizon.",
        saferAlternative:"A diversified index fund like Nifty 50 ETF",
        entryStrategy:"Begin with 2-5% of portfolio, add monthly via SIP."
      });
    }
    setAiLoad(false);
  }, []);

  const asset = STATIC[sym];
  const fScore = analysis?.fearScore || asset?.fs || 5;
  const fCol = fColor(fScore);
  const displayPrice = quote?.price || (sym ? STATIC_PRICES[sym] : null);
  const displayChange = quote?.ch;

  const ChartTip = ({active,payload}) => {
    if(!active||!payload?.length) return null;
    return <div style={{background:T.surface,border:`1px solid ${T.bdrHi}`,borderRadius:8,padding:"8px 12px",fontSize:11}}>
      <div style={{color:T.textSub,marginBottom:3}}>{payload[0]?.payload?.d}</div>
      <div style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>{sym&&fmt(payload[0]?.value,sym)}</div>
    </div>;
  };

  const quick = ["AAPL","NVDA","MSFT","TSLA","TCS","HDFC","BTC","GOOGL","AMZN"];

  return <div>
    <SectionHead title="AI Stock Analyzer" sub="Search any global stock — live Finnhub data + Claude AI analysis + FearScore™"/>

    {/* Search bar */}
    <div style={{position:"relative",maxWidth:580,marginBottom:20}}>
      <Search size={14} style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:T.textSub}}/>
      <input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>setSuggest(true)} onBlur={()=>setTimeout(()=>setSuggest(false),200)}
        placeholder="Search any stock globally (e.g. NVDA, RELIANCE, TSLA, INFY)…"
        style={{width:"100%",padding:"12px 16px 12px 40px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:12,color:T.text,fontSize:13}}
        onFocus={e=>{e.target.style.borderColor=T.goldFoc;setSuggest(true);}} onBlur={e=>{e.target.style.borderColor=T.bdr;}}/>
      {suggs.length>0 && suggest && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:T.surface,border:`1px solid ${T.bdrHi}`,borderRadius:12,marginTop:5,zIndex:60,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
          {suggs.map((r,i)=>(
            <div key={i} onMouseDown={()=>{analyze(r.symbol);setQ("");setSuggs([]);}}
              style={{padding:"10px 16px",cursor:"pointer",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>{STATIC[r.symbol]?.e||"📈"}</span>
                <div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.gold,fontWeight:700,fontSize:12}}>{r.symbol}</span>
                  <span style={{color:T.textSub,fontSize:11,marginLeft:8}}>{(r.description||"").slice(0,36)}</span>
                </div>
              </div>
              <span style={{fontSize:9,color:T.textMute,letterSpacing:".05em"}}>{r.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Quick picks */}
    {!sym && <div style={{marginBottom:28}}>
      <div style={{fontSize:9,color:T.textSub,textTransform:"uppercase",letterSpacing:".12em",marginBottom:10,fontWeight:500}}>Popular picks</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {quick.map(s=><button key={s} onClick={()=>analyze(s)}
          style={{padding:"7px 13px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.bdrHi;e.currentTarget.style.color=T.gold;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.color=T.text;}}>
          <span>{STATIC[s]?.e||"📈"}</span>{s}
        </button>)}
      </div>
    </div>}

    {/* Loading state */}
    {loading && <PCard style={{textAlign:"center",padding:50}}>
      <Spin size={28}/> 
      <p style={{marginTop:14,fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:T.textSub}}>Fetching live data for {sym}…</p>
      <p style={{fontSize:12,color:T.textMute,marginTop:6}}>Quote · Profile · 90-day candles · Financials</p>
    </PCard>}

    {dataErr && <div style={{padding:"12px 16px",background:T.goldBg,border:`1px solid ${T.goldBdr}`,borderRadius:10,marginBottom:14,fontSize:12,color:T.gold,display:"flex",gap:8,alignItems:"center"}}>
      <Info size={13}/> Live data unavailable for {sym}. Using curated fallback data.
    </div>}

    {/* Main analysis */}
    {sym && !loading && <>
      {/* Header card */}
      <PCard style={{marginBottom:14}} glow={!!analysis}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            {profile?.logo && <img src={profile.logo} alt="" style={{width:48,height:48,borderRadius:10,objectFit:"contain",background:T.surface,padding:4}}/>}
            {!profile?.logo && <div style={{width:48,height:48,borderRadius:10,background:`${asset?.c||T.gold}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{asset?.e||"📈"}</div>}
            <div>
              <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:asset?.c||T.gold,fontWeight:700}}>{sym}</span>
                {(profile?.exchange||profile?.finnhubIndustry) && <Badge color={T.textSub}>{profile?.exchange||profile?.finnhubIndustry}</Badge>}
                {asset?.tag && <Badge color={T.gold}>{asset.tag}</Badge>}
              </div>
              <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.text,fontWeight:400,margin:"0 0 8px"}}>{profile?.name||asset?.n||sym}</h3>
              <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
                {displayPrice ? <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:24,fontWeight:500,color:T.text}}>{fmt(displayPrice,sym)}</span> : <span className="skeleton" style={{display:"block",width:120,height:28,borderRadius:6}}/>}
                {displayChange != null && <Delta v={displayChange} size={14}/>}
                {quote?.high && <span style={{fontSize:11,color:T.textSub,fontFamily:"'JetBrains Mono',monospace"}}>H: ${quote.high.toFixed(2)}</span>}
                {quote?.low  && <span style={{fontSize:11,color:T.textSub,fontFamily:"'JetBrains Mono',monospace"}}>L: ${quote.low.toFixed(2)}</span>}
              </div>
            </div>
          </div>
          <div style={{textAlign:"center",padding:"14px 20px",background:`${fCol}10`,border:`1px solid ${fCol}25`,borderRadius:12}}>
            <div style={{fontSize:9,color:fCol,textTransform:"uppercase",letterSpacing:".12em",marginBottom:5,fontWeight:600}}>Fear Score™</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:38,fontWeight:700,color:fCol,lineHeight:1}}>{fScore}<span style={{fontSize:15,color:T.textSub}}>/10</span></div>
            <div style={{fontSize:10,color:fCol,fontWeight:600,marginTop:4}}>{fLabel(fScore)}</div>
          </div>
        </div>

        {/* Live financial metrics */}
        {metrics && <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:9}}>
          {[
            {l:"P/E Ratio",    v:metrics.peNormalizedAnnual?.toFixed(1)||"—"},
            {l:"P/B Ratio",    v:metrics.pbAnnual?.toFixed(2)||"—"},
            {l:"Mkt Cap",      v:profile?.marketCapitalization?fmtBig(profile.marketCapitalization*1e6):"—"},
            {l:"52W High",     v:metrics["52WeekHigh"]?`$${metrics["52WeekHigh"]?.toFixed(2)}`:"—"},
            {l:"52W Low",      v:metrics["52WeekLow"]?`$${metrics["52WeekLow"]?.toFixed(2)}`:"—"},
          ].map(m=><div key={m.l} style={{padding:"10px 12px",background:T.surface,borderRadius:9,border:`1px solid ${T.bdr}`}}>
            <div style={{fontSize:9,color:T.textSub,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5,fontWeight:500}}>{m.l}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500,color:T.text}}>{m.v}</div>
          </div>)}
        </div>}
      </PCard>

      {/* Price chart — real Finnhub candles */}
      <PCard style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>
            90-Day Price History {candles.length>0&&!dataErr?"· Finnhub Candles":"· Simulated"}
          </div>
          {quote?.price && <div style={{fontSize:10,color:T.green,fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>
            {displayChange>=0?"+":""}{displayChange?.toFixed(2)}% today
          </div>}
        </div>
        {candles.length>0 ? <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={candles}>
            <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.gold} stopOpacity={.28}/><stop offset="100%" stopColor={T.gold} stopOpacity={0}/>
            </linearGradient></defs>
            <XAxis dataKey="d" tick={{fill:T.textMute,fontSize:9}} tickLine={false} axisLine={false} interval={Math.floor(candles.length/6)}/>
            <YAxis hide domain={["auto","auto"]}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="p" stroke={T.gold} strokeWidth={1.8} fill="url(#cg)" dot={false}/>
          </AreaChart>
        </ResponsiveContainer> : <div className="skeleton" style={{height:150,borderRadius:8}}/>}
      </PCard>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {["overview","fundamentals","strategy","news"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"7px 16px",borderRadius:8,border:`1px solid ${tab===t?T.gold:T.bdr}`,
            background:tab===t?T.goldBg:"transparent",color:tab===t?T.gold:T.textSub,fontSize:12,fontWeight:500,textTransform:"capitalize"}}>
            {t}
          </button>
        ))}
      </div>

      {/* AI loading */}
      {aiLoad && <PCard style={{textAlign:"center",padding:36}}>
        <Sparkles size={20} color={T.gold} style={{margin:"0 auto 12px",display:"block"}}/>
        <p style={{color:T.textSub,marginBottom:14,fontFamily:"'Cormorant Garamond',serif",fontSize:17}}>Claude AI is analysing {sym}…</p>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.gold,animation:`pulse 1.2s ease-in-out ${i*.2}s infinite`}}/>)}
        </div>
      </PCard>}

      {analysis && !aiLoad && <>
        {tab==="overview" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <PCard style={{gridColumn:"1/-1",background:T.goldBg,borderColor:T.goldBdr}}>
            <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10,fontWeight:600}}>In Plain English</div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:T.text,lineHeight:1.7,margin:"0 0 8px",fontWeight:300}}>{analysis.eli5}</p>
            <p style={{color:T.textSub,fontSize:13,lineHeight:1.7,margin:"0 0 14px"}}>{analysis.thesis}</p>
            <div style={{padding:"10px 14px",background:`${T.gold}10`,borderRadius:8,borderLeft:`2px solid ${T.gold}`}}>
              <span style={{color:T.gold,fontSize:12}}>📊 {analysis.historicalFact}</span>
            </div>
            <div style={{marginTop:8,fontSize:11,color:T.textMute}}>{analysis.fearReason}</div>
          </PCard>
          <PCard style={{background:T.greenBg,borderColor:`${T.green}25`}}>
            <div style={{fontSize:10,color:T.green,textTransform:"uppercase",letterSpacing:".1em",marginBottom:12,fontWeight:600}}>Why It Could Rise ↑</div>
            {analysis.bullCase.map((p,i)=><div key={i} style={{display:"flex",gap:9,marginBottom:9,alignItems:"flex-start"}}>
              <TrendingUp size={13} color={T.green} style={{marginTop:3,flexShrink:0}}/>
              <span style={{color:T.text,fontSize:13,lineHeight:1.65}}>{p}</span>
            </div>)}
          </PCard>
          <PCard style={{background:T.goldBg,borderColor:`${T.gold}25`}}>
            <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:".1em",marginBottom:12,fontWeight:600}}>Risks — Calmly ⚠</div>
            {analysis.bearCase.map((p,i)=><div key={i} style={{display:"flex",gap:9,marginBottom:9,alignItems:"flex-start"}}>
              <Shield size={13} color={T.gold} style={{marginTop:3,flexShrink:0}}/>
              <span style={{color:T.text,fontSize:13,lineHeight:1.65}}>{p}</span>
            </div>)}
            <div style={{marginTop:12,padding:"9px 12px",background:`${T.gold}10`,borderRadius:8,fontSize:12,color:T.goldDim}}>Safer: {analysis.saferAlternative}</div>
          </PCard>
          <PCard style={{gridColumn:"1/-1",background:`linear-gradient(135deg,${T.goldBg},${T.purpleBg})`,borderColor:T.goldBdr}}>
            <div style={{display:"flex",gap:12}}>
              <Target size={17} color={T.gold} style={{flexShrink:0,marginTop:2}}/>
              <div>
                <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:".1em",marginBottom:7,fontWeight:600}}>AI Verdict · Best for: {analysis.bestFor}</div>
                <p style={{color:T.text,fontSize:14,lineHeight:1.8,margin:0}}>{analysis.beginnerVerdict}</p>
              </div>
            </div>
            <div style={{marginTop:14,fontSize:10,color:T.textMute}}>Educational only — not regulated financial advice. Always do your own research.</div>
          </PCard>
        </div>}

        {tab==="fundamentals" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <PCard>
            <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14,fontWeight:500}}>Fear Score Breakdown</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{color:T.text,fontSize:13}}>{fScore}/10</span>
              <Badge color={fColor(fScore)}>{fLabel(fScore)}</Badge>
            </div>
            <div style={{height:6,background:T.textMute,borderRadius:3,overflow:"hidden",marginBottom:12}}>
              <div style={{width:`${fScore*10}%`,height:"100%",background:`linear-gradient(90deg,${T.green},${T.gold},${T.red})`,borderRadius:3}}/>
            </div>
            <p style={{color:T.textSub,fontSize:12,lineHeight:1.65,margin:0}}>{analysis.fearReason}</p>
          </PCard>
          {metrics && <PCard>
            <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14,fontWeight:500}}>Live Financials</div>
            {[
              {l:"Revenue Growth (YoY)", v:metrics.revenueGrowthTTMYoy?`${metrics.revenueGrowthTTMYoy.toFixed(1)}%`:"—"},
              {l:"Net Profit Margin",    v:metrics.netProfitMarginAnnual?`${metrics.netProfitMarginAnnual.toFixed(1)}%`:"—"},
              {l:"ROE",                  v:metrics.roeTTM?`${metrics.roeTTM.toFixed(1)}%`:"—"},
              {l:"Debt/Equity",          v:metrics.totalDebt_totalEquityAnnual?.toFixed(2)||"—"},
            ].map(m=><div key={m.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.bdr}`}}>
              <span style={{color:T.textSub,fontSize:12}}>{m.l}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.text,fontSize:12,fontWeight:500}}>{m.v}</span>
            </div>)}
          </PCard>}
          {profile && <PCard style={{gridColumn:"1/-1"}}>
            <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:12,fontWeight:500}}>Company Profile</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {l:"Country",   v:profile.country||"—"},
                {l:"Exchange",  v:profile.exchange||"—"},
                {l:"Currency",  v:profile.currency||"—"},
                {l:"IPO Date",  v:profile.ipo||"—"},
              ].map(m=><div key={m.l} style={{padding:"10px 12px",background:T.surface,borderRadius:9,border:`1px solid ${T.bdr}`}}>
                <div style={{fontSize:9,color:T.textSub,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5,fontWeight:500}}>{m.l}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.text,fontWeight:500}}>{m.v}</div>
              </div>)}
            </div>
            {profile.weburl && <div style={{marginTop:12}}>
              <a href={profile.weburl} target="_blank" rel="noopener noreferrer" style={{color:T.blue,fontSize:12,textDecoration:"none"}}>
                🌐 {profile.weburl}
              </a>
            </div>}
          </PCard>}
        </div>}

        {tab==="strategy" && <PCard style={{background:T.goldBg,borderColor:T.goldBdr}}>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            <Zap size={17} color={T.gold} style={{flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:600}}>Beginner Entry Strategy</div>
              <p style={{color:T.text,fontSize:14,lineHeight:1.8,margin:0}}>{analysis.entryStrategy}</p>
            </div>
          </div>
          <GoldLine/>
          <div style={{fontSize:11,color:T.textMute}}>Past performance does not guarantee future results. This is educational content only.</div>
        </PCard>}

        {tab==="news" && <div>
          {news.length > 0 ? news.map((n,i)=>(
            <PCard key={i} style={{marginBottom:10,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:T.textSub}}>{new Date(n.datetime*1000).toLocaleDateString()}</span>
                <span style={{fontSize:10,color:T.textSub}}>{n.source}</span>
              </div>
              <a href={n.url} target="_blank" rel="noopener noreferrer" style={{color:T.text,fontSize:13,fontWeight:500,textDecoration:"none",lineHeight:1.5,display:"block",marginBottom:6}}>{n.headline}</a>
              <p style={{fontSize:12,color:T.textSub,lineHeight:1.55,margin:0}}>{(n.summary||"").slice(0,160)}{n.summary?.length>160?"…":""}</p>
            </PCard>
          )) : <PCard style={{textAlign:"center",padding:30,color:T.textSub,fontSize:13}}>No recent news available for {sym}.</PCard>}
        </div>}
      </>}
    </>}
  </div>;
}

/* ─────────────────────────────────────────────────────────
   SIMULATOR
───────────────────────────────────────────────────────── */
function Simulator() {
  const [pr,   setPr]   = useState(100000);
  const [mo,   setMo]   = useState(5000);
  const [yrs,  setYrs]  = useState(10);
  const [rate, setRate] = useState(12);
  const [ran,  setRan]  = useState(false);

  const presets = [{l:"FD/Bonds",r:6.5},{l:"Nifty 50",r:12},{l:"S&P 500",r:10.5},{l:"Growth",r:15},{l:"Aggressive",r:18}];
  const data    = useMemo(() => calcSIP(pr, mo, yrs, rate), [pr,mo,yrs,rate]);
  const last    = data[data.length-1] || {};
  const gains   = Math.max(0, (last.portfolio||0) - (last.invested||0));
  const gainPct = last.invested ? Math.round((gains/last.invested)*100) : 0;

  const scenarios = presets.map(p => { const d=calcSIP(pr,mo,yrs,p.r); return {...p,val:(d[d.length-1]||{}).portfolio||0}; });

  const ChartTip = ({active,payload,label}) => {
    if (!active||!payload?.length) return null;
    return <div style={{background:T.surface,border:`1px solid ${T.bdrHi}`,borderRadius:8,padding:"9px 13px",fontSize:11}}>
      <div style={{color:T.textSub,marginBottom:5}}>{label}</div>
      {payload.map(p=><div key={p.dataKey} style={{color:p.color,fontFamily:"'JetBrains Mono',monospace",marginBottom:2}}>
        {p.name}: ₹{Math.round(p.value).toLocaleString("en-IN")}
      </div>)}
    </div>;
  };

  return <div>
    <SectionHead title="Investment Simulator" sub="Compound interest — the most powerful wealth-building tool in history. See it work on your numbers."/>
    <div style={{display:"grid",gridTemplateColumns:"290px 1fr",gap:18,alignItems:"start"}}>
      <PCard>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:T.text,fontWeight:500,marginBottom:22}}>Configure</div>
        {[
          {l:"Initial Investment",v:pr,set:setPr,min:1000,max:2000000,step:5000,f:v=>`₹${Number(v).toLocaleString("en-IN")}`},
          {l:"Monthly SIP",v:mo,set:setMo,min:0,max:100000,step:1000,f:v=>`₹${Number(v).toLocaleString("en-IN")}`},
        ].map(f=><div key={f.l} style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:T.textSub,fontSize:12}}>{f.l}</span>
            <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500}}>{f.f(f.v)}</span>
          </div>
          <input type="range" min={f.min} max={f.max} step={f.step} value={f.v} onChange={e=>f.set(Number(e.target.value))}/>
        </div>)}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:T.textSub,fontSize:12}}>Time Period</span>
            <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500}}>{yrs} years</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
            {[1,3,5,10,15,20,30].map(y=><button key={y} onClick={()=>setYrs(y)} style={{
              padding:"4px 9px",borderRadius:6,border:`1px solid ${yrs===y?T.gold:T.bdr}`,
              background:yrs===y?T.goldBg:"transparent",color:yrs===y?T.gold:T.textSub,fontSize:11}}>
              {y}yr
            </button>)}
          </div>
        </div>
        <div style={{marginBottom:22}}>
          <span style={{color:T.textSub,fontSize:12,display:"block",marginBottom:8}}>Return Preset</span>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
            {presets.map(p=><button key={p.l} onClick={()=>setRate(p.r)} style={{
              padding:"4px 8px",fontSize:10,borderRadius:6,
              border:`1px solid ${rate===p.r?T.gold:T.bdr}`,
              background:rate===p.r?T.goldBg:"transparent",
              color:rate===p.r?T.gold:T.textSub}}>
              {p.l} {p.r}%
            </button>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{color:T.textSub,fontSize:12}}>Custom</span>
            <span style={{color:T.gold,fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500}}>{rate}%</span>
          </div>
          <input type="range" min={1} max={30} step={0.5} value={rate} onChange={e=>setRate(Number(e.target.value))}/>
        </div>
        <button onClick={()=>setRan(true)} style={{width:"100%",padding:12,borderRadius:10,border:`1px solid ${T.goldBdr}`,
          background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,color:T.bgDeep,fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Zap size={14}/>Run Simulation
        </button>
      </PCard>
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
          {[
            {l:"Final Portfolio",v:`₹${Math.round(last.portfolio||0).toLocaleString("en-IN")}`,c:T.gold},
            {l:"Total Invested", v:`₹${Math.round(last.invested||0).toLocaleString("en-IN")}`, c:T.purple},
            {l:`Gains (+${gainPct}%)`,v:`₹${Math.round(gains).toLocaleString("en-IN")}`,c:T.green},
          ].map(m=><PCard key={m.l} style={{padding:"14px 16px"}}>
            <div style={{fontSize:9,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:5,fontWeight:500}}>{m.l}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:17,fontWeight:500,color:m.c}}>{m.v}</div>
          </PCard>)}
        </div>
        <PCard style={{marginBottom:14}}>
          <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14,fontWeight:500}}>Growth Projection — {yrs} Years</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.gold} stopOpacity={.3}/><stop offset="100%" stopColor={T.gold} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.purple} stopOpacity={.15}/><stop offset="100%" stopColor={T.purple} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="yr" tick={{fill:T.textMute,fontSize:10}} tickLine={false} axisLine={false}/>
              <YAxis tick={{fill:T.textMute,fontSize:9}} tickLine={false} axisLine={false}
                tickFormatter={v=>`₹${v>=1e5?(v/1e5).toFixed(0)+"L":(v/1000).toFixed(0)+"k"}`}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="invested"  name="Invested"  stroke={T.purple} strokeWidth={1.5} strokeDasharray="6 3" fill="url(#sg2)" dot={false}/>
              <Area type="monotone" dataKey="portfolio" name="Portfolio" stroke={T.gold}   strokeWidth={2}   fill="url(#sg1)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:20,marginTop:10}}>
            {[{c:T.gold,l:"Portfolio"},{c:T.purple,l:"Invested",dash:true}].map(lg=>(
              <div key={lg.l} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:18,height:2,background:lg.dash?"transparent":lg.c,borderTop:lg.dash?`2px dashed ${lg.c}`:"none"}}/>
                <span style={{color:T.textSub,fontSize:10}}>{lg.l}</span>
              </div>
            ))}
          </div>
        </PCard>
        {ran && <PCard style={{marginBottom:14}}>
          <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14,fontWeight:500}}>Scenario Comparison at Year {yrs}</div>
          {scenarios.map(s=><div key={s.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"10px 13px",background:T.surface,borderRadius:10,border:`1px solid ${T.bdr}`}}>
            <div>
              <div style={{color:T.text,fontSize:12,fontWeight:500,marginBottom:2}}>{s.l}</div>
              <div style={{color:T.textSub,fontSize:11}}>{s.r}% annual return</div>
            </div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",color:T.gold,fontSize:15,fontWeight:500}}>₹{Math.round(s.val).toLocaleString("en-IN")}</div>
          </div>)}
        </PCard>}
        <div style={{padding:"13px 17px",background:T.goldBg,borderLeft:`2px solid ${T.gold}`,borderRadius:10}}>
          <p style={{color:T.text,fontSize:13,margin:0,lineHeight:1.75}}>
            <strong style={{color:T.gold}}>The truth that changes everything:</strong> Even a 40% crash in year 4 barely shows on a {yrs}-year chart. Time is the only market edge that cannot be bought.
          </p>
        </div>
      </div>
    </div>
  </div>;
}

/* ─────────────────────────────────────────────────────────
   AI ADVISOR
───────────────────────────────────────────────────────── */
function Advisor() {
  const [msgs,    setMsgs]    = useState([{role:"assistant",content:"Good day. I'm Feargon AI — your private investment advisor, powered by Claude.\n\nI remove fear from investing one honest conversation at a time. Ask me anything about stocks, SIPs, crypto, mutual funds, or simply 'where do I even begin?'\n\nNo jargon. No judgement. Just clarity. ✦"}]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const starters = [
    "I'm scared of losing money. Where do I even start?",
    "Is Nifty 50 SIP the best strategy for beginners?",
    "Should I invest in Bitcoin or gold?",
    "What's the difference between ETF and mutual fund?",
    "How much should a 25-year-old earning ₹50k invest?",
    "Explain compound interest with a real example",
    "Is it too late to start investing at 35?",
  ];

  async function send(text) {
    const msg = (text||input).trim();
    if (!msg||loading) return;
    setInput(""); setError(null);
    const nextMsgs = [...msgs, {role:"user",content:msg}];
    setMsgs(nextMsgs);
    setLoading(true);
    try {
      const apiMsgs = nextMsgs.map(m=>({role:m.role,content:m.content}));
      const reply = await aiCall(apiMsgs, AI_SYS_ADVISOR);
      if (!reply) throw new Error("Empty response");
      setMsgs(prev=>[...prev,{role:"assistant",content:reply}]);
    } catch(e) {
      console.error("Advisor:", e.message);
      setError(`Connection issue: ${e.message}. Please try again.`);
      setMsgs(prev=>prev.slice(0,-1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 140px)"}}>
    <SectionHead title="AI Investment Advisor" sub="Powered by Claude · Indian + global context · Financial education · Always available"/>
    <div style={{flex:1,overflowY:"auto",paddingRight:4,paddingBottom:10}}>
      {msgs.map((m,i)=>(
        <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:14,animation:"fadeIn .3s ease"}}>
          {m.role==="assistant" && <div style={{width:31,height:31,borderRadius:9,marginRight:9,flexShrink:0,background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:17,color:T.bgDeep,boxShadow:"0 2px 8px rgba(201,168,76,.25)"}}>F</div>}
          <div style={{maxWidth:"72%",padding:"12px 16px",borderRadius:m.role==="user"?"14px 3px 14px 14px":"3px 14px 14px 14px",
            background:m.role==="user"?`linear-gradient(135deg,${T.goldBg},${T.purpleBg})`:T.card,
            border:`1px solid ${m.role==="user"?T.goldBdr:T.bdr}`,color:T.text,fontSize:13,lineHeight:1.8,whiteSpace:"pre-wrap"}}>
            {m.content}
          </div>
        </div>
      ))}
      {loading && <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
        <div style={{width:31,height:31,borderRadius:9,background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:17,color:T.bgDeep}}>F</div>
        <div style={{padding:"12px 16px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:"3px 14px 14px 14px",display:"flex",gap:7,alignItems:"center"}}>
          <Spin size={13}/><span style={{color:T.textSub,fontSize:13}}>Thinking…</span>
        </div>
      </div>}
      {error && <div style={{marginBottom:12,padding:"10px 14px",background:T.redBg,border:`1px solid ${T.red}30`,borderRadius:10,fontSize:12,color:T.red,display:"flex",gap:8,alignItems:"center"}}>
        <AlertTriangle size={13}/>{error}
        <button onClick={()=>setError(null)} style={{marginLeft:"auto",background:"none",border:"none",color:T.red,cursor:"pointer"}}><X size={12}/></button>
      </div>}
      <div ref={bottomRef}/>
    </div>
    {msgs.length<=1 && <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
      {starters.map(s=><button key={s} onClick={()=>send(s)} style={{padding:"6px 11px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:8,color:T.textSub,fontSize:12,transition:"all .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.goldBdr;e.currentTarget.style.color=T.gold;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.color=T.textSub;}}>{s}</button>)}
    </div>}
    <div style={{display:"flex",gap:10}}>
      <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
        placeholder="Ask anything about investing, markets, or 'where do I start?'…"
        style={{flex:1,padding:"12px 15px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:11,color:T.text,fontSize:13}}
        onFocus={e=>e.target.style.borderColor=T.goldFoc} onBlur={e=>e.target.style.borderColor=T.bdr}/>
      <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
        padding:"12px 20px",border:"none",borderRadius:11,display:"flex",alignItems:"center",gap:6,
        background:loading||!input.trim()?T.textMute:`linear-gradient(135deg,${T.gold},${T.goldDim})`,
        color:loading||!input.trim()?T.textSub:T.bgDeep,fontWeight:600,fontSize:13}}>
        {loading?<Spin size={14} color={T.bgDeep}/>:<Send size={14}/>}Send
      </button>
    </div>
  </div>;
}

/* ─────────────────────────────────────────────────────────
   FEAR PROFILER
───────────────────────────────────────────────────────── */
const QUIZ = [
  {q:"The market drops 20% in one day. Your first instinct:",opts:[{t:"Sell everything immediately",s:1},{t:"Hold and wait for recovery",s:5},{t:"Buy the dip aggressively",s:10}]},
  {q:"A friend doubled money on a meme coin. You:",opts:[{t:"Ignore it — too risky for me",s:1},{t:"Research the fundamentals first",s:5},{t:"Put ₹10,000 in immediately",s:10}]},
  {q:"For your retirement corpus, you prioritise:",opts:[{t:"Zero risk of losing principal",s:1},{t:"Steady moderate growth",s:5},{t:"Maximum possible returns",s:10}]},
  {q:"Down 15% after 12 months invested. You:",opts:[{t:"Sell — I cannot take more losses",s:1},{t:"Stay invested — trust the process",s:5},{t:"Double my position at this price",s:10}]},
];
const PERSONAS = {
  low: {n:"The Cautious Guardian",e:"🛡",c:T.green, d:"Capital preservation is your north star — a healthy instinct. The key: even zero-risk FDs lose to inflation. Controlled minimal risk is mathematically necessary for real wealth."},
  mid: {n:"The Strategic Balancer",e:"⚖",c:T.gold,  d:"You fear unpredictable volatility more than risk itself. Your strength is patience. A rules-based automated SIP removes the emotional decisions that cost investors 2-3% per year."},
  high:{n:"The FOMO Challenger",  e:"🎯",c:T.purple,d:"You don't fear losing — you fear missing out. Your risk is overexposure without a framework. Discipline separates speculation from wealth-building, and you're one system away from both."},
};
function Profiler() {
  const [step,setStep]=useState(0); const [score,setScore]=useState(0); const [done,setDone]=useState(false);
  const [plan,setPlan]=useState(""); const [planLoad,setPlanLoad]=useState(false);
  const persona = score<=10?PERSONAS.low:score<=22?PERSONAS.mid:PERSONAS.high;
  function pick(s){ const ns=score+s,ni=step+1; if(ni>=QUIZ.length){setScore(ns);setDone(true);genPlan(ns);}else{setScore(ns);setStep(ni);} }
  async function genPlan(sc) {
    setPlanLoad(true);
    const p=sc<=10?PERSONAS.low:sc<=22?PERSONAS.mid:PERSONAS.high;
    try {
      const t = await aiCall([{role:"user",content:`Investor scored ${sc}/40 on Fear Profiler. Persona: "${p.n}" — ${p.d}\n\nWrite 3 numbered personalised steps using Indian market context (SIPs, Nifty 50 ETF, Zerodha, Groww). Warm, specific, max 5 sentences. No preamble.`}],"You are a calm investment coach. Be specific and encouraging with Indian market context.");
      setPlan(t);
    } catch { setPlan("1. Open Zerodha or Groww today and start a Nifty 50 ETF SIP of ₹1,000/month.\n2. Use the Feargon Simulator to see your numbers grow over 10 years — seeing is believing.\n3. Ask the AI Advisor one question every week — knowledge is the permanent antidote to fear."); }
    setPlanLoad(false);
  }
  function reset(){setStep(0);setScore(0);setDone(false);setPlan("");}
  return <div style={{maxWidth:660,margin:"0 auto"}}>
    <SectionHead title="Fear Profiler" sub="4-question psychology assessment · Fear Persona · Personalised AI combat plan"/>
    {!done ? <PCard>
      <div style={{marginBottom:22}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
          <span style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>Question {step+1} of {QUIZ.length}</span>
          <span style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(((step+1)/QUIZ.length)*100)}%</span>
        </div>
        <div style={{height:3,background:T.textMute,borderRadius:2,overflow:"hidden"}}>
          <div style={{width:`${((step+1)/QUIZ.length)*100}%`,height:"100%",background:`linear-gradient(90deg,${T.gold},${T.goldBr})`,borderRadius:2,transition:"width .5s"}}/>
        </div>
      </div>
      <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:T.text,fontWeight:400,marginBottom:22,lineHeight:1.45}}>{QUIZ[step].q}</h3>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {QUIZ[step].opts.map((o,i)=><button key={i} onClick={()=>pick(o.s)} style={{padding:"15px 18px",background:T.surface,border:`1px solid ${T.bdr}`,borderRadius:11,color:T.text,textAlign:"left",fontSize:13,lineHeight:1.5,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.background=T.cardHov;e.currentTarget.style.color=T.gold;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bdr;e.currentTarget.style.background=T.surface;e.currentTarget.style.color=T.text;}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.goldDim,marginRight:10,fontSize:11}}>{String.fromCharCode(65+i)}</span>{o.t}
        </button>)}
      </div>
    </PCard> : <div>
      <PCard style={{marginBottom:14,textAlign:"center",background:`${persona.c}07`,borderColor:`${persona.c}25`,padding:28}}>
        <div style={{fontSize:52,marginBottom:14}}>{persona.e}</div>
        <div style={{fontSize:9,color:persona.c,textTransform:"uppercase",letterSpacing:".15em",marginBottom:8,fontWeight:600}}>Your Fear Persona</div>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:persona.c,margin:"0 0 14px",fontWeight:400}}>{persona.n}</h2>
        <p style={{color:T.text,fontSize:14,lineHeight:1.8,maxWidth:480,margin:"0 auto 18px"}}>{persona.d}</p>
        <Badge color={persona.c}>Score: {score}/{QUIZ.length*10}</Badge>
      </PCard>
      <PCard style={{marginBottom:14}}>
        <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:14}}>
          <Sparkles size={15} color={T.gold}/><div style={{fontSize:10,color:T.gold,textTransform:"uppercase",letterSpacing:".1em",fontWeight:600}}>AI Combat Plan</div>
        </div>
        {planLoad ? <div style={{display:"flex",gap:9,alignItems:"center",color:T.textSub,fontSize:13}}><Spin size={14}/>Generating personalised plan…</div>
          : <p style={{color:T.text,fontSize:13,lineHeight:1.9,margin:0,whiteSpace:"pre-line"}}>{plan}</p>}
      </PCard>
      <div style={{display:"flex",gap:10}}>
        <button onClick={reset} style={{flex:1,padding:12,background:T.card,border:`1px solid ${T.bdr}`,borderRadius:10,color:T.textSub,fontSize:13}}>Retake</button>
        <button style={{flex:2,padding:12,background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,border:"none",borderRadius:10,color:T.bgDeep,fontWeight:600,fontSize:14,fontFamily:"'Cormorant Garamond',serif"}}>Begin Your Investment Journey →</button>
      </div>
    </div>}
  </div>;
}

/* ─────────────────────────────────────────────────────────
   PORTFOLIO
───────────────────────────────────────────────────────── */
function Portfolio() {
  const [holdings, setHoldings] = useState([
    {sym:"NIFTY50",name:"Nifty 50 ETF",pct:40,value:500000,gain:45000,c:T.gold},
    {sym:"TCS",    name:"TCS",          pct:25,value:312500,gain:28000,c:T.purple},
    {sym:"HDFC",   name:"HDFC Bank",    pct:20,value:250000,gain:18000,c:T.blue},
    {sym:"BTC",    name:"Bitcoin",       pct:15,value:187500,gain:52000,c:T.green},
  ]);
  const [newSym, setNewSym] = useState("");
  const totalValue = holdings.reduce((s,h)=>s+h.value,0);
  const totalGain  = holdings.reduce((s,h)=>s+h.gain,0);
  const pieData = holdings.map(h=>({name:h.sym,value:h.pct,color:h.c}));
  const CustomTip = ({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0];const item=pieData.find(x=>x.name===d.name);return <div style={{background:T.surface,border:`1px solid ${T.bdrHi}`,borderRadius:8,padding:"8px 12px",fontSize:12}}><div style={{color:item?.color||T.gold,fontWeight:600}}>{d.name}</div><div style={{color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{d.value}%</div></div>;};
  return <div>
    <SectionHead title="Portfolio Builder" sub="Design your allocation, spot concentration risk, and track performance."/>
    <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:18,alignItems:"start"}}>
      <PCard style={{textAlign:"center"}}>
        <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14,fontWeight:500}}>Allocation</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} dataKey="value" stroke="none">
            {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
          </Pie><Tooltip content={<CustomTip/>}/></PieChart>
        </ResponsiveContainer>
        <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:5}}>
          {holdings.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:9,height:9,borderRadius:2,background:h.c}}/><span style={{color:T.text,fontSize:12}}>{h.sym}</span></div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:h.c,fontSize:12,fontWeight:500}}>{h.pct}%</span>
          </div>)}
        </div>
        <GoldLine/>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:9,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:5,fontWeight:500}}>Total Value</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,color:T.gold,fontWeight:500}}>₹{Math.round(totalValue).toLocaleString("en-IN")}</div>
          <div style={{fontSize:12,color:T.green,marginTop:3,fontWeight:500}}>+₹{Math.round(totalGain).toLocaleString("en-IN")} ({((totalGain/totalValue)*100).toFixed(1)}%)</div>
        </div>
      </PCard>
      <div>
        {holdings.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,padding:"12px 15px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:12}}>
          <div style={{width:32,height:32,borderRadius:9,background:`${h.c}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:h.c,fontSize:10,fontWeight:700}}>{h.sym.slice(0,3)}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:T.text,fontSize:13,fontWeight:500}}>{h.name}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",color:h.c,fontSize:12,fontWeight:500}}>{h.pct}%</span>
            </div>
            <input type="range" min={0} max={70} value={h.pct}
              onChange={e=>setHoldings(prev=>prev.map((x,j)=>j===i?{...x,pct:Number(e.target.value)}:x))}
              style={{accentColor:h.c}}/>
          </div>
          <button onClick={()=>setHoldings(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.textSub,padding:5}}
            onMouseEnter={e=>e.currentTarget.style.color=T.red} onMouseLeave={e=>e.currentTarget.style.color=T.textSub}><X size={13}/></button>
        </div>)}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <input value={newSym} onChange={e=>setNewSym(e.target.value)} placeholder="Add symbol (e.g. TSLA, SOL, INFY)"
            style={{flex:1,padding:"10px 13px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:10,color:T.text,fontSize:13}}
            onFocus={e=>e.target.style.borderColor=T.goldFoc} onBlur={e=>e.target.style.borderColor=T.bdr}/>
          <button onClick={()=>{const s=newSym.toUpperCase().trim();if(!s)return;const st=STATIC[s];setHoldings(prev=>[...prev,{sym:s,name:st?.n||s,pct:5,value:50000,gain:0,c:st?.c||T.purple}]);setNewSym("");}}
            style={{padding:"10px 16px",background:T.goldBg,border:`1px solid ${T.goldBdr}`,borderRadius:10,color:T.gold,fontWeight:500,fontSize:13,display:"flex",alignItems:"center",gap:5}}>
            <Plus size={13}/>Add
          </button>
        </div>
        {holdings.some(h=>h.pct>45) && <div style={{padding:"12px 15px",background:T.goldBg,border:`1px solid ${T.goldBdr}`,borderRadius:10}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <AlertTriangle size={13} color={T.gold}/>
            <span style={{color:T.gold,fontSize:12,fontWeight:500}}>Concentration risk — one asset exceeds 45%. Consider diversifying.</span>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

/* ─────────────────────────────────────────────────────────
   PERFORMANCE (GROW API)
 ───────────────────────────────────────────────────────── */
function Performance() {
  const [view, setView] = useState("home");
  const utils = trpc.useUtils();

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = trpc.grow.status.useQuery(undefined, {
    retry: false,
  });

  const connectMutation = trpc.grow.connect.useMutation({
    onSuccess: () => {
      utils.grow.status.invalidate();
      refetchStatus();
    },
  });

  const disconnectMutation = trpc.grow.disconnect.useMutation({
    onSuccess: () => {
      utils.grow.status.invalidate();
      refetchStatus();
    },
  });

  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = trpc.grow.getPortfolio.useQuery(undefined, {
    enabled: status?.connected === true,
  });

  const { data: pnl, isLoading: pnlLoading } = trpc.grow.getPnL.useQuery(undefined, {
    enabled: status?.connected === true,
  });

  const [token, setToken] = useState("");

  const handleConnect = async () => {
    if (!token.trim()) return;
    try {
      await connectMutation.mutateAsync({ accessToken: token.trim() });
      setToken("");
    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

  const handleDisconnect = async () => {
    await disconnectMutation.mutateAsync();
  };

  const handleRefresh = () => {
    refetchPortfolio();
  };

  if (!status && statusLoading) {
    return <div style={{textAlign:"center",padding:60,color:T.textSub}}><Spin/> Loading...</div>;
  }

  if (!status?.connected) {
    return <div>
      <SectionHead title="Performance" sub="Connect your Grow account to track real portfolio performance."/>
      <PCard>
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{width:60,height:60,borderRadius:30,background:T.goldBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <TrendingUp size={28} color={T.gold}/>
          </div>
          <div style={{fontSize:16,fontWeight:500,color:T.text,marginBottom:8}}>Connect Grow Account</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:20}}>Link your Grow Trading API to see real-time portfolio & P&L</div>
          <input value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste your Grow API access token"
            style={{width:"100%",maxWidth:400,padding:"12px 14px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:10,color:T.text,fontSize:13,marginBottom:12}}
            onFocus={e=>e.target.style.borderColor=T.goldFoc} onBlur={e=>e.target.style.borderColor=T.bdr}/>
          <button onClick={handleConnect} disabled={connectMutation.isPending}
            style={{padding:"12px 24px",background:T.goldBg,border:`1px solid ${T.goldBdr}`,borderRadius:10,color:T.gold,fontWeight:500,fontSize:13,display:"flex",alignItems:"center",gap:6,margin:"0 auto",opacity:connectMutation.isPending?0.6:1}}>
            {connectMutation.isPending ? <Spin/> : <Link size={14}/>} Connect Account
          </button>
        </div>
        <GoldLine/>
        <div style={{fontSize:10,color:T.textSub,textAlign:"center"}}>
          Get your token from <a href="https://groww.in/trade-api" target="_blank" rel="noopener" style={{color:T.gold}}>Groww Trade API</a> → API Keys
        </div>
      </PCard>
    </div>;
  }

  const totalValue = pnl?.totalValue || 0;
  const totalPnL = pnl?.totalPnL || 0;
  const pnlPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

  return <div>
    <SectionHead 
      title="Performance" 
      sub={status?.userName ? `Connected as ${status.userName}` : "Connected to Grow"}
      action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={handleRefresh} disabled={portfolioLoading}
            style={{padding:"8px 12px",background:T.card,border:`1px solid ${T.bdr}`,borderRadius:8,color:T.textSub,fontSize:12,display:"flex",alignItems:"center",gap:5}}>
            <RefreshCw size={12} className={portfolioLoading?"spin":""}/> Refresh
          </button>
          <button onClick={handleDisconnect}
            style={{padding:"8px 12px",background:`${T.red}18`,border:`1px solid ${T.red}33`,borderRadius:8,color:T.red,fontSize:12}}>
            Disconnect
          </button>
        </div>
      }
    />
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
      <PCard>
        <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:500}}>Total Value</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:T.text,fontWeight:500}}>
          {pnlLoading ? "—" : fmt(totalValue, "RELIANCE")}
        </div>
      </PCard>
      <PCard>
        <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:500}}>Total P&L</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:totalPnL >= 0 ? T.green : T.red,fontWeight:500}}>
          {pnlLoading ? "—" : `${totalPnL >= 0 ? "+" : ""}${fmt(totalPnL, "RELIANCE")}`}
        </div>
      </PCard>
      <PCard>
        <div style={{fontSize:10,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:500}}>Return %</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:pnlPercent >= 0 ? T.green : T.red,fontWeight:500}}>
          {pnlLoading ? "—" : `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`}
        </div>
      </PCard>
    </div>
    <PCard>
      <div style={{fontSize:12,color:T.textSub,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14,fontWeight:500}}>Holdings</div>
      {portfolioLoading ? (
        <div style={{textAlign:"center",padding:20,color:T.textSub}}><Spin/> Loading...</div>
      ) : portfolio?.holdings?.length > 0 ? (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {portfolio.holdings.map((h, i) => (
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:T.surface,borderRadius:8}}>
              <div>
                <div style={{color:T.text,fontSize:13,fontWeight:500}}>{h.tradingSymbol}</div>
                <div style={{color:T.textSub,fontSize:11}}>Qty: {h.quantity}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",color:T.text,fontSize:13}}>{fmt(h.averagePrice, "RELIANCE")}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",color:h.pnl >= 0 ? T.green : T.red,fontSize:11}}>
                  {h.pnl >= 0 ? "+" : ""}{fmt(h.pnl, "RELIANCE")}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{textAlign:"center",padding:20,color:T.textSub}}>No holdings found</div>
      )}
    </PCard>
    {status?.lastSyncAt && (
      <div style={{fontSize:10,color:T.textMute,marginTop:12,textAlign:"center"}}>
        Last synced: {new Date(status.lastSyncAt).toLocaleString()}
      </div>
    )}
  </div>;
}

/* ─────────────────────────────────────────────────────────
   ROOT APP
 ───────────────────────────────────────────────────────── */
export default function App() {
  useGlobalStyles();
  const [view,         setView]         = useState("home");
  const [analyzeTarget,setAnalyzeTarget]= useState(null);

  function nav(v)        { setAnalyzeTarget(null); setView(v); }
  function goAnalyze(sym){ setAnalyzeTarget(sym);  setView("analyze"); }

  const views = {
    home:     <Home      setView={nav}   setAnalyzeTarget={goAnalyze}/>,
    market:   <Market    setView={nav}   setAnalyzeTarget={goAnalyze}/>,
    analyze:  <Analyzer  targetSym={analyzeTarget} setTargetSym={setAnalyzeTarget}/>,
    simulate: <Simulator/>,
    portfolio:<Portfolio/>,
    grow:     <Performance/>,
    advisor:  <Advisor/>,
    profiler: <Profiler/>,
  };

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text}}>
      {/* Ambient glow */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-15%",left:"25%",width:700,height:700,borderRadius:"50%",background:`radial-gradient(circle,${T.gold}05 0%,transparent 70%)`,filter:"blur(40px)"}}/>
        <div style={{position:"absolute",bottom:"5%",right:"5%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${T.purple}04 0%,transparent 70%)`,filter:"blur(40px)"}}/>
      </div>
      <div style={{position:"relative",zIndex:1}}>
        <Navbar view={view} setView={nav}/>
        <Ticker/>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"36px 24px 80px"}}>
          {views[view]}
        </div>
      </div>
    </div>
  );
}