import { useUser } from '../hooks/useUser'
import { useRegions } from '../hooks/useRegions'
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../api/supabase'
import GeneralFeed from '../components/feed/GeneralFeed'
import { useNavigate } from 'react-router-dom'
import { useStories } from '../hooks/useStories'
import StoryList from '../components/feed/StoryList'
import { useFollow } from '../hooks/useFollow'
import { useNotifications } from '../hooks/useNotifications'
import NotificationPanel from '../components/NotificationPanel'
import { useMessages } from '../hooks/useMessages'
import StoryComposer from '../components/StoryComposer'
import { useIsMobile } from '../hooks/useIsMobile'
import { useClaims } from '../hooks/useClaims'

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
  .sidebar { width: 220px; min-width: 220px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: transform 0.25s ease; }
  .sidebar.mobile-hidden { transform: translateX(-100%); }

  /* Mobile sidebar overlay */
  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 998; backdrop-filter: blur(2px); }
  .sidebar-overlay.visible { display: block; }

  /* Mobile sidebar */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed; top: 0; left: 0; bottom: 0;
      z-index: 999; transform: translateX(-100%);
    }
    .sidebar.mobile-open { transform: translateX(0); }
    .main { width: 100vw !important; }
  }

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
  .nav-badge.orange { background: var(--accent2); }
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
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes flashTag { 0%,100%{opacity:1} 50%{opacity:0.6} }
  .ml-auto { margin-left: auto; }
  .topbar-btn { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: var(--mono); letter-spacing: 0.5px; border: 1px solid var(--accent); color: var(--accent); background: transparent; transition: all 0.15s; white-space: nowrap; }
  .topbar-btn:hover { background: rgba(0,212,255,0.1); }
  .topbar-btn.primary { background: var(--accent); color: #000; font-weight: 600; }
  .feed-layout { flex: 1; display: flex; overflow: hidden; min-height: 0; }
  .intel-feed { width: 360px; min-width: 360px; border-right: 1px solid var(--border); overflow-y: auto; background: var(--bg); }
  .intel-feed::-webkit-scrollbar { width: 3px; }
  .intel-feed::-webkit-scrollbar-thumb { background: var(--border); }

  /* Mobile feed layout */
  @media (max-width: 768px) {
    .intel-feed { width: 100%; min-width: unset; border-right: none; }
    .feed-layout { flex-direction: column; }
    .detail-panel-wrap { display: none; }
    .detail-panel-wrap.mobile-visible { display: flex; flex: 1; overflow-y: auto; }
    .topbar-title { font-size: 11px; }
    .topbar { padding: 0 12px; gap: 8px; }
  }

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
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:200; padding: 16px; }
  .modal { background:var(--surface); border:1px solid var(--border); border-radius:8px; width:480px; max-width: 100%; max-height:80vh; overflow-y:auto; padding:24px; }
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
  .map-filters { padding:8px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:var(--surface); flex-shrink:0; overflow-x: auto; }
  .mf-btn { padding:3px 10px; border-radius:3px; font-family:var(--mono); font-size:9px; letter-spacing:1px; border:1px solid var(--border); color:var(--muted); background:transparent; cursor:pointer; transition:all 0.15s; white-space: nowrap; }
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
  .region-panel { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); width:360px; max-width: calc(100vw - 32px); background:rgba(13,18,25,0.97); border:1px solid var(--border); border-radius:8px; padding:14px; backdrop-filter:blur(12px); }
  .tooltip-box { position:fixed; pointer-events:none; background:rgba(10,16,24,0.97); border:1px solid var(--border); border-radius:6px; padding:9px 13px; min-width:180px; max-width:260px; font-size:11px; z-index:999; box-shadow:0 8px 32px rgba(0,0,0,0.6); }
  .tt-region { font-family:var(--mono); font-size:9px; color:var(--accent); margin-bottom:3px; letter-spacing:1px; }
  .tt-count { font-size:20px; font-weight:700; color:var(--text); margin-bottom:4px; font-family:var(--mono); }
  .tt-tags { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:4px; }
  .tt-tag { padding:1px 5px; border-radius:2px; border:1px solid var(--border); font-family:var(--mono); font-size:8px; color:var(--muted); }
  .tt-hint { font-size:9px; color:var(--muted); font-family:var(--mono); margin-top:4px; }

  /* BOTTOM NAV (mobile only) */
  .bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 56px; background: var(--surface);
    border-top: 1px solid var(--border);
    z-index: 997;
    align-items: center; justify-content: space-around;
    padding: 0 4px;
  }
  @media (max-width: 768px) {
    .bottom-nav { display: flex; }
    .main { padding-bottom: 56px; }
    .map-stats-box { display: none; }
  }
  .bn-item {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; flex: 1; padding: 6px 0; cursor: pointer;
    font-family: var(--mono); font-size: 8px; color: var(--muted);
    border: none; background: none; transition: color 0.15s;
    position: relative;
  }
  .bn-item.active { color: var(--accent); }
  .bn-item-icon { font-size: 16px; line-height: 1; }
  .bn-badge {
    position: absolute; top: 4px; right: calc(50% - 14px);
    background: var(--accent2); color: white;
    font-size: 8px; font-family: var(--mono);
    padding: 1px 4px; border-radius: 8px; min-width: 14px;
    text-align: center;
  }

  /* Hamburger button */
  .hamburger {
    display: none; background: none; border: none;
    cursor: pointer; padding: 6px; color: var(--muted);
    font-size: 18px; line-height: 1; flex-shrink: 0;
  }
  @media (max-width: 768px) {
    .hamburger { display: flex; align-items: center; }
    .topbar-stats { display: none; }
  }

  /* Mobile detail back button */
  .mobile-back {
    display: none; align-items: center; gap: 8px;
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    background: var(--surface); cursor: pointer;
    font-family: var(--mono); font-size: 10px; color: var(--accent);
    letter-spacing: 1px; flex-shrink: 0;
  }
  @media (max-width: 768px) {
    .mobile-back { display: flex; }
  }
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

const ALL_FILTERS = ["ALL","CONFLICT","MARITIME","CYBER","MILITARY","GEOPOLITICS","NUCLEAR","SECURITY"];
const CLAIM_STYLE = {
  open:       { color: '#ff9f43', label: '⚑ OPEN CLAIM',  bg: 'rgba(255,159,67,0.08)'  },
  verified:   { color: '#00ff88', label: '✓ VERIFIED',    bg: 'rgba(0,255,136,0.08)'   },
  false:      { color: '#ff4757', label: '✗ FALSE',       bg: 'rgba(255,71,87,0.08)'   },
  developing: { color: '#00d4ff', label: '◎ DEVELOPING',  bg: 'rgba(0,212,255,0.08)'   },
  reversed:   { color: '#ffd32a', label: '⟳ REVERSED',   bg: 'rgba(255,211,42,0.08)'  },
}

