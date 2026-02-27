import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');`;

const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #080c10; color: #c8d6e5; font-family: 'IBM Plex Sans', sans-serif; }
  :root {
    --bg: #080c10; --surface: #0d1219; --surface2: #131c26;
    --border: #1e2d3d; --accent: #00d4ff; --accent2: #ff6b35;
    --verified: #00ff88; --warn: #ffcc00; --text: #c8d6e5;
    --muted: #4a6080; --mono: 'IBM Plex Mono', monospace;
  }
  .app { display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 220px; min-width: 220px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .logo { padding: 20px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 32px; height: 32px; background: var(--accent); clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #000; font-family: var(--mono); }
  .logo-text { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--accent); letter-spacing: 2px; }
  .logo-sub { font-size: 9px; color: var(--muted); letter-spacing: 1px; margin-top: 1px; }
  .nav { flex: 1; padding: 12px 0; overflow-y: auto; }
  .nav-section { padding: 8px 18px 4px; font-size: 9px; letter-spacing: 2px; color: var(--muted); font-family: var(--mono); text-transform: uppercase; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; cursor: pointer; font-size: 13px; color: #7a9bbf; transition: all 0.15s; border-left: 2px solid transparent; }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: rgba(0,212,255,0.06); color: var(--accent); border-left-color: var(--accent); }
  .nav-badge { margin-left: auto; background: var(--accent2); color: #fff; font-size: 9px; padding: 1px 6px; border-radius: 10px; font-family: var(--mono); }
  .nav-badge.green { background: var(--verified); color: #000; }
  .sidebar-bottom { border-top: 1px solid var(--border); padding: 12px 18px; }
  .user-card { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#1e3a5f,#0d6efd); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: white; border: 1px solid var(--border); }
  .user-name { font-size: 12px; font-weight: 500; }
  .user-role { font-size: 10px; color: var(--muted); font-family: var(--mono); }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
  .topbar { height: 52px; min-height: 52px; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 16px; background: var(--surface); flex-shrink: 0; }
  .topbar-title { font-family: var(--mono); font-size: 12px; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; white-space: nowrap; }
  .live-indicator { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10px; color: var(--accent2); white-space: nowrap; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); animation: blink 1.4s ease-in-out infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes flashTag { 0%,100%{opacity:1} 50%{opacity:0.6} }
  .ml-auto { margin-left: auto; }
  .topbar-btn { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: var(--mono); letter-spacing: 0.5px; border: 1px solid var(--accent); color: var(--accent); background: transparent; transition: all 0.15s; white-space: nowrap; }
  .topbar-btn:hover { background: rgba(0,212,255,0.1); }
  .topbar-btn.primary { background: var(--accent); color: #000; font-weight: 600; }
  .feed-layout { flex: 1; display: flex; overflow: hidden; min-height: 0; }
  .intel-feed { width: 360px; min-width: 360px; border-right: 1px solid var(--border); overflow-y: auto; background: var(--bg); }
  .intel-feed::-webkit-scrollbar { width: 3px; }
  .intel-feed::-webkit-scrollbar-thumb { background: var(--border); }
  .section-header { position: sticky; top: 0; z-index: 10; background: rgba(8,12,16,0.95); backdrop-filter: blur(8px); padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .section-label { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); font-weight: 600; }
  .count-badge { font-family: var(--mono); font-size: 9px; color: var(--muted); margin-left: auto; }
  .story-card { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; position: relative; }
  .story-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:transparent; transition:background 0.15s; }
  .story-card:hover { background: var(--surface2); }
  .story-card:hover::before { background: var(--accent); }
  .story-card.active { background: rgba(0,212,255,0.05); }
  .story-card.active::before { background: var(--accent); }
  .story-card.breaking::before { background: var(--accent2); }
  .story-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .breaking-tag { font-family:var(--mono); font-size:8px; letter-spacing:1.5px; padding:2px 6px; border-radius:2px; background:var(--accent2); color:#fff; font-weight:600; animation:flashTag 2s ease-in-out infinite; }
  .story-tag { font-family:var(--mono); font-size:8px; letter-spacing:1px; padding:2px 6px; border-radius:2px; border:1px solid var(--border); color:var(--muted); }
  .story-time { font-family:var(--mono); font-size:9px; color:var(--muted); margin-left:auto; }
  .story-headline { font-size:13px; font-weight:500; line-height:1.5; color:var(--text); margin-bottom:8px; }
  .story-sources { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .source-chip { display:flex; align-items:center; gap:4px; padding:2px 7px; border-radius:3px; background:var(--surface2); border:1px solid var(--border); font-size:9px; color:var(--muted); font-family:var(--mono); }
  .vdot { width:5px; height:5px; border-radius:50%; background:var(--verified); }
  .post-card { padding:14px 16px; border-bottom:1px solid var(--border); }
  .post-card:hover { background:rgba(255,255,255,0.02); }
  .post-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .post-avatar { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:white; border:1px solid var(--border); flex-shrink:0; }
  .post-author { font-size:12px; font-weight:500; }
  .post-handle { font-size:10px; color:var(--muted); font-family:var(--mono); }
  .post-time { font-size:10px; color:var(--muted); margin-left:auto; font-family:var(--mono); }
  .post-body { font-size:12px; line-height:1.6; color:#9ab3cc; }
  .post-actions { display:flex; gap:16px; margin-top:10px; }
  .post-action { font-size:10px; color:var(--muted); cursor:pointer; font-family:var(--mono); }
  .post-action:hover { color:var(--accent); }
  .detail-panel { flex:1; overflow-y:auto; background:var(--bg); padding:24px 28px; }
  .detail-panel::-webkit-scrollbar { width:3px; }
  .detail-panel::-webkit-scrollbar-thumb { background:var(--border); }
  .detail-headline { font-size:20px; font-weight:600; line-height:1.4; color:var(--text); margin-bottom:8px; }
  .detail-summary { font-size:13px; line-height:1.7; color:#7a9bbf; padding:14px 16px; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:4px; margin-bottom:20px; }
  .detail-summary-label { font-family:var(--mono); font-size:9px; letter-spacing:2px; color:var(--accent); margin-bottom:6px; }
  .src-title { font-family:var(--mono); font-size:10px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
  .src-title::after { content:''; flex:1; height:1px; background:var(--border); }
  .source-post { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:14px; margin-bottom:10px; transition:border-color 0.15s; }
  .source-post:hover { border-color:var(--accent); }
  .source-post-hd { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .source-name { font-size:13px; font-weight:600; }
  .source-handle { font-size:10px; color:var(--muted); font-family:var(--mono); }
  .score-badge { margin-left:auto; display:flex; align-items:center; gap:4px; font-family:var(--mono); font-size:9px; padding:2px 8px; border-radius:3px; border:1px solid var(--verified); color:var(--verified); }
  .source-post-body { font-size:12px; line-height:1.6; color:#8aa5be; }
  .source-post-time { margin-top:8px; font-family:var(--mono); font-size:9px; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .first-report { color:var(--accent2); }
  .conf-bar { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
  .conf-label { font-family:var(--mono); font-size:9px; color:var(--muted); white-space:nowrap; }
  .conf-track { flex:1; height:3px; background:var(--border); border-radius:2px; }
  .conf-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--accent2),var(--accent)); }
  .conf-val { font-family:var(--mono); font-size:9px; color:var(--accent); }
  .tl-bar { display:flex; align-items:center; gap:6px; padding:8px 16px; border-bottom:1px solid var(--border); background:rgba(0,212,255,0.03); overflow-x:auto; flex-shrink:0; }
  .tl-event { flex-shrink:0; font-size:9px; font-family:var(--mono); color:var(--muted); padding:3px 8px; border-radius:3px; border:1px solid var(--border); white-space:nowrap; }
  .tl-event.first { border-color:var(--accent2); color:var(--accent2); }
  .tl-arrow { color:var(--border); font-size:10px; flex-shrink:0; }
  .tabs { display:flex; border-bottom:1px solid var(--border); padding:0 16px; background:var(--bg); flex-shrink:0; }
  .tab { padding:10px 16px; font-size:11px; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; font-family:var(--mono); letter-spacing:0.5px; transition:all 0.15s; }
  .tab:hover { color:var(--text); }
  .tab.active { color:var(--accent); border-bottom-color:var(--accent); }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:200; }
  .modal { background:var(--surface); border:1px solid var(--border); border-radius:8px; width:480px; max-height:80vh; overflow-y:auto; padding:24px; }
  .modal-title { font-family:var(--mono); font-size:14px; font-weight:600; color:var(--accent); margin-bottom:4px; }
  .modal-sub { font-size:11px; color:var(--muted); margin-bottom:20px; line-height:1.5; }
  .form-group { margin-bottom:16px; }
  .form-label { font-family:var(--mono); font-size:10px; letter-spacing:1px; color:var(--muted); margin-bottom:6px; display:block; }
  .form-input { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:9px 12px; color:var(--text); font-family:'IBM Plex Sans',sans-serif; font-size:12px; outline:none; transition:border-color 0.15s; }
  .form-input:focus { border-color:var(--accent); }
  .form-ta { resize:vertical; min-height:70px; }
  .crit-list { background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:12px; margin-bottom:20px; }
  .crit-item { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; font-size:11px; color:#7a9bbf; line-height:1.5; }
  .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  .btn { padding:8px 18px; border-radius:4px; cursor:pointer; font-size:11px; font-family:var(--mono); border:1px solid var(--border); color:var(--muted); background:transparent; transition:all 0.15s; }
  .btn:hover { color:var(--text); }
  .btn.primary { background:var(--accent); color:#000; font-weight:600; border-color:var(--accent); }

  /* MAP */
  .map-wrap { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .map-filters { padding:8px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:var(--surface); flex-shrink:0; }
  .mf-btn { padding:3px 10px; border-radius:3px; font-family:var(--mono); font-size:9px; letter-spacing:1px; border:1px solid var(--border); color:var(--muted); background:transparent; cursor:pointer; transition:all 0.15s; }
  .mf-btn.on { border-color:var(--accent); color:var(--accent); background:rgba(0,212,255,0.08); }
  .map-body { flex:1; position:relative; overflow:hidden; }
  .map-svg { width:100%; height:100%; display:block; }
  .map-legend-box { position:absolute; bottom:16px; left:16px; background:rgba(13,18,25,0.93); border:1px solid var(--border); border-radius:6px; padding:10px 14px; backdrop-filter:blur(8px); display:flex; flex-direction:column; gap:6px; }
  .leg-row { display:flex; align-items:center; gap:7px; font-family:var(--mono); font-size:8px; color:var(--muted); letter-spacing:0.5px; }
  .leg-dot { border-radius:50%; flex-shrink:0; }
  .map-stats-box { position:absolute; top:12px; right:16px; display:flex; flex-direction:column; gap:8px; }
  .stat-card { background:rgba(13,18,25,0.93); border:1px solid var(--border); border-radius:6px; padding:9px 13px; min-width:130px; backdrop-filter:blur(8px); }
  .stat-label { font-family:var(--mono); font-size:8px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; margin-bottom:3px; }
  .stat-val { font-family:var(--mono); font-size:18px; font-weight:600; }
  .stat-sub { font-size:9px; color:var(--muted); margin-top:2px; }
  .region-panel { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); width:360px; background:rgba(13,18,25,0.97); border:1px solid var(--border); border-radius:8px; padding:14px; backdrop-filter:blur(12px); }
  .tooltip-box { position:fixed; pointer-events:none; background:rgba(10,16,24,0.97); border:1px solid var(--border); border-radius:6px; padding:9px 13px; min-width:180px; max-width:260px; font-size:11px; z-index:999; box-shadow:0 8px 32px rgba(0,0,0,0.6); }
  .tt-region { font-family:var(--mono); font-size:9px; color:var(--accent); margin-bottom:3px; letter-spacing:1px; }
  .tt-count { font-size:20px; font-weight:700; color:var(--text); margin-bottom:4px; font-family:var(--mono); }
  .tt-tags { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:4px; }
  .tt-tag { padding:1px 5px; border-radius:2px; border:1px solid var(--border); font-family:var(--mono); font-size:8px; color:var(--muted); }
  .tt-hint { font-size:9px; color:var(--muted); font-family:var(--mono); margin-top:4px; }
`;

// ─── DATA ────────────────────────────────────────────────────────────────────

const REGIONS = [
  { id:"hormuz",    name:"Strait of Hormuz",       lat:26.5, lng:56.5,  count:14, breaking:true,  color:"#ff6b35", tags:["CONFLICT","MARITIME"] },
  { id:"ukraine",   name:"Eastern Ukraine",         lat:49.0, lng:37.5,  count:22, breaking:true,  color:"#ff6b35", tags:["CONFLICT","MILITARY"] },
  { id:"israel",    name:"Gaza / Israel",           lat:31.5, lng:34.5,  count:18, breaking:true,  color:"#ff6b35", tags:["CONFLICT","HUMANITARIAN"] },
  { id:"southchin", name:"South China Sea",         lat:14.0, lng:113.0, count:11, breaking:false, color:"#ffcc00", tags:["TERRITORIAL","NAVAL"] },
  { id:"taiwan",    name:"Taiwan Strait",           lat:24.5, lng:120.5, count:9,  breaking:false, color:"#ffcc00", tags:["GEOPOLITICS","NAVAL"] },
  { id:"reddtrade", name:"Red Sea",                 lat:14.0, lng:43.0,  count:8,  breaking:false, color:"#ffcc00", tags:["MARITIME","SECURITY"] },
  { id:"sahel",     name:"Sahel Region",            lat:14.0, lng:2.0,   count:7,  breaking:false, color:"#ffcc00", tags:["CONFLICT","GOVERNANCE"] },
  { id:"cyber_eu",  name:"EU Cyber Infrastructure", lat:51.0, lng:10.0,  count:5,  breaking:false, color:"#00d4ff", tags:["CYBER","INFRASTRUCTURE"] },
  { id:"pakistan",  name:"Pakistan / Afghanistan",  lat:33.0, lng:68.0,  count:5,  breaking:false, color:"#00d4ff", tags:["SECURITY","GEOPOLITICS"] },
  { id:"myanmar",   name:"Myanmar",                 lat:19.0, lng:96.5,  count:6,  breaking:false, color:"#ffcc00", tags:["CONFLICT","HUMAN RIGHTS"] },
  { id:"korea",     name:"Korean Peninsula",        lat:38.5, lng:127.5, count:4,  breaking:false, color:"#00d4ff", tags:["MILITARY","NUCLEAR"] },
  { id:"venezuela", name:"Venezuela",               lat:7.5,  lng:-66.0, count:3,  breaking:false, color:"#4a6080", tags:["GOVERNANCE","ECONOMICS"] },
];

const STORIES = [
  { id:1, breaking:true,  tag:"CONFLICT",    headline:"Multiple explosions near port infrastructure in Strait of Hormuz", summary:"Three verified OSINT sources corroborate large detonations near shipping lanes approx. 12km south of Bandar Abbas. AIS signals for 4 vessels went dark.", time:"4m ago", confidence:82, region:"hormuz",
    sources:[
      {name:"StratSentinel",    handle:"@StratSentinel",   score:94, av:"#1a3a5c", ini:"SS", t:"T+0",  first:true,  body:"⚠️ AIS anomaly cluster near Bandar Abbas. 4 vessels lost transponder signal within 8-min window. Grid: 27.1°N 56.8°E."},
      {name:"MaritimeWatch",    handle:"@MW_Intel",         score:89, av:"#1a4a3c", ini:"MW", t:"T+3m", first:false, body:"Corroborating StratSentinel. Local source reports 2 distinct detonations from Qeshm Island. Timing consistent with AIS blackout."},
      {name:"GulfWatcher",      handle:"@GulfWatcher_OS",   score:78, av:"#3a2a1a", ini:"GW", t:"T+6m", first:false, body:"Sentinel-6 pass from 40min prior shows no obstructions. Smoke plume approx 14km offshore at 0847 local."},
    ]},
  { id:2, breaking:false, tag:"CYBER",       headline:"SCADA systems targeted in coordinated EU infrastructure intrusion", summary:"Two threat intelligence sources identify overlapping TTPs in attacks on water treatment and power grid SCADA systems across DE, NL, PL.", time:"31m ago", confidence:67, region:"cyber_eu",
    sources:[
      {name:"CyberSentinel_EU", handle:"@CyberSentinel_EU", score:91, av:"#1c1a3c", ini:"CS", t:"T+0",  first:true,  body:"SCADA intrusions in DE, NL, PL share identical C2 infrastructure. Dropper uses modified Industroyer2 variant. Yara rules published."},
      {name:"OT_Threat_Intel",  handle:"@OTThreatIntel",    score:86, av:"#2a1a3c", ini:"OT", t:"T+14m",first:false, body:"Power grid HMI probing from same ASN block (AS48832). Pattern consistent with SANDSTORM cluster activity from Q1."},
    ]},
  { id:3, breaking:false, tag:"GEOPOLITICS", headline:"Mechanized troop movement observed along northern border — satellite analysis underway", summary:"Single verified source reporting significant mechanized column movement. Awaiting corroboration from additional OSINT channels.", time:"1h ago", confidence:41, region:"ukraine",
    sources:[
      {name:"GeoIntelysis",     handle:"@GeoIntelysis",     score:88, av:"#1a2a3c", ini:"GI", t:"T+0",  first:true,  body:"Planet Labs imagery: 40+ vehicles (APCs + logistics) heading N on Route M-4. Annotated thread below."},
    ]},
];

const GENERAL = [
  {id:101, author:"rk_analyst",     ini:"RK", color:"#1a3050", body:"Maritime insurance premium shift in the Gulf over 72hrs is telling — Lloyd's underwriters don't move that fast without solid signal.", time:"12m ago", likes:34, replies:8},
  {id:102, author:"policywatch_dc", ini:"PW", color:"#2a1a40", body:"Emergency UN Security Council briefing request — third in 6 weeks for the same region if confirmed.", time:"28m ago", likes:21, replies:5},
  {id:103, author:"freelance_journo",ini:"FJ",color:"#0a3020", body:"Local contacts describing significant security presence near the port since yesterday evening, corroborating what OSINT channels are picking up.", time:"45m ago", likes:18, replies:12},
];

const ALL_FILTERS = ["ALL","CONFLICT","MARITIME","CYBER","MILITARY","GEOPOLITICS","NUCLEAR","SECURITY"];

// ─── WORLD MAP ───────────────────────────────────────────────────────────────

function WorldMap({ filter, onRegionClick }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [topoData, setTopoData] = useState(null);
  const [dims, setDims] = useState({w:900, h:520});

  const regions = filter === "ALL" ? REGIONS : REGIONS.filter(r => r.tags.includes(filter));

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(([e]) => {
      setDims({w: e.contentRect.width, h: e.contentRect.height});
    });
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  // Load topo once
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(setTopoData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const {w, h} = dims;
    const proj = d3.geoNaturalEarth1().scale(w / 6.5).translate([w/2, h/2]);
    const path = d3.geoPath().projection(proj);

    // Ocean
    svg.append("path")
      .datum({type:"Sphere"})
      .attr("d", path)
      .attr("fill", "#04090f");

    // Graticule
    const graticule = d3.geoGraticule();
    svg.append("path")
      .datum(graticule())
      .attr("d", path)
      .attr("fill","none")
      .attr("stroke","#111d28")
      .attr("stroke-width", 0.5);

    // Countries
    if (topoData && window.topojson) {
      const countries = window.topojson.feature(topoData, topoData.objects.countries);
      svg.append("g")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("d", path)
        .attr("fill", "#0c1a26")
        .attr("stroke", "#162333")
        .attr("stroke-width", 0.5)
        .attr("stroke-linejoin", "round");
    }

    // Sphere border
    svg.append("path")
      .datum({type:"Sphere"})
      .attr("d", path)
      .attr("fill","none")
      .attr("stroke","#1e2d3d")
      .attr("stroke-width", 1);

    // ─── HOTSPOT BUBBLES ─────────────────────────────────────────────────────
    const maxC = d3.max(regions, d => d.count) || 1;
    const rScale = d3.scaleSqrt().domain([1, maxC]).range([9, 48]);
    const g = svg.append("g");

    regions.forEach(reg => {
      const [cx, cy] = proj([reg.lng, reg.lat]);
      if (cx == null || isNaN(cx)) return;
      const r = rScale(reg.count);

      // Animated rings for breaking events
      if (reg.breaking) {
        [0, 0.7, 1.4].forEach((delay, i) => {
          const ring = g.append("circle")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", r)
            .attr("fill","none")
            .attr("stroke", reg.color)
            .attr("stroke-width", 1.5 - i * 0.4)
            .attr("pointer-events","none");

          function animateRing() {
            ring
              .attr("r", r).attr("opacity", 0.7)
              .transition().duration(2000).delay(delay * 1000)
              .ease(d3.easeCubicOut)
              .attr("r", r * 2.6)
              .attr("opacity", 0)
              .on("end", animateRing);
          }
          animateRing();
        });
      }

      // Glow / halo
      g.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r + 4)
        .attr("fill", reg.color).attr("fill-opacity", 0.06)
        .attr("pointer-events","none");

      // Main bubble
      const circle = g.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r)
        .attr("fill", reg.color)
        .attr("fill-opacity", reg.breaking ? 0.38 : 0.22)
        .attr("stroke", reg.color)
        .attr("stroke-width", reg.breaking ? 2 : 1.3)
        .attr("stroke-opacity", 0.85)
        .style("cursor", "pointer");

      // Count text
      g.append("text")
        .attr("x", cx).attr("y", cy + 1)
        .attr("text-anchor","middle").attr("dominant-baseline","middle")
        .attr("fill", reg.breaking ? "#fff" : "#b8cede")
        .attr("font-size", r > 26 ? 13 : r > 16 ? 10 : 8)
        .attr("font-family","'IBM Plex Mono',monospace")
        .attr("font-weight","700")
        .attr("pointer-events","none")
        .text(reg.count);

      // Label
      if (r >= 18) {
        g.append("text")
          .attr("x", cx).attr("y", cy + r + 11)
          .attr("text-anchor","middle")
          .attr("fill", reg.color).attr("fill-opacity", 0.75)
          .attr("font-size", 7.5)
          .attr("font-family","'IBM Plex Mono',monospace")
          .attr("letter-spacing","0.8px")
          .attr("pointer-events","none")
          .text(reg.name.toUpperCase());
      }

      // Interactions
      circle
        .on("mouseover", function(event) {
          d3.select(this).attr("fill-opacity", 0.6).attr("r", r * 1.1);
          setTooltip({ reg, mx: event.clientX, my: event.clientY });
        })
        .on("mousemove", function(event) {
          setTooltip(prev => prev ? {...prev, mx: event.clientX, my: event.clientY} : null);
        })
        .on("mouseout", function() {
          d3.select(this).attr("fill-opacity", reg.breaking ? 0.38 : 0.22).attr("r", r);
          setTooltip(null);
        })
        .on("click", () => { onRegionClick(reg); });
    });

  }, [dims, regions, topoData]);

  // Inject topojson script once
  useEffect(() => {
    if (!window.topojson) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
      s.onload = () => setDims(d => ({...d})); // re-trigger map draw
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div ref={wrapRef} className="map-body">
      <svg ref={svgRef} className="map-svg" />
      {tooltip && (
        <div className="tooltip-box" style={{left: tooltip.mx + 14, top: tooltip.my - 60}}>
          <div className="tt-region">{tooltip.reg.name.toUpperCase()}</div>
          <div className="tt-count">{tooltip.reg.count}</div>
          <div style={{fontSize:9,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:4}}>
            active events in this region
          </div>
          {tooltip.reg.breaking && (
            <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--accent2)",letterSpacing:1,marginBottom:4}}>⚑ BREAKING EVENT</div>
          )}
          <div className="tt-tags">
            {tooltip.reg.tags.map(t => <span key={t} className="tt-tag">{t}</span>)}
          </div>
          <div className="tt-hint">Click to view details →</div>
        </div>
      )}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [nav, setNav] = useState("feed");
  const [tab, setTab] = useState("intel");
  const [story, setStory] = useState(STORIES[0]);
  const [showApply, setShowApply] = useState(false);
  const [applied, setApplied] = useState(false);
  const [mf, setMf] = useState("ALL");
  const [selRegion, setSelRegion] = useState(null);
  const [form, setForm] = useState({channel:"",handle:"",portfolio:"",why:""});

  const doApply = () => { setApplied(true); setTimeout(() => { setShowApply(false); setApplied(false); }, 2000); };
  const totalEv = REGIONS.reduce((a,r) => a+r.count, 0);
  const breakZones = REGIONS.filter(r => r.breaking).length;
  const hottest = REGIONS.reduce((a,b) => a.count > b.count ? a : b);

  const navItems = [
    {id:"feed",  label:"Intel Feed",       icon:"◈", section:"Feed"},
    {id:"trending",label:"Trending",       icon:"↑", badge:"12"},
    {id:"map",   label:"Event Map",        icon:"◉"},
    {id:"__sep"},
    {id:"verified",label:"Verified Sources",icon:"◆",badge:"47",bc:"green",section:"OSINT Channels"},
    {id:"pending", label:"Under Review",   icon:"◇"},
    {id:"apply",   label:"Apply to Join",  icon:"⊕"},
    {id:"__sep2"},
    {id:"profile", label:"My Profile",     icon:"○", section:"Account"},
    {id:"settings",label:"Settings",       icon:"≡"},
  ];

  return (
    <>
      <style>{FONTS + styles}</style>
      <div className="app">

        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="logo">
            <div className="logo-icon">⬡</div>
            <div>
              <div className="logo-text">SIGINT</div>
              <div className="logo-sub">OPEN SOURCE INTEL NETWORK</div>
            </div>
          </div>
          <div className="nav">
            {navItems.map((n,i) => {
              if (n.id.startsWith("__sep")) return <div key={n.id} style={{height:8}} />;
              return (
                <span key={n.id}>
                  {n.section && <div className="nav-section">{n.section}</div>}
                  <div
                    className={`nav-item ${nav===n.id?"active":""}`}
                    onClick={() => {
                      setNav(n.id);
                      if (n.id === "apply") setShowApply(true);
                    }}
                  >
                    <span style={{fontSize:12}}>{n.icon}</span> {n.label}
                    {n.badge && <span className={`nav-badge ${n.bc||""}`}>{n.badge}</span>}
                  </div>
                </span>
              );
            })}
          </div>
          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="avatar">JD</div>
              <div>
                <div className="user-name">John Doe</div>
                <div className="user-role">PUBLIC_USER</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          <div className="topbar">
            <span className="topbar-title">
              {nav==="map"?"Event Map":nav==="trending"?"Trending":"Intel Feed"}
            </span>
            <div className="live-indicator"><div className="live-dot" />LIVE</div>
            <span style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)"}}>
              {nav==="map"
                ? `${REGIONS.length} regions · ${totalEv} tracked events`
                : `${STORIES.length} stories · ${STORIES.reduce((a,s)=>a+s.sources.length,0)} verified posts`}
            </span>
            <div className="ml-auto">
              <button className="topbar-btn" onClick={() => setShowApply(true)}>Apply as OSINT Channel</button>
            </div>
          </div>

          {/* ══ MAP VIEW ══ */}
          {nav === "map" && (
            <div className="map-wrap">
              <div className="map-filters">
                <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",letterSpacing:2,whiteSpace:"nowrap"}}>FILTER BY:</span>
                {ALL_FILTERS.map(f => (
                  <button key={f} className={`mf-btn ${mf===f?"on":""}`} onClick={() => { setMf(f); setSelRegion(null); }}>{f}</button>
                ))}
                <div className="ml-auto" style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div className="leg-row"><div className="leg-dot" style={{width:8,height:8,background:"#ff6b35",opacity:0.8}} />Breaking</div>
                  <div className="leg-row"><div className="leg-dot" style={{width:8,height:8,background:"#ffcc00",opacity:0.8}} />Active</div>
                  <div className="leg-row"><div className="leg-dot" style={{width:8,height:8,background:"#00d4ff",opacity:0.8}} />Monitoring</div>
                  <div className="leg-row" style={{gap:4}}>
                    <div style={{width:12,height:12,borderRadius:"50%",border:"1.5px solid #ff6b35",opacity:0.5}} />
                    Ripple = breaking
                  </div>
                </div>
              </div>

              <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <WorldMap filter={mf} onRegionClick={r => setSelRegion(prev => prev?.id===r.id ? null : r)} />

                {/* Stat cards */}
                <div className="map-stats-box">
                  <div className="stat-card">
                    <div className="stat-label">Total Events</div>
                    <div className="stat-val" style={{color:"var(--accent)"}}>{totalEv}</div>
                    <div className="stat-sub">{REGIONS.length} active regions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Breaking Zones</div>
                    <div className="stat-val" style={{color:"var(--accent2)"}}>{breakZones}</div>
                    <div className="stat-sub">live right now</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Hottest Region</div>
                    <div className="stat-val" style={{fontSize:11,lineHeight:1.3,color:"var(--warn)",marginTop:3}}>{hottest.name}</div>
                    <div className="stat-sub">{hottest.count} events</div>
                  </div>
                </div>

                {/* Region detail pop-up */}
                {selRegion && (
                  <div className="region-panel">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      {selRegion.breaking && <span className="breaking-tag">BREAKING</span>}
                      <span style={{fontFamily:"var(--mono)",fontSize:11,color:selRegion.color,fontWeight:600}}>{selRegion.name.toUpperCase()}</span>
                      <button onClick={()=>setSelRegion(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      <div style={{flex:1,background:"var(--surface)",borderRadius:4,padding:"8px 10px",border:"1px solid var(--border)"}}>
                        <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",letterSpacing:1,marginBottom:2}}>EVENTS</div>
                        <div style={{fontFamily:"var(--mono)",fontSize:22,fontWeight:700,color:selRegion.color}}>{selRegion.count}</div>
                      </div>
                      <div style={{flex:2,background:"var(--surface)",borderRadius:4,padding:"8px 10px",border:"1px solid var(--border)"}}>
                        <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",letterSpacing:1,marginBottom:5}}>CATEGORIES</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {selRegion.tags.map(t=><span key={t} className="story-tag">{t}</span>)}
                        </div>
                      </div>
                    </div>
                    {STORIES.filter(s=>s.region===selRegion.id).length > 0 ? (
                      <>
                        <div style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:2,color:"var(--muted)",marginBottom:6}}>LINKED INTEL STORIES</div>
                        {STORIES.filter(s=>s.region===selRegion.id).map(s=>(
                          <div key={s.id}
                            style={{padding:"8px 10px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:4,marginBottom:6,cursor:"pointer",fontSize:11,lineHeight:1.4,color:"var(--text)"}}
                            onClick={()=>{setStory(s);setNav("feed");}}>
                            {s.breaking && <span className="breaking-tag" style={{fontSize:7,marginRight:5}}>BREAKING</span>}
                            {s.headline}
                            <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",marginTop:4}}>
                              {s.sources.length} source{s.sources.length!==1?"s":""} · {s.time}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)"}}>No linked intel stories yet for this region.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ FEED VIEW ══ */}
          {nav !== "map" && (
            <div className="feed-layout">
              {/* Left panel */}
              <div className="intel-feed">
                <div className="tabs">
                  <div className={`tab ${tab==="intel"?"active":""}`} onClick={()=>setTab("intel")}>Intel Stories</div>
                  <div className={`tab ${tab==="general"?"active":""}`} onClick={()=>setTab("general")}>General</div>
                </div>

                {tab==="intel" && <>
                  <div className="section-header">
                    <span className="section-label">⬡ Multi-Source Stories</span>
                    <span className="count-badge">{STORIES.length} threads</span>
                  </div>
                  {STORIES.map(s => (
                    <div key={s.id} className={`story-card ${s.breaking?"breaking":""} ${story?.id===s.id?"active":""}`} onClick={()=>setStory(s)}>
                      <div className="story-meta">
                        {s.breaking && <span className="breaking-tag">BREAKING</span>}
                        <span className="story-tag">{s.tag}</span>
                        <span className="story-time">{s.time}</span>
                      </div>
                      <div className="story-headline">{s.headline}</div>
                      <div className="story-sources">
                        {s.sources.map((src,i)=>(
                          <div key={i} className="source-chip"><div className="vdot"/>{src.name}</div>
                        ))}
                        <span style={{fontSize:9,color:s.sources.length===1?"var(--warn)":"var(--muted)",fontFamily:"var(--mono)"}}>
                          {s.sources.length===1?"⚠ 1 source":`${s.sources.length} sources`}
                        </span>
                      </div>
                    </div>
                  ))}
                </>}

                {tab==="general" && <>
                  <div className="section-header"><span className="section-label">Public Discussion</span></div>
                  <div style={{padding:"10px 16px 6px",borderBottom:"1px solid var(--border)"}}>
                    <textarea placeholder="Share your thoughts, analysis, or open-source finds..." style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:4,padding:"10px 12px",color:"var(--text)",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,resize:"none",height:66,outline:"none"}} />
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
                      <button className="topbar-btn primary" style={{fontSize:10,padding:"4px 12px"}}>Post</button>
                    </div>
                  </div>
                  {GENERAL.map(p => (
                    <div key={p.id} className="post-card">
                      <div className="post-header">
                        <div className="post-avatar" style={{background:p.color}}>{p.ini}</div>
                        <div><div className="post-author">{p.author}</div><div className="post-handle">@{p.author}</div></div>
                        <div className="post-time">{p.time}</div>
                      </div>
                      <div className="post-body">{p.body}</div>
                      <div className="post-actions">
                        <span className="post-action">↩ {p.replies}</span>
                        <span className="post-action">♡ {p.likes}</span>
                        <span className="post-action">↗ Share</span>
                      </div>
                    </div>
                  ))}
                </>}
              </div>

              {/* Right detail */}
              {story ? (
                <div className="detail-panel">
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                    {story.breaking && <span className="breaking-tag">BREAKING</span>}
                    <span className="story-tag">{story.tag}</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)"}}>First reported {story.time}</span>
                    <button
                      onClick={()=>setNav("map")}
                      style={{marginLeft:"auto",background:"transparent",border:"1px solid var(--border)",borderRadius:3,padding:"3px 9px",fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",cursor:"pointer",letterSpacing:1}}
                    >◉ VIEW ON MAP</button>
                  </div>
                  <div className="detail-headline">{story.headline}</div>
                  <div className="conf-bar">
                    <span className="conf-label">CONFIDENCE</span>
                    <div className="conf-track"><div className="conf-fill" style={{width:`${story.confidence}%`}} /></div>
                    <span className="conf-val">{story.confidence}%</span>
                  </div>
                  <div className="tl-bar">
                    {story.sources.map((s,i) => (
                      <span key={i} style={{display:"contents"}}>
                        {i>0 && <span className="tl-arrow">→</span>}
                        <div className={`tl-event ${i===0?"first":""}`}>
                          {i===0?"⚑ FIRST: ":`+${s.t.replace("T+","")}: `}{s.name}
                        </div>
                      </span>
                    ))}
                  </div>
                  <div className="detail-summary" style={{marginTop:16}}>
                    <div className="detail-summary-label">◈ AI-SYNTHESISED SUMMARY</div>
                    {story.summary}
                  </div>
                  <div className="src-title">{story.sources.length} Verified Source{story.sources.length!==1?"s":""}</div>
                  {story.sources.map((s,i) => (
                    <div key={i} className="source-post">
                      <div className="source-post-hd">
                        <div className="post-avatar" style={{background:s.av,width:36,height:36,fontSize:12}}>{s.ini}</div>
                        <div><div className="source-name">{s.name}</div><div className="source-handle">{s.handle}</div></div>
                        <div className="score-badge">◆ {s.score} / 100</div>
                      </div>
                      <div className="source-post-body">{s.body}</div>
                      <div className="source-post-time">
                        {s.first && <span className="first-report">⚑ First to report</span>}
                        <span>{s.t==="T+0"?"First post":`Posted ${s.t} after breaking`}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{height:32}} />
                </div>
              ) : (
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"var(--muted)",gap:12}}>
                  <div style={{fontSize:40,opacity:0.25}}>◈</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,letterSpacing:1}}>Select a story</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── APPLY MODAL ── */}
      {showApply && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowApply(false)}>
          <div className="modal">
            {applied ? (
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:40,marginBottom:12,color:"var(--verified)"}}>◆</div>
                <div style={{fontFamily:"var(--mono)",color:"var(--verified)",fontSize:14,marginBottom:8}}>APPLICATION SUBMITTED</div>
                <div style={{fontSize:12,color:"var(--muted)"}}>Your application is under review. You'll be notified within 72 hours.</div>
              </div>
            ) : <>
              <div className="modal-title">◈ Apply for OSINT Channel Status</div>
              <div className="modal-sub">Verified OSINT channels gain exclusive access to post in the Intel Stories section. Applications are evaluated on a rolling basis.</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--accent)",letterSpacing:2,marginBottom:8}}>EVALUATION CRITERIA</div>
              <div className="crit-list">
                {[["◆","Accuracy Score","Historical post accuracy, weighted by severity"],["⚑","Breaking Speed","Time-to-first-report vs other sources"],["◉","Source Quality","Evidence grade: satellite, AIS, intercepts, human OSINT"],["▣","Track Record","90+ days active, 50+ verified posts minimum"]].map(([ic,lbl,txt],i)=>(
                  <div key={i} className="crit-item">
                    <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)"}}>{ic}</span>
                    <div><strong style={{color:"var(--text)",fontSize:11}}>{lbl}</strong><br/>{txt}</div>
                  </div>
                ))}
              </div>
              {[["Channel / Organization Name","e.g. AltitudeSentinel","channel","text"],["Primary Handle / Account","@yourhandle","handle","text"]].map(([lbl,ph,k])=>(
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <input className="form-input" placeholder={ph} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
              {[["Portfolio / Past Work","Link to notable OSINT threads or published analyses...","portfolio"],["Why should you be approved?","Describe your methodology, sourcing, and coverage areas...","why"]].map(([lbl,ph,k])=>(
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <textarea className="form-input form-ta" placeholder={ph} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
              <div className="modal-actions">
                <button className="btn" onClick={()=>setShowApply(false)}>Cancel</button>
                <button className="btn primary" onClick={doApply}>Submit Application</button>
              </div>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
