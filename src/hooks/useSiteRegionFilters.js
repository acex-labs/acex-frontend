import { useQuery } from '@tanstack/react-query'
import { fetchAllSites, fetchRegions } from '../api/inventory'

const sorted = names => [...new Set(names)].sort((a, b) => a.localeCompare(b))

// The site and region dropdowns of a list: every name the inventory has. A site or region in the address is always
// among the choices, so the filter it sets can be seen and cleared. Pass `{ sites: false }` or `{ regions: false }`
// for a list that has only one of them.
// The queries share their cache with the dashboard map, the site rankings and the compliance pages.
export function useSiteRegionFilters({ site = '', region = '' } = {}, { sites = true, regions = true } = {}) {
  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites'],
    queryFn: fetchAllSites,
    staleTime: 120_000,
    enabled: sites,
  })
  const { data: regionData } = useQuery({
    queryKey: ['regions', 'all'],
    queryFn: () => fetchRegions({ limit: 1000 }),
    staleTime: 120_000,
    enabled: regions,
  })

  const filters = []
  if (sites) {
    filters.push({
      key: 'site', label: 'All sites', width: '150px',
      options: sorted([...allSites.map(s => s.name), ...(site ? [site] : [])]),
    })
  }
  if (regions) {
    filters.push({
      key: 'region', label: 'All regions', width: '150px',
      options: sorted([...(regionData?.items ?? []).map(r => r.name), ...(region ? [region] : [])]),
    })
  }
  return filters
}
