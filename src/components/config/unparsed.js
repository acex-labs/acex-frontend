// Observed lines the driver couldn't parse, each under the headers of the blocks it sits in. A header
// is written once for a run of lines sharing it, flagged as context when it's only there for that.
export function unparsedRows(unmatched) {
  const out = []
  let open = []  // the context written so far: headers and unparsed lines the next line may sit under
  for (const { line, parents } of unmatched) {
    let shared = 0
    while (shared < parents.length && shared < open.length && parents[shared] === open[shared]) shared++
    parents.slice(shared).forEach(header => out.push({ text: header, context: true }))
    out.push({ text: line, context: false })
    open = [...parents, line]
  }
  return out
}

export const unparsedText = (unmatched) => unparsedRows(unmatched).map(r => r.text).join('\n')
