import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Eye, EyeOff, Pencil, RotateCcw } from 'lucide-react'

export function ToggleButton({ shown, onClick, hideLabel, showLabel }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-medium transition-colors whitespace-nowrap',
        shown ? 'border-edge text-subtle hover:text-content' : 'border-brand/40 text-brand bg-brand/5',
      ].join(' ')}
    >
      {shown ? <Eye size={12} /> : <EyeOff size={12} />}
      {shown ? hideLabel : showLabel}
    </button>
  )
}

// One choice of several, as a row of joined buttons. options: [{ value, label }]
export function Segmented({ value, options, onChange }) {
  return (
    <div className="flex rounded border border-edge overflow-hidden">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            'px-3 py-1.5 text-[11px] font-medium transition-colors border-r border-edge last:border-r-0',
            value === o.value ? 'bg-brand/10 text-brand' : 'text-subtle hover:text-content',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// A plain select whose first option means "no filter". options: [string]
export function FilterSelect({ value, options, allLabel, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-7 px-1.5 text-[11px] rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50 max-w-[180px]"
    >
      <option value="">{allLabel}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// Several choices of a list; none picked means all. options: [{ value, label }]
export function MultiSelect({ label, selected, options, onChange }) {
  const toggle = value => onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  const summary = selected.length ? `${label}: ${selected.length}` : `All ${label.toLowerCase()}`
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={!options.length}
          className={[
            'h-7 flex items-center gap-1.5 px-2 rounded border text-[11px] transition-colors disabled:opacity-50',
            selected.length ? 'border-brand/40 text-brand bg-brand/5' : 'border-edge bg-surface-hi text-content',
          ].join(' ')}
        >
          {summary}
          <ChevronDown size={11} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-[180px] max-h-[320px] overflow-y-auto rounded-lg border border-edge bg-surface p-1 shadow-xl"
        >
          {options.map(o => (
            <DropdownMenu.CheckboxItem
              key={o.value}
              checked={selected.includes(o.value)}
              onCheckedChange={() => toggle(o.value)}
              onSelect={e => e.preventDefault()}
              className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-content rounded cursor-pointer outline-none data-[highlighted]:bg-surface-hi"
            >
              <span className="w-3.5 flex justify-center">
                <DropdownMenu.ItemIndicator><Check size={12} className="text-brand" /></DropdownMenu.ItemIndicator>
              </span>
              {o.label}
            </DropdownMenu.CheckboxItem>
          ))}
          {selected.length > 0 && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-edge" />
              <DropdownMenu.Item
                onSelect={() => onChange([])}
                className="px-2 py-1.5 text-[11px] text-subtle rounded cursor-pointer outline-none data-[highlighted]:bg-surface-hi"
              >
                Clear
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const PANEL_BUTTON = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors bg-surface disabled:opacity-50'

// Edit mode for the shared layout: nothing moves until Edit, nothing is kept until Save.
export function LayoutControls({ editing, moved, busy, onEdit, onSave, onCancel, onReset }) {
  if (!editing) {
    return (
      <button onClick={onEdit} className={`${PANEL_BUTTON} border-edge text-subtle hover:text-content`}>
        <Pencil size={12} /> Edit layout
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      {onReset && (
        <button onClick={onReset} disabled={busy} className={`${PANEL_BUTTON} border-edge text-subtle hover:text-content`}>
          <RotateCcw size={12} /> Reset layout
        </button>
      )}
      <button onClick={onCancel} disabled={busy} className={`${PANEL_BUTTON} border-edge text-subtle hover:text-content`}>
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={busy || !moved}
        className={`${PANEL_BUTTON} border-brand/50 text-brand bg-brand/10 hover:bg-brand/15`}
      >
        {busy ? 'Saving…' : `Save${moved ? ` (${moved})` : ''}`}
      </button>
    </div>
  )
}
