type FalsyValues = null | undefined | false | 0 | ''

export const keepTruthy = <T>(
  arr: (T | FalsyValues)[],
): Exclude<T, FalsyValues>[] => {
  return arr.filter(Boolean) as any
}
