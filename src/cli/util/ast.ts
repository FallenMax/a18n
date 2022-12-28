import * as parser from '@babel/parser'
import * as recast from 'recast'
import { keepTruthy } from './keep_truthty'

export const parse = (code: string, fileName: string) => {
  const jsx = /\.(jsx|tsx)$/.test(fileName)
  return recast.parse(code, {
    parser: {
      parse: (source: string) =>
        parser.parse(source, {
          tokens: true,
          sourceType: 'module',
          plugins: keepTruthy([
            jsx && 'jsx', // should only be enabled for .jsx/.tsx though
            'typescript',
            'objectRestSpread',
            'asyncGenerators',
            'classProperties',
            'dynamicImport',
            'decorators-legacy',
            'optionalCatchBinding',
            'optionalChaining',
            'nullishCoalescingOperator',
          ]),
        }),
    },
  })
}

export const print = (ast: any): string => {
  return recast.print(ast, {
    tabWidth: 2,
    quote: 'single',
  }).code
}
