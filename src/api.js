const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail
    try {
      const body = await res.json()
      detail = body.detail || body.message || JSON.stringify(body)
    } catch {
      detail = res.statusText
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getAccounts: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v)
    })
    const s = qs.toString()
    return request(`/accounts${s ? `?${s}` : ''}`)
  },
  getStats: () => request('/accounts/stats'),
  getConfig: () => request('/config'),
  updateConfig: (cfg) => request('/config', { method: 'PUT', body: JSON.stringify(cfg) }),
  startBot: (body) => request('/bot/start', { method: 'POST', body: JSON.stringify(body) }),
  stopBot: () => request('/bot/stop', { method: 'POST' }),
  getBotStatus: () => request('/bot/status'),
  getPlatforms: () => request('/platforms'),
  getSmsBalance: () => request('/sms/balance'),
}

export function openLogSocket(onMessage, onStatus) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws/logs`)
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch {
      onMessage({ message: e.data, level: 'info' })
    }
  }
  ws.onopen = () => onStatus?.('connected')
  ws.onclose = () => onStatus?.('disconnected')
  ws.onerror = () => onStatus?.('error')
  return ws
}
