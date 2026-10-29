import assert from 'node:assert/strict'
import test from 'node:test'
import { sortCves } from './sortCves.js'

const fieldValue = (cve, key) => cve[key] ?? ''
const items = records => records.map((cve, index) => ({ cve, index }))
const values = (records, key, order) => sortCves(records, key, order, fieldValue).map(item => item.cve[key])

test('preserves the original order until a column is selected', () => {
  const records = items([{ id: 'B' }, { id: 'A' }])
  assert.equal(sortCves(records, null, 'asc', fieldValue), records)
})

test('sorts text in both directions without mutating input, with missing values last', () => {
  const records = items([{ id: 'CVE-10' }, { id: '' }, { id: 'cve-2' }, { id: 'CVE-2' }])
  assert.deepEqual(values(records, 'id', 'asc'), ['cve-2', 'CVE-2', 'CVE-10', ''])
  assert.deepEqual(values(records, 'id', 'desc'), ['CVE-10', 'cve-2', 'CVE-2', ''])
  assert.deepEqual(records.map(item => item.cve.id), ['CVE-10', '', 'cve-2', 'CVE-2'])
})

test('sorts publication and modification dates chronologically, including offsets', () => {
  const records = items([
    { published: '2024-01-01T01:00:00+02:00', modified: '2025-01-01' },
    { published: '2024-01-01T00:00:00Z', modified: '2023-01-01' },
    { published: '', modified: '' },
  ])
  assert.deepEqual(values(records, 'published', 'asc'), ['2024-01-01T01:00:00+02:00', '2024-01-01T00:00:00Z', ''])
  assert.deepEqual(values(records, 'modified', 'desc'), ['2025-01-01', '2023-01-01', ''])
})

test('sorts numeric severity scores numerically and keeps textual severities deterministic', () => {
  const records = items([{ severity: '9.8' }, { severity: '10' }, { severity: 'LOW' }, { severity: '2' }])
  assert.deepEqual(values(records, 'severity', 'asc'), ['2', '9.8', '10', 'LOW'])
  assert.deepEqual(values(records, 'severity', 'desc'), ['LOW', '10', '9.8', '2'])
})

test('sorts the entire filtered list before a page is sliced', () => {
  const records = items(Array.from({ length: 60 }, (_, i) => ({ id: `CVE-${60 - i}` })))
  const sorted = sortCves(records, 'id', 'asc', fieldValue)
  assert.equal(sorted[0].cve.id, 'CVE-1')
  assert.equal(sorted[49].cve.id, 'CVE-50')
  assert.equal(sorted[50].cve.id, 'CVE-51')
})
