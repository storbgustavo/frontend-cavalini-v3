import { openLogSocket } from '../api.js'
import { levelClass, debounce } from '../utils.js'

let ws = null
let logs = []
let autoScroll = true
let filter = ''
const MAX_LOGS = 1000

export function renderLogs(contentEl) {
  contentEl.innerHTML = `
    <div class="page logs-container">
      <div class="panel" style="display:flex;flex-direction:column;flex:1;margin-bottom:0">
        <div class="logs-toolbar">
          <div class="logs-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" id="logs-filter" placeholder="Filtrar logs..." />
          </div>
          <button class="btn btn-sm" id="logs-clear">Limpar</button>
          <label class="toggle" style="font-size:13px">
            <input type="checkbox" id="logs-autoscroll" checked />
            <span class="toggle-track"></span>
            <span class="toggle-label">Auto-scroll</span>
          </label>
          <div class="topbar-badge" id="logs-conn-status">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>
            Conectando...
          </div>
        </div>
        <div class="logs-viewer" id="logs-viewer">
          <div class="logs-empty" id="logs-empty">Aguardando logs...</div>
        </div>
      </div>
    </div>
  `

  const debouncedFilter = debounce((v) => { filter = v.toLowerCase(); renderLogsList() }, 200)

  document.getElementById('logs-filter').addEventListener('input', (e) => debouncedFilter(e.target.value))
  document.getElementById('logs-autoscroll').addEventListener('change', (e) => { autoScroll = e.target.checked })
  document.getElementById('logs-clear').addEventListener('click', () => {
    logs = []
    renderLogsList()
  })

  connect(contentEl)
}

function connect(contentEl) {
  const statusEl = document.getElementById('logs-conn-status')
  if (!statusEl) return

  ws = openLogSocket(
    (msg) => {
      addLog(msg)
    },
    (status) => {
      if (status === 'connected') {
        statusEl.className = 'topbar-badge connected'
        statusEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>
          Conectado
        `
      } else if (status === 'disconnected') {
        statusEl.className = 'topbar-badge disconnected'
        statusEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M2.62 12a10.94 10.94 0 0 1 4.66-3.9"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>
          Desconectado
        `
        setTimeout(() => {
          if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
            connect(contentEl)
          }
        }, 3000)
      } else if (status === 'error') {
        statusEl.className = 'topbar-badge disconnected'
        statusEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Erro de conexão
        `
      }
    }
  )
}

function addLog(msg) {
  const entry = {
    time: msg.time ?? msg.timestamp ?? new Date().toISOString(),
    level: msg.level ?? 'info',
    message: msg.message ?? msg.msg ?? String(msg),
  }
  logs.push(entry)
  if (logs.length > MAX_LOGS) logs.shift()
  renderLogEntry(entry)
}

function renderLogEntry(entry) {
  if (filter && !entry.message.toLowerCase().includes(filter)) return

  const viewer = document.getElementById('logs-viewer')
  if (!viewer) return

  const empty = document.getElementById('logs-empty')
  if (empty) empty.remove()

  const line = document.createElement('div')
  line.className = `log-line ${levelClass(entry.level)}`
  const time = new Date(entry.time)
  const timeStr = isNaN(time.getTime()) ? entry.time : time.toLocaleTimeString('pt-BR')

  line.innerHTML = `
    <span class="log-time">${timeStr}</span>
    <span class="log-level">${entry.level}</span>
    <span class="log-msg">${escapeHtml(entry.message)}</span>
  `
  viewer.appendChild(line)

  if (autoScroll) {
    viewer.scrollTop = viewer.scrollHeight
  }

  while (viewer.children.length > MAX_LOGS) {
    viewer.removeChild(viewer.firstChild)
  }
}

function renderLogsList() {
  const viewer = document.getElementById('logs-viewer')
  if (!viewer) return
  viewer.innerHTML = ''
  const filtered = filter ? logs.filter(l => l.message.toLowerCase().includes(filter)) : logs
  if (filtered.length === 0) {
    viewer.innerHTML = '<div class="logs-empty">Nenhum log para exibir.</div>'
    return
  }
  filtered.forEach(entry => renderLogEntry(entry))
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export function disconnectLogs() {
  if (ws) {
    ws.close()
    ws = null
  }
}
