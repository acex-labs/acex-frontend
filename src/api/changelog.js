import { apiFetch } from './client.js'
import interfaceNotes from '../changelog.json'

// The web interface keeps its own release notes and ships them inside the bundle,
// so they always describe the version that is running, whichever backend it talks to.
const INTERFACE_COMPONENT = {
  id: interfaceNotes.component,
  name: interfaceNotes.name,
  source: 'bundled',
}

const byNewest = (a, b) => {
  if (!a.version !== !b.version) return a.version ? 1 : -1 // unreleased first
  return (b.date ?? '').localeCompare(a.date ?? '')
}

// Put the interface's notes into the product section next to the backend's.
export function withInterfaceNotes(response) {
  const sections = (response?.sections ?? []).map(section => ({ ...section }))
  let product = sections.find(section => section.id === 'product')
  if (!product) {
    product = { id: 'product', name: 'ACEX', components: [], releases: [], coming: [] }
    sections.unshift(product)
  }
  product.components = [...product.components, INTERFACE_COMPONENT]
  product.releases = [
    ...product.releases,
    ...interfaceNotes.releases.map(release => ({ ...release, component: INTERFACE_COMPONENT.id })),
  ].sort(byNewest)
  product.coming = [...product.coming, ...(interfaceNotes.coming ?? [])]
  // Highlights are the product's, whichever component keeps them; the interface may keep its own.
  const own = (interfaceNotes.highlights ?? []).map(h => ({ ...h, id: `${interfaceNotes.component}/${h.id}` }))
  const highlights = [...(response?.highlights ?? []), ...own].sort(
    (a, b) => b.date.localeCompare(a.date) || b.title.localeCompare(a.title),
  )
  return { ...response, highlights, sections }
}

// Release notes of the backend and of every installed component that publishes
// them, plus planned work, with the interface's own notes added. Sections after
// the first are deployment-specific. A backend that does not have the endpoint
// yet still leaves the interface's notes readable.
export async function fetchChangelog() {
  try {
    return withInterfaceNotes(await apiFetch('/api/v1/changelog'))
  } catch (error) {
    return { ...withInterfaceNotes({ sections: [] }), backendError: error.message }
  }
}
