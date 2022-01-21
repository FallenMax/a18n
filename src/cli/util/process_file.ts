import JestWorker from 'jest-worker'
import * as os from 'os'
import parallelMap from 'p-map'
import { keepTruthy } from './keep_truthty'

export const processFiles = async <
  Worker extends {
    [K in FuncName]: (file: string, params?: any) => Promise<Result> | Result
  },
  FuncName extends keyof Worker,
  Params extends {
    silent?: boolean
    exclude?: string | undefined
  } = (Parameters<Worker[FuncName]>[1] extends {}
    ? Parameters<Worker[FuncName]>[1]
    : {}) & {
    silent?: boolean
    exclude?: string | undefined
  },
  Result = ReturnType<Worker[FuncName]>
>(
  files: string[],
  processorPath: string,
  processFunction: FuncName,
  params: Params,
): Promise<Result[]> => {
  const worker = new JestWorker(processorPath, {
    exposedMethods: [processFunction as string],
    maxRetries: 0,
    enableWorkerThreads: true,
    forkOptions: {
      stdio: 'inherit',
    },
  }) as any

  const processFile = async (file: string) => {
    if (params.silent !== true) {
      console.info(file)
    }
    return await worker[processFunction](file, params)
  }

  const results = await parallelMap(files, processFile, {
    concurrency: os.cpus().length,
  })
  worker.end()

  const errors = keepTruthy(
    results.map((res, i) => {
      if (!res.ok) {
        return {
          file: files[i],
        }
      }
    }),
  )

  if (errors.length) {
    console.warn('There are errors when processing files below:')
    console.warn('---')
    errors.forEach((e) => {
      console.warn(`${e.file}`)
    })
  }

  return results
}
