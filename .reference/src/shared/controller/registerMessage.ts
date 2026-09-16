import { v4 as uuidv4 } from 'uuid'

const NAME = `input_${uuidv4()}`

const AVAILABLE_HANDSETS = import.meta.env.VITE_AVAILABLE_HANDSETS?.split(',') || ['R1']
const AVAILABLE_GOOSE = import.meta.env.VITE_AVAILABLE_GOOSE?.split(',') || ['L1']

console.debug('Доступные handset:', AVAILABLE_HANDSETS)
console.debug('Доступные goose:', AVAILABLE_GOOSE)

const createHandsetUnit = (direction: string) => {
  return {
    name: `handset_${direction}`,
    description: 'HANDSET processor',
    commands: [],
    events: [],
    model: 'Unit',
    version: '1.0',
    target: `${NAME}:handset_${direction}`,
  }
}

const createGooseUnit = (direction: string) => {
  return {
    name: `goose_${direction}`,
    description: 'GOOSE processor',
    commands: [],
    events: [],
    model: 'Unit',
    version: '1.0',
    target: `${NAME}:goose_${direction}`,
  }
}

const generateUnits = (baseUnits: unknown[], handsets: string[], gooseDirs: string[])=> {
  const units = [...baseUnits]
  // Добавляем handsets
  for (const dir of handsets) {
    units.push(createHandsetUnit(dir))
  }
  // Добавляем goose
  for (const dir of gooseDirs) {
    units.push(createGooseUnit(dir))
  }
  return units
}

const baseSystemUnits = [
  {
    name: 'sysinfo',
    description: 'Versions Information',
    commands: [
      {
        name: 'get_version',
        description: 'get versions!',
        attrs: [],
        return_type: '',
        model: 'UnitCommand',
        version: '1.0',
      },
    ],
    events: [],
    model: 'Unit',
    version: '1.0',
    target: 'sysinfo:sysinfo',
  },
  {
    name: 'netinfo',
    description: 'Network Information',
    commands: [
      {
        name: 'get',
        description: 'get netinfo!',
        attrs: [],
        return_type: '',
        model: 'UnitCommand',
        version: '1.0',
      },
    ],
    events: [],
    model: 'Unit',
    version: '1.0',
    target: 'sysinfo:netinfo',
  },
  {
    name: 'modulesinfo',
    description: 'Modules Information',
    commands: [
      {
        name: 'get',
        description: 'get modulesinfo!',
        attrs: [],
        return_type: '',
        model: 'UnitCommand',
        version: '1.0',
      },
    ],
    events: [],
    model: 'Unit',
    version: '1.0',
    target: 'sysinfo:modulesinfo',
  },
]

const baseHubUnits = [
  {
    name: 'hub',
    description: 'HUB processor',
    commands: [],
    events: [],
    model: 'Unit',
    version: '1.0',
    target: `${NAME}:hub`,
  },
]

export const REGISTER_MESSAGE = {
  sender: NAME,
  uid: uuidv4(),
  timestamp: new Date().getTime().toString(),
  name: 'register',
  message: {
    name: NAME,
    uid: uuidv4(),
    devices: [
      {
        name: NAME,
        description: 'System info',
        units: generateUnits(baseSystemUnits, [], []), // только системные юниты
        model: 'Device',
        version: '1.0',
      },
      {
        name: NAME,
        description: 'hub service',
        units: generateUnits(baseHubUnits, [], []), // hub и ничего больше
        model: 'Device',
        version: '1.0',
      },
      {
        name: NAME,
        description: 'goose service',
        units: generateUnits([], [], AVAILABLE_GOOSE), // только goose
        model: 'Device',
        version: '1.0',
      },
      {
        name: NAME,
        description: 'handset service',
        units: generateUnits([], AVAILABLE_HANDSETS, []), // только handset
        model: 'Device',
        version: '1.0',
      },
    ],
    model: 'ServiceRegister',
    version: '1.0',
  },
  model: 'register',
  version: '1.0',
}
