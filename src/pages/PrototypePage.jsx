import { useUser } from '../hooks/useUser'
import { useRegions } from '../hooks/useRegions'
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../api/supabase'
import { MAP_FILTERS } from '../constants'
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
import { useTheme } from '../hooks/useTheme'
import ThemeRipple from '../components/ThemeRipple'
import EditNoteSection from '../components/EditNoteSection'
import SourceNoteButton from '../components/SourceNoteButton'
import WorldMap from '../components/map/WorldMap'
import {
  Rss, Search, TrendingUp, Globe2, BadgeCheck, Plus, Clock,
  MessageSquare, Bell, User, Settings, ShieldAlert, MapPin,
  Cpu, Flag, Award, Inbox, Film, X, Radio,
} from 'lucide-react'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── THEME TRANSITION — RADAR SWEEP ── */
  @keyframes radarSweep {
    0%   { transform: translateY(-100%); opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: 1; }
    100% { transform: translateY(100vh); opacity: 0; }
  }
  @keyframes decrypt {
    0%   { opacity: 0; letter-spacing: 4px; filter: blur(3px); }
    40%  { opacity: 0.7; letter-spacing: 1px; filter: blur(1px); }
    100% { opacity: 1; letter-spacing: inherit; filter: blur(0); }
  }
  html[data-theme-transitioning]::after {
    content: '';
    position: fixed; inset: 0; z-index: 99999; pointer-events: none;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 3px,
      rgba(77,200,232,0.04) 3px, rgba(77,200,232,0.04) 4px
    );
    animation: radarSweep 0.7s cubic-bezier(0.4,0,0.2,1) forwards;
  }
  html[data-theme-transitioning] .story-headline,
  html[data-theme-transitioning] .detail-headline,
  html[data-theme-transitioning] .logo-text,
  html[data-theme-transitioning] .nav-item,
  html[data-theme-transitioning] .post-body {
    animation: decrypt 0.6s ease forwards;
  }

  /* ── LIGHT MODE — GHOST ── */
  :root, [data-theme="light"] {
    --bg: #f8f7f5;
    --surface: #ffffff;
    --surface2: #f0ede8;
    --border: #e0dbd4;
    --accent: #c0404a;
    --accent2: #8a3a8a;
    --verified: #2a7a4a;
    --warn: #b06020;
    --text: #1a1614;
    --muted: #8a7a70;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Inter', sans-serif;
    --active-bg: rgba(192,64,74,0.06);
    --story-active-bg: rgba(192,64,74,0.04);
    --tl-bg: rgba(192,64,74,0.03);
    --section-bg: rgba(248,247,245,0.95);
    --stat-bg: rgba(255,255,255,0.93);
    --tooltip-bg: rgba(248,247,245,0.97);
    --map-bg: rgba(255,255,255,0.93);
    --region-bg: rgba(255,255,255,0.97);
    --modal-overlay: rgba(26,22,20,0.6);
    --post-hover: rgba(0,0,0,0.02);
    --mf-active-bg: rgba(192,64,74,0.08);
    --topbar-hover: rgba(192,64,74,0.1);
  }

  /* ── DARK MODE — VOID ── */
  [data-theme="dark"] {
    --bg: #000000;
    --surface: #0a0a0a;
    --surface2: #111111;
    --border: #1e1e1e;
    --accent: #4dc8e8;
    --accent2: #e84848;
    --verified: #30d880;
    --warn: #e8a020;
    --text: #e0e8f0;
    --muted: #404858;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Inter', sans-serif;
    --active-bg: rgba(77,200,232,0.06);
    --story-active-bg: rgba(77,200,232,0.05);
    --tl-bg: rgba(77,200,232,0.03);
    --section-bg: rgba(0,0,0,0.95);
    --stat-bg: rgba(10,10,10,0.93);
    --tooltip-bg: rgba(0,0,0,0.97);
    --map-bg: rgba(10,10,10,0.93);
    --region-bg: rgba(10,10,10,0.97);
    --modal-overlay: rgba(0,0,0,0.75);
    --post-hover: rgba(255,255,255,0.02);
    --mf-active-bg: rgba(77,200,232,0.08);
    --topbar-hover: rgba(77,200,232,0.1);
  }

  body {
    background: var(--bg); color: var(--text);
    font-family: var(--sans);
    transition: background 0.4s ease, color 0.3s ease;
  }

  .app { display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 220px; min-width: 220px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: transform 0.25s ease, background 0.4s ease; }
  .sidebar.mobile-hidden { transform: translateX(-100%); }

  .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998; backdrop-filter: blur(2px); }
  .sidebar-overlay.visible { display: block; }

  @media (max-width: 768px) {
    .sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 999; transform: translateX(-100%); }
    .sidebar.mobile-open { transform: translateX(0); }
    .main { width: 100vw !important; }
  }

  .logo { padding: 20px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 10px; }
  .logo-icon { width: 32px; height: 32px; background: var(--accent); clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--bg); font-family: var(--mono); }
  .logo-text { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--accent); letter-spacing: 2px; }
  .logo-sub { font-size: 9px; color: var(--muted); letter-spacing: 1px; margin-top: 1px; font-family: var(--mono); }
  .nav { flex: 1; padding: 12px 0; overflow-y: auto; }
  .nav-section { padding: 8px 18px 4px; font-size: 9px; letter-spacing: 2px; color: var(--muted); font-family: var(--mono); text-transform: uppercase; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; cursor: pointer; font-size: 13px; font-family: var(--sans); color: var(--muted); transition: all 0.15s; border-left: 2px solid transparent; }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: var(--active-bg); color: var(--accent); border-left-color: var(--accent); }
  .nav-badge { margin-left: auto; background: var(--accent2); color: #fff; font-size: 9px; padding: 1px 6px; border-radius: 10px; font-family: var(--mono); }
  .nav-badge.green { background: var(--verified); color: #000; }
  .nav-badge.orange { background: var(--accent2); }
  .sidebar-bottom { border-top: 1px solid var(--border); padding: 12px 18px; }
  .user-card { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--bg); border: 1px solid var(--border); font-family: var(--mono); }
  .user-name { font-size: 12px; font-weight: 500; color: var(--text); font-family: var(--sans); }
  .user-role { font-size: 10px; color: var(--muted); font-family: var(--mono); }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; transition: background 0.4s ease; }
  .topbar { height: 52px; min-height: 52px; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 16px; background: var(--surface); flex-shrink: 0; transition: background 0.4s ease; }
  .topbar-title { font-family: var(--mono); font-size: 12px; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; white-space: nowrap; }
  .live-indicator { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10px; color: var(--accent2); white-space: nowrap; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); animation: blink 1.4s ease-in-out infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes flashTag { 0%,100%{opacity:1} 50%{opacity:0.6} }
  .ml-auto { margin-left: auto; }
  .topbar-btn { padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: var(--mono); letter-spacing: 0.5px; border: 1px solid var(--accent); color: var(--accent); background: transparent; transition: all 0.15s; white-space: nowrap; }
  .topbar-btn:hover { background: var(--topbar-hover); }
  .topbar-btn.primary { background: var(--accent); color: var(--bg); font-weight: 600; }
  .feed-layout { flex: 1; display: flex; overflow: hidden; min-height: 0; }
  .intel-feed { width: 360px; min-width: 360px; border-right: 1px solid var(--border); overflow-y: auto; background: var(--bg); }
  .intel-feed::-webkit-scrollbar { width: 3px; }
  .intel-feed::-webkit-scrollbar-thumb { background: var(--border); }

  @media (max-width: 768px) {
    .intel-feed { width: 100%; min-width: unset; border-right: none; }
    .feed-layout { flex-direction: column; }
    .detail-panel-wrap { display: none; }
    .detail-panel-wrap.mobile-visible { display: flex; flex: 1; overflow-y: auto; }
    .topbar-title { font-size: 11px; }
    .topbar { padding: 0 12px; gap: 8px; }
  }

  .section-header { position: sticky; top: 0; z-index: 10; background: var(--section-bg); backdrop-filter: blur(8px); padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .section-label { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); font-weight: 600; }
  .count-badge { font-family: var(--mono); font-size: 9px; color: var(--muted); margin-left: auto; }
  .story-card { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.15s; position: relative; }
  .story-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:transparent; transition:background 0.15s; }
  .story-card:hover { background: var(--surface2); }
  .story-card:hover::before { background: var(--accent); }
  .story-card.active { background: var(--story-active-bg); }
  .story-card.active::before { background: var(--accent); }
  .story-card.breaking::before { background: var(--accent2); }
  .story-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .breaking-tag { font-family:var(--mono); font-size:8px; letter-spacing:1.5px; padding:2px 6px; border-radius:2px; background:var(--accent2); color:#fff; font-weight:600; animation:flashTag 2s ease-in-out infinite; }
  .story-tag { font-family:var(--mono); font-size:8px; letter-spacing:1px; padding:2px 6px; border-radius:2px; border:1px solid var(--border); color:var(--muted); }
  .story-time { font-family:var(--mono); font-size:9px; color:var(--muted); margin-left:auto; }
  .story-headline { font-size:13px; font-weight:500; line-height:1.5; color:var(--text); margin-bottom:8px; font-family:var(--sans); }
  .story-sources { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .source-chip { display:flex; align-items:center; gap:4px; padding:2px 7px; border-radius:3px; background:var(--surface2); border:1px solid var(--border); font-size:9px; color:var(--muted); font-family:var(--mono); }
  .vdot { width:5px; height:5px; border-radius:50%; background:var(--verified); }
  .post-card { padding:14px 16px; border-bottom:1px solid var(--border); }
  .post-card:hover { background:var(--post-hover); }
  .post-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .post-avatar { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:var(--bg); border:1px solid var(--border); flex-shrink:0; background:var(--accent); font-family:var(--mono); }
  .post-author { font-size:12px; font-weight:500; color:var(--text); font-family:var(--sans); }
  .post-handle { font-size:10px; color:var(--muted); font-family:var(--mono); }
  .post-time { font-size:10px; color:var(--muted); margin-left:auto; font-family:var(--mono); }
  .post-body { font-size:12px; line-height:1.6; color:var(--muted); font-family:var(--sans); }
  .post-actions { display:flex; gap:16px; margin-top:10px; }
  .post-action { font-size:10px; color:var(--muted); cursor:pointer; font-family:var(--mono); transition:color 0.15s, transform 160ms ease-out; }
  .post-action:hover { color:var(--accent); }
  .post-action:active { transform:scale(0.85); }
  @media (prefers-reduced-motion:reduce) { .post-action { transition:color 0.15s; } .post-action:active { transform:none; } }
  .detail-panel { flex:1; overflow-y:auto; background:var(--bg); padding:24px 28px; transition:background 0.4s ease; animation:detail-fade-in 150ms ease-out both; }
  @keyframes detail-fade-in { from { opacity:0; } to { opacity:1; } }
  @media (prefers-reduced-motion:reduce) { .detail-panel { animation-duration:0ms; } }
  .detail-panel::-webkit-scrollbar { width:3px; }
  .detail-panel::-webkit-scrollbar-thumb { background:var(--border); }
  .detail-headline { font-size:20px; font-weight:600; line-height:1.4; color:var(--text); margin-bottom:8px; font-family:var(--sans); }
  .detail-summary { font-size:13px; line-height:1.7; color:var(--muted); padding:14px 16px; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:0 4px 4px 0; margin-bottom:20px; font-family:var(--sans); }
  .detail-summary-label { font-family:var(--mono); font-size:9px; letter-spacing:2px; color:var(--accent); margin-bottom:6px; }
  .src-title { font-family:var(--mono); font-size:10px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
  .src-title::after { content:''; flex:1; height:1px; background:var(--border); }
  .source-post { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:18px; margin-bottom:14px; transition:border-color 0.15s; }
  .source-post:hover { border-color:var(--accent); }
  .source-post-hd { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .source-name { font-size:14px; font-weight:600; color:var(--text); font-family:var(--sans); }
  .source-handle { font-size:10px; color:var(--muted); font-family:var(--mono); margin-top:2px; }
  .score-badge { margin-left:auto; display:flex; align-items:center; gap:4px; font-family:var(--mono); font-size:9px; padding:4px 10px; border-radius:4px; border:1px solid var(--verified); color:var(--verified); white-space:nowrap; }
  .source-post-body { font-size:13px; line-height:1.7; color:var(--text); font-family:var(--sans); }
  .source-post-time { margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-family:var(--mono); font-size:9px; color:var(--muted); display:flex; align-items:center; gap:12px; }
  .first-report { color:var(--accent2); }
  .conf-bar { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
  .conf-label { font-family:var(--mono); font-size:9px; color:var(--muted); white-space:nowrap; }
  .conf-track { flex:1; height:3px; background:var(--border); border-radius:2px; }
  .conf-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--accent2),var(--accent)); }
  .conf-val { font-family:var(--mono); font-size:9px; color:var(--accent); }
  .tl-bar { display:flex; align-items:center; gap:6px; padding:8px 16px; border-bottom:1px solid var(--border); background:var(--tl-bg); overflow-x:auto; flex-shrink:0; }
  .tl-event { flex-shrink:0; font-size:9px; font-family:var(--mono); color:var(--muted); padding:3px 8px; border-radius:3px; border:1px solid var(--border); white-space:nowrap; }
  .tl-event.first { border-color:var(--accent2); color:var(--accent2); }
  .tl-arrow { color:var(--border); font-size:10px; flex-shrink:0; }
  .tabs { display:flex; border-bottom:1px solid var(--border); padding:0 16px; background:var(--bg); flex-shrink:0; }
  .tab { padding:10px 16px; font-size:11px; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; font-family:var(--mono); letter-spacing:0.5px; transition:all 0.15s; }
  .tab:hover { color:var(--text); }
  .tab.active { color:var(--accent); border-bottom-color:var(--accent); }
  .modal-overlay { position:fixed; inset:0; background:var(--modal-overlay); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:200; padding:16px; animation:modal-overlay-enter 200ms ease-out both; }
  .modal { background:var(--surface); border:1px solid var(--border); border-radius:8px; width:480px; max-width:100%; max-height:80vh; overflow-y:auto; padding:24px; animation:modal-card-enter 250ms cubic-bezier(0.23,1,0.32,1) both; }
  @keyframes modal-overlay-enter { from { opacity:0; } to { opacity:1; } }
  @keyframes modal-card-enter { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
  @media (prefers-reduced-motion:reduce) { .modal-overlay, .modal { animation-duration:0ms; } }
  .modal-title { font-family:var(--mono); font-size:14px; font-weight:600; color:var(--accent); margin-bottom:4px; }
  .modal-sub { font-size:11px; color:var(--muted); margin-bottom:20px; line-height:1.5; font-family:var(--sans); }
  .form-group { margin-bottom:16px; }
  .form-label { font-family:var(--mono); font-size:10px; letter-spacing:1px; color:var(--muted); margin-bottom:6px; display:block; }
  .form-input { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:9px 12px; color:var(--text); font-family:var(--sans); font-size:12px; outline:none; transition:border-color 0.15s; }
  .form-input:focus { border-color:var(--accent); }
  .form-ta { resize:vertical; min-height:70px; }
  .crit-list { background:var(--bg); border:1px solid var(--border); border-radius:4px; padding:12px; margin-bottom:20px; }
  .crit-item { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; font-size:11px; color:var(--muted); line-height:1.5; font-family:var(--sans); }
  .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  .btn { padding:8px 18px; border-radius:4px; cursor:pointer; font-size:11px; font-family:var(--mono); border:1px solid var(--border); color:var(--muted); background:transparent; transition:all 0.15s; }
  .btn:hover { color:var(--text); }
  .btn.primary { background:var(--accent); color:var(--bg); font-weight:600; border-color:var(--accent); }

  /* MAP */
  .map-wrap { flex:1; display:flex; flex-direction:column; overflow:hidden; }
  .map-filters { padding:8px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:var(--surface); flex-shrink:0; overflow-x:auto; }
  .mf-btn { padding:3px 10px; border-radius:3px; font-family:var(--mono); font-size:9px; letter-spacing:1px; border:1px solid var(--border); color:var(--muted); background:transparent; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
  .mf-btn.on { border-color:var(--accent); color:var(--accent); background:var(--mf-active-bg); }
  .map-body { flex:1; position:relative; overflow:hidden; }
  .map-svg { width:100%; height:100%; display:block; }
  .map-legend-box { position:absolute; bottom:16px; left:16px; background:var(--map-bg); border:1px solid var(--border); border-radius:6px; padding:10px 14px; backdrop-filter:blur(8px); display:flex; flex-direction:column; gap:6px; }
  .leg-row { display:flex; align-items:center; gap:7px; font-family:var(--mono); font-size:8px; color:var(--muted); letter-spacing:0.5px; }
  .leg-dot { border-radius:50%; flex-shrink:0; }
  .map-stats-box { position:absolute; top:12px; right:16px; display:flex; flex-direction:column; gap:8px; }
  .stat-card { background:var(--stat-bg); border:1px solid var(--border); border-radius:6px; padding:9px 13px; min-width:130px; backdrop-filter:blur(8px); }
  .stat-label { font-family:var(--mono); font-size:8px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; margin-bottom:3px; }
  .stat-val { font-family:var(--mono); font-size:18px; font-weight:600; color:var(--text); }
  .stat-sub { font-size:9px; color:var(--muted); margin-top:2px; font-family:var(--sans); }
  .region-panel { position:absolute; bottom:16px; left:50%; transform:translateX(-50%); width:360px; max-width:calc(100vw - 32px); background:var(--region-bg); border:1px solid var(--border); border-radius:8px; padding:14px; backdrop-filter:blur(12px); }
  .tooltip-box { position:fixed; pointer-events:none; background:var(--tooltip-bg); border:1px solid var(--border); border-radius:6px; padding:9px 13px; min-width:180px; max-width:260px; font-size:11px; z-index:999; }
  .tt-region { font-family:var(--mono); font-size:9px; color:var(--accent); margin-bottom:3px; letter-spacing:1px; }
  .tt-count { font-size:20px; font-weight:700; color:var(--text); margin-bottom:4px; font-family:var(--mono); }
  .tt-tags { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:4px; }
  .tt-tag { padding:1px 5px; border-radius:2px; border:1px solid var(--border); font-family:var(--mono); font-size:8px; color:var(--muted); }
  .tt-hint { font-size:9px; color:var(--muted); font-family:var(--mono); margin-top:4px; }

  /* BOTTOM NAV */
  .bottom-nav { display:none; position:fixed; bottom:0; left:0; right:0; height:56px; background:var(--surface); border-top:1px solid var(--border); z-index:997; align-items:center; justify-content:space-around; padding:0 4px; }
  @media (max-width: 768px) {
    .bottom-nav { display:flex; }
    .main { padding-bottom:56px; }
    .map-stats-box { display:none; }
  }
  .bn-item { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; flex:1; padding:6px 0; cursor:pointer; font-family:var(--mono); font-size:8px; color:var(--muted); border:none; background:none; transition:color 0.15s; position:relative; }
  .bn-item.active { color:var(--accent); }
  .bn-item-icon { font-size:16px; line-height:1; }
  .bn-badge { position:absolute; top:4px; right:calc(50% - 14px); background:var(--accent2); color:white; font-size:8px; font-family:var(--mono); padding:1px 4px; border-radius:8px; min-width:14px; text-align:center; }

  /* HAMBURGER */
  .hamburger { display:none; background:none; border:none; cursor:pointer; padding:6px; color:var(--muted); font-size:18px; line-height:1; flex-shrink:0; }
  @media (max-width: 768px) {
    .hamburger { display:flex; align-items:center; }
    .topbar-stats { display:none; }
  }

  /* MOBILE BACK */
  .mobile-back { display:none; align-items:center; gap:8px; padding:10px 16px; border-bottom:1px solid var(--border); background:var(--surface); cursor:pointer; font-family:var(--mono); font-size:10px; color:var(--accent); letter-spacing:1px; flex-shrink:0; }
  @media (max-width: 768px) {
    .mobile-back { display:flex; }
  }
`



// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { theme, toggleTheme } = useTheme()
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

  // Set the first story from DB once loaded
  useEffect(() => {
    if (dbStories.length > 0 && !story) setStory(dbStories[0])
  }, [dbStories]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic nav badge counts
  const [trendingCount, setTrendingCount] = useState(null)
  const [verifiedCount, setVerifiedCount] = useState(null)
  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    supabase.from('stories').select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .then(({ count }) => setTrendingCount(count))
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'osint')
      .then(({ count }) => setVerifiedCount(count))
  }, [])

  const [suggestions, setSuggestions] = useState([])
  const [analysts, setAnalysts] = useState([])
  useEffect(() => {
    supabase.from('users').select('id, username, role, score').eq('role', 'osint')
      .order('score', { ascending: false })
      .then(({ data }) => {
        setAnalysts(data || [])
        setSuggestions((data || []).slice(0, 3))
      })
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
  const [story, setStory] = useState(null)
  const [showApply, setShowApply] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [mf, setMf] = useState("ALL")
  const [selRegion, setSelRegion] = useState(null)
  const [form, setForm] = useState({channel:"",handle:"",portfolio:"",why:""})
  const [ripple, setRipple] = useState(null)
  const holding = useRef(false)
  const logoRef = useRef(null)

  const holdTimer = useRef(null)

  const startHold = useCallback(() => {
    if (ripple) return
    const rect = logoRef.current?.getBoundingClientRect()
    const origin = {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    }
    holding.current = true
    toggleTheme()                   // switch theme immediately
    setRipple({ origin, theme })    // theme = OLD theme (for mask color)
  }, [theme, ripple, toggleTheme])

  const cancelHold = useCallback(() => { holding.current = false }, [])

  const handleSelectStory = (s) => { setStory(s); if (isMobile) setMobileDetail(true) }

  const refreshStory = async (storyId) => {
    if (!storyId) return
    const { data } = await supabase
      .from('stories')
      .select(`
        id, headline, summary, tag, region, confidence, is_breaking, created_at,
        story_sources(
          post_id,
          posts(id, body, created_at, users(id, username, role, score))
        )
      `)
      .eq('id', storyId)
      .single()
    if (data) setStory(data)
  }

  useEffect(() => {
    if (!story?.id) return
  
    const sub = supabase
      .channel(`story-${story.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stories',
        filter: `id=eq.${story.id}`
      }, (payload) => {
        setStory(prev => prev ? { ...prev, ...payload.new } : prev)
      })
      .subscribe()
  
    return () => supabase.removeChannel(sub)
  }, [story?.id])

  const doApply = async () => {
    if (!form.channel || !form.handle) return
    setApplied(true)
    const { error } = await supabase.from('osint_applications').insert({
      user_id: user.id, channel_name: form.channel, handle: form.handle,
      portfolio: form.portfolio, why: form.why, status: 'pending'
    })
    if (error) { setApplyError(error.message); setApplied(false); return }
    setHasApplied(true)
    setTimeout(() => { setShowApply(false); setApplied(false); setForm({channel:"",handle:"",portfolio:"",why:""}) }, 2000)
  }

  const totalEv = dbRegions.reduce((a, r) => a + (r.count || 0), 0)
  const breakZones = dbRegions.filter(r => r.breaking).length
  const hottest = dbRegions.length > 0 ? dbRegions.reduce((a, b) => (a.count || 0) > (b.count || 0) ? a : b) : null

  const navItems = [
    {id:"feed",    label:"Intel Feed",        Icon:Rss,          section:"Feed"},
    {id:"search",  label:"Search",            Icon:Search},
    {id:"trending",label:"Trending",          Icon:TrendingUp,   badge: trendingCount != null ? String(trendingCount) : null},
    {id:"map",     label:"Event Map",         Icon:Globe2},
    {id:"verified",label:"Verified Sources",  Icon:BadgeCheck,   badge: verifiedCount != null ? String(verifiedCount) : null, bc:"green", section:"OSINT Channels"},
    ...(profile?.role === 'public' && !hasApplied ? [{id:"apply",  label:"Apply to Join",        Icon:Plus}] : []),
    ...(profile?.role === 'public' && hasApplied  ? [{id:"status", label:"Application Pending",  Icon:Clock}] : []),
    {id:"messages",      label:"Messages",      Icon:MessageSquare, section:"Account", badge: msgUnreadCount > 0 ? String(msgUnreadCount) : null, bc:"orange"},
    {id:"notifications", label:"Notifications", Icon:Bell,          badge: unreadCount > 0 ? String(unreadCount) : null, bc:"orange"},
    {id:"feedback",      label:"Give Feedback", Icon:MessageSquare},
    {id:"settings",      label:"Settings",      Icon:Settings},
    ...(profile?.role === 'admin' ? [{id:"admin", label:"Admin Dashboard", Icon:ShieldAlert, section:"Admin"}] : []),
  ]

  // Bottom nav items (mobile) — just the 5 most important
  const bottomNavItems = [
    {id:"feed",          Icon:Rss,          label:"Feed"},
    {id:"map",           Icon:Globe2,       label:"Map"},
    {id:"search",        Icon:Search,       label:"Search"},
    {id:"messages",      Icon:MessageSquare,label:"DMs",   badge: msgUnreadCount > 0 ? msgUnreadCount : null},
    {id:"notifications", Icon:Bell,         label:"Alerts",badge: unreadCount > 0 ? unreadCount : null},
  ]

  return (
    <>
      <style>{FONTS + styles}</style>
      <div className="app">

        {ripple && (
          <ThemeRipple
            origin={ripple.origin}
            theme={ripple.theme}
            holding={holding}
            onDone={() => setRipple(null)}
            onRevert={() => { toggleTheme(); setRipple(null) }}
          />
        )}

        {/* ── MOBILE SIDEBAR OVERLAY ── */}
        {isMobile && (
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <div className={`sidebar ${isMobile && sidebarOpen ? 'mobile-open' : ''}`}>
          <div
            className="logo"
            ref={logoRef}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={(e) => { e.preventDefault(); startHold() }}
            onTouchEnd={cancelHold}
          >
            <img
              src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
              alt="MINT"
              draggable={false}
              style={{ height: 38, width: 'auto', display: 'block', flexShrink: 0, pointerEvents: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
            />
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)}
                style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:4,display:'flex',alignItems:'center',marginLeft:'auto'}}>
                <X size={18} />
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
                    if (n.id === 'feedback') { navigate('/feedback'); if (isMobile) setSidebarOpen(false); return; }
                    if (n.id === 'settings') { navigate('/settings'); if (isMobile) setSidebarOpen(false); return; }
                    setNavAndSave(n.id)
                  }}
                >
                  <n.Icon size={14} /> {n.label}
                  {n.badge && <span className={`nav-badge ${n.bc||""}`}>{n.badge}</span>}
                </div>
              </span>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="user-card" onClick={() => navigate('/profile')} style={{cursor:'pointer'}}>
              <div className="avatar">{(profile?.username || user?.email)?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <div className="user-name" style={{fontSize:11, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{profile?.username || user?.email || 'User'}</div>
                <div className="user-role">{profile?.role?.toUpperCase() || 'PUBLIC'}_USER</div>
              </div>
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
                ? `${dbRegions.length} regions · ${totalEv} events`
                : `${dbStories.length} stories`}
            </span>
            <div className="ml-auto" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isMobile && (
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to Ghost' : 'Switch to Void'}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '5px 8px', cursor: 'pointer',
                    color: 'var(--muted)', display: 'flex', alignItems: 'center',
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                  }}
                >
                  {theme === 'dark' ? '☀' : '☾'}
                </button>
              )}
              {profile?.role === 'public' && !hasApplied && !isMobile && (
                <button onClick={() => setShowApply(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'transparent',border:'1px solid var(--verified)',borderRadius:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--verified)',cursor:'pointer',letterSpacing:1}}>
                  <BadgeCheck size={13} /> APPLY AS ANALYST
                </button>
              )}
              {profile?.role === 'public' && hasApplied && !isMobile && (
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(74,96,128,0.15)',border:'1px solid var(--border)',borderRadius:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',letterSpacing:1}}>
                  <Clock size={13} /> PENDING
                </div>
              )}
              {profile?.role === 'osint' && (
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:6,fontFamily:'var(--mono)',fontSize:isMobile?9:10,color:'var(--verified)',letterSpacing:1}}>
                  <BadgeCheck size={13} /> {isMobile ? 'ANALYST' : 'VERIFIED ANALYST'}
                </div>
              )}
            </div>
          </div>
          
          
          {/* ══ MAP VIEW ══ */}
          {nav === "map" && (
            <div className="map-wrap">
              <div className="map-filters">
                <span style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",letterSpacing:2,whiteSpace:"nowrap"}}>FILTER:</span>
                {MAP_FILTERS.map(f => (
                  <button key={f} className={`mf-btn ${mf===f?"on":""}`} onClick={() => { setMf(f); setSelRegion(null); }}>{f}</button>
                ))}
              </div>
              <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {dbRegions.length === 0 ? (
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>
                    <Globe2 size={24} style={{animation:"pulse 1.5s ease-in-out infinite"}} />
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
                      <div className="stat-sub">{dbRegions.length} active regions</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Breaking Zones</div>
                      <div className="stat-val" style={{color:"var(--accent2)"}}>{breakZones}</div>
                      <div className="stat-sub">live right now</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Hottest Region</div>
                      <div className="stat-val" style={{fontSize:11,lineHeight:1.3,color:"var(--warn)",marginTop:3}}>{hottest?.name ?? '—'}</div>
                      <div className="stat-sub">{hottest?.count ?? 0} events</div>
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
                    {dbStories.filter(s=>s.region===selRegion.id).length > 0 ? (
                      <>
                        <div style={{fontFamily:"var(--mono)",fontSize:8,letterSpacing:2,color:"var(--muted)",marginBottom:6}}>LINKED INTEL STORIES</div>
                        {dbStories.filter(s=>s.region===selRegion.id).map(s=>(
                          <div key={s.id}
                            style={{padding:"8px 10px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:4,marginBottom:6,cursor:"pointer",fontSize:11,lineHeight:1.4,color:"var(--text)"}}
                            onClick={()=>{setStory(s);setNav("feed");if(isMobile)setMobileDetail(true)}}>
                            {(s.breaking||s.is_breaking) && <span className="breaking-tag" style={{fontSize:7,marginRight:5}}>BREAKING</span>}
                            {s.headline}
                            <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",marginTop:4}}>
                              {(s.story_sources||[]).length} source{(s.story_sources||[]).length!==1?"s":""} · {s.time || 'recent'}
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
                <span className="section-label"><TrendingUp size={12} style={{display:'inline',verticalAlign:'middle',marginRight:5}} />Trending Now</span>
                <span className="count-badge">Last 24 hours</span>
              </div>
              <div style={{overflow:"auto", flex:1}}>
                {dbStories
                  .slice().sort((a,b) => (b.story_sources||[]).length - (a.story_sources||[]).length)
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
                          <span style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--accent)", display:'flex', alignItems:'center', gap:3}}><BadgeCheck size={9} />{(s.sources||s.story_sources||[]).length} sources</span>
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
                <span className="section-label"><BadgeCheck size={12} style={{display:'inline',verticalAlign:'middle',marginRight:5}} />Verified OSINT Channels</span>
                <span className="count-badge">{analysts.length} active</span>
              </div>
              <div style={{overflow:"auto", flex:1, padding:"12px 16px"}}>
                {/* Top 3 podium */}
                {analysts.length >= 3 && (
                  <div style={{display:"flex", gap:10, marginBottom:16, alignItems:"flex-end"}}>
                    {/* 2nd place */}
                    <div style={{flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"12px", textAlign:"center", cursor:"pointer"}}
                      onClick={() => navigate(`/channel/${analysts[1].username}`)}>
                      <div style={{fontFamily:"var(--mono)", fontSize:20, color:"#7a9bbf", marginBottom:4}}>②</div>
                      <div style={{width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#1e3a5f,#0d6efd)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"white", margin:"0 auto 8px"}}>
                        {analysts[1].username?.[0]?.toUpperCase()}
                      </div>
                      <div style={{fontFamily:"var(--mono)", fontSize:10, color:"var(--verified)", marginBottom:4, display:'flex', alignItems:'center', gap:3}}>{analysts[1].username} <BadgeCheck size={9} /></div>
                      <div style={{fontFamily:"var(--mono)", fontSize:18, fontWeight:700, color:"#7a9bbf"}}>{analysts[1].score}</div>
                    </div>
                    {/* 1st place */}
                    <div style={{flex:1, background:"rgba(255,159,67,0.08)", border:"1px solid #ff9f43", borderRadius:8, padding:"14px", textAlign:"center", cursor:"pointer"}}
                      onClick={() => navigate(`/channel/${analysts[0].username}`)}>
                      <div style={{fontFamily:"var(--mono)", fontSize:22, color:"#ff9f43", marginBottom:4}}>①</div>
                      <div style={{width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#7a3f00,#ff9f43)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"white", margin:"0 auto 8px", border:"2px solid #ff9f43"}}>
                        {analysts[0].username?.[0]?.toUpperCase()}
                      </div>
                      <div style={{fontFamily:"var(--mono)", fontSize:11, color:"#ff9f43", marginBottom:4, display:'flex', alignItems:'center', gap:3}}>{analysts[0].username} <BadgeCheck size={9} /></div>
                      <div style={{fontFamily:"var(--mono)", fontSize:22, fontWeight:700, color:"#ff9f43"}}>{analysts[0].score}</div>
                      <div style={{fontFamily:"var(--mono)", fontSize:8, color:"#ff9f43", letterSpacing:1, marginTop:2}}>TOP ANALYST</div>
                    </div>
                    {/* 3rd place */}
                    <div style={{flex:1, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"12px", textAlign:"center", cursor:"pointer"}}
                      onClick={() => navigate(`/channel/${analysts[2].username}`)}>
                      <div style={{fontFamily:"var(--mono)", fontSize:20, color:"#8a6a2a", marginBottom:4}}>③</div>
                      <div style={{width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#1e3a5f,#0d6efd)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"white", margin:"0 auto 8px"}}>
                        {analysts[2].username?.[0]?.toUpperCase()}
                      </div>
                      <div style={{fontFamily:"var(--mono)", fontSize:10, color:"var(--verified)", marginBottom:4}}>{analysts[2].username} ◆</div>
                      <div style={{fontFamily:"var(--mono)", fontSize:18, fontWeight:700, color:"#8a6a2a"}}>{analysts[2].score}</div>
                    </div>
                  </div>
                )}

                {/* Full ranked list */}
                <div style={{fontFamily:"var(--mono)", fontSize:9, letterSpacing:2, color:"var(--muted)", marginBottom:10}}>FULL RANKINGS</div>
                {analysts.length === 0 ? (
                  <div style={{textAlign:"center", padding:40, fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)"}}>No verified analysts yet</div>
                ) : analysts.map((ch, i) => {
                  const scoreColor = ch.score >= 75 ? 'var(--verified)' : ch.score >= 50 ? 'var(--accent)' : ch.score >= 0 ? 'var(--warn)' : '#ff4757'
                  return (
                    <div key={ch.id} style={{background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"14px 16px", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"border-color 0.15s"}}
                      onClick={() => navigate(`/channel/${ch.username}`)}
                      onMouseOver={e => e.currentTarget.style.borderColor='var(--accent)'}
                      onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
                      {/* Rank */}
                      <div style={{fontFamily:"var(--mono)", fontSize:16, fontWeight:700, minWidth:28, textAlign:"center",
                        color: i===0 ? '#ff9f43' : i===1 ? '#7a9bbf' : i===2 ? '#8a6a2a' : 'var(--muted)'}}>
                        {i + 1}
                      </div>
                      {/* Avatar */}
                      <div style={{width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#1e3a5f,#0d6efd)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"white", flexShrink:0}}>
                        {ch.username?.[0]?.toUpperCase()}
                      </div>
                      {/* Info */}
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{display:"flex", alignItems:"center", gap:6}}>
                          <span style={{fontSize:13, fontWeight:600, color:"var(--text)"}}>{ch.username}</span>
                          <BadgeCheck size={10} style={{color:"var(--verified)"}} />
                        </div>
                        <div style={{fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", marginTop:2}}>
                          @{ch.username}
                        </div>
                      </div>
                      {/* Score bar */}
                      <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, minWidth:80}}>
                        <div style={{fontFamily:"var(--mono)", fontSize:13, fontWeight:700, color:scoreColor}}>
                          {ch.score ?? '—'}<span style={{fontSize:9, color:"var(--muted)"}}>/100</span>
                        </div>
                        <div style={{width:80, height:3, background:"var(--border)", borderRadius:2}}>
                          <div style={{height:"100%", borderRadius:2, background:scoreColor, width:`${Math.max(0, ch.score ?? 0)}%`, transition:"width 0.3s"}} />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Suggested to Follow */}
                {suggestions.length > 0 && (
                  <div style={{marginTop:24, paddingTop:16, borderTop:'1px solid var(--border)'}}>
                    <div style={{fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:12}}>SUGGESTED TO FOLLOW</div>
                    <div style={{display:'flex', gap:10}}>
                      {suggestions.map(s => (
                        <div key={s.id} onClick={() => navigate(`/channel/${s.username}`)}
                          style={{flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'12px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s'}}
                          onMouseOver={e => e.currentTarget.style.borderColor='var(--accent)'}
                          onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
                          <div style={{width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#0d6efd)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white', margin:'0 auto 8px'}}>
                            {s.username?.[0]?.toUpperCase()}
                          </div>
                          <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--verified)', display:'flex', alignItems:'center', justifyContent:'center', gap:3, marginBottom:2}}>
                            {s.username} <BadgeCheck size={9} />
                          </div>
                          <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)'}}>{s.score}/100</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    <span className="section-label"><Cpu size={12} style={{display:'inline',verticalAlign:'middle',marginRight:5}} />Multi-Source Stories</span>
                    <span className="count-badge">{dbStories.length} threads</span>
                    {(profile?.role === 'osint' || profile?.role === 'admin') && (
                      <button onClick={() => setShowComposer(true)} style={{marginLeft:8,padding:'4px 10px',background:'rgba(0,255,136,0.1)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:4,fontFamily:'var(--mono)',fontSize:9,color:'var(--verified)',cursor:'pointer',letterSpacing:1}}>
                        <BadgeCheck size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} /> NEW
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
                    stories={dbStories.filter(s => {
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
                  <div key={story.id} className="detail-panel">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                      {(story.breaking || story.is_breaking) && <span className="breaking-tag">BREAKING</span>}
                      <span className="story-tag">{story.tag}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)"}}>First reported {story.time}</span>
                      {!isMobile && (
                        <button onClick={()=>setNav("map")} style={{marginLeft:"auto",background:"transparent",border:"1px solid var(--border)",borderRadius:3,padding:"3px 9px",fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",cursor:"pointer",letterSpacing:1, display:'flex',alignItems:'center',gap:4}}><MapPin size={8} /> VIEW ON MAP</button>
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
                            {i===0?<><Flag size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />FIRST: </>:`+${(s.t||'').replace("T+","")}: `}
                            {s.name || s.posts?.users?.username || 'Source'}
                          </div>
                        </span>
                      ))}
                    </div>
                    <div className="detail-summary" style={{marginTop:16}}>
                      <div className="detail-summary-label"><Cpu size={10} style={{display:'inline',verticalAlign:'middle',marginRight:5}} />AI-SYNTHESISED SUMMARY</div>
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
                          <div className="score-badge"><Award size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />{s.score || s.posts?.users?.score || '??'} / 100</div>
                        </div>
                        <div className="source-post-body">{s.body || s.posts?.body || ''}</div>
                        <div className="source-post-time">
                          {s.first && <span className="first-report"><Flag size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />First to report</span>}
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
                  <Cpu size={40} style={{opacity:0.25}} />
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
              <span className="bn-item-icon"><item.Icon size={18} /></span>
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
                <BadgeCheck size={40} style={{marginBottom:12,color:"var(--verified)"}} />
                <div style={{fontFamily:"var(--mono)",color:"var(--verified)",fontSize:14,marginBottom:8}}>APPLICATION SUBMITTED</div>
                <div style={{fontSize:12,color:"var(--muted)"}}>Your application is under review. You'll be notified within 72 hours.</div>
              </div>
            ) : <>
              <div className="modal-title"><BadgeCheck size={13} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />Apply for OSINT Channel Status</div>
              <div className="modal-sub">Verified OSINT channels gain exclusive access to post in the Intel Stories section. Applications are evaluated on a rolling basis.</div>
              <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--accent)",letterSpacing:2,marginBottom:8}}>EVALUATION CRITERIA</div>
              <div className="crit-list">
                {[[Award,"Accuracy Score","Historical post accuracy, weighted by severity"],[Flag,"Breaking Speed","Time-to-first-report vs other sources"],[Globe2,"Source Quality","Evidence grade: satellite, AIS, intercepts, human OSINT"],[BadgeCheck,"Track Record","90+ days active, 50+ verified posts minimum"]].map(([Ic,lbl,txt],i)=>(
                  <div key={i} className="crit-item">
                    <Ic size={13} style={{color:"var(--accent)",flexShrink:0}} />
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
              {applyError && (
                <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(192,64,74,0.1)', border: '1px solid var(--accent2)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', marginBottom: 8 }}>
                  {applyError}
                </div>
              )}
              <div className="modal-actions">
                <button className="btn" onClick={() => { setShowApply(false); setApplyError('') }}>Cancel</button>
                <button className="btn primary" onClick={() => { setApplyError(''); doApply() }}>Submit Application</button>
              </div>
            </>}
          </div>
        </div>
      )}

      {showComposer && (
        <StoryComposer
          onClose={() => setShowComposer(false)}
          onPublished={async (post) => {
            setShowComposer(false)
            // Wait for refreshStorySummary to finish writing to DB
            await new Promise(r => setTimeout(r, 3000))
            // Find which story this post belongs to and refresh it
            const { data } = await supabase
              .from('story_sources')
              .select('story_id')
              .eq('post_id', post.id)
              .single()
            if (data?.story_id) await refreshStory(data.story_id)
          }}
        />
      )}

      {showNotifs && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onClose={() => setShowNotifs(false)}
          style={isMobile
            ? { position: 'fixed', left: 0, right: 0, top: 56, bottom: 56, width: '100%', borderRadius: 0, maxHeight: 'none' }
            : { position: 'fixed', left: 220, top: 60, right: 'auto' }
          }
        />
      )}
    </>
  );
}
