/** Line-level side-by-side diff (left = older, right = newer). No server diff endpoint. */

export type DiffLineKind = 'equal' | 'added' | 'removed' | 'empty'

export type DiffSideLine = {
  kind: DiffLineKind
  text: string
  lineNo: number | null
}

export type SideBySideDiff = {
  left: DiffSideLine[]
  right: DiffSideLine[]
}

export function splitLines(text: string): string[] {
  if (text === '') {
    return []
  }
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

/**
 * Build aligned left/right rows via LCS so equal lines stay paired and
 * inserts/deletes show opposite empty cells (classic side-by-side).
 */
export function buildSideBySideDiff(oldText: string, newText: string): SideBySideDiff {
  const a = splitLines(oldText)
  const b = splitLines(newText)
  const n = a.length
  const m = b.length

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        dp[i]![j] = (dp[i + 1]![j + 1] ?? 0) + 1
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0)
      }
    }
  }

  const left: DiffSideLine[] = []
  const right: DiffSideLine[] = []
  let i = 0
  let j = 0
  let leftNo = 1
  let rightNo = 1

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      left.push({ kind: 'equal', text: a[i]!, lineNo: leftNo })
      right.push({ kind: 'equal', text: b[j]!, lineNo: rightNo })
      i += 1
      j += 1
      leftNo += 1
      rightNo += 1
      continue
    }
    const down = dp[i + 1]![j] ?? 0
    const rightScore = dp[i]![j + 1] ?? 0
    // Equal LCS remainder + differing lines → treat as in-place replace (side-by-side).
    if (down === rightScore) {
      left.push({ kind: 'removed', text: a[i]!, lineNo: leftNo })
      right.push({ kind: 'added', text: b[j]!, lineNo: rightNo })
      i += 1
      j += 1
      leftNo += 1
      rightNo += 1
      continue
    }
    if (down > rightScore) {
      left.push({ kind: 'removed', text: a[i]!, lineNo: leftNo })
      right.push({ kind: 'empty', text: '', lineNo: null })
      i += 1
      leftNo += 1
    } else {
      left.push({ kind: 'empty', text: '', lineNo: null })
      right.push({ kind: 'added', text: b[j]!, lineNo: rightNo })
      j += 1
      rightNo += 1
    }
  }

  while (i < n) {
    left.push({ kind: 'removed', text: a[i]!, lineNo: leftNo })
    right.push({ kind: 'empty', text: '', lineNo: null })
    i += 1
    leftNo += 1
  }
  while (j < m) {
    left.push({ kind: 'empty', text: '', lineNo: null })
    right.push({ kind: 'added', text: b[j]!, lineNo: rightNo })
    j += 1
    rightNo += 1
  }

  return { left, right }
}
