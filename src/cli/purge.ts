import assert from 'assert'
import type * as TsxPurger from './purge/tsx-purger'
import { processFiles } from './util/process_file'
const purgerPath = require.resolve('./purge/tsx-purger')

export const purge = async (
  files: string[],
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

  const results = await processFiles<typeof TsxPurger, 'purgeFile'>(
    files,
    purgerPath,
    'purgeFile',
    params,
  )

  assert(
    results.every((r) => r.ok),
    'Some files failed to process',
  )
}
