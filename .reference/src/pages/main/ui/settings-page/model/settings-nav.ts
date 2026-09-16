import { tooltips } from '@/entities/tooltips'

export type SettingsNavItem = {
  routeName: string
  labelKey: string
  tooltipKey: keyof typeof tooltips
  requiresGoose?: boolean
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    routeName: 'MainSettings',
    labelKey: 'MainSettings',
    tooltipKey: 'settingsMain',
  },
  {
    routeName: 'MediaDevice',
    labelKey: 'MediaDevices',
    tooltipKey: 'settingsMediaDevices',
  },
  {
    routeName: 'ForwardingSettings',
    labelKey: 'IncomingCallProcessing',
    tooltipKey: 'settingsIncomingCalls',
  },
  {
    routeName: 'Customize',
    labelKey: 'Prioritization',
    tooltipKey: 'settingsPriority',
  },
  {
    routeName: 'BindingContact',
    labelKey: 'LineKeys',
    tooltipKey: 'settingsLines',
    requiresGoose: true,
  },
]

export const SETTINGS_SECTION_I18N_BY_ROUTE: Record<string, string> = {
  MainSettings: 'MainSettings',
  MediaDevice: 'MediaDevices',
  ForwardingSettings: 'IncomingCallProcessing',
  Customize: 'Prioritization',
  BindingContact: 'LineKeys',
  BindingContactBlock: 'LineKeys',
  BlackWhiteList: 'BlackWhiteList',
}
