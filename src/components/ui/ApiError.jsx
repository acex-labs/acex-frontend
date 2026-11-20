import { Link } from 'react-router-dom'
import { parseApiError, existingRecordPath } from '../../api/apiError'

// Opens the record a duplicate collides with.
function OpenExisting({ duplicate }) {
  const path = existingRecordPath(duplicate)
  if (!path) return null
  return <Link to={path} className="ml-1 underline hover:text-red-300">Open existing</Link>
}

// The message of an API error that is about one field, for FormField's `error`.
// Renders nothing for an error about some other field, or none.
export function FieldError({ error, field }) {
  if (!error) return null
  const { fields, duplicate } = parseApiError(error)
  if (!fields[field]) return null
  return (
    <span className="mt-1 block">
      {fields[field]}
      {duplicate?.field === field && <OpenExisting duplicate={duplicate} />}
    </span>
  )
}

// The message of an API error at the foot of a form. `fields` names the fields the form shows
// a FieldError under: an error about one of them is not said twice.
export function FormError({ error, fallback, fields = [], className = 'mt-2 text-[11px] text-red-400' }) {
  if (!error) return null
  const { message, fields: byField, duplicate } = parseApiError(error, fallback)
  if (fields.some(field => byField[field])) return null
  return (
    <p className={className}>
      {message}
      {duplicate && <OpenExisting duplicate={duplicate} />}
    </p>
  )
}
