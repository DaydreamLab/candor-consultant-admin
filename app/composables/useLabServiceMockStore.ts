import {
  cloneLabAppointment,
  cloneLabService,
  newLocalId,
  seedLabAppointments,
  seedLabServices,
  type LabAppointmentMock,
  type LabServiceMock,
  type LabServiceWrite
} from '~/utils/lab-service-mock'

export function useLabServiceMockStore() {
  const services = useState<LabServiceMock[]>('candor-lab-services-mock', () => seedLabServices())
  const appointments = useState<LabAppointmentMock[]>('candor-lab-appointments-mock-v3', () => seedLabAppointments())

  function listServices() {
    return [...services.value].sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
  }

  function getService(id: string) {
    const row = services.value.find(item => item.id === id)
    return row ? cloneLabService(row) : null
  }

  function createService(input: LabServiceWrite) {
    const now = new Date().toISOString()
    const payload = cloneLabService({
      id: newLocalId('ls'),
      code: input.code,
      name_zh: input.name_zh,
      name_en: input.name_en,
      description: input.description,
      partner_name: input.partner_name,
      partner_phone: input.partner_phone,
      partner_address: input.partner_address,
      items: input.items,
      schedule_rules: input.schedule_rules,
      sort_order: input.sort_order,
      active: input.active,
      updated_at: now
    })
    services.value = [payload, ...services.value]
    return cloneLabService(payload)
  }

  function updateService(id: string, input: LabServiceWrite) {
    const index = services.value.findIndex(item => item.id === id)
    if (index < 0) {
      return null
    }
    const previous = services.value[index]!
    const row = cloneLabService({
      id: previous.id,
      code: previous.code,
      name_zh: input.name_zh,
      name_en: input.name_en,
      description: input.description,
      partner_name: input.partner_name,
      partner_phone: input.partner_phone,
      partner_address: input.partner_address,
      items: input.items,
      schedule_rules: input.schedule_rules,
      sort_order: input.sort_order,
      active: input.active,
      updated_at: new Date().toISOString()
    })
    const copy = [...services.value]
    copy[index] = row
    services.value = copy
    return cloneLabService(row)
  }

  function listAppointments() {
    return [...appointments.value].sort((a, b) => {
      const dateCmp = b.appointment_date.localeCompare(a.appointment_date)
      if (dateCmp !== 0) {
        return dateCmp
      }
      return b.booked_at.localeCompare(a.booked_at)
    })
  }

  function getAppointment(id: string) {
    const row = appointments.value.find(item => item.id === id)
    return row ? cloneLabAppointment(row) : null
  }

  function cancelAppointment(id: string) {
    const index = appointments.value.findIndex(item => item.id === id)
    if (index < 0) {
      return null
    }
    const previous = appointments.value[index]!
    if (previous.status === 'cancelled') {
      return cloneLabAppointment(previous)
    }
    const row: LabAppointmentMock = {
      ...previous,
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    }
    const copy = [...appointments.value]
    copy[index] = row
    appointments.value = copy
    return cloneLabAppointment(row)
  }

  return {
    listServices,
    getService,
    createService,
    updateService,
    listAppointments,
    getAppointment,
    cancelAppointment
  }
}
