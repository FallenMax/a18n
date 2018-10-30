export const assertNever = (o: any): never => {
  throw new Error('unexpected type: ' + JSON.stringify(o))
}
