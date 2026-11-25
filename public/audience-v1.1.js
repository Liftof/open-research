(() => {
  'use strict'

  const script = document.currentScript
  const installed = Symbol.for('pb-audience.tracker')
  if (!script || window !== window.top || window[installed]) return

  const validKey = /^[a-z][a-z0-9-]{0,39}$/
  const validPath = /^\/(?!\/)[^?#\\\u0000-\u0020]*$/
  const {
    site, origin, pages, page = 'home', path = '/', endpoint: endpointUrl,
    consent, navigation, local
  } = script.dataset

  if (!validKey.test(site ?? '') || origin !== location.origin) return

  let endpoint
  let routes
  try {
    endpoint = new URL(endpointUrl ?? 'https://pb-audience.vercel.app/api/collect')
    const loopback = local === 'on' && location.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
      endpoint.origin === location.origin
    if (location.protocol !== 'https:' && !loopback) return
    if (endpoint.protocol !== 'https:' && !loopback) return
    if (endpoint.pathname !== '/api/collect' || endpoint.search || endpoint.hash ||
        endpoint.username || endpoint.password) return

    const config = pages === undefined ? { [path]: page } : JSON.parse(pages)
    if (config === null || typeof config !== 'object' || Array.isArray(config)) return
    routes = new Map(Object.entries(config))
    if (!routes.size || routes.size > 30) return
    for (const [route, key] of routes) {
      if (!validPath.test(route) || typeof key !== 'string' || !validKey.test(key)) return
    }
  } catch {
    return
  }

  let previousPath
  let optedOut = false
  window[installed] = true

  function mayCount() {
    const params = new URLSearchParams(location.search)
    if (params.get('audience') === 'off') optedOut = true
    if (optedOut || params.has('embed') || document.prerendering ||
        window.pbAudienceDisabled === true || navigator.globalPrivacyControl === true ||
        [navigator.doNotTrack, window.doNotTrack].some(value => value === '1' || value === 'yes') ||
        (consent === 'required' && window.pbAudienceConsent !== true)) return false

    try {
      return window.localStorage.getItem('pb-audience-opt-out') !== '1'
    } catch {
      return true
    }
  }

  function count() {
    if (!mayCount()) return
    const currentPath = location.pathname
    if (currentPath === previousPath) return
    previousPath = currentPath
    const pageKey = routes.get(currentPath)
    if (!pageKey) return

    fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ site, page: pageKey })
    }).catch(() => {})
  }

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      previousPath = undefined
      count()
    }
  })

  if (consent === 'required') window.addEventListener('pb-audience:consent', count)
  if (navigation === 'spa') {
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method]
      history[method] = function (...args) {
        const result = Reflect.apply(original, this, args)
        queueMicrotask(count)
        return result
      }
    }
    window.addEventListener('popstate', count)
  }

  if (document.prerendering) {
    document.addEventListener('prerenderingchange', count, { once: true })
  } else {
    count()
  }
})()
