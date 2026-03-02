import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

const DEFAULT_REGIONS = [
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
]

export function useRegions() {
  const [regions, setRegions] = useState(DEFAULT_REGIONS)

  useEffect(() => {
    async function fetchRegionCounts() {
      const { data, error } = await supabase
        .from('stories')
        .select('region, is_breaking')

      if (error || !data) return

      const counts = {}
      const breaking = {}
      data.forEach(s => {
        if (s.region) {
          counts[s.region] = (counts[s.region] || 0) + 1
          if (s.is_breaking) breaking[s.region] = true
        }
      })

      setRegions(DEFAULT_REGIONS.map(r => ({
        ...r,
        count: counts[r.id] || r.count,
        breaking: breaking[r.id] || r.breaking,
        color: breaking[r.id] ? "#ff6b35" : counts[r.id] ? "#ffcc00" : r.color
      })))
    }

    fetchRegionCounts()
  }, [])

  return { regions }
}