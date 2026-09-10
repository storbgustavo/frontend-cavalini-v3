import './src/style.css'
import { api } from './src/api.js'
import { ICONS, toast } from './src/utils.js'
import { renderDashboard } from './src/pages/dashboard.js'
import { renderAccounts } from './src/pages/accounts.js'
import { renderBot, stopPolling } from './src/pages/bot.js'
import { renderConfig } from './src/pages/config.js'
import { renderLogs, disconnectLogs } from './src/pages/logs.js'

const routes = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', title: 'Dashboard', subtitle: 'Visão geral das contas e estatísticas', render: renderDashboard },
  { id: 'accounts', label: 'Contas', icon: 'users', title: 'Contas', subtitle: 'Todas as contas de apostas registradas', render: renderAccounts },
  { id: 'bot', label: 'Bot', icon: 'bot', title: 'Controle do Bot', subtitle: 'Iniciar, parar e configurar o bot', render: renderBot },
  { id: 'config', label: 'Config', icon: 'settings', title: 'Configurações', subtitle: 'Proxy, SMS e ajustes gerais', render: renderConfig },
  { id: 'logs', label: 'Logs', icon: 'terminal', title: 'Logs em Tempo Real', subtitle: 'Monitor de eventos ao vivo', render: renderLogs },
]

let currentRoute = null
let botStatusPoll = null

function renderShell() {
  document.querySelector('#app').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">${iconSvg('bot', 22)}</div>
          <div class="sidebar-logo-text">
            <h1>Cavalini Pro</h1>
            <span>Bot de Apostas</span>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav">
        <div class="nav-section">Menu</div>
      </nav>
      <div class="sidebar-footer">
        <div class="bot-status-mini" id="bot-status-mini">
          <div class="status-dot stopped" id="bot-status-dot"></div>
          <span class="bot-status-mini-text" id="bot-status-text">Verificando...</span>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="mobile-menu-btn" id="mobile-menu-btn">${iconSvg('layout-dashboard', 20)}</button>
          <div>
            <div class="topbar-title" id="topbar-title">Dashboard</div>
            <div class="topbar-subtitle" id="topbar-subtitle">Visão geral</div>
          </div>
        </div>
        <div class="topbar-actions" id="topbar-actions"></div>
      </header>
      <main class="content" id="content"></main>
    </div>
    <div id="toast-container"></div>
  `

  const nav = document.getElementById('sidebar-nav')
  routes.forEach(r => {
    const item = document.createElement('div')
    item.className = 'nav-item'
    item.dataset.route = r.id
    item.innerHTML = `${iconSvg(r.icon, 18)}<span>${r.label}</span>`
    item.addEventListener('click', () => navigate(r.id))
    nav.appendChild(item)
  })

  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open')
  })

  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar')
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !e.target.closest('#mobile-menu-btn')) {
      sidebar.classList.remove('open')
    }
  })
}

function iconSvg(name, size) {
  const paths = ICONS[name] || ICONS['info']
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths.map(d => `<path d="${d}"/>`).join('')}</svg>`
}

async function navigate(routeId) {
  if (currentRoute === routeId) return

  if (currentRoute === 'bot') stopPolling()
  if (currentRoute === 'logs') disconnectLogs()

  currentRoute = routeId
  const route = routes.find(r => r.id === routeId)
  if (!route) return

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === routeId)
  })

  document.getElementById('topbar-title').textContent = route.title
  document.getElementById('topbar-subtitle').textContent = route.subtitle

  const content = document.getElementById('content')
  content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>'

  document.getElementById('sidebar').classList.remove('open')

  try {
    await route.render(content)
  } catch (err) {
    content.innerHTML = `<div class="panel"><div class="panel-body" style="color:var(--error)">Erro ao carregar página: ${err.message}</div></div>`
  }
}

async function pollBotStatus() {
  const dot = document.getElementById('bot-status-dot')
  const text = document.getElementById('bot-status-text')
  if (!dot || !text) return

  try {
    const status = await api.getBotStatus()
    if (status.running) {
      dot.className = 'status-dot running'
      text.className = 'bot-status-mini-text running'
      text.textContent = 'Bot rodando'
    } else {
      dot.className = 'status-dot stopped'
      text.className = 'bot-status-mini-text'
      text.textContent = 'Bot parado'
    }
  } catch {
    dot.className = 'status-dot error'
    text.className = 'bot-status-mini-text'
    text.textContent = 'Backend offline'
  }
}

renderShell()

const initialRoute = location.hash.replace('#', '') || 'dashboard'
navigate(routes.find(r => r.id === initialRoute) ? initialRoute : 'dashboard')

pollBotStatus()
botStatusPoll = setInterval(pollBotStatus, 10000)

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '')
  if (hash && routes.find(r => r.id === hash)) navigate(hash)
})
