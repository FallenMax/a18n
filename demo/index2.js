const SYMBOL_END =
  typeof Symbol !== 'undefined'
    ? Symbol.for('a18n-compiled')
    : '__$a18n-compiled'

let cache = {}

const loadTemplate = (parts) => {
  let o = cache
  for (let i = 0; i < parts.length; i++) {
    o = o[parts[i]]
    if (!o) {
      return undefined
    }
  }
  return o && o[SYMBOL_END]
}
const saveTemplate = (path, template) => {
  let o = cache
  for (let i = 0; i < path.length && o; i++) {
    o = o[path[i]] || (o[path[i]] = {})
  }
  o[SYMBOL_END] = template
  return template
}

// const getKey = (parts) => {
//   let str = ''
//   for (let index = 0; index < parts.length; index++) {
//     str += parts[index]
//   }
//   return str
// }
// const loadTemplate = (parts) => {
//   const key = getKey(parts)
//   return cache[key]
// }
// const saveTemplate = (parts, template) => {
//   const key = getKey(parts)
//   return (cache[key] = template)
// }

const doCompile = (parts, resource) => {
  const partCount = parts.length
  const keyTemplate = parts
    .map((part, i) => {
      return i === partCount - 1
        ? part
        : `${part}%${partCount === 2 ? 's' : i + 1}`
    })
    .join('')
  const valueTemplate = resource[keyTemplate]

  const templateString =
    typeof valueTemplate === 'string' ? valueTemplate : keyTemplate

  return templateString.split(/(%s|%\d)/g).map((item) => {
    const result = /^%(s|\d)$/g.exec(item)
    const pos = result && result[1]
    if (pos) {
      return pos === 's' ? 1 : Number(pos)
    } else {
      return item
    }
  })
}

/**
 * preprocess dynamic text into template, making future translation faster
 * (~10x than previous parse/interpolate approach)
 *
 * @example
 * key-value pair: { 'x%1y%2z%3w': 'aa%3bb%1cc' }
 * will generate a compiled template: ["aa", 3, "bb", 1, "cc"]
 * and be cached under path [x,y,z,w,SYMBOL_END]
 */
const compile = (parts, resource) => {
  // return saveTemplate(parts, doCompile(parts, resource))
  // return doCompile(parts, resource)
  return loadTemplate(parts) || saveTemplate(parts, doCompile(parts, resource))
}

const clearCompileCache = () => {
  cache = {}
}

const DEBUG_getCompileCache = () => {
  return cache
}

const resource = {
  source: 'target',
  'x%1y%2z%3w': 'a%3b%1c',
}

function a18n(text) {
  if (typeof text === 'string') {
    const translated = resource[text]
    if (typeof translated === 'string') {
      return translated
    }
    return text
  }

  if (Array.isArray(text)) {
    // let key = text.join('')
    // let key = text.join('')
    // let key = ''
    // for (let index = 0; index < text.length; index++) {
    //   let t = text[index]
    //   key += t
    // }
    // keyS = key.join('')
    // const template = cache[key] || (cache[key] = doCompile(text, resource))
    const template = compile(text, resource)
    let result = ''
    for (let index = 0; index < template.length; index++) {
      const item = template[index]
      result += typeof item === 'number' ? String(arguments[item]) : item
    }
    return result
  }

  return String(text)
}

const translateDynamicText = (count) => {
  let found = 0
  let start = Date.now()
  let staticText = false
  for (let index = 0; index < count; index++) {
    if (staticText) {
      if (a18n('source') === 'target') {
        found++
      }
    } else {
      if (a18n`x${1}y${2}z${3}w` === 'a3b1c') {
        found++
      }
    }
    staticText = !staticText
  }
  realMs = Date.now() - start

  return [realMs, found]
}

const [real, found] = translateDynamicText(1000000)
console.log('dynamic:', real, found)
// printStatus(loadTemplate)
// console.log('dynamic:', translateDynamicText(100000))

// function printStatus(fn) {
//   const status = %GetOptimizationStatus(fn)
//   console.log('status ', status)
//   switch (status) {
//     case 1:
//       console.log('Function is optimized')
//       break
//     case 2:
//       console.log('Function is not optimized')
//       break
//     case 3:
//       console.log('Function is always optimized')
//       break
//     case 4:
//       console.log('Function is never optimized')
//       break
//     case 6:
//       console.log('Function is maybe deoptimized')
//       break
//     case 7:
//       console.log('Function is optimized by TurboFan')
//       break
//     default:
//       console.log('Unknown optimization status')
//       break
//   }
// }

// printStatus(loadTemplate)
