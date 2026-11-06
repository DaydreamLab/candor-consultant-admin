import {
  expertHhmmToMinute,
  expertMinuteToHhmm,
  halfHourSlots,
  halfHourSlotsBetween
} from '~/utils/expert-booking-calendar'

const STORAGE_KEY = 'candor.expert.workWindow'
export const EXPERT_WORK_WINDOW_START = '06:00'
export const EXPERT_WORK_WINDOW_END = '20:00'

function minuteOf(hhmm: string): number {
  return hhmm === '24:00' ? 24 * 60 : expertHhmmToMinute(hhmm)
}

function clockMarks(): string[] {
  return [...halfHourSlots(0, 24), '24:00']
}

/**
 * Visible working-hour window shared by the calendar and the daily-hours editor.
 * Slot edits on the editor are separate and only persist when the user saves.
 */
export function useExpertWorkWindow() {
  const start = useState('expert-work-window-start', () => EXPERT_WORK_WINDOW_START)
  const end = useState('expert-work-window-end', () => EXPERT_WORK_WINDOW_END)

  const slots = computed(() => halfHourSlotsBetween(start.value, end.value))
  const startItems = computed(() =>
    clockMarks()
      .filter(mark => minuteOf(mark) < minuteOf(end.value))
      .map(value => ({ label: value, value }))
  )
  const endItems = computed(() =>
    clockMarks()
      .filter(mark => minuteOf(mark) > minuteOf(start.value))
      .map(value => ({ label: value, value }))
  )

  function remember() {
    if (!import.meta.client) {
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      start: start.value,
      end: end.value
    }))
  }

  onMounted(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }
    try {
      const parsed = JSON.parse(raw) as { start?: string, end?: string }
      if (!parsed.start || !parsed.end || minuteOf(parsed.start) >= minuteOf(parsed.end)) {
        return
      }
      start.value = parsed.start
      end.value = parsed.end
    } catch {
      // Ignore a corrupt preference and keep the default window.
    }
  })

  watch(start, (value) => {
    if (minuteOf(value) >= minuteOf(end.value)) {
      const next = minuteOf(value) + 30
      end.value = next >= 24 * 60 ? '24:00' : expertMinuteToHhmm(next)
    }
    remember()
  })

  watch(end, (value) => {
    if (minuteOf(value) <= minuteOf(start.value)) {
      const prev = minuteOf(value) - 30
      start.value = prev <= 0 ? '00:00' : expertMinuteToHhmm(prev)
    }
    remember()
  })

  return { start, end, slots, startItems, endItems }
}
