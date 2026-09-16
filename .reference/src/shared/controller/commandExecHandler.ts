import { useAppStore, useDevicesStore } from '@/shared/composables'
import { useTurretAdminWs } from '@/shared/turret-admin-ws'

import { syncAllGooseMicrophoneHardware } from './event-handlers/gooseEventHandler'

export interface NetworkInterface {
    name: string, /* Имя сетевого интерфейса */
    mac_address: string, /* MAC адрес */
    ip_address: string, /* IP адрес */
    broadcast: string, /* Широковещательный адрес */
    gateway: string, /* Шлюз */
    speed: string, /* Скорость подключения, 1000 Мб/с */
    label: string /* Маркировка порта на корпусе устройства. Средний */
}

export interface ModuleInterface {
    position: string, /* Расположение устройства - центр */
    available: boolean, /* Модуль подключен */
    id: string, /* Короткий идентификатор устройства */
    name: string, /* Имя устройства - может быть изменено */
    pcb: string, /* Децимальный номер платы */
    revision: number, /* Версия платы */
    serial: string, /* Серийный номер ЦВМ (Пульта) */
    type: number, /* Тип устройства - ЦВМ */
    audiolabel: string, /* Название аудио устройства в системе. Для входа и выхода одинаковое */
    firmware_version: string, /* Версия встроенного ПО */
    features: { /* Возможности устройства */
        audio_in: boolean, /* Есть Аудио вход */
        audio_out: boolean, /* Есть Аудио выход */
        display: boolean /* Есть Дисплей */
    },
    sinks?: string[],
    sources?: string[],
    mcu_uuid: string /* Уникальный идентификатор микроконтроллера */
}

type ReturnValue = { hostname: string, interfaces: Array<NetworkInterface> } | { modules: Array<ModuleInterface> } /*Результат выполнения команды*/

export interface CommandExecEvent {
    sender: 'core',
    uid: string,
    timestamp: string,
    state: string,
    return_value: ReturnValue,
    model: 'command_exec',
    version: string
}

export const commandExecHandler = (e: CommandExecEvent) => {
  console.debug('%cCommandExecHandler: ', 'color: green;', e)
  const returnValue = e.return_value
    
  if ('interfaces' in returnValue) {
    const { setNetworkInterfaces, setHostname, setNetworkInfoLoading } = useAppStore()
    const { hostname, interfaces } = returnValue
    setNetworkInterfaces(interfaces)
    setHostname(hostname)
    setNetworkInfoLoading(false)

    const hardwareMac = interfaces.find(item => item.mac_address)?.mac_address
    if (hardwareMac) {
      useTurretAdminWs().updateControllerIdentity({ hardwareMac })
    }
  } else if ('modules' in returnValue) {
    const { modules } = returnValue
    const { setControllerModules } = useDevicesStore()
    setControllerModules(modules)
    syncAllGooseMicrophoneHardware()

    const hub = modules.find(item => item.id === 'hub')
    const serial = hub?.serial?.trim()
    const hardwareSerial = serial && serial.toLowerCase() !== 'unknown'
      ? serial
      : hub?.mcu_uuid?.trim()
    if (hardwareSerial) {
      useTurretAdminWs().updateControllerIdentity({ hardwareSerial })
    }

  }
}
