import { AdminApiError, adminListKnowledgeDatasetGroups } from '~/utils/admin-api'
import type { KnowledgeDatasetGroup } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'

export const KNOWLEDGE_GROUP_ALL = 'all'

export function useKnowledgeDatasetGroupFilter() {
  const config = useRuntimeConfig()
  const { t } = useI18n()

  const groups = ref<KnowledgeDatasetGroup[]>([])
  const groupsPending = ref(false)
  const groupsError = ref('')
  const filterGroup = ref<string>(KNOWLEDGE_GROUP_ALL)

  const groupSelectItems = computed(() => {
    const items = [
      { label: t('knowledge.filters.groupAll'), value: KNOWLEDGE_GROUP_ALL }
    ]
    const sorted = [...groups.value].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    for (const row of sorted) {
      const count = row.dataset_count != null ? ` (${row.dataset_count})` : ''
      const name = row.display_name?.trim() || row.group_key
      items.push({
        label: `${name}${count} · ${row.group_key}`,
        value: row.group_key
      })
    }
    return items
  })

  const groupQueryValue = computed(() => {
    if (filterGroup.value === KNOWLEDGE_GROUP_ALL || !filterGroup.value.trim()) {
      return undefined
    }
    return filterGroup.value.trim()
  })

  async function loadGroups() {
    const token = readOperatorToken()
    if (!token) {
      groups.value = []
      groupsError.value = t('knowledge.datasetGroups.failed')
      groupsPending.value = false
      return
    }
    groupsPending.value = true
    groupsError.value = ''
    try {
      groups.value = await adminListKnowledgeDatasetGroups(config.public.apiBase, token)
    } catch (error) {
      groups.value = []
      groupsError.value = error instanceof AdminApiError && error.message
        ? error.message
        : t('knowledge.datasetGroups.failed')
    } finally {
      groupsPending.value = false
    }
  }

  if (import.meta.client) {
    void loadGroups()
  }

  return {
    groups,
    groupsPending,
    groupsError,
    filterGroup,
    groupSelectItems,
    groupQueryValue,
    loadGroups
  }
}
