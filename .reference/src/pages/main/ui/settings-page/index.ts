/**
 * Settings page slice (shell + sections).
 *
 * Sections live under `sections/<name>/` with local index.
 * Further polish (подблоки main-settings/ui, единый naming) — по мере доработки секций.
 */

export { default as SettingsPage } from './ui/SettingsPage.vue'
export { default as SettingsSidebarFooter } from './ui/SettingsSidebarFooter.vue'

export { MainSettings } from './sections/main-settings'
export { MediaDevicePage } from './sections/media-device'
export { ForwardingSettingsPage } from './sections/forwarding-settings'
export { CustomizePage } from './sections/customize'
export { BindingContact, BindingContactBlock } from './sections/line-keys'
export { BlackWhiteListPage } from './sections/black-white-list'

export {
  SETTINGS_NAV_ITEMS,
  SETTINGS_SECTION_I18N_BY_ROUTE,
} from './model'
export type { SettingsNavItem } from './model'
