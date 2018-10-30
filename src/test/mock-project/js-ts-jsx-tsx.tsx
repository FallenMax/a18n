const a18n = 1 as any
const s = '中文'
const s2 = `中文`
const s3 = a18n('中文')
const s4 = a18n('中文')
const s5 = 'english'
const s6 = 'eng 中间有中文 lish'
const s7 = `中文${123}`
// @a18n-ignore
const s8 = '忽略我'

{
  const s3 = a18n('中文')
  const s4 = a18n('中文2')
  const s7 = a18n`中文${1}`
  const s8 = a18n`${1}中文${2}中文2${3}`
}

export {}
