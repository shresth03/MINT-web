import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

export function useRegions() {
  const [regions, setRegions] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchRegionCounts() {
      const { data, error } = await supabase
        .from('stories')
        .select('region, region_lat, region_lng, is_breaking')

      if (error || !data) {
        setLoaded(true)
        return
      }

      // Group stories by region name, accumulate counts and coordinates
      const map = {}
      data.forEach(s => {
        if (!s.region || s.region === 'global' || s.region_lat == null || s.region_lng == null) return
        if (!map[s.region]) {
          map[s.region] = { count: 0, breaking: false, lat: s.region_lat, lng: s.region_lng }
        }
        map[s.region].count++
        if (s.is_breaking) map[s.region].breaking = true
      })

      const live = Object.entries(map)
        .filter(([, r]) => r.count > 0)
        .map(([name, r]) => ({
          id: name,
          name,
          lat: r.lat,
          lng: r.lng,
          count: r.count,
          breaking: r.breaking,
          color: r.breaking ? '#ff6b35' : r.count >= 8 ? '#ffcc00' : '#00d4ff',
          tags: [],
        }))

      setRegions(live)
      setLoaded(true)
    }

    fetchRegionCounts()
  }, [])

  return { regions, loaded }
}
