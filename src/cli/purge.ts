import type * as TsxPurger from './purge/tsx-purger'
import { getFiles, isSourceCode } from './util/file'
import { processFiles } from './util/process_file'
const purgerPath = require.resolve('./purge/tsx-purger')

export const purge = async (
  path: string,
  params: {
    write: boolean
    exclude?: string
    namespace: string | undefined
    silent?: boolean
  },
) => {
  if (!params.write) {
    console.info(
      `Dry run mode, files below will be modified (use --write to actually write files): `,
    )
    console.info(`---`)
  }

  const files = getFiles(path, { exclude: params.exclude }).filter(isSourceCode)

  await processFiles<typeof TsxPurger, 'purgeFile'>(
    files,
    purgerPath,
    'purgeFile',
    params,
  )
}
