import a18n from 'a18n'
import type ReactNS from 'react'
import * as React from 'react'

type N = ReactNS.ReactNode

const s = a18n('中文-1')
const s2 = a18n`中文-1`
const s3 = a18n('中文1-1')
const s4 = a18n`有些是${a18n(
  '中文2-1',
)}, 有些有${a18n`嵌套-1`}and some are ${'English1'}-1`
const s4_1 = a18n.x`有些是${a18n(
  '中文22-1',
)}, 有些有${a18n.x`嵌套-1`}and some are ${'English1'}-1`
const s5 = 'english'
const s6 = a18n('eng 中间有中文 lish-1')
const s7 = a18n`中文${interpolated}-1`
// @a18n-ignore
const s8 = '忽略我'
const s9 = 'plaintext'
// 跨行的中文不应该匹配
const s10 = 'plaintext'
/**
 * 注释里的 '中文' 是 `不能`碰的
 */
// '行注释中的中文'
/** '这种注释' */
const s13 = true ? a18n`星期${interpolated}-1` : a18n`周${interpolated}-1`
const s14 = a18n`星期-1`

// jsx text, attributes
const s15 = (
  <div>
    {a18n('我喜欢-1')}
    <input type="text" placeholder={a18n('这样子-1')} />
    <div>{a18n('生活-1')}</div>
  </div>
)

const s15_1 = (
  <>
    {a18n('我喜欢-1')}
    <input type="text" placeholder={a18n('这样子-1')} />
  </>
)

// 保留ts类型标注
const s16 = null as any

// decorator语法
@connect()
class SomeComponent extends React.Component {
  doStuff = () => {}
  render() {
    return (
      <div>
        {/* @a18n-ignore */}
        被忽略的中文
      </div>
    )
  }
}

// object key : don't wrap
// object value : do wrap
const s17 = {
  中文: 3,
  中文2: a18n('中文3-1'),
}

// tsLiteral: don't touch
export type s18 = 'YYYY年MM月DD日' | 'YYYY年MM月DD日 hh:mm'
// tsEnumNumber don't touch
export enum S19 {
  '一' = 1,
}

// nullish coalescing语法
const temp = s3 ?? s10

// optional chaining语法
const temp2 = (s3 as any)?.y?.z

// Logical OR assignment
a ||= b
