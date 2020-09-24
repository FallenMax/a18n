import type * as TsxPurger from './purge/tsx-purger'
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

  await processFiles<typeof TsxPurger, 'purgeFile'>(
    path,
    purgerPath,
    'purgeFile',
    params,
  )
}
