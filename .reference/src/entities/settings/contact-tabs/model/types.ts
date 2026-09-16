export type ContactTabId = string

export type ContactTab = {
    id: ContactTabId,
    groupGuid: string,
    name: string,
    order: number,
    enabled: boolean, // Включен для отображения на экране или нет
}
