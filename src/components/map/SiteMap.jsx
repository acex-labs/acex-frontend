import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '../../context/ThemeContext'

function makeSiteIcon() {
  return L.divIcon({
    className:  'site-icon-root',
    iconSize:   [22, 22],
    iconAnchor: [11, 11],
    html: `
      <div class="site-wrapper">
        <div class="site-dot"></div>
      </div>
    `,
  })
}

export default function SiteMap({ sites = [], onSiteClick }) {
  const { resolved } = useTheme()
  const mappable = sites.filter(s => s.latitude != null && s.longitude != null)

  return (
    <MapContainer
      center={[20, 15]}
      zoom={2}
      minZoom={2}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        key={resolved}
        attribution="Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS User Community"
        url={resolved === 'light'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'}
      />
      <TileLayer
        key={`${resolved}-ref`}
        url={resolved === 'light'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'}
      />

      {mappable.map(site => (
        <Marker
          key={site.id ?? site.name}
          position={[site.latitude, site.longitude]}
          icon={makeSiteIcon()}
          eventHandlers={{ click: () => onSiteClick?.(site) }}
        >
          <Tooltip
            direction="top"
            offset={[0, -9]}
            opacity={1}
            className="site-tooltip"
          >
            <div style={{ padding: '7px 11px', minWidth: 130 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-content)', marginBottom: 2 }}>
                {site.display_name || site.name}
              </div>
              {site.city && (
                <div style={{ fontSize: 11, color: 'var(--color-subtle)' }}>
                  {site.city}{site.country ? `, ${site.country}` : ''}
                </div>
              )}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}
