const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Path 參數須為 chunk／dataset 本體 UUID；全域稽核列表事件的 `id` 可能為整數。 */
export function isKnowledgeResourceUuid(id: string): boolean {
  const text = id.trim()
  return text.length > 0 && UUID_RE.test(text)
}
