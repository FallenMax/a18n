import { resolve } from 'path'
const packageJson = require(resolve(__dirname, '../../package.json'))

export const LIB_MODULE = packageJson.name
export const LIB_IDENTIFIER = 'a18n'
export const LIB_METHOD_X_IDENTIFIER = 'x'
export const LIB_FACTORY_IDENTIFIER = 'getA18n'
export const LIB_IGNORE_LINE = '@a18n-ignore'
export const LIB_IGNORE_FILE = '@a18n-ignore-file'
export const TEXT_PREFIX = '@@'
export const TEXT_PREFIX_REGEX = /^\s*@@/

export const DEFAULT_LOCALES = ['en-US']
