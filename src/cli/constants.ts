import { resolve } from 'path'
const packageJson = require(resolve(__dirname, '../../package.json'))

export const LIB_MODULE = packageJson.name
export const LIB_IDENTIFIER = 'a18n'
export const LIB_FACTORY_IDENTIFIER = 'getA18n'
export const LIB_IGNORE_LINE = '@a18n-ignore'
export const LIB_IGNORE_FILE = '@a18n-ignore-file'
export const LIB_PROPERTY_KEY_ID = '_'

export const DEFAULT_LOCALES = ['en', 'zh-CN', 'zh-HK', 'zh-TW', 'zh-YUE']
