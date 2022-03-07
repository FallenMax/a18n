export const assertNever = (o: never): never => {
  throw new Error('unexpected type: ' + JSON.stringify(o))
}
