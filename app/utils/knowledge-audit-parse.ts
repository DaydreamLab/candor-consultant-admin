import type { KnowledgeAuditEvent } from '~/types/knowledge'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringField(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function optionalString(value: unknown): string | null {
  const text = stringField(value).trim()
  return text ? text : null
}

const AUDIT_ARRAY_KEYS = [
  'items',
  'events',
  'audit_events',
  'audits',
  'records',
  'rows',
  'entries',
  'log',
  'data'
] as const

/** 從 audit API `data`（物件或陣列）取出事件列。 */
export function knowledgeAuditEventsOf(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return []
  }
  for (const key of AUDIT_ARRAY_KEYS) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

export function parseKnowledgeAuditEvent(row: Record<string, unknown>): KnowledgeAuditEvent {
  return {
    id: stringField(row.id),
    source: optionalString(row.source),
    level: optionalString(row.level),
    action: optionalString(row.action),
    actor_id: optionalString(row.actor_id ?? row.actorId ?? row.operator_id),
    created_at: optionalString(row.created_at ?? row.createdAt ?? row.occurred_at),
    dataset_id: optionalString(row.dataset_id ?? row.datasetId),
    chunk_id: optionalString(row.chunk_id ?? row.chunkId),
    raw: row
  }
}

export function readKnowledgeAuditEvents(data: unknown): KnowledgeAuditEvent[] {
  return knowledgeAuditEventsOf(data).filter(isRecord).map(parseKnowledgeAuditEvent)
}

export function knowledgeAuditRawObject(data: unknown): Record<string, unknown> {
  if (isRecord(data)) {
    return data
  }
  if (Array.isArray(data)) {
    return { items: data }
  }
  return {}
}

export function readAuditTotalCount(data: unknown): number | null {
  if (!isRecord(data)) {
    return null
  }
  const total = data.total ?? data.total_count ?? data.count
  if (typeof total === 'number' && Number.isFinite(total)) {
    return total
  }
  if (typeof total === 'string' && total.trim() && Number.isFinite(Number(total))) {
    return Number(total)
  }
  return null
}
