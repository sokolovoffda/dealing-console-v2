import { getScheduleTemplate, TimetableTemplate } from '@wui/common-library'

import { Forwarding, ForwardingConditions } from '@/entities/forwarding-settings'

export const getForwardingTemplate = (condition: ForwardingConditions, templates: TimetableTemplate[], priority: number): Forwarding => ({
  guid: '',
  enabled: false,
  priority,
  service: {
    key: '',
    value: '',
  },
  scenario: {
    key: '',
    value: '',
  },
  condition,
  aNumber: '.*',
  schedule: getScheduleTemplate(templates),
  forwardNumber: '',
  timeout: '',
})
