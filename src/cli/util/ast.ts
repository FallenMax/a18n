import * as parser from '@babel/parser'
import * as recast from 'recast'

export const parse = (code: string) => {
  return recast.parse(code, {
    parser: {
      parse: (source: string) =>
        parser.parse(source, {
          tokens: true,
          sourceType: 'module',
          plugins: [
            'jsx', // should only be enabled for .jsx/.tsx though
            'typescript',
            'objectRestSpread',
            'asyncGenerators',
            'classProperties',
            'dynamicImport',
            'decorators-legacy',
            'optionalCatchBinding',
            'optionalChaining',
            'nullishCoalescingOperator',
          ],
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
