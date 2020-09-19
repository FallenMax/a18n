import { readFileSync } from 'fs'
import { resolve } from 'path'
import { sourceTextToKey } from '../util/locale'
import { createResource, exporters, extractors, importers } from './extract'

describe('extract', () => {
  const filePath = resolve(
    __dirname,
    '../../src/cli/__test__/extract-input.mock.tsx',
  )
  const source = readFileSync(filePath, { encoding: 'utf-8' })

  const extracted = extractors.tsx(source, filePath)

  test('extract source text to key', () => {
    const expected = [
      '中文',
      '中文%s',
      '%1中文%2中文2%3',
      '没有插值但用了backtick',
      '"无效名称"错误。无法识别公式中的文本。',
      '我喜欢',
      '这样子',
    ]

    const keys = [] as string[]
    extracted.map(sourceTextToKey).forEach((key) => {
      keys.push(key)
    })

    expect(keys.sort()).toEqual(expected.sort())
  })

  test('format: json', () => {
    const expected = [
      '中文',
      '中文%s',
      '%1中文%2中文2%3',
      '没有插值但用了backtick',
      '"无效名称"错误。无法识别公式中的文本。',
      '我喜欢',
      '这样子',
    ]

    const exported = exporters.json(
      createResource(extracted, { 中文: 'Chinese' }),
      'test',
    )
    const imported = importers.json(exported)

    expect(imported['中文']).toEqual('Chinese')
    expect(Object.keys(imported).sort()).toEqual(expected.sort())
  })
})
