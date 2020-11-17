const s3 = a18n('中文')
const s7 = a18n`中文${interpolated}`
const s8 = a18n`${interpolated}中文${interpolated}中文2${interpolated}`
const s9 = a18n`没有插值但用了backtick`
const s10 = a18n('"无效名称"错误。无法识别公式中的文本。')
const s15 = (
  <div>
    {a18n('我喜欢')}
    <input type="text" placeholder={a18n('这样子')} />
  </div>
)

const s15_1 = (
  <>
    {a18n('我喜欢2')}
    <input type="text" placeholder={a18n('这样子2')} />
  </>
)

const r = null as any
const r1 = { ...{}, ...{} }

// decorator syntax
@connect()
class SomeComponent extends React.Component {
  doStuff = () => {}
  render() {
    return <div />
  }
}

// nullish coalescing syntax
const temp = s3 ?? s10

// optional chaining syntax
const temp2 = (s3 as any)?.y?.z

// a18n(variable) should only produce warning instead of error
const someVar = 'abc'
const temp3 = a18n(someVar)
