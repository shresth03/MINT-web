import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function WorldMap({ filter, onRegionClick, regions: propRegions }) {
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

  const allRegions = propRegions || [];
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
