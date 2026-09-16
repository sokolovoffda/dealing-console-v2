import { ChainTooltipDirectiveBindingValue } from '@wui/common-library'
import { v4 as uuidv4 } from 'uuid'

import { useLocalization } from '@/shared/i18n'

type Keys = 'welcome' |
  'contactCard' |
  'person' |
  'contacts' |
  'phonebook' |
  'groups' |
  'history' |
  'settings' |
  'reload' |
  'exit' |
  'pinnedCalls' |
  'callManager' |
  'callQueue' |
  'rightPanel' |
  'settingsMain' |
  'settingsMediaDevices' |
  'settingsIncomingCalls' |
  'settingsContacts' |
  'settingsPriority' |
  'settingsLines' |
  'curtainLineDevice' |
  'mediaDeviceType' |
  'mediaDeviceModule' |
  'mediaDeviceNumber' |
  'mediaDeviceAudioIn' |
  'mediaDeviceAudioOut' |
  'mediaDeviceButtonAppearance' |
  'mediaDeviceAudioInTest' |
  'mediaDeviceAudioOutTest' |
  'mediaDeviceDeleteButton' |
  'mediaDeviceOperatingMode' |
  'contactViewCardDeviceCheck' |
  'groupsOfClosedContactsRow' |
  'groupsOfClosedContactsFooter'

export enum TooltipsScenarios {
  WELCOME = 'welcome-page',
  MAIN_PAGE = 'main-page',
  SETTINGS_PAGE = 'settings-page',
  MEDIA_DEVICES_PAGE = 'media-devices',
  CONTACT_VIEW_CARD = 'contact-view-card',
  GROUPS_OF_CLOSED_CONTACTS = 'groups-of-closed-contacts',
}

const generateTooltips = (): Record<Keys, ChainTooltipDirectiveBindingValue> => {
  const { t } = useLocalization()
  return {
    welcome: {
      header: t('ScenarioWelcomeHeader'),
      message: t('ScenarioWelcomeMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.WELCOME,
      direction: 'right',
      actions: ['skip', 'start'],
    },
    person: {
      header: t('ScenarioPersonHeader'),
      message: t('ScenarioPersonMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    contactCard: {
      header: t('ScenarioContactCardHeader'),
      message: t('ScenarioContactCardMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    contacts: {
      header: t('ScenarioContactsHeader'),
      message: t('ScenarioContactsMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    phonebook: {
      header: t('ScenarioPhonebookHeader'),
      message: t('ScenarioPhonebookMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    groups: {
      header: t('ScenarioGroupsHeader'),
      message: t('ScenarioGroupsMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    history: {
      header: t('ScenarioHistoryHeader'),
      message: t('ScenarioHistoryMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    settings: {
      header: t('ScenarioSettingsHeader'),
      message: t('ScenarioSettingsMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right-top',
    },
    reload: {
      header: t('ScenarioReloadHeader'),
      message: t('ScenarioReloadMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right-top',
    },
    exit: {
      header: t('ScenarioExitHeader'),
      message: t('ScenarioExitMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right-top',
    },
    pinnedCalls: {
      header: t('ScenarioPinnedCallsHeader'),
      message: t('ScenarioPinnedCallsMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'right',
    },
    callManager: {
      header: t('ScenarioCallManagerHeader'),
      message: t('ScenarioCallManagerMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'left',
    },
    callQueue: {
      header: t('ScenarioCallQueueHeader'),
      message: t('ScenarioCallQueueMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'left',
    },
    rightPanel: {
      header: t('ScenarioRightPanelHeader'),
      message: t('ScenarioRightPanelMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MAIN_PAGE,
      direction: 'left',
    },
    settingsMain: {
      header: t('ScenarioSettingsMainHeader'),
      message: t('ScenarioSettingsMainMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.SETTINGS_PAGE,
      direction: 'right',
    },
    settingsMediaDevices: {
      header: t('ScenarioSettingsMediaDevicesHeader'),
      message: t('ScenarioSettingsMediaDevicesMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.SETTINGS_PAGE,
      direction: 'right',
    },
    settingsIncomingCalls: {
      header: t('ScenarioSettingsIncomingCallsHeader'),
      message: t('ScenarioSettingsIncomingCallsMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.SETTINGS_PAGE,
      direction: 'right',
    },
    settingsContacts: {
      header: t('ScenarioSettingsContactsHeader'),
      message: t('ScenarioSettingsContactsMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.SETTINGS_PAGE,
      direction: 'right',
    },
    settingsPriority: {
      header: t('ScenarioSettingsPriorityHeader'),
      message: t('ScenarioSettingsPriorityMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.SETTINGS_PAGE,
      direction: 'right',
    },
    settingsLines: {
      header: t('ScenarioSettingsLinesHeader'),
      message: t('ScenarioSettingsLinesMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.SETTINGS_PAGE,
      direction: 'right',
    },
    curtainLineDevice: {
      header: t('ScenarioCurtainLineDeviceHeader'),
      message: t('ScenarioCurtainLineDeviceMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceType: {
      header: t('ScenarioMediaDeviceTypeHeader'),
      message: t('ScenarioMediaDeviceTypeMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceModule: {
      header: t('ScenarioMediaDeviceModuleHeader'),
      message: t('ScenarioMediaDeviceModuleMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceNumber: {
      header: t('ScenarioMediaDeviceNumberHeader'),
      message: t('ScenarioMediaDeviceNumberMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceAudioIn: {
      header: t('ScenarioMediaDeviceAudioInHeader'),
      message: t('ScenarioMediaDeviceAudioInMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceAudioOut: {
      header: t('ScenarioMediaDeviceAudioOutHeader'),
      message: t('ScenarioMediaDeviceAudioOutMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceOperatingMode: {
      header: t('ScenarioMediaDeviceOperatingModeHeader'),
      message: t('ScenarioMediaDeviceOperatingModeMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right-top',
    },
    mediaDeviceButtonAppearance: {
      header: t('ScenarioMediaDeviceButtonAppearanceHeader'),
      message: t('ScenarioMediaDeviceButtonAppearanceMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceAudioInTest: {
      header: t('ScenarioMediaDeviceAudioInTestHeader'),
      message: t('ScenarioMediaDeviceAudioInTestMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceAudioOutTest: {
      header: t('ScenarioMediaDeviceAudioOutTestHeader'),
      message: t('ScenarioMediaDeviceAudioOutTestMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right',
    },
    mediaDeviceDeleteButton: {
      header: t('ScenarioMediaDeviceDeleteButtonHeader'),
      message: t('ScenarioMediaDeviceDeleteButtonMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.MEDIA_DEVICES_PAGE,
      direction: 'right-top',
    },
    contactViewCardDeviceCheck: {
      header: t('ScenarioContactViewCardDeviceCheckHeader'),
      message: t('ScenarioContactViewCardDeviceCheckMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.CONTACT_VIEW_CARD,
      direction: 'left',
      actions: ['skip', 'start'],
    },
    groupsOfClosedContactsRow: {
      header: t('ScenarioGroupsOfClosedContactsRowHeader'),
      message: t('ScenarioGroupsOfClosedContactsRowMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.GROUPS_OF_CLOSED_CONTACTS,
      direction: 'right',
    },
    groupsOfClosedContactsFooter: {
      header: t('ScenarioGroupsOfClosedContactsFooterHeader'),
      message: t('ScenarioGroupsOfClosedContactsFooterMessage'),
      id: uuidv4(),
      scenarioName: TooltipsScenarios.GROUPS_OF_CLOSED_CONTACTS,
      direction: 'right-top',
    }, 
  }
}

export const tooltips = generateTooltips()