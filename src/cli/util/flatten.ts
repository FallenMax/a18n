export const flatten = <T>(xs: (T | T[])[]): T[] => {
  return ([] as T[]).concat(...xs)
}
