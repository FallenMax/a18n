import { readFileSync } from 'fs'
import { resolve } from 'path'
import { purgers } from './purge'

describe('purge', () => {
  test('remove a18n() calls and imports ', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-output.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const expected = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/purge-output.mock.tsx'),
      { encoding: 'utf-8' },
    )

    expect(purgers.tsx(source, {})).toBe(expected)
    // ensure nothing changes for second purge
    expect(purgers.tsx(expected, {})).toBe(expected)
  })
})
