export const updateObjectInArray = <T>(array: Array<T>, newObject: T, key: keyof T): void => {
  const index = array.findIndex((item) => item[key] === newObject[key])
  if (index !== -1) {
    array.splice(index, 1, newObject)
  } else {
    array.push(newObject)
  }
}

export const updateObjectInMapArrayValue = <MK, AV>(
  map: Map<MK, Array<AV>>,
  mapKey: MK,
  object: AV,
  objectKey: keyof AV,
): void => {
  const mapArrayValue = map.get(mapKey)
  if (mapArrayValue) {
    updateObjectInArray(mapArrayValue, object, objectKey)
  } else {
    map.set(mapKey, [object])
  }
}
