import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'

// Fixed ray lengths so they don't flicker each animation frame
const TYCHO_RAYS  = [2.8, 3.4, 2.6, 3.6, 3.0, 2.5, 3.2, 2.9]
const COPER_RAYS  = [2.5, 3.0, 2.3, 2.8, 2.6, 3.1]

export default function WorldMap({ filter, onRegionClick, regions: propRegions }) {
  const svgRef        = useRef(null)
  const wrapRef       = useRef(null)
  const rotRef        = useRef([-78, -22, 0])  // India-centric: 78°E, 22°N
  const dragRef       = useRef(false)
  const lastPos       = useRef(null)
  const rafRef        = useRef(null)
  const kbFocusRef    = useRef(false)
  const roverCloseRef = useRef(null)
  // Track last dims for which static layer was built — avoids full teardown every frame
  const staticReadyRef = useRef(null)

  const [tooltip,     setTooltip]   = useState(null)
  const [topoData,    setTopoData]  = useState(null)
  const [indiaData,   setIndiaData] = useState(null)
  const [dims,        setDims]      = useState({ w: 900, h: 520 })
  const [showRover,   setShowRover] = useState(false)
  const [isDragging,  setIsDragging] = useState(false)

  const allRegions = propRegions || []
  const regions    = filter === 'ALL' ? allRegions : allRegions.filter(r => r.tags.includes(filter))

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(([e]) =>
      setDims({ w: e.contentRect.width, h: e.contentRect.height })
    )
    if (wrapRef.current) obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [])

  // Fetch topojson countries
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json()).then(setTopoData).catch(() => {})
  }, [])

  // Fetch correct India boundary (Survey of India compliant — includes PoK & Aksai Chin)
  useEffect(() => {
    fetch('/india-boundary.json')
      .then(r => r.json()).then(setIndiaData).catch(() => {})
  }, [])

  // Focus rover close button on open
  useEffect(() => {
    if (showRover) roverCloseRef.current?.focus()
  }, [showRover])

  // Inject topojson lib if missing
  useEffect(() => {
    if (!window.topojson) {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js'
      s.onload = () => setDims(d => ({ ...d }))
      document.head.appendChild(s)
    }
  }, [])

  // Auto-rotation loop
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      draw()
      return
    }
    let lastTime = null
    function tick(time) {
      if (!dragRef.current && !kbFocusRef.current) {
        if (lastTime !== null) {
          rotRef.current = [rotRef.current[0] + (time - lastTime) * 0.01, rotRef.current[1], 0]
        }
        lastTime = time
        draw()
      } else {
        lastTime = null
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [dims, regions, topoData, indiaData]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildStaticLayer(svg, w, h, r, mX, mY, mR) {
    svg.selectAll('*').remove()
    staticReadyRef.current = { w, h }

    // ── DEFS ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs')

    // Globe outer glow
    const gg = defs.append('radialGradient').attr('id', 'gg')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
    gg.append('stop').attr('offset', '85%').attr('stop-color', '#081c30').attr('stop-opacity', 1)
    gg.append('stop').attr('offset', '100%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.08)

    // Moon surface
    const mb = defs.append('radialGradient').attr('id', 'mb')
      .attr('cx', '36%').attr('cy', '30%').attr('r', '70%')
    mb.append('stop').attr('offset',  '0%').attr('stop-color', '#e0dcd2')
    mb.append('stop').attr('offset', '22%').attr('stop-color', '#cac4b0')
    mb.append('stop').attr('offset', '52%').attr('stop-color', '#968c78')
    mb.append('stop').attr('offset', '76%').attr('stop-color', '#524840')
    mb.append('stop').attr('offset','100%').attr('stop-color', '#1a1510')

    // Moon terminator
    const mt = defs.append('linearGradient').attr('id', 'mt')
      .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%')
    mt.append('stop').attr('offset', '40%').attr('stop-color', '#000').attr('stop-opacity', 0)
    mt.append('stop').attr('offset', '66%').attr('stop-color', '#000').attr('stop-opacity', 0.28)
    mt.append('stop').attr('offset','100%').attr('stop-color', '#000').attr('stop-opacity', 0.84)

    // Moon atmospheric halo
    const mh = defs.append('radialGradient').attr('id', 'mh')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
    mh.append('stop').attr('offset', '80%').attr('stop-color', '#c8c0a8').attr('stop-opacity', 0)
    mh.append('stop').attr('offset', '92%').attr('stop-color', '#c8c0a8').attr('stop-opacity', 0.07)
    mh.append('stop').attr('offset','100%').attr('stop-color', '#c8c0a8').attr('stop-opacity', 0)

    // Clip path for moon features
    defs.append('clipPath').attr('id', 'mc')
      .append('circle').attr('cx', mX).attr('cy', mY).attr('r', mR - 0.5)

    // Limb darkening — transparent at center, dark at edges → real sphere look
    const ldg = defs.append('radialGradient').attr('id', 'ldg')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
    ldg.append('stop').attr('offset',  '0%').attr('stop-color', '#000').attr('stop-opacity', 0)
    ldg.append('stop').attr('offset', '58%').attr('stop-color', '#000').attr('stop-opacity', 0)
    ldg.append('stop').attr('offset', '80%').attr('stop-color', '#000').attr('stop-opacity', 0.20)
    ldg.append('stop').attr('offset','100%').attr('stop-color', '#000').attr('stop-opacity', 0.52)

    // Specular highlight — userSpaceOnUse so cx/cy can be nudged per frame
    const sg = defs.append('radialGradient').attr('id', 'sg')
      .attr('cx', w/2 - r*0.28).attr('cy', h/2 - r*0.22).attr('r', r*0.40)
      .attr('gradientUnits', 'userSpaceOnUse')
    sg.append('stop').attr('offset',  '0%').attr('stop-color', '#d0eeff').attr('stop-opacity', 0.13)
    sg.append('stop').attr('offset', '48%').attr('stop-color', '#4dc8e8').attr('stop-opacity', 0.05)
    sg.append('stop').attr('offset','100%').attr('stop-color', '#000000').attr('stop-opacity', 0)

    // Atmosphere ring — thin halo just outside globe surface, breathing opacity
    const ag = defs.append('radialGradient').attr('id', 'ag')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
    ag.append('stop').attr('offset', '84%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0)
    ag.append('stop').attr('offset', '93%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.08)
    ag.append('stop').attr('offset','100%').attr('stop-color', '#004466').attr('stop-opacity', 0)

    // ── GLOBE BACKGROUND (static — never moves) ────────────────────────────
    svg.append('circle').attr('cx', w/2).attr('cy', h/2).attr('r', r + 8)
      .attr('fill', 'url(#gg)').attr('stroke', '#1e3a52').attr('stroke-width', 1)
    svg.append('circle').attr('cx', w/2).attr('cy', h/2).attr('r', r)
      .attr('fill', '#081c30').attr('stroke', '#00d4ff')
      .attr('stroke-width', 0.5).attr('stroke-opacity', 0.15)

    // ── DYNAMIC LAYER SLOT (countries/graticule/hotspots go here each frame) ──
    svg.append('g').attr('class', 'globe-dynamic')

    // ── DEPTH OVERLAYS (drawn once on top of countries, below moon) ────────
    // Limb darkening: static, no per-frame update needed
    svg.append('circle').attr('cx', w/2).attr('cy', h/2).attr('r', r)
      .attr('fill', 'url(#ldg)').attr('pointer-events', 'none')
    // Specular highlight: circle is static; gradient cx/cy updated each frame
    svg.append('circle').attr('cx', w/2).attr('cy', h/2).attr('r', r)
      .attr('class', 'spec-hl').attr('fill', 'url(#sg)').attr('pointer-events', 'none')
    // Atmospheric halo: r+16 so ring peaks right at globe surface edge
    svg.append('circle').attr('cx', w/2).attr('cy', h/2).attr('r', r + 16)
      .attr('class', 'atmos-br').attr('fill', 'url(#ag)').attr('pointer-events', 'none')

    // ── REALISTIC MOON (static — corner position, drawn once on top) ──────
    svg.append('circle').attr('cx', mX).attr('cy', mY).attr('r', mR * 1.20)
      .attr('fill', 'url(#mh)').attr('pointer-events', 'none')

    const moon = svg.append('g').style('cursor', 'pointer')
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', 'Chandrayaan-3 moon — press to view Pragyan rover')
    moon
      .on('click', () => setShowRover(true))
      .on('focus', () => { kbFocusRef.current = true })
      .on('blur',  () => { kbFocusRef.current = false })
      .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowRover(true) } })

    moon.append('circle').attr('cx', mX).attr('cy', mY).attr('r', mR)
      .attr('fill', 'url(#mb)')

    const feats = moon.append('g').attr('clip-path', 'url(#mc)')

    const maria = [
      { cx: mX - mR*0.28, cy: mY - mR*0.10, rx: mR*0.40, ry: mR*0.46, o: 0.56 },
      { cx: mX - mR*0.22, cy: mY - mR*0.32, rx: mR*0.21, ry: mR*0.18, o: 0.62 },
      { cx: mX + mR*0.10, cy: mY - mR*0.27, rx: mR*0.14, ry: mR*0.12, o: 0.58 },
      { cx: mX + mR*0.18, cy: mY - mR*0.10, rx: mR*0.16, ry: mR*0.13, o: 0.55 },
      { cx: mX - mR*0.12, cy: mY + mR*0.22, rx: mR*0.13, ry: mR*0.10, o: 0.52 },
      { cx: mX + mR*0.40, cy: mY - mR*0.24, rx: mR*0.10, ry: mR*0.08, o: 0.64 },
      { cx: mX + mR*0.32, cy: mY + mR*0.04, rx: mR*0.09, ry: mR*0.08, o: 0.50 },
    ]
    maria.forEach(m => {
      feats.append('ellipse')
        .attr('cx', m.cx).attr('cy', m.cy).attr('rx', m.rx).attr('ry', m.ry)
        .attr('fill', '#26231a').attr('fill-opacity', m.o)
    })

    const strokes = [
      { x1: mX - mR*0.05, y1: mY - mR*0.60, x2: mX + mR*0.15, y2: mY - mR*0.50, o: 0.07 },
      { x1: mX + mR*0.10, y1: mY + mR*0.35, x2: mX + mR*0.35, y2: mY + mR*0.45, o: 0.06 },
      { x1: mX - mR*0.45, y1: mY + mR*0.30, x2: mX - mR*0.20, y2: mY + mR*0.40, o: 0.07 },
    ]
    strokes.forEach(s => {
      feats.append('line')
        .attr('x1', s.x1).attr('y1', s.y1).attr('x2', s.x2).attr('y2', s.y2)
        .attr('stroke', '#9a9080').attr('stroke-width', mR * 0.04)
        .attr('stroke-opacity', s.o).attr('stroke-linecap', 'round')
    })

    const craters = [
      { dx: 0.05,  dy: 0.48,  r: 0.09, rays: TYCHO_RAYS  },
      { dx: -0.20, dy: 0.12,  r: 0.07, rays: COPER_RAYS  },
      { dx: -0.24, dy: -0.42, r: 0.06 },
      { dx: -0.35, dy:  0.08, r: 0.05 },
      { dx: -0.38, dy: -0.16, r: 0.04, bright: true },
      { dx: -0.08, dy:  0.44, r: 0.11 },
      { dx: -0.50, dy:  0.06, r: 0.06 },
      { dx:  0.25, dy:  0.30, r: 0.04 },
      { dx:  0.32, dy: -0.38, r: 0.035 },
      { dx: -0.10, dy:  0.34, r: 0.035 },
      { dx:  0.15, dy: -0.46, r: 0.030 },
      { dx:  0.40, dy:  0.10, r: 0.030 },
      { dx: -0.42, dy:  0.30, r: 0.040 },
      { dx:  0.06, dy: -0.20, r: 0.025 },
      { dx: -0.14, dy: -0.28, r: 0.025 },
    ]
    craters.forEach(c => {
      const cx = mX + c.dx * mR
      const cy = mY + c.dy * mR
      const cr = c.r * mR
      feats.append('circle').attr('cx', cx).attr('cy', cy).attr('r', cr + cr * 0.30)
        .attr('fill', c.bright ? '#ece8d8' : '#a89e88').attr('fill-opacity', 0.30)
      feats.append('circle').attr('cx', cx + cr*0.10).attr('cy', cy + cr*0.10).attr('r', cr * 0.75)
        .attr('fill', '#16140e').attr('fill-opacity', 0.70)
      feats.append('circle').attr('cx', cx - cr*0.28).attr('cy', cy - cr*0.28).attr('r', cr * 0.36)
        .attr('fill', c.bright ? '#fffff5' : '#d0c8b0')
        .attr('fill-opacity', c.bright ? 0.72 : 0.40)
      if (c.rays) {
        c.rays.forEach((len, i) => {
          const angle = (i / c.rays.length) * Math.PI * 2
          feats.append('line')
            .attr('x1', cx).attr('y1', cy)
            .attr('x2', cx + Math.cos(angle) * cr * len)
            .attr('y2', cy + Math.sin(angle) * cr * len)
            .attr('stroke', '#ccc4a4').attr('stroke-width', 0.5)
            .attr('stroke-opacity', 0.20)
        })
      }
    })

    feats.append('ellipse')
      .attr('cx', mX).attr('cy', mY + mR * 0.76)
      .attr('rx', mR * 0.18).attr('ry', mR * 0.06)
      .attr('fill', '#d8d4c8').attr('fill-opacity', 0.18)

    feats.append('rect')
      .attr('x', mX - mR).attr('y', mY - mR)
      .attr('width', mR * 2).attr('height', mR * 2)
      .attr('fill', 'url(#mt)').attr('pointer-events', 'none')

    moon.append('circle').attr('cx', mX).attr('cy', mY).attr('r', mR)
      .attr('fill', 'url(#mt)').attr('pointer-events', 'none')

    moon.append('circle').attr('cx', mX).attr('cy', mY).attr('r', mR)
      .attr('fill', 'none').attr('stroke', '#c8c0a8')
      .attr('stroke-width', 1.8).attr('stroke-opacity', 0.16)
      .attr('pointer-events', 'none')

    // Chandrayaan-3 landing site
    const c3y = mY + mR * 0.82
    moon.append('circle').attr('cx', mX).attr('cy', c3y).attr('r', mR * 0.115)
      .attr('fill', '#00d4ff').attr('fill-opacity', 0.12).attr('pointer-events', 'none')
    moon.append('circle').attr('cx', mX).attr('cy', c3y).attr('r', mR * 0.058)
      .attr('fill', '#00d4ff').attr('fill-opacity', 0.42).attr('pointer-events', 'none')

    const ls = mR * 0.038
    moon.append('line')
      .attr('x1', mX - ls*2.5).attr('y1', c3y)
      .attr('x2', mX + ls*2.5).attr('y2', c3y)
      .attr('stroke', '#00d4ff').attr('stroke-width', 1.5).attr('pointer-events', 'none')
    moon.append('line')
      .attr('x1', mX).attr('y1', c3y - ls*2.5)
      .attr('x2', mX).attr('y2', c3y + ls*2.5)
      .attr('stroke', '#00d4ff').attr('stroke-width', 1.5).attr('pointer-events', 'none')
    moon.append('circle').attr('cx', mX).attr('cy', c3y).attr('r', ls)
      .attr('fill', '#00d4ff').attr('pointer-events', 'none')

    moon.append('text')
      .attr('x', mX).attr('y', c3y + mR * 0.17)
      .attr('text-anchor', 'middle').attr('fill', '#00d4ff')
      .attr('font-size', Math.max(5.5, mR * 0.088))
      .attr('font-family', "var(--mono)").attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text('CHANDRAYAAN-3')

    moon.append('text')
      .attr('x', mX).attr('y', c3y + mR * 0.27)
      .attr('text-anchor', 'middle').attr('fill', '#9a9278')
      .attr('font-size', Math.max(4.5, mR * 0.064))
      .attr('font-family', "var(--mono)")
      .attr('pointer-events', 'none')
      .text('SOUTH POLE · 2023')

    moon.append('text')
      .attr('x', mX).attr('y', mY - mR - 7)
      .attr('text-anchor', 'middle').attr('fill', '#c8c0a8')
      .attr('font-size', Math.max(7, mR * 0.10))
      .attr('font-family', "var(--mono)").attr('letter-spacing', 2)
      .attr('pointer-events', 'none')
      .text('MOON')

    moon.append('text')
      .attr('x', mX).attr('y', mY - mR - 15)
      .attr('text-anchor', 'middle').attr('fill', '#3a5068')
      .attr('font-size', 6)
      .attr('font-family', "var(--mono)")
      .attr('pointer-events', 'none')
      .text('[ CLICK ]')
  }

  function draw() {
    const svg = d3.select(svgRef.current)
    const { w, h } = dims
    const r = Math.min(w, h) / 2 - 20
    const mX = 78
    const mY = 78
    const mR = Math.min(52, r * 0.20)

    const proj = d3.geoOrthographic()
      .scale(r).translate([w / 2, h / 2])
      .rotate(rotRef.current).clipAngle(90)
    const path = d3.geoPath().projection(proj)

    // Rebuild static layer only when dims change or SVG was cleared externally
    const needsRebuild =
      !staticReadyRef.current ||
      staticReadyRef.current.w !== w ||
      staticReadyRef.current.h !== h ||
      svg.select('.globe-dynamic').empty()

    if (needsRebuild) {
      buildStaticLayer(svg, w, h, r, mX, mY, mR)
    }

    // ── DEPTH ANIMATION — update gradient attrs on the static overlays ─────
    const now = Date.now()
    // Specular: slow Lissajous drift in upper-left quadrant
    const sx = w/2 - r*0.28 + Math.cos(now / 11000) * r * 0.09
    const sy = h/2 - r*0.22 + Math.sin(now / 15000) * r * 0.07
    svg.select('#sg').attr('cx', sx).attr('cy', sy)
    // Atmosphere: gentle sine-wave breathing (0.30 → 1.0 intensity)
    svg.select('.atmos-br').attr('fill-opacity', 0.65 + Math.sin(now / 3200) * 0.35)

    // ── DYNAMIC CONTENT — cleared and redrawn every frame ─────────────────
    const dynG = svg.select('.globe-dynamic')
    dynG.selectAll('*').remove()

    dynG.append('path').datum(d3.geoGraticule()()).attr('d', path)
      .attr('fill', 'none').attr('stroke', '#163448').attr('stroke-width', 0.5)

    if (topoData && window.topojson) {
      const countries = window.topojson.feature(topoData, topoData.objects.countries).features
      dynG.append('g').selectAll('path')
        .data(countries.filter(f => f.id !== 356))
        .join('path').attr('d', path)
        .attr('fill', '#111418').attr('stroke', '#4a7090').attr('stroke-width', 0.65)

      // Only draw India once the world atlas is present — avoids a winding-order
      // flood-fill glitch that occurs when indiaData (local file, loads instantly)
      // renders alone before topoData (CDN fetch) arrives.
      if (indiaData) {
        dynG.append('g').selectAll('path')
          .data(indiaData.features)
          .join('path').attr('d', path)
          .attr('fill', '#111418').attr('stroke', '#4a7090').attr('stroke-width', 0.65)
      }
    }

    // ── EVENT HOTSPOTS ────────────────────────────────────────────────────
    const maxC  = d3.max(regions, d => d.count) || 1
    const rScale = d3.scaleSqrt().domain([1, maxC]).range([6, 22])
    const g = dynG.append('g')

    regions.forEach(reg => {
      const coords = proj([reg.lng, reg.lat])
      if (!coords) return
      if (d3.geoDistance([reg.lng, reg.lat], [-rotRef.current[0], -rotRef.current[1]]) > Math.PI / 2) return
      const [cx, cy] = coords
      const bR = rScale(reg.count)

      if (reg.breaking) {
        const t = (Date.now() % 1800) / 1800
        const e = 1 - Math.pow(1 - t, 2)
        g.append('circle').attr('cx', cx).attr('cy', cy)
          .attr('r', bR + bR * 1.8 * e)
          .attr('fill', 'none').attr('stroke', reg.color)
          .attr('stroke-width', 1.5).attr('stroke-opacity', 0.8 * (1 - e))
          .attr('pointer-events', 'none')
      }

      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', bR + 3)
        .attr('fill', reg.color).attr('fill-opacity', 0.06).attr('pointer-events', 'none')

      const circle = g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', bR)
        .attr('fill', reg.color).attr('fill-opacity', reg.breaking ? 0.45 : 0.25)
        .attr('stroke', reg.color).attr('stroke-width', reg.breaking ? 2 : 1.2)
        .attr('stroke-opacity', 0.9).style('cursor', 'pointer')
        .attr('tabindex', 0).attr('role', 'button')
        .attr('aria-label', `${reg.name}: ${reg.count} active event${reg.count === 1 ? '' : 's'}`)

      g.append('text').attr('x', cx).attr('y', cy + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#fff').attr('font-size', bR > 14 ? 10 : 8)
        .attr('font-family', "var(--mono)").attr('font-weight', '700')
        .attr('pointer-events', 'none').text(reg.count)

      circle
        .on('focus', () => { kbFocusRef.current = true })
        .on('blur',  () => { kbFocusRef.current = false })
        .on('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRegionClick(reg) }
        })
        .on('mouseover', function (event) {
          d3.select(this).attr('fill-opacity', 0.7)
          setTooltip({ reg, mx: event.clientX, my: event.clientY })
        })
        .on('mousemove', function (event) {
          setTooltip(p => p ? { ...p, mx: event.clientX, my: event.clientY } : null)
        })
        .on('mouseout', function () {
          d3.select(this).attr('fill-opacity', reg.breaking ? 0.45 : 0.25)
          setTooltip(null)
        })
        .on('click', () => onRegionClick(reg))
    })
  }

  // Drag-to-rotate
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const getPos = e => e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY }

    const onStart = e => { dragRef.current = true; setIsDragging(true); lastPos.current = getPos(e) }
    const onMove  = e => {
      if (!dragRef.current || !lastPos.current) return
      const pos = getPos(e)
      const dx = pos.x - lastPos.current.x
      const dy = pos.y - lastPos.current.y
      rotRef.current = [rotRef.current[0] + dx * 0.4, rotRef.current[1] - dy * 0.4, 0]
      lastPos.current = pos
      draw()
    }
    const onEnd = () => { dragRef.current = false; setIsDragging(false); lastPos.current = null }

    el.addEventListener('mousedown',  onStart)
    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseup',    onEnd)
    el.addEventListener('mouseleave', onEnd)
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: true })
    el.addEventListener('touchend',   onEnd)
    return () => {
      el.removeEventListener('mousedown',  onStart)
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseup',    onEnd)
      el.removeEventListener('mouseleave', onEnd)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [dims, regions, topoData, indiaData]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className="map-body" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
      <svg ref={svgRef} className="map-svg" />

      {tooltip && (
        <div className="tooltip-box" style={{ left: tooltip.mx + 14, top: tooltip.my - 60 }}>
          <div className="tt-region">{tooltip.reg.name.toUpperCase()}</div>
          <div className="tt-count">{tooltip.reg.count}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 4 }}>
            active events
          </div>
          {tooltip.reg.breaking && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--accent2)', letterSpacing: 1, marginBottom: 4 }}>
              ⚑ BREAKING EVENT
            </div>
          )}
          <div className="tt-tags">
            {tooltip.reg.tags.map(t => <span key={t} className="tt-tag">{t}</span>)}
          </div>
          <div className="tt-hint">Click to view details →</div>
        </div>
      )}

      {showRover && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(2, 5, 10, 0.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setShowRover(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chandrayaan-3 Pragyan Rover"
            style={{ position: 'relative', maxWidth: 680, width: '90vw', padding: '28px 24px' }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.key === 'Escape' && setShowRover(false)}
          >
            <div style={{
              fontFamily: "var(--mono)",
              color: '#00d4ff', letterSpacing: 3, fontSize: 9,
              marginBottom: 14, textTransform: 'uppercase',
            }}>
              ISRO · CHANDRAYAAN-3 · VIKRAM LANDER · SOUTH POLE · AUGUST 2023
            </div>

            <div style={{ position: 'relative' }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chandrayaan-3_Pragyan_rover_on_Moon.jpg/960px-Chandrayaan-3_Pragyan_rover_on_Moon.jpg"
                alt="Pragyan rover on the lunar south pole"
                style={{
                  width: '100%', display: 'block',
                  borderRadius: 3,
                  border: '1px solid rgba(0,212,255,0.22)',
                }}
              />
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)',
                borderRadius: 3,
              }} />
            </div>

            <div style={{
              marginTop: 12, display: 'flex', justifyContent: 'space-between',
              fontFamily: "var(--mono)", fontSize: 9,
            }}>
              <span style={{ color: '#5a7a9a' }}>Pragyan rover · photographed by Vikram lander</span>
              <span style={{ color: '#3a5a6a' }}>ISRO 2023</span>
            </div>

            <button
              ref={roverCloseRef}
              aria-label="Close rover photo"
              onClick={() => setShowRover(false)}
              style={{
                position: 'absolute', top: 4, right: -4,
                background: 'none', border: 'none',
                color: '#4a6a8a', cursor: 'pointer',
                fontSize: 16, fontFamily: 'var(--mono)', padding: '4px 8px',
              }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
