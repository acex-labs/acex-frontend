import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
  const mappable = sites.filter(s => s.latitude != null && s.longitude != null)

  return (
    <MapContainer
      center={[20, 15]}
      zoom={2}
      minZoom={2}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

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
              <div style={{ fontWeight: 600, fontSize: 12, color: '#ececec', marginBottom: 2 }}>
                {site.display_name || site.name}
              </div>
              {site.city && (
                <div style={{ fontSize: 11, color: '#555' }}>
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
