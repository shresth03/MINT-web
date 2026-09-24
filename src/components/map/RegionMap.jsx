import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'

function markerIcon(color) {
  const fill = (color || '#4dc8e8').replace('#', '%23')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><circle cx="9" cy="9" r="7" fill="${fill}" stroke="%230a0a0a" stroke-width="2"/></svg>`
  return `data:image/svg+xml,${svg}`
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa5b5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4dc8e8' }, { weight: 0.8 }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#e0e8f0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050505' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111111' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

export default function RegionMap({ region }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="map-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <MapPin size={22} style={{ color: 'var(--muted)' }} />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: 1, textAlign: 'center', maxWidth: 260 }}>
          Google Maps not configured.
          <div style={{ marginTop: 4, fontSize: 10 }}>Set VITE_GOOGLE_MAPS_API_KEY to enable the region drill-down.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="map-body">
      <APIProvider apiKey={apiKey}>
        <Map
          key={region.id}
          defaultCenter={{ lat: region.lat, lng: region.lng }}
          defaultZoom={5}
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          styles={import.meta.env.VITE_GOOGLE_MAP_ID ? undefined : DARK_MAP_STYLE}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: '100%', height: '100%' }}
        >
          <Marker
            position={{ lat: region.lat, lng: region.lng }}
            icon={{ url: markerIcon(region.color), scaledSize: { width: 18, height: 18 } }}
          />
        </Map>
      </APIProvider>
    </div>
  )
}
