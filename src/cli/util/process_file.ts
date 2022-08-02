import { codeFrameColumns } from '@babel/code-frame'
import JestWorker from 'jest-worker'
import * as os from 'os'

import chalk from 'chalk'
import { readFileSync } from 'fs'
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
  Result = ReturnType<Worker[FuncName]>,
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
      console.info(chalk.gray(file))
    }
    let result: any = { ok: false }
    try {
      result = await worker[processFunction](file, params)
    } catch (error) {
      result = {
        ok: false,
        error,
      }
    }

    if (!result.ok) {
      const error = result.error
      const tryExtractLocation = (stack?: string) => {
        if (!stack) return undefined
        const [firstLine] = stack.split('\n')
        if (!firstLine) return undefined
        const [_, line, column] = firstLine.match(/\((\d+):(\d+)\)$/) || []
        return _ ? { line, column } : undefined
      }
      const loc = error?.loc ?? tryExtractLocation(error?.stack)
      if (loc) {
        console.warn(
          chalk.red`\n[a18n] error processing: \n${file}:${loc.line}:${loc.column}\n`,
        )
        try {
          const content = readFileSync(file, 'utf-8')
          const frame = codeFrameColumns(
            content,
            {
              start: loc,
            },
            {
              highlightCode: true,
              // forceColor: true,
            },
          )
          console.info(frame)
          console.info('')
        } catch (error) {}
      } else {
        console.warn(chalk.red`[a18n] error processing: ${file}`)
      }
      console.error(error)
      console.info('')
    }

    return result
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
    console.warn(chalk.red`
------------------
${errors.length} file(s) failed to process, see log for details

${errors.map((e) => e.file).join('\n')}
------------------

`)
  }

  return results
}
