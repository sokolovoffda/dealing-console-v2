export const arrayBatchesHandler = async <T> (config: {
    array: Array<T>,
    batchSize: number,
    delayMs: number,
    callback?: (arg: T) => void,
},
): Promise<boolean> => {
  const { array, batchSize, delayMs, callback } = config  
    
  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const values = [...array]
  const totalValues = array.length
  console.debug(`Total values for handle: ${totalValues}`)

  for (let i = 0; i < totalValues; i += batchSize) {
    const batch = values.slice(i, i + batchSize)

    batch.forEach((item) => {
      callback?.(item)
    })

    if (i + batchSize < totalValues){
      await delay(delayMs)
    }
  }
  console.debug('All values processed.')
  return Promise.resolve(true)
}