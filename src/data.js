export const REGIONS = [
    { id: "hormuz",    name: "Strait of Hormuz",       lat: 26.5, lng: 56.5,  count: 14, breaking: true,  color: "#ff6b35", tags: ["CONFLICT", "MARITIME"] },
    { id: "ukraine",   name: "Eastern Ukraine",         lat: 49.0, lng: 37.5,  count: 22, breaking: true,  color: "#ff6b35", tags: ["CONFLICT", "MILITARY"] },
    { id: "israel",    name: "Gaza / Israel",           lat: 31.5, lng: 34.5,  count: 18, breaking: true,  color: "#ff6b35", tags: ["CONFLICT", "HUMANITARIAN"] },
    { id: "southchin", name: "South China Sea",         lat: 14.0, lng: 113.0, count: 11, breaking: false, color: "#ffcc00", tags: ["TERRITORIAL", "NAVAL"] },
    { id: "taiwan",    name: "Taiwan Strait",           lat: 24.5, lng: 120.5, count: 9,  breaking: false, color: "#ffcc00", tags: ["GEOPOLITICS", "NAVAL"] },
    { id: "reddtrade", name: "Red Sea",                 lat: 14.0, lng: 43.0,  count: 8,  breaking: false, color: "#ffcc00", tags: ["MARITIME", "SECURITY"] },
    { id: "sahel",     name: "Sahel Region",            lat: 14.0, lng: 2.0,   count: 7,  breaking: false, color: "#ffcc00", tags: ["CONFLICT", "GOVERNANCE"] },
    { id: "cyber_eu",  name: "EU Cyber Infrastructure", lat: 51.0, lng: 10.0,  count: 5,  breaking: false, color: "#00d4ff", tags: ["CYBER", "INFRASTRUCTURE"] },
    { id: "pakistan",  name: "Pakistan / Afghanistan",  lat: 33.0, lng: 68.0,  count: 5,  breaking: false, color: "#00d4ff", tags: ["SECURITY", "GEOPOLITICS"] },
    { id: "myanmar",   name: "Myanmar",                 lat: 19.0, lng: 96.5,  count: 6,  breaking: false, color: "#ffcc00", tags: ["CONFLICT", "HUMAN RIGHTS"] },
    { id: "korea",     name: "Korean Peninsula",        lat: 38.5, lng: 127.5, count: 4,  breaking: false, color: "#00d4ff", tags: ["MILITARY", "NUCLEAR"] },
    { id: "venezuela", name: "Venezuela",               lat: 7.5,  lng: -66.0, count: 3,  breaking: false, color: "#4a6080", tags: ["GOVERNANCE", "ECONOMICS"] },
  ]
  
  export const STORIES = [
    {
      id: 1, breaking: true, tag: "CONFLICT", region: "hormuz",
      headline: "Multiple explosions near port infrastructure in Strait of Hormuz",
      summary: "Three verified OSINT sources corroborate large detonations near shipping lanes approx. 12km south of Bandar Abbas. AIS signals for 4 vessels went dark.",
      time: "4m ago", confidence: 82,
      sources: [
        { name: "StratSentinel",  handle: "@StratSentinel",  score: 94, av: "#1a3a5c", ini: "SS", t: "T+0",  first: true,  body: "⚠️ AIS anomaly cluster near Bandar Abbas. 4 vessels lost transponder signal within 8-min window." },
        { name: "MaritimeWatch",  handle: "@MW_Intel",        score: 89, av: "#1a4a3c", ini: "MW", t: "T+3m", first: false, body: "Corroborating StratSentinel. Local source reports 2 distinct detonations from Qeshm Island." },
        { name: "GulfWatcher",    handle: "@GulfWatcher_OS",  score: 78, av: "#3a2a1a", ini: "GW", t: "T+6m", first: false, body: "Sentinel-6 pass from 40min prior shows no obstructions. Smoke plume approx 14km offshore." },
      ]
    },
    {
      id: 2, breaking: false, tag: "CYBER", region: "cyber_eu",
      headline: "SCADA systems targeted in coordinated EU infrastructure intrusion",
      summary: "Two threat intelligence sources identify overlapping TTPs in attacks on water treatment and power grid SCADA systems across DE, NL, PL.",
      time: "31m ago", confidence: 67,
      sources: [
        { name: "CyberSentinel_EU", handle: "@CyberSentinel_EU", score: 91, av: "#1c1a3c", ini: "CS", t: "T+0",   first: true,  body: "SCADA intrusions in DE, NL, PL share identical C2 infrastructure. Dropper uses modified Industroyer2 variant." },
        { name: "OT_Threat_Intel",  handle: "@OTThreatIntel",    score: 86, av: "#2a1a3c", ini: "OT", t: "T+14m", first: false, body: "Power grid HMI probing from same ASN block. Pattern consistent with SANDSTORM cluster activity from Q1." },
      ]
    },
    {
      id: 3, breaking: false, tag: "GEOPOLITICS", region: "ukraine",
      headline: "Mechanized troop movement observed along northern border",
      summary: "Single verified source reporting significant mechanized column movement. Awaiting corroboration from additional OSINT channels.",
      time: "1h ago", confidence: 41,
      sources: [
        { name: "GeoIntelysis", handle: "@GeoIntelysis", score: 88, av: "#1a2a3c", ini: "GI", t: "T+0", first: true, body: "Planet Labs imagery: 40+ vehicles (APCs + logistics) heading N on Route M-4." },
      ]
    },
  ]
  
  export const GENERAL_POSTS = [
    { id: 101, author: "rk_analyst",      ini: "RK", color: "#1a3050", body: "Maritime insurance premium shift in the Gulf over 72hrs is telling — Lloyd's underwriters don't move that fast without solid signal.", time: "12m ago", likes: 34, replies: 8 },
    { id: 102, author: "policywatch_dc",  ini: "PW", color: "#2a1a40", body: "Emergency UN Security Council briefing request — third in 6 weeks for the same region if confirmed.", time: "28m ago", likes: 21, replies: 5 },
    { id: 103, author: "freelance_journo",ini: "FJ", color: "#0a3020", body: "Local contacts describing significant security presence near the port since yesterday evening.", time: "45m ago", likes: 18, replies: 12 },
  ]