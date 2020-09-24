import { processFiles } from './util/process_file'
import type * as TsxWrapper from './wrap/tsx-wrapper'
const wrapperPath = require.resolve('./wrap/tsx-wrapper')

export const wrap = async (
  path: string,
  params: {
    write: boolean
    exclude?: string
    namespace: string | undefined
    silent?: boolean
  },
) => {
  if (!params.write) {
    console.warn(
      `Dry run mode, files below will be modified (use --write to actually write files): `,
    )
    console.warn(`---`)
  }

  await processFiles<typeof TsxWrapper, 'wrapFile'>(
    path,
    wrapperPath,
    'wrapFile',
    params,
  )
}
