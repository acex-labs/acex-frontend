import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MapContainer, TileLayer } from 'react-leaflet'
import './index.css'
import SiteMap from './components/map/SiteMap'
import RegionFormModal from './components/regions/RegionFormModal'
import { ThemeProvider } from './context/ThemeContext'

const qc = new QueryClient()
const sites = [{ id: 1, name: 'test-site', latitude: 59.33, longitude: 18.06 }]

function MapWithoutIsolation() {
  return (
    <MapContainer center={[59.33, 18.06]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
    </MapContainer>
  )
}

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={qc}>
    <ThemeProvider>
      <div style={{ display: 'flex', gap: 8, padding: 8, height: 420 }}>
        <div id="map-old" style={{ width: '48vw', height: 400, border: '1px solid red' }}>
          <MapWithoutIsolation />
        </div>
        <div id="map-new" style={{ width: '48vw', height: 400, border: '1px solid lime' }}>
          <SiteMap sites={sites} />
        </div>
      </div>
      <RegionFormModal onClose={() => {}} onSuccess={() => {}} />
    </ThemeProvider>
  </QueryClientProvider>
)
