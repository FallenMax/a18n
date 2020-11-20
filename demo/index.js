const a18n = window.a18n.default

a18n.addLocaleResource('en', {
  source: 'target',
  'x%1y%2z%3w': 'a%3b%1c',
})
a18n.setLocale('en')

const translateDynamicText = (count) => {
  let realMs, refMs
  // reference  implementation
  {
    let b18n = () => 'a3b1c'
    let found = 0
    let start = Date.now()
    for (let index = 0; index < count; index++) {
      if (b18n`x${1}y${2}z${3}w` === 'a3b1c') {
        found++
      }
    }
    refMs = Date.now() - start
  }

  // real implementation
  {
    let found = 0
    let start = Date.now()
    for (let index = 0; index < count; index++) {
      if (a18n`x${1}y${2}z${3}w` === 'a3b1c') {
        found++
      }
    }
    realMs = Date.now() - start
  }

  return [realMs, refMs]
}

const translateStaticText = (count) => {
  let realMs, refMs
  {
    let b18n = () => 'target'
    let found = 0
    let start = Date.now()
    for (let index = 0; index < count; index++) {
      if (b18n('source') === 'target') {
        found++
      }
    }
    refMs = Date.now() - start
  }

  // real
  {
    let found = 0
    let start = Date.now()
    for (let index = 0; index < count; index++) {
      if (a18n('source') === 'target') {
        found++
      }
    }
    realMs = Date.now() - start
  }
  return [realMs, refMs]
}

const $ = (str) => document.querySelector(str)
const avg = (numbers) => {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}
window.translateStaticText = () => {
  let count = $('#static_text_count').value
  const times = Array(10)
    .fill(0)
    .map(() => translateStaticText(count))
  const realMs = avg(times.map(([real]) => real))
  const refMs = avg(times.map(([, ref]) => ref))
  $('#static_text_time_ref').textContent = refMs
  $('#static_text_time').textContent = realMs
}
window.translateDynamicText = () => {
  let count = $('#dynamic_text_count').value
  const times = Array(10)
    .fill(0)
    .map(() => translateDynamicText(count))
  const realMs = avg(times.map(([real]) => real))
  const refMs = avg(times.map(([, ref]) => ref))
  $('#dynamic_text_time_ref').textContent = refMs
  $('#dynamic_text_time').textContent = realMs
}

const tests = [window.translateStaticText, window.translateDynamicText]
tests.forEach((test) => test())
