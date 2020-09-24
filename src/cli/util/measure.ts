export const withMeasure = <T extends (...args: any[]) => any>(fn: T): T => {
  return (async (...args) => {
    const start = Date.now()
    try {
      return await fn(...args)
    } finally {
      const end = Date.now()
      const duration = Math.round((end - start) / 1000)
      console.warn(`Done in ${duration}s`)
    }
  }) as T
}