function EditNoteSection({ userNote, updateNote, deleteNote }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(userNote.body)
  const [stance, setStance] = useState(userNote.stance)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!body.trim()) return
    setSaving(true)
    await updateNote(userNote.id, body.trim(), stance)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm('Delete your note? This cannot be undone.')) return
    setDeleting(true)
    await deleteNote(userNote.id)
    setDeleting(false)
  }

  if (!editing) return (
    <div style={{ padding:'12px 14px', background:'rgba(0,255,136,0.04)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:1, color:'var(--muted)' }}>YOUR NOTE</span>
        <span style={{
          padding:'2px 8px', borderRadius:3, fontFamily:'var(--mono)', fontSize:9,
          background: userNote.stance === 'challenges' ? 'rgba(255,71,87,0.12)' : 'rgba(0,255,136,0.1)',
          color: userNote.stance === 'challenges' ? '#ff4757' : 'var(--verified)'
        }}>
          {userNote.stance === 'challenges' ? '⚑ CHALLENGING' : '✓ SUPPORTING'}
        </span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={() => setEditing(true)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:9, cursor:'pointer' }}>EDIT</button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding:'4px 10px', background:'transparent', border:'1px solid #ff4757', color:'#ff4757', borderRadius:4, fontFamily:'var(--mono)', fontSize:9, cursor:'pointer', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? '...' : 'DELETE'}
          </button>
        </div>
      </div>
      <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{userNote.body}</div>
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:10 }}>EDIT YOUR NOTE</div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {['challenges','supports'].map(s => (
          <button key={s} onClick={() => setStance(s)} style={{
            flex:1, padding:'8px 0',
            background: stance===s ? (s==='challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)') : 'transparent',
            border:`1px solid ${stance===s ? (s==='challenges' ? '#ff4757' : 'var(--verified)') : 'var(--border)'}`,
            borderRadius:4, fontFamily:'var(--mono)', fontSize:10,
            color: stance===s ? (s==='challenges' ? '#ff4757' : 'var(--verified)') : 'var(--muted)',
            cursor:'pointer', letterSpacing:1
          }}>
            {s==='challenges' ? '⚑ CHALLENGES' : '✓ SUPPORTS'}
          </button>
        ))}
      </div>
      <textarea
        value={body} onChange={e => setBody(e.target.value)}
        maxLength={500} rows={3}
        style={{ width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'10px 12px', color:'var(--text)', fontFamily:'IBM Plex Sans, sans-serif', fontSize:12, resize:'none', outline:'none', boxSizing:'border-box', marginBottom:8 }}
        onFocus={e => e.target.style.borderColor='var(--accent)'}
        onBlur={e => e.target.style.borderColor='var(--border)'}
      />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button onClick={() => setEditing(false)} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer' }}>CANCEL</button>
        <button onClick={handleSave} disabled={!body.trim() || saving} style={{
          padding:'7px 16px',
          background: stance==='challenges' ? '#ff4757' : 'var(--verified)',
          color:'#000', border:'none', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
          cursor: !body.trim() || saving ? 'not-allowed' : 'pointer',
          opacity: !body.trim() || saving ? 0.5 : 1, letterSpacing:1
        }}>
          {saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>
    </div>
  )
}
function SourceNoteButton({ post, user }) {
  const [open, setOpen] = useState(false)
  const { claim, notes, userNote, claimVisible, challengeWeight, supportWeight, submitNote, updateNote, deleteNote } = useClaims(post?.id)
  const [stance, setStance] = useState('challenges')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  if (!post?.id) return null

  const cs = claim ? CLAIM_STYLE[claim.status] : null

  async function handleSubmit() {
    if (!body.trim()) return
    setSubmitting(true)
    const { error } = await submitNote(body.trim(), stance)
    if (error) setErr(typeof error === 'string' ? error : error.message)
    else setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <>
      {/* Claim badge inline */}
      {claimVisible && claim && cs && (
        <div style={{
          display:'inline-flex', alignItems:'center', gap:5,
          padding:'2px 8px', borderRadius:4, marginTop:8,
          background: cs.bg, border:`1px solid ${cs.color}33`
        }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:cs.color, letterSpacing:1 }}>
            {cs.label}
          </span>
          {claim.resolution_note && (
            <span style={{ fontSize:10, color:'var(--muted)', marginLeft:4 }}>— {claim.resolution_note}</span>
          )}
        </div>
      )}

      {/* Note button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background:'none', border:'1px solid var(--border)', borderRadius:4,
          padding:'3px 10px', fontFamily:'var(--mono)', fontSize:9,
          color:'var(--muted)', cursor:'pointer', letterSpacing:1,
          marginTop:8, transition:'all 0.15s'
        }}
        onMouseOver={e => { e.currentTarget.style.color='#ff9f43'; e.currentTarget.style.borderColor='#ff9f43' }}
        onMouseOut={e => { e.currentTarget.style.color='var(--muted)'; e.currentTarget.style.borderColor='var(--border)' }}
      >
        ⚑ NOTE {notes.length > 0 && `(${notes.length})`}
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000
        }} onClick={() => setOpen(false)}>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, padding:24, width:500, maxWidth:'92vw',
            maxHeight:'85vh', overflowY:'auto'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:2, color:'var(--accent)' }}>COMMUNITY NOTES</div>
              <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:18 }}>×</button>
            </div>

            {/* Post preview */}
            <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:12, marginBottom:16 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginBottom:6 }}>
                {post.users?.username || post.name || 'Unknown'}
              </div>
              <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
                {(post.body || '').length > 200 ? (post.body || '').slice(0, 200) + '…' : (post.body || '')}
              </div>
            </div>

            {/* Claim status */}
            {claimVisible && claim && cs && (
              <div style={{
                padding:'8px 12px', borderRadius:6, marginBottom:16,
                background: cs.bg, border:`1px solid ${cs.color}22`
              }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:cs.color }}>
                  {cs.label}
                </span>
                {claim.resolution_note && (
                  <span style={{ fontSize:11, color:'var(--muted)', marginLeft:8 }}>— {claim.resolution_note}</span>
                )}
              </div>
            )}

            {/* Weights */}
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <div style={{ flex:1, padding:'8px 12px', background:'rgba(255,71,87,0.06)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:10, color:'#ff4757', textAlign:'center' }}>
                ⚑ CHALLENGING<br/>
                <span style={{ fontSize:18, fontWeight:700 }}>{challengeWeight}</span>
              </div>
              <div style={{ flex:1, padding:'8px 12px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:10, color:'var(--verified)', textAlign:'center' }}>
                ✓ SUPPORTING<br/>
                <span style={{ fontSize:18, fontWeight:700 }}>{supportWeight}</span>
              </div>
            </div>

            {/* Existing notes */}
            {notes.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:8 }}>NOTES ({notes.length})</div>
                {notes.map(n => (
                  <div key={n.id} style={{
                    padding:'10px 12px', marginBottom:8, background:'var(--bg)', borderRadius:6,
                    border:`1px solid ${n.stance==='challenges' ? 'rgba(255,71,87,0.25)' : 'rgba(0,255,136,0.2)'}`
                  }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color: n.users?.role==='osint' ? 'var(--verified)' : 'var(--text)' }}>
                        {n.users?.username || 'Unknown'}
                        {n.users?.role==='osint' && <span style={{ color:'var(--verified)', marginLeft:3 }}>◆</span>}
                      </span>
                      <span style={{
                        fontFamily:'var(--mono)', fontSize:8, padding:'1px 6px', borderRadius:3,
                        background: n.stance==='challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)',
                        color: n.stance==='challenges' ? '#ff4757' : 'var(--verified)'
                      }}>
                        {n.stance==='challenges' ? '⚑ CHALLENGING' : '✓ SUPPORTING'}
                      </span>
                      {n.accuracy_rating && (
                        <span style={{
                          fontFamily:'var(--mono)', fontSize:8, padding:'1px 6px', borderRadius:3,
                          background: n.accuracy_rating==='accurate' ? 'rgba(0,255,136,0.12)' : 'rgba(255,71,87,0.15)',
                          color: n.accuracy_rating==='accurate' ? 'var(--verified)' : '#ff4757'
                        }}>
                          {n.accuracy_rating==='accurate' ? '✓ RATED ACCURATE' : '✗ RATED INACCURATE'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{n.body}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Write note */}
            {!submitted && !userNote ? (
              <div>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:10 }}>WRITE A NOTE</div>
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  {['challenges','supports'].map(s => (
                    <button key={s} onClick={() => setStance(s)} style={{
                      flex:1, padding:'8px 0',
                      background: stance===s ? (s==='challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)') : 'transparent',
                      border:`1px solid ${stance===s ? (s==='challenges' ? '#ff4757' : 'var(--verified)') : 'var(--border)'}`,
                      borderRadius:4, fontFamily:'var(--mono)', fontSize:10,
                      color: stance===s ? (s==='challenges' ? '#ff4757' : 'var(--verified)') : 'var(--muted)',
                      cursor:'pointer', letterSpacing:1
                    }}>
                      {s==='challenges' ? '⚑ CHALLENGES' : '✓ SUPPORTS'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={body} onChange={e => { setBody(e.target.value); setErr('') }}
                  placeholder={stance==='challenges' ? 'Explain why this claim is inaccurate...' : 'Provide corroboration or context...'}
                  maxLength={500} rows={3}
                  style={{
                    width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
                    borderRadius:6, padding:'10px 12px', color:'var(--text)',
                    fontFamily:'IBM Plex Sans, sans-serif', fontSize:12,
                    resize:'none', outline:'none', boxSizing:'border-box', marginBottom:8
                  }}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border)'}
                />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>
                    {body.length}/500
                    {err && <span style={{ color:'var(--accent2)', marginLeft:8 }}>⚠ {err}</span>}
                  </span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setOpen(false)} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer' }}>CANCEL</button>
                    <button onClick={handleSubmit} disabled={!body.trim() || submitting} style={{
                      padding:'7px 16px',
                      background: stance==='challenges' ? '#ff4757' : 'var(--verified)',
                      color:'#000', border:'none', borderRadius:4,
                      fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
                      cursor: !body.trim() || submitting ? 'not-allowed' : 'pointer',
                      opacity: !body.trim() || submitting ? 0.5 : 1, letterSpacing:1
                    }}>
                      {submitting ? '...' : 'SUBMIT NOTE'}
                    </button>
                  </div>
                </div>
              </div>
            ) : userNote && !submitted ? (
              <EditNoteSection userNote={userNote} updateNote={updateNote} deleteNote={deleteNote} />
            ) : (
              <div style={{ padding:'12px 16px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:6, fontFamily:'var(--mono)', fontSize:11, color:'var(--verified)', textAlign:'center' }}>
                ✓ Your note has been submitted
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── WORLD MAP ───────────────────────────────────────────────────────────────
function WorldMap({ filter, onRegionClick, regions: propRegions }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [topoData, setTopoData] = useState(null);
  const [dims, setDims] = useState({w:900, h:520});
  const rotationRef = useRef([-20, -30, 0]);
  const isDragging = useRef(false);
  const lastPos = useRef(null);
  const animFrameRef = useRef(null);
  const projRef = useRef(null);
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)

  const allRegions = propRegions || REGIONS;
  const regions = filter === "ALL" ? allRegions : allRegions.filter(r => r.tags.includes(filter));


  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
  
    function onWheel(e) {
      e.preventDefault()
      zoomRef.current = Math.max(0.5, Math.min(4, zoomRef.current - e.deltaY * 0.001))
      setZoom(zoomRef.current)
    }
  
    // Pinch zoom for mobile
    let lastDist = null
    function onTouchMove(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (lastDist !== null) {
          zoomRef.current = Math.max(0.5, Math.min(4, zoomRef.current + (dist - lastDist) * 0.005))
          setZoom(zoomRef.current)
        }
        lastDist = dist
      }
    }
    function onTouchEnd() { lastDist = null }
  
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    const obs = new ResizeObserver(([e]) => setDims({w: e.contentRect.width, h: e.contentRect.height}));
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json()).then(setTopoData).catch(() => {});
  }, []);

  useEffect(() => {
    if (!window.topojson) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
      s.onload = () => setDims(d => ({...d}));
      document.head.appendChild(s);
    }
  }, []);

  // Auto-rotation
  useEffect(() => {
    let lastTime = null;
    function autoRotate(time) {
      if (!isDragging.current) {
        if (lastTime !== null) {
          const delta = time - lastTime;
          rotationRef.current = [rotationRef.current[0] + delta * 0.01, rotationRef.current[1], 0];
        }
        lastTime = time;
        drawGlobe();
      } else {
        lastTime = null;
      }
      animFrameRef.current = requestAnimationFrame(autoRotate);
    }
    animFrameRef.current = requestAnimationFrame(autoRotate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dims, regions, topoData]);

  function drawGlobe() {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const {w, h} = dims;
    const r = (Math.min(w, h) / 2 - 20) * zoomRef.current;
    const proj = d3.geoOrthographic()
      .scale(r)
      .translate([w/2, h/2])
      .rotate(rotationRef.current)
      .clipAngle(90);
    projRef.current = proj;
    const path = d3.geoPath().projection(proj);

    // Outer glow
    const defs = svg.append("defs");
    const radialGrad = defs.append("radialGradient").attr("id","globe-glow")
      .attr("cx","50%").attr("cy","50%").attr("r","50%");
    radialGrad.append("stop").attr("offset","85%").attr("stop-color","#04090f").attr("stop-opacity",1);
    radialGrad.append("stop").attr("offset","100%").attr("stop-color","#00d4ff").attr("stop-opacity",0.15);

    // Globe base
    svg.append("circle").attr("cx",w/2).attr("cy",h/2).attr("r",r+8)
      .attr("fill","url(#globe-glow)").attr("stroke","#1e2d3d").attr("stroke-width",1);
    svg.append("circle").attr("cx",w/2).attr("cy",h/2).attr("r",r)
      .attr("fill","#04090f").attr("stroke","#00d4ff").attr("stroke-width",0.5).attr("stroke-opacity",0.3);

    // Graticule
    svg.append("path").datum(d3.geoGraticule()()).attr("d",path)
      .attr("fill","none").attr("stroke","#0d1e2e").attr("stroke-width",0.5);

    // Countries
    if (topoData && window.topojson) {
      svg.append("g").selectAll("path")
        .data(window.topojson.feature(topoData, topoData.objects.countries).features)
        .join("path").attr("d", path)
        .attr("fill","#0c1a26").attr("stroke","#1a2d40").attr("stroke-width",0.4);
    }

    // Hotspot bubbles
    const maxC = d3.max(regions, d => d.count) || 1;
    const rScale = d3.scaleSqrt().domain([1, maxC]).range([6, 22]);
    const g = svg.append("g");

    regions.forEach(reg => {
      const coords = proj([reg.lng, reg.lat]);
      if (!coords) return;
      // Check if on visible side
      const geoAngle = d3.geoDistance([reg.lng, reg.lat], [-rotationRef.current[0], -rotationRef.current[1]]);
      if (geoAngle > Math.PI / 2) return; // behind globe
      const [cx, cy] = coords;
      const bR = rScale(reg.count);

      if (reg.breaking) {
        const ring = g.append("circle").attr("cx",cx).attr("cy",cy).attr("r",bR)
          .attr("fill","none").attr("stroke",reg.color).attr("stroke-width",1.5).attr("pointer-events","none");
        function animRing() {
          ring.attr("r",bR).attr("opacity",0.8)
            .transition().duration(1800).ease(d3.easeCubicOut)
            .attr("r",bR*2.8).attr("opacity",0).on("end",animRing);
        }
        animRing();
      }

      g.append("circle").attr("cx",cx).attr("cy",cy).attr("r",bR+3)
        .attr("fill",reg.color).attr("fill-opacity",0.06).attr("pointer-events","none");

      const circle = g.append("circle").attr("cx",cx).attr("cy",cy).attr("r",bR)
        .attr("fill",reg.color).attr("fill-opacity",reg.breaking?0.45:0.25)
        .attr("stroke",reg.color).attr("stroke-width",reg.breaking?2:1.2)
        .attr("stroke-opacity",0.9).style("cursor","pointer");

      g.append("text").attr("x",cx).attr("y",cy+1)
        .attr("text-anchor","middle").attr("dominant-baseline","middle")
        .attr("fill","#fff").attr("font-size", bR > 14 ? 10 : 8)
        .attr("font-family","'IBM Plex Mono',monospace").attr("font-weight","700")
        .attr("pointer-events","none").text(reg.count);

      circle
        .on("mouseover", function(event) {
          d3.select(this).attr("fill-opacity",0.7);
          setTooltip({reg, mx:event.clientX, my:event.clientY});
        })
        .on("mousemove", function(event) {
          setTooltip(p => p ? {...p, mx:event.clientX, my:event.clientY} : null);
        })
        .on("mouseout", function() {
          d3.select(this).attr("fill-opacity",reg.breaking?0.45:0.25);
          setTooltip(null);
        })
        .on("click", () => onRegionClick(reg));
    });
   // ── MOON ──────────────────────────────────────────────────────
    // Fixed position in top-right corner, independent of globe size
    const moonX = 80
    const moonY = 80
    const z = zoomRef.current
    const isZoomedIn = z > 1.8
    // Smooth scale — moon grows naturally from dot to full size between zoom 0.5 and 2.5
    const moonScale = Math.max(0, Math.min(1, (z - 0.8) / 1.7))
    const moonR = 4 + moonScale * (r * 0.27 - 4)

    const moonDefs = svg.select("defs")

    // Moon glow
    const moonGlow = moonDefs.append("radialGradient").attr("id","moon-glow")
      .attr("cx","40%").attr("cy","35%").attr("r","60%")
    moonGlow.append("stop").attr("offset","0%").attr("stop-color","#e8dcc8").attr("stop-opacity",1)
    moonGlow.append("stop").attr("offset","60%").attr("stop-color","#b8a882").attr("stop-opacity",1)
    moonGlow.append("stop").attr("offset","100%").attr("stop-color","#6a5a3a").attr("stop-opacity",1)

    // Moon shadow (makes it look 3D)
    const moonShadow = moonDefs.append("radialGradient").attr("id","moon-shadow")
      .attr("cx","70%").attr("cy","50%").attr("r","55%")
    moonShadow.append("stop").attr("offset","0%").attr("stop-color","#000").attr("stop-opacity",0)
    moonShadow.append("stop").attr("offset","100%").attr("stop-color","#000").attr("stop-opacity",0.65)

    // Star-like glow when far
    if (moonScale < 1) {
      svg.append("circle")
        .attr("cx", moonX).attr("cy", moonY).attr("r", moonR + 3)
        .attr("fill", "#e8dcc8").attr("fill-opacity", 0.15 * (1 - moonScale))
        .attr("pointer-events", "none")
    }

    // Moon base
    const moonGroup = svg.append("g").style("cursor", isZoomedIn ? "pointer" : "default")

    moonGroup.append("circle")
      .attr("cx", moonX).attr("cy", moonY).attr("r", moonR)
      .attr("fill", "url(#moon-glow)")

    // 3D shadow overlay
    moonGroup.append("circle")
      .attr("cx", moonX).attr("cy", moonY).attr("r", moonR)
      .attr("fill", "url(#moon-shadow)")
      .attr("pointer-events", "none")

    if (moonScale > 0.5) {
      // Craters
      const craters = [
        {dx:-0.25, dy:-0.1,  r:0.12},
        {dx: 0.1,  dy: 0.2,  r:0.09},
        {dx:-0.05, dy: 0.3,  r:0.07},
        {dx: 0.3,  dy:-0.2,  r:0.06},
        {dx:-0.35, dy: 0.25, r:0.05},
        {dx: 0.15, dy:-0.35, r:0.08},
      ]
      craters.forEach(c => {
        moonGroup.append("circle")
          .attr("cx", moonX + c.dx * moonR).attr("cy", moonY + c.dy * moonR)
          .attr("r", c.r * moonR)
          .attr("fill", "#8a7a5a").attr("fill-opacity", 0.5)
          .attr("stroke", "#6a5a3a").attr("stroke-width", 0.5).attr("pointer-events", "none")
      })

      // Chandrayaan-3 lander marker
      const c3x = moonX - moonR * 0.18
      const c3y = moonY + moonR * 0.55

      // Landing site glow
      moonGroup.append("circle")
        .attr("cx", c3x).attr("cy", c3y).attr("r", moonR * 0.09)
        .attr("fill", "#00d4ff").attr("fill-opacity", 0.2)
        .attr("pointer-events", "none")

      // Lander icon (simple cross/satellite shape)
      const ls = moonR * 0.04
      moonGroup.append("line")
        .attr("x1", c3x - ls*2).attr("y1", c3y).attr("x2", c3x + ls*2).attr("y2", c3y)
        .attr("stroke", "#00d4ff").attr("stroke-width", 1.5).attr("pointer-events","none")
      moonGroup.append("line")
        .attr("x1", c3x).attr("y1", c3y - ls*2).attr("x2", c3x).attr("y2", c3y + ls*2)
        .attr("stroke", "#00d4ff").attr("stroke-width", 1.5).attr("pointer-events","none")
      moonGroup.append("circle")
        .attr("cx", c3x).attr("cy", c3y).attr("r", ls)
        .attr("fill", "#00d4ff").attr("pointer-events","none")

      // Chandrayaan label
      moonGroup.append("text")
        .attr("x", c3x + moonR * 0.14).attr("y", c3y + 3)
        .attr("fill", "#00d4ff").attr("font-size", Math.max(7, moonR * 0.09))
        .attr("font-family", "'IBM Plex Mono',monospace").attr("font-weight", "600")
        .attr("pointer-events","none")
        .text("CHANDRAYAAN-3")

      // South Pole label
      moonGroup.append("text")
        .attr("x", moonX - moonR * 0.15).attr("y", moonY + moonR * 0.72)
        .attr("fill", "#b8a882").attr("font-size", Math.max(6, moonR * 0.07))
        .attr("font-family", "'IBM Plex Mono',monospace")
        .attr("pointer-events","none")
        .text("SOUTH POLE")

      // Moon label
      moonGroup.append("text")
        .attr("x", moonX).attr("y", moonY - moonR - 8)
        .attr("text-anchor", "middle").attr("fill", "#e8dcc8")
        .attr("font-size", Math.max(8, moonR * 0.1))
        .attr("font-family", "'IBM Plex Mono',monospace").attr("letter-spacing", 2)
        .attr("pointer-events","none")
        .text("MOON")

      // Real Chandrayaan-3 image overlay using foreignObject
      const imgSize = moonR * 0.45
      moonGroup.append("image")
        .attr("href", "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chandrayaan-3_Pragyan_rover_on_Moon.jpg/320px-Chandrayaan-3_Pragyan_rover_on_Moon.jpg")
        .attr("x", moonX + moonR * 0.35).attr("y", moonY - moonR * 0.95)
        .attr("width", imgSize).attr("height", imgSize * 0.65)
        .attr("clip-path", "inset(0 round 4px)")
        .attr("opacity", 0.9)
        .attr("pointer-events","none")

      // Image border
      moonGroup.append("rect")
        .attr("x", moonX + moonR * 0.35).attr("y", moonY - moonR * 0.95)
        .attr("width", imgSize).attr("height", imgSize * 0.65)
        .attr("fill", "none").attr("stroke", "#00d4ff")
        .attr("stroke-width", 1).attr("rx", 4).attr("pointer-events","none")

      // Image caption
      moonGroup.append("text")
        .attr("x", moonX + moonR * 0.35 + imgSize/2).attr("y", moonY - moonR * 0.95 + imgSize * 0.65 + 10)
        .attr("text-anchor","middle").attr("fill","#7a9bbf")
        .attr("font-size", Math.max(6, moonR * 0.07))
        .attr("font-family","'IBM Plex Mono',monospace")
        .attr("pointer-events","none")
        .text("Pragyan Rover · ISRO 2023")

      } else if (moonScale <= 0.5) {
        
        moonGroup.append("text")
        .attr("x", moonX + moonR + 5).attr("y", moonY + 3)
        .attr("fill", "#6a5a3a").attr("fill-opacity", 0.7)
        .attr("font-size", 7).attr("font-family","'IBM Plex Mono',monospace")
        .attr("pointer-events","none")
        .text("●")
    }

    // Zoom hint (only shown when not zoomed)
    if (moonScale < 0.4) {
      svg.append("text")
        .attr("x", moonX)
        .attr("y", moonY + moonR + 18)
        .attr("text-anchor","middle").attr("fill","#2a3d54")
        .attr("font-size", 7).attr("font-family","'IBM Plex Mono',monospace")
        .attr("pointer-events","none")
        .text("scroll to zoom")
    }
  }

  // Drag to rotate
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    function getPos(e) {
      if (e.touches) return {x: e.touches[0].clientX, y: e.touches[0].clientY};
      return {x: e.clientX, y: e.clientY};
    }

    function onStart(e) {
      isDragging.current = true;
      lastPos.current = getPos(e);
    }
    function onMove(e) {
      if (!isDragging.current || !lastPos.current) return;
      const pos = getPos(e);
      const dx = pos.x - lastPos.current.x;
      const dy = pos.y - lastPos.current.y;
      rotationRef.current = [
        rotationRef.current[0] + dx * 0.4,
        rotationRef.current[1] - dy * 0.4,
        0
      ];
      lastPos.current = pos;
      drawGlobe();
    }
    function onEnd() { isDragging.current = false; lastPos.current = null; }

    el.addEventListener("mousedown", onStart);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseup", onEnd);
    el.addEventListener("mouseleave", onEnd);
    el.addEventListener("touchstart", onStart, {passive:true});
    el.addEventListener("touchmove", onMove, {passive:true});
    el.addEventListener("touchend", onEnd);

    return () => {
      el.removeEventListener("mousedown", onStart);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseup", onEnd);
      el.removeEventListener("mouseleave", onEnd);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [dims, regions, topoData]);

  return (
    <div ref={wrapRef} className="map-body" style={{cursor: isDragging.current ? 'grabbing' : 'grab'}}>
      <svg ref={svgRef} className="map-svg" />
      {tooltip && (
        <div className="tooltip-box" style={{left: tooltip.mx+14, top: tooltip.my-60}}>
          <div className="tt-region">{tooltip.reg.name.toUpperCase()}</div>
          <div className="tt-count">{tooltip.reg.count}</div>
          <div style={{fontSize:9,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:4}}>active events</div>
          {tooltip.reg.breaking && <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--accent2)",letterSpacing:1,marginBottom:4}}>⚑ BREAKING EVENT</div>}
          <div className="tt-tags">{tooltip.reg.tags.map(t => <span key={t} className="tt-tag">{t}</span>)}</div>
          <div className="tt-hint">Click to view details →</div>
        </div>
      )}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const { stories: dbStories, loading: storiesLoading } = useStories()
  const { profile } = useUser()
  const { notifications, unreadCount, markAllRead, markRead, createNotification } = useNotifications()
  const [showNotifs, setShowNotifs] = useState(false)
  const { getFollowedUserIds } = useFollow()
  const { unreadCount: msgUnreadCount } = useMessages()
  const [followedIds, setFollowedIds] = useState([])
  const [feedTab, setFeedTab] = useState('all')
  const [hasApplied, setHasApplied] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const { regions: dbRegions } = useRegions()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false) // show detail panel on mobile

  useEffect(() => { getFollowedUserIds().then(ids => setFollowedIds(ids)) }, [user])

  const [suggestions, setSuggestions] = useState([])
  useEffect(() => {
    supabase.from('users').select('id, username, role, score').eq('role', 'osint')
      .order('score', { ascending: false }).limit(3)
      .then(({ data }) => setSuggestions(data || []))
  }, [])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('osint_applications').select('id').eq('user_id', user.id)
      .then(({ data }) => { if (data && data.length > 0) setHasApplied(true) })
  }, [user])

  const [nav, setNav] = useState(() => localStorage.getItem('sigint_nav') || "feed")
  const setNavAndSave = (id) => { setNav(id); localStorage.setItem('sigint_nav', id); if (isMobile) setSidebarOpen(false) }

  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); navigate('/search') } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const [tab, setTab] = useState("intel")
  const [story, setStory] = useState(STORIES[0])
  const [showApply, setShowApply] = useState(false)
  const [applied, setApplied] = useState(false)
  const [mf, setMf] = useState("ALL")
  const [selRegion, setSelRegion] = useState(null)
  const [form, setForm] = useState({channel:"",handle:"",portfolio:"",why:""})

  const handleSelectStory = (s) => { setStory(s); if (isMobile) setMobileDetail(true) }

  const doApply = async () => {
    if (!form.channel || !form.handle) return
    setApplied(true)
    const { error } = await supabase.from('osint_applications').insert({
      user_id: user.id, channel_name: form.channel, handle: form.handle,
      portfolio: form.portfolio, why: form.why, status: 'pending'
    })
    if (error) { console.error('Application error:', error.message); alert('Error: ' + error.message); setApplied(false); return }
    setHasApplied(true)
    setTimeout(() => { setShowApply(false); setApplied(false); setForm({channel:"",handle:"",portfolio:"",why:""}) }, 2000)
  }

  const totalEv = REGIONS.reduce((a,r) => a+r.count, 0)
  const breakZones = REGIONS.filter(r => r.breaking).length
  const hottest = REGIONS.reduce((a,b) => a.count > b.count ? a : b)

  const navItems = [
    {id:"feed",    label:"Intel Feed",        icon:"◈", section:"Feed"},
    {id:"search",  label:"Search",            icon:"◎"},
    {id:"trending",label:"Trending",          icon:"↑", badge:"12"},
    {id:"map",     label:"Event Map",         icon:"◉"},
    {id:"verified",label:"Verified Sources",  icon:"◆", badge:"47", bc:"green", section:"OSINT Channels"},
    ...(profile?.role === 'public' && !hasApplied ? [{id:"apply", label:"Apply to Join", icon:"⊕"}] : []),
    ...(profile?.role === 'public' && hasApplied  ? [{id:"status", label:"Application Pending", icon:"◌"}] : []),
    {id:"messages",      label:"Messages",      icon:"◻", section:"Account", badge: msgUnreadCount > 0 ? String(msgUnreadCount) : null, bc:"orange"},
    {id:"notifications", label:"Notifications", icon:"◎", badge: unreadCount > 0 ? String(unreadCount) : null, bc:"orange"},
    {id:"profile",       label:"My Profile",    icon:"○"},
    {id:"settings",      label:"Settings",      icon:"≡"},
    ...(profile?.role === 'admin' ? [{id:"admin", label:"Admin Dashboard", icon:"⬡", section:"Admin"}] : []),
  ]

  // Bottom nav items (mobile) — just the 5 most important
  const bottomNavItems = [
    {id:"feed",          icon:"◈", label:"Feed"},
    {id:"map",           icon:"◉", label:"Map"},
    {id:"search",        icon:"◎", label:"Search"},
    {id:"messages",      icon:"◻", label:"DMs",   badge: msgUnreadCount > 0 ? msgUnreadCount : null},
    {id:"notifications", icon:"●", label:"Alerts", badge: unreadCount > 0 ? unreadCount : null},
  ]

  return (
    <>
      <style>{FONTS + styles}</style>
      <div className="app">

        {/* ── MOBILE SIDEBAR OVERLAY ── */}
        {isMobile && (
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <div className={`sidebar ${isMobile && sidebarOpen ? 'mobile-open' : ''}`}>
          <div className="logo">
            <div className="logo-icon">⬡</div>
            <div style={{flex:1}}>
              <div className="logo-text">MINT</div>
              <div className="logo-sub">OPEN SOURCE INTEL NETWORK</div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)}
                style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:18,padding:4}}>
                ✕
              </button>
            )}
          </div>
          <div className="nav">
            {navItems.map((n) => (
              <span key={n.id}>
                {n.section && <div className="nav-section">{n.section}</div>}
                <div
                  className={`nav-item ${nav===n.id?"active":""}`}
                  onClick={() => {
                    if(n.id==="admin") { navigate('/admin'); if(isMobile) setSidebarOpen(false); return; }
                    if(n.id==="profile") { navigate('/profile'); if(isMobile) setSidebarOpen(false); return; }
                    if(n.id==="search") { navigate('/search'); if(isMobile) setSidebarOpen(false); return; }
                    if(n.id==="messages") { navigate('/messages'); if(isMobile) setSidebarOpen(false); return; }
                    if(n.id==="notifications") { setShowNotifs(v => !v); if(isMobile) setSidebarOpen(false); return; }
                    if(n.id==="apply") { setShowApply(true); if(isMobile) setSidebarOpen(false); return; }
                    setNavAndSave(n.id)
                  }}
                >
                  <span style={{fontSize:12}}>{n.icon}</span> {n.label}
                  {n.badge && <span className={`nav-badge ${n.bc||""}`}>{n.badge}</span>}
                </div>
              </span>
            ))}
          </div>
          <div className="sidebar-bottom">
            {!isMobile && suggestions.length > 0 && (
              <div style={{padding:'12px 0', borderTop:'1px solid var(--border)'}}>
                <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:10}}>SUGGESTED</div>
                {suggestions.map(s => (
                  <div key={s.id} onClick={() => navigate(`/channel/${s.username}`)}
                    style={{display:'flex', alignItems:'center', gap:8, padding:'6px 0', cursor:'pointer', borderBottom:'1px solid var(--border)'}}>
                    <div style={{width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#0d6efd)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0}}>
                      {s.username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--verified)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.username} ◆</div>
                      <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)'}}>Score: {s.score || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="user-card">
              <div className="avatar">{user?.email?.[0].toUpperCase() || 'U'}</div>
              <div>
                <div className="user-name" style={{fontSize:11, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user?.email || 'User'}</div>
                <div className="user-role">{profile?.role?.toUpperCase() || 'PUBLIC'}_USER</div>
              </div>
            </div>
            <div onClick={handleSignOut} style={{marginTop:10, fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', cursor:'pointer', letterSpacing:1}}>
              ⊗ SIGN OUT
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            {isMobile && (
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            )}
            <span className="topbar-title">
              {nav==="map"?"Event Map":nav==="trending"?"Trending":"Intel Feed"}
            </span>
            <div className="live-indicator"><div className="live-dot" />LIVE</div>
            <span className="topbar-stats" style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)"}}>
              {nav==="map"
                ? `${REGIONS.length} regions · ${totalEv} events`
                : `${(dbStories.length > 0 ? dbStories : STORIES).length} stories`}
            </span>
            <div className="ml-auto">
              {profile?.role === 'public' && !hasApplied && !isMobile && (
                <button onClick={() => setShowApply(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'transparent',border:'1px solid var(--verified)',borderRadius:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--verified)',cursor:'pointer',letterSpacing:1}}>
                  <span style={{fontSize:12}}>◆</span> APPLY AS ANALYST
                </button>
              )}
              {profile?.role === 'public' && hasApplied && !isMobile && (
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(74,96,128,0.15)',border:'1px solid var(--border)',borderRadius:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',letterSpacing:1}}>
                  <span>◌</span> PENDING
                </div>
              )}
              {profile?.role === 'osint' && (
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:6,fontFamily:'var(--mono)',fontSize:isMobile?9:10,color:'var(--verified)',letterSpacing:1}}>
                  <span>◆</span> {isMobile ? 'ANALYST' : 'VERIFIED ANALYST'}
                </div>
              )}
            </div>
          </div>

          {/* ══ MAP VIEW ══ */}
          {nav === "map" && (
            <div className="map-wrap">
              <div className="map-filters">
                <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",letterSpacing:2,whiteSpace:"nowrap"}}>FILTER:</span>
                {ALL_FILTERS.map(f => (
                  <button key={f} className={`mf-btn ${mf===f?"on":""}`} onClick={() => { setMf(f); setSelRegion(null); }}>{f}</button>
                ))}
              </div>
              <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {dbRegions.length === 0 ? (
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>
                    <div style={{fontSize:24,animation:"pulse 1.5s ease-in-out infinite"}}>◉</div>
                    <div style={{letterSpacing:2}}>LOADING MAP DATA...</div>
                  </div>
                ) : (
                  <WorldMap filter={mf} regions={dbRegions} onRegionClick={r => setSelRegion(r)} />
                )}
                {!isMobile && (
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
                )}
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
                            onClick={()=>{setStory(s);setNav("feed");if(isMobile)setMobileDetail(true)}}>
                            {s.breaking && <span className="breaking-tag" style={{fontSize:7,marginRight:5}}>BREAKING</span>}
                            {s.headline}
                            <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",marginTop:4}}>
                              {s.sources.length} source{s.sources.length!==1?"s":""} · {s.time}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)",padding:"8px 0"}}>
                        No linked intel stories for this region yet.
                        <div style={{marginTop:6,fontSize:9,color:"#2a3d54"}}>
                          Stories will appear here as OSINT channels report events.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ TRENDING ══ */}
          {nav === "trending" && (
            <div style={{flex:1, overflow:"hidden", display:"flex", flexDirection:"column"}}>
              <div className="section-header">
                <span className="section-label">↑ Trending Now</span>
                <span className="count-badge">Last 24 hours</span>
              </div>
              <div style={{overflow:"auto", flex:1}}>
                {(dbStories.length > 0 ? dbStories : STORIES)
                  .slice().sort((a,b) => (b.sources||b.story_sources||[]).length - (a.sources||a.story_sources||[]).length)
                  .map((s, i) => (
                    <div key={s.id} className="story-card" onClick={() => { handleSelectStory(s); setNav("feed") }}
                      style={{display:"flex", alignItems:"flex-start", gap:12}}>
                      <div style={{fontFamily:"var(--mono)", fontSize:20, fontWeight:700, color: i===0?"var(--accent2)": i===1?"var(--muted)": i===2?"#8a6a2a":"var(--border)", minWidth:28, paddingTop:2}}>
                        {i+1}
                      </div>
                      <div style={{flex:1}}>
                        <div className="story-meta">
                          {(s.breaking||s.is_breaking) && <span className="breaking-tag">BREAKING</span>}
                          <span className="story-tag">{s.tag}</span>
                          <span className="story-time">{s.time || 'recent'}</span>
                        </div>
                        <div className="story-headline">{s.headline}</div>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginTop:6}}>
                          <span style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--accent)"}}>◆ {(s.sources||s.story_sources||[]).length} sources</span>
                          <span style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)"}}>{s.confidence || s.confidence === 0 ? `${s.confidence}% confidence` : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ══ VERIFIED ══ */}
          {nav === "verified" && (
            <div style={{flex:1, overflow:"hidden", display:"flex", flexDirection:"column"}}>
              <div className="section-header">
                <span className="section-label">◆ Verified OSINT Channels</span>
                <span className="count-badge">6 active</span>
              </div>
              <div style={{overflow:"auto", flex:1, padding:"12px 16px"}}>
                {[
                  {name:"StratSentinel", handle:"@StratSentinel", score:94, tag:"MARITIME · CONFLICT", posts:142},
                  {name:"MaritimeWatch", handle:"@MW_Intel", score:89, tag:"MARITIME · NAVAL", posts:98},
                  {name:"GulfWatcher", handle:"@GulfWatcher_OS", score:78, tag:"GULF · ENERGY", posts:67},
                  {name:"CyberSentinel_EU", handle:"@CyberSentinel_EU", score:91, tag:"CYBER · INFRASTRUCTURE", posts:203},
                  {name:"OT_Threat_Intel", handle:"@OTThreatIntel", score:86, tag:"CYBER · ICS", posts:115},
                  {name:"GeoIntelysis", handle:"@GeoIntelysis", score:88, tag:"GEOPOLITICS · SATELLITE", posts:89},
                ].map((ch, i) => (
                  <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"16px",marginBottom:10,cursor:"pointer"}}
                    onClick={() => navigate(`/channel/${ch.name}`)}>
                    <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:10}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a5f,#0d6efd)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0}}>
                        {ch.name[0]}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:13,fontWeight:600}}>{ch.name}</span>
                          <span style={{color:"var(--verified)",fontSize:10}}>◆</span>
                        </div>
                        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>{ch.handle}</div>
                      </div>
                      <div style={{fontFamily:"var(--mono)",fontSize:11,fontWeight:700,color:"var(--verified)",padding:"4px 10px",border:"1px solid var(--verified)",borderRadius:4}}>
                        {ch.score}/100
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {ch.tag.split(" · ").map(t => <span key={t} className="story-tag">{t}</span>)}
                      <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)"}}>{ch.posts} verified posts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ FEED VIEW ══ */}
          {nav !== "map" && nav !== "trending" && nav !== "verified" && (
            <div className="feed-layout">
              {/* Left panel — hide on mobile when viewing detail */}
              <div className="intel-feed" style={isMobile && mobileDetail ? {display:'none'} : {}}>
                <div className="tabs">
                  <div className={`tab ${tab==="intel"?"active":""}`} onClick={()=>setTab("intel")}>Intel Stories</div>
                  <div className={`tab ${tab==="general"?"active":""}`} onClick={()=>setTab("general")}>General</div>
                </div>

                {tab==="intel" && <>
                  <div className="section-header">
                    <span className="section-label">⬡ Multi-Source Stories</span>
                    <span className="count-badge">{STORIES.length} threads</span>
                    {(profile?.role === 'osint' || profile?.role === 'admin') && (
                      <button onClick={() => setShowComposer(true)} style={{marginLeft:8,padding:'4px 10px',background:'rgba(0,255,136,0.1)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:4,fontFamily:'var(--mono)',fontSize:9,color:'var(--verified)',cursor:'pointer',letterSpacing:1}}>
                        ◆ NEW
                      </button>
                    )}
                  </div>
                  <div style={{display:'flex', borderBottom:'1px solid var(--border)', background:'var(--surface)'}}>
                    {['all','following'].map(t => (
                      <button key={t} onClick={() => setFeedTab(t)} style={{flex:1,padding:'10px 0',background:'none',border:'none',borderBottom: feedTab===t ? '2px solid var(--accent)' : '2px solid transparent',fontFamily:'var(--mono)',fontSize:10,letterSpacing:1,color: feedTab===t ? 'var(--accent)' : 'var(--muted)',cursor:'pointer',transition:'all 0.15s',textTransform:'uppercase'}}>
                        {t === 'all' ? 'All Intel' : 'Following'}
                      </button>
                    ))}
                  </div>
                  <StoryList
                    stories={(dbStories.length > 0 ? dbStories : STORIES).filter(s => {
                      if (feedTab === 'all') return true
                      if (followedIds.length === 0) return false
                      const sources = s.sources || s.story_sources || []
                      return sources.some(src => followedIds.includes(src.posts?.users?.id || src.posts?.author_id))
                    })}
                    activeStory={story}
                    onSelect={handleSelectStory}
                    loading={storiesLoading}
                  />
                </>}
                {tab === "general" && <GeneralFeed />}
              </div>

              {/* Right detail — full screen on mobile */}
              {(!isMobile || mobileDetail) && story && (
                <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
                  {/* Mobile back button */}
                  {isMobile && (
                    <div className="mobile-back" onClick={() => setMobileDetail(false)}>
                      ← BACK TO FEED
                    </div>
                  )}
                  <div className="detail-panel">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                      {(story.breaking || story.is_breaking) && <span className="breaking-tag">BREAKING</span>}
                      <span className="story-tag">{story.tag}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)"}}>First reported {story.time}</span>
                      {!isMobile && (
                        <button onClick={()=>setNav("map")} style={{marginLeft:"auto",background:"transparent",border:"1px solid var(--border)",borderRadius:3,padding:"3px 9px",fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",cursor:"pointer",letterSpacing:1}}>◉ VIEW ON MAP</button>
                      )}
                    </div>
                    <div className="detail-headline">{story.headline}</div>
                    <div className="conf-bar">
                      <span className="conf-label">CONFIDENCE</span>
                      <div className="conf-track"><div className="conf-fill" style={{width:`${story.confidence}%`}} /></div>
                      <span className="conf-val">{story.confidence}%</span>
                    </div>
                    <div className="tl-bar">
                      {(story.sources || story.story_sources || []).map((s,i) => (
                        <span key={i} style={{display:"contents"}}>
                          {i>0 && <span className="tl-arrow">→</span>}
                          <div className={`tl-event ${i===0?"first":""}`}>
                            {i===0?"⚑ FIRST: ":`+${(s.t||'').replace("T+","")}: `}
                            {s.name || s.posts?.users?.username || 'Source'}
                          </div>
                        </span>
                      ))}
                    </div>
                    <div className="detail-summary" style={{marginTop:16}}>
                      <div className="detail-summary-label">◈ AI-SYNTHESISED SUMMARY</div>
                      {story.summary}
                    </div>
                    <div className="src-title">
                      {(story.sources || story.story_sources || []).length} Verified Source
                      {(story.sources || story.story_sources || []).length!==1?"s":""}
                    </div>
                    {(story.sources || story.story_sources || []).map((s,i) => (
                      <div key={i} className="source-post">
                        <div className="source-post-hd">
                          <div className="post-avatar" style={{background: s.av || '#1a3a5c', width:36, height:36, fontSize:12}}>
                            {s.ini || (s.posts?.users?.username?.[0]?.toUpperCase()) || 'S'}
                          </div>
                          <div>
                            <div className="source-name">{s.name || s.posts?.users?.username || 'Source'}</div>
                            <div className="source-handle">{s.handle || `@${s.posts?.users?.username || 'unknown'}`}</div>
                          </div>
                          <div className="score-badge">◆ {s.score || s.posts?.users?.score || '??'} / 100</div>
                        </div>
                        <div className="source-post-body">{s.body || s.posts?.body || ''}</div>
                        <div className="source-post-time">
                          {s.first && <span className="first-report">⚑ First to report</span>}
                          <span>{s.t==="T+0" ? "First post" : s.t ? `Posted ${s.t} after breaking` : ''}</span>
                        </div>
                        {s.posts?.id && <SourceNoteButton post={s.posts} user={user} />}
                      </div>
                    ))}
                    <div style={{height:32}} />
                  </div>
                </div>
              )}

              {/* Empty state on desktop */}
              {!isMobile && !story && (
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"var(--muted)",gap:12}}>
                  <div style={{fontSize:40,opacity:0.25}}>◈</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,letterSpacing:1}}>Select a story</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM NAV (mobile only) ── */}
        <div className="bottom-nav">
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              className={`bn-item ${nav===item.id ? 'active' : ''}`}
              onClick={() => {
                if(item.id==="notifications") { setShowNotifs(v => !v); return; }
                if(item.id==="messages") { navigate('/messages'); return; }
                if(item.id==="search") { navigate('/search'); return; }
                setNavAndSave(item.id)
                setMobileDetail(false)
              }}
            >
              {item.badge > 0 && <span className="bn-badge">{item.badge}</span>}
              <span className="bn-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
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
              {[["Channel / Organization Name","e.g. AltitudeSentinel","channel"],["Primary Handle / Account","@yourhandle","handle"]].map(([lbl,ph,k])=>(
                <div key={k} className="form-group">
                  <label className="form-label">{lbl}</label>
                  <input className="form-input" placeholder={ph} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
              {[["Portfolio / Past Work","Link to notable OSINT threads...","portfolio"],["Why should you be approved?","Describe your methodology...","why"]].map(([lbl,ph,k])=>(
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

      {showComposer && (
        <StoryComposer onClose={() => setShowComposer(false)} onPublished={() => setShowComposer(false)} />
      )}

      {showNotifs && (
        <div style={{
          position:'fixed',
          top: 0,
          left: isMobile ? 0 : 220,
          right: isMobile ? 0 : 'auto',
          bottom: isMobile ? 56 : 0,
          width: isMobile ? '100%' : 320,
          background:'var(--surface)', borderLeft:'1px solid var(--border)',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          zIndex:9999, boxShadow:'4px 0 24px rgba(0,0,0,0.5)'
        }}>
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onMarkRead={markRead}
            onClose={() => setShowNotifs(false)}
          />
        </div>
      )}
    </>
  );
}
