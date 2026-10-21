import { computed, onMounted, reactive, ref, watch } from 'vue'
import { vi } from 'vitest'

vi.stubGlobal('reactive', reactive)
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('watch', watch)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key
}))
