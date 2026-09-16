import { computed, ref } from 'vue'

type TransactionMode = 'readwrite' | 'readonly' | 'versionchange' | undefined
type SaveDataConfig = {
  objectStoreName: string,
  key: IDBValidKey,
  data: unknown,
}
type GetDataConfig = {
  objectStoreName: string,
  key: IDBValidKey,
}
type GetAllDataConfig = {
  objectStoreName: string,
  byKeys?: boolean
}
type DeleteDataConfig = {
  objectStoreName: string,
  key: IDBValidKey,
}

/**
 * @TODO
 * 
 * rename database name due to conflict with Dispatch Console product
 * 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DATA_BASE_NAME = 'dealing-console-ui'
const DEPRECATED_DATA_BASE_NAME = 'dispatch-console-ui'

export const OBJECT_STORE_NAME_EXTERNAL = 'EXTERNAL'
export const OBJECT_STORE_NAME_FAVORITES = 'FAVORITES'
export const OBJECT_STORE_NAME_TOOLTIPS = 'TOOLTIPS'
export const OBJECT_STORE_NAME_MEDIA_DEVICES = 'MEDIA-DEVICES-CONFIGS'
export const OBJECT_STORE_NAME_PINNED_DEVICE = 'PINNED-MEDIA-DEVICE-CONFIG'
const DATA_BASE_VERSION = 9

class IndexedDB {
  dbName: string
  objectStoreNames: string[]
  IDBDatabase = ref<IDBDatabase | null>(null)

  constructor (databaseName: string, objectStoreNames: string[]) {
    this.dbName = databaseName
    this.objectStoreNames = objectStoreNames
  }

  openDB (): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(this.dbName, DATA_BASE_VERSION)

      request.onblocked = () => {
        alert('Пожалуйста, закройте все другие вкладки приложения, пока этот сайт открыт!')
      }

      request.onupgradeneeded = (event) => {
        const db: IDBDatabase = (event.target as IDBOpenDBRequest).result
        this.objectStoreNames.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName)
          }
        })

        db.onversionchange = () => {
          db.close()
          alert('Готова новая версия этой страницы. Пожалуйста, перезагрузите!')
        }
      }

      request.onsuccess = (event) => {
        const db: IDBDatabase = (event.target as IDBOpenDBRequest).result
        db.onversionchange = () => {
          db.close()
          alert('Готова новая версия этой страницы. Пожалуйста, перезагрузите!')
        }
        this.IDBDatabase.value = db
        resolve(db)
      }

      request.onerror = () => {
        const err = request.error?.message || 'Error creating database' // event.target.errorCode
        reject(err)
        console.error('openDb:', err)
      }
    })
  }

  saveData (config: SaveDataConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.IDBDatabase.value) {
        reject(new Error(`IDBDatabase is ${this.IDBDatabase.value}`))
        return
      }
      const { objectStoreName, data, key } = config
      const store: IDBObjectStore = this.getObjectStore(this.IDBDatabase.value, objectStoreName, 'readwrite')
      const request = store.put(data, key)

      request.onsuccess = () => {
        resolve(true)
      }

      request.onerror = (error) => {
        reject(error)
      }
    })
  }

  getData <T> (config: GetDataConfig): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.IDBDatabase.value) {
        reject(new Error(`IDBDatabase is ${this.IDBDatabase.value}`))
        return
      }
      const { objectStoreName, key } = config
      const store: IDBObjectStore = this.getObjectStore(this.IDBDatabase.value, objectStoreName, 'readonly')
      const request = store.get(key)
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = (error) => {
        reject(error)
      }
    })
  }

  getAll <T> (config: GetAllDataConfig): Promise<T[] | IDBValidKey[]> {
    return new Promise((resolve, reject) => {
      if (!this.IDBDatabase.value) {
        reject(new Error(`IDBDatabase is ${this.IDBDatabase.value}`))
        return
      }
      const { objectStoreName, byKeys = false } = config
      const transaction: IDBTransaction = this.IDBDatabase.value.transaction(objectStoreName, 'readonly')
      const contactsStore = transaction.objectStore(objectStoreName)
      const fn = byKeys ? 'getAllKeys' : 'getAll'
      const request: IDBRequest<IDBValidKey[]> | IDBRequest<T[]> = contactsStore[fn]()
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = (error) => {
        reject(error)
      }
    })
  }

  deleteData (config: DeleteDataConfig) {
    if (!this.IDBDatabase.value) {
      console.error(`IDBDatabase is ${this.IDBDatabase.value}`)
      return
    }
    const { objectStoreName, key } = config
    const transaction: IDBTransaction = this.IDBDatabase.value.transaction(objectStoreName, 'readwrite')
    const store = transaction.objectStore(objectStoreName)
    store.delete(key)
  }

  private getObjectStore = (dataBase: IDBDatabase, objectStoreName: string, mode?: TransactionMode): IDBObjectStore => {
    const transaction: IDBTransaction = dataBase.transaction(objectStoreName, mode)
    return transaction.objectStore(objectStoreName)
  }

  public isReady = computed(() => !!this.IDBDatabase.value)
}

const IDB = new IndexedDB(DEPRECATED_DATA_BASE_NAME, [
  OBJECT_STORE_NAME_EXTERNAL,
  OBJECT_STORE_NAME_FAVORITES,
  OBJECT_STORE_NAME_TOOLTIPS,
  OBJECT_STORE_NAME_MEDIA_DEVICES,
  OBJECT_STORE_NAME_PINNED_DEVICE,
]);

(async function () {
  try {
    await IDB.openDB()
  } catch (e) {
    console.error(e)
  }
})()

export { IDB }


