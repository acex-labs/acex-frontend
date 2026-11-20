// What an API error says. `apiFetch` keeps the status and the body's `detail`, which is a string
// (HTTPException), a list of { loc, msg } (validation, 422) or an object with a `message` or `reason`.
// A duplicate is the last: { code: 'duplicate', message, resource, field, value, existing_id }.

const RECORD_PATHS = {
  asset: id => `/network/assets/${id}`,
  logical_node: id => `/network/logical-nodes/${id}`,
  node_instance: id => `/network/nodes/${id}`,
}

// -> { status, message, fields (message per field name), duplicate (the record in the way, or null) }
export function parseApiError(error, fallback = 'Something went wrong.') {
  const { status, detail } = error ?? {}
  const parsed = { status, message: fallback, fields: {}, duplicate: null }

  if (typeof detail === 'string' && detail) {
    parsed.message = detail
  } else if (Array.isArray(detail) && detail.length) {
    // loc is where in the request it went wrong, e.g. ['body', 'serial_number']. An error about
    // the body as a whole, ['body'], is not about any one field.
    const where = d => d.loc?.slice(1).join('.')
    parsed.message = detail.map(d => (where(d) ? `${where(d)}: ${d.msg}` : d.msg)).join(' · ')
    for (const d of detail) {
      const field = d.loc?.length > 1 ? d.loc.at(-1) : null
      if (typeof field === 'string' && !(field in parsed.fields)) parsed.fields[field] = d.msg
    }
  } else if (detail && typeof detail === 'object') {
    const message = detail.message ?? detail.reason
    if (typeof message === 'string' && message) parsed.message = message
    if (detail.code === 'duplicate') {
      parsed.duplicate = detail
      if (detail.field) parsed.fields[detail.field] = parsed.message
    }
  }
  return parsed
}

export function apiErrorMessage(error, fallback) {
  return parseApiError(error, fallback).message
}

// Where the record a duplicate collides with can be opened, or null if there is no page for it.
export function existingRecordPath(duplicate) {
  const path = RECORD_PATHS[duplicate?.resource]
  return path && duplicate.existing_id != null ? path(duplicate.existing_id) : null
}
