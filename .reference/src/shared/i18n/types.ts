export enum Locales {
    RU_RU = 'ru-RU',
    EN_GB = 'en-GB',
    ZH_CN = 'zh-CN', // Упрощенный китайский
    ZH_TW = 'zh-TW'  // Традиционный китайский
}

export interface LocalizationItem {
    [key: string]: string
}

export interface LocalizationResource {
    [key: string]: LocalizationItem
}