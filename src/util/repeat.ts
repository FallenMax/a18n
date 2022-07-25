export const repeatArray = <T = any>(
  arr: T[],
  count: number,
  seperator?: any,
): T[] => {
  let repeated = [] as any[]
  for (let index = 0; index < count; index++) {
    repeated = repeated.concat(arr)
    if (seperator != null && index !== count - 1) {
      repeated.push(seperator)
    }
  }

  return repeated
}

export const repeatString = (
  str: string,
  count: number,
  seperator?: string,
): string => {
  let repeated = ''
  for (let index = 0; index < count; index++) {
    repeated = repeated + str
    if (seperator != null && index !== count - 1) {
      repeated = repeated + seperator
    }
  }

  return repeated
}
